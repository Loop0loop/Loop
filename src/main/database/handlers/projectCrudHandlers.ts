'use strict';

// MIGRATION: MIGRATED FROM projectIpcHandlers.ts:19-556
// MIGRATION: TODO verify Prisma disconnect, error handling, 'new' ID edge case

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../shared/logger';
import { IpcResponse, Project, ProjectStructure } from '../../../shared/types';
// PrismaProjectStructure is no longer used here; mapping helpers live in mappers/projectMapper
import { prismaService } from '../services/PrismaService';
import { projectService } from '../services/projectService';
import { sampleProjectService } from '../services/sampleProjectService';
import { projectImportService } from '../services/projectImportService';
import { ProjectCreateSchema, ProjectUpdateSchema, detectSuspiciousInput } from '../../../shared/validation/projectValidation';
import { globalRateLimiter, channelLimiters } from '../../services/RateLimiterService';
import { databaseMutex } from '../services/DatabaseMutexService';  // 🔒 동시성 제어

import { mapPrismaProjectToDomain } from '../mappers/projectMapper';

/**
 * 🔥 프로젝트 CRUD IPC 핸들러 - 성능 최적화
 * 
 * 등록된 채널:
 * - projects:get-all
 * - projects:get-by-id
 * - projects:create
 * - projects:update
 * - projects:delete
 * - projects:create-sample
 * - projects:import-file
 */
export function registerProjectCrudHandlers(): void {
  Logger.debug('PROJECT_CRUD_IPC', 'Registering CRUD IPC handlers');

  // 모든 프로젝트 조회 - 🔥 성능 최적화
  ipcMain.handle('projects:get-all', async (): Promise<IpcResponse<Project[]>> => {
    try {
      Logger.debug('PROJECT_CRUD_IPC', 'Getting all projects from database');

      const prisma = await prismaService.getClient();

      // 🔥 N+1 쿼리 최적화: include로 관련 데이터 한 번에 로드
      const projects = await prisma.project.findMany({
        include: {
          episodes: {
            select: { 
              id: true, 
              title: true, 
              wordCount: true, 
              episodeNumber: true,
              status: true,
              createdAt: true,
              updatedAt: true
            }
          },
          characters: true,
          structure: true,
          notes: true,
          writerStats: true,
          publications: true
        },
        orderBy: { lastModified: 'desc' }
      });

      // Prisma 결과를 Project 타입으로 변환
      const convertedProjects: Project[] = projects.map(mapPrismaProjectToDomain);

      Logger.info('PROJECT_CRUD_IPC', `✅ 조회된 프로젝트 수: ${convertedProjects.length}`);

      return {
        success: true,
        data: convertedProjects,
        timestamp: new Date(),
      };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', 'Failed to get projects from database', error);

      return {
        success: true,
        data: [],
        timestamp: new Date(),
      };
    }
  });

  // 프로젝트 ID로 조회 - 🔥 성능 최적화
  ipcMain.handle('projects:get-by-id', async (_event: IpcMainInvokeEvent, id: string): Promise<IpcResponse<Project>> => {
    try {
      Logger.debug('PROJECT_CRUD_IPC', 'Getting project by ID', { id });

      const prisma = await prismaService.getClient();

      // 🔥 디버깅: 요청된 ID 상세 로그
      Logger.info('PROJECT_CRUD_IPC', `🔍 실제 요청된 프로젝트 ID: "${id}" (길이: ${id.length})`);

      // 🔥 N+1 쿼리 최적화: include로 관련 데이터 한 번에 로드
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          episodes: {
            select: { 
              id: true, 
              title: true, 
              wordCount: true, 
              episodeNumber: true,
              status: true,
              createdAt: true,
              updatedAt: true
            }
          },
          characters: true,
          structure: true,
          notes: true,
          writerStats: true,
          publications: true
        }
      });

      // 🔥 디버깅: 조회 결과 로그
      Logger.info('PROJECT_CRUD_IPC', `🔍 DB 조회 결과: ${project ? '찾음' : '없음'}`, {
        requestedId: id,
        found: !!project,
        projectTitle: project?.title
      });

      if (!project) {
        // 🔥 'new' ID 처리 - 새 프로젝트 템플릿 반환
        if (id === 'new') {
          const now = new Date();
          const newProjectTemplate: Project = {
            id: 'new',
            title: '새로운 프로젝트',
            description: '새로운 이야기를 시작해보세요',
            content: '',
            chapters: '{}', // 🔥 빈 chapters 추가
            progress: 0,
            wordCount: 0,
            genre: 'unknown',
            status: 'active',
            author: '사용자',
            createdAt: now,
            lastModified: now,
            updatedAt: now,
          };

          Logger.info('PROJECT_CRUD_IPC', 'new 프로젝트 템플릿 반환');
          return {
            success: true,
            data: newProjectTemplate,
            timestamp: new Date(),
          };
        }

        return {
          success: false,
          error: '프로젝트를 찾을 수 없습니다.',
          timestamp: new Date(),
        };
      }

      const convertedProject: Project = mapPrismaProjectToDomain(project);

      return {
        success: true,
        data: convertedProject,
        timestamp: new Date(),
      };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', 'Failed to get project by ID', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  });

  // 🔥 실제 프로젝트 생성 - Prisma DB 연동
  ipcMain.handle('projects:create', async (_event: IpcMainInvokeEvent, project: Omit<Project, 'id' | 'createdAt' | 'lastModified'>): Promise<IpcResponse<Project>> => {
    try {
      Logger.info('PROJECT_CRUD_IPC', '🔥 Creating new project in DB', {
        title: project.title,
        genre: project.genre,
      });

      // 🔒 V4 단계 0: 속도 제한 (Rate Limiting) 검증
      const rateLimitKey = 'projects:create';
      const limiter = channelLimiters[rateLimitKey] || globalRateLimiter;
      const limitResult = limiter.checkLimit(rateLimitKey);
      if (!limitResult.allowed) {
        Logger.warn('PROJECT_CRUD_IPC', '⚠️ V4 Rate limit exceeded for projects:create', {
          retryAfterMs: limitResult.retryAfter,
          requestCount: limitResult.requestCount,
        });
        return {
          success: false,
          error: `프로젝트 생성 요청이 너무 많습니다. ${Math.ceil(limitResult.retryAfter / 1000)}초 후 다시 시도해주세요.`,
          timestamp: new Date(),
        };
      }
      Logger.debug('PROJECT_CRUD_IPC', '✅ V4 Rate limit check passed', {
        remaining: limitResult.remaining,
      });

      // 🔒 V3 단계 1: Zod 검증을 통한 입력값 검증
      let validatedProject: any;
      try {
        validatedProject = await ProjectCreateSchema.parseAsync(project);
        Logger.debug('PROJECT_CRUD_IPC', '✅ V3 Zod validation passed', { title: validatedProject.title });
      } catch (zodError: any) {
        const errorMessage = zodError.issues?.[0]?.message || '입력값 검증 실패';
        Logger.error('PROJECT_CRUD_IPC', '❌ V3 Zod validation failed', zodError);
        
        // 🔒 의심스러운 입력 패턴 감지
        if (detectSuspiciousInput(JSON.stringify(project))) {
          Logger.warn('PROJECT_CRUD_IPC', '⚠️ Suspicious input pattern detected', {
            title: project.title,
            genre: project.genre
          });
        }
        
        throw new Error(`입력값 검증 실패: ${errorMessage}`);
      }

      // 🔒 V3 단계 2: 비즈니스 로직 검증
      if (!validatedProject.title || validatedProject.title.trim().length === 0) {
        throw new Error('프로젝트 제목은 필수입니다.');
      }

      // Delegate DB create logic to ProjectService
      const created = await projectService.createProject(validatedProject);
      if (!created.success) throw new Error(created.error || 'Failed to create project');

      const createdProject = created.data as any;
      const newProject: Project = {
        id: createdProject.id,
        title: createdProject.title,
        description: createdProject.description || '',
        content: createdProject.content || '',
        progress: createdProject.progress || 0,
        wordCount: createdProject.wordCount || 0,
        genre: createdProject.genre || 'unknown',
        status: createdProject.status || 'active',
        author: createdProject.author || '사용자',
        createdAt: createdProject.createdAt,
        lastModified: createdProject.lastModified,
        updatedAt: createdProject.lastModified,
      };

      Logger.info('PROJECT_CRUD_IPC', '✅ Project created successfully in DB', { id: newProject.id, title: newProject.title, wordCount: newProject.wordCount });

      return { success: true, data: newProject, timestamp: new Date() };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', '❌ Failed to create project in DB', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  });

  // 🔥 프로젝트 업데이트 - 성능 최적화 (즉시 저장)
  ipcMain.handle('projects:update', async (_event: IpcMainInvokeEvent, id: string, updates: Partial<Project>): Promise<IpcResponse<Project>> => {
    try {
      Logger.debug('PROJECT_CRUD_IPC', '🚀 즉시 프로젝트 업데이트 시작', { id, contentLength: updates.content?.length });

      // 🔒 V4 단계 0: 속도 제한 (Rate Limiting) 검증
      const rateLimitKey = 'projects:update';
      const limiter = channelLimiters[rateLimitKey] || globalRateLimiter;
      const limitResult = limiter.checkLimit(rateLimitKey);
      if (!limitResult.allowed) {
        Logger.warn('PROJECT_CRUD_IPC', '⚠️ V4 Rate limit exceeded for projects:update', {
          retryAfterMs: limitResult.retryAfter,
          requestCount: limitResult.requestCount,
        });
        return {
          success: false,
          error: `프로젝트 업데이트 요청이 너무 많습니다. ${Math.ceil(limitResult.retryAfter / 1000)}초 후 다시 시도해주세요.`,
          timestamp: new Date(),
        };
      }
      Logger.debug('PROJECT_CRUD_IPC', '✅ V4 Rate limit check passed', {
        remaining: limitResult.remaining,
      });

      // 🔒 V3 단계 1: Zod 검증을 통한 입력값 검증 (update는 partial)
      let validatedUpdates: any;
      try {
        validatedUpdates = await ProjectUpdateSchema.parseAsync(updates);
        Logger.debug('PROJECT_CRUD_IPC', '✅ V3 Zod update validation passed', { hasTitle: !!validatedUpdates.title });
      } catch (zodError: any) {
        const errorMessage = zodError.issues?.[0]?.message || '입력값 검증 실패';
        Logger.error('PROJECT_CRUD_IPC', '❌ V3 Zod update validation failed', zodError);
        
        // 🔒 의심스러운 입력 패턴 감지
        if (detectSuspiciousInput(JSON.stringify(updates))) {
          Logger.warn('PROJECT_CRUD_IPC', '⚠️ Suspicious update pattern detected', {
            hasGenre: 'genre' in updates,
            hasStatus: 'status' in updates
          });
        }
        
        throw new Error(`입력값 검증 실패: ${errorMessage}`);
      }

      // delegate DB update to ProjectService
      // const prisma = await prismaService.getClient();

      const updateData: Partial<{
        title: string;
        description: string;
        content: string;
        chapters: string; // 🔥 chapters 필드 추가
        progress: number;
        wordCount: number;
        genre: string;
        status: string;
        author: string;
        lastModified: Date;
      }> = {
        lastModified: new Date(),
      };

      if (validatedUpdates.title) updateData.title = validatedUpdates.title.trim();
      if (validatedUpdates.description !== undefined) updateData.description = validatedUpdates.description;
      if (validatedUpdates.content !== undefined) {
        updateData.content = validatedUpdates.content;
        updateData.wordCount = validatedUpdates.content.split(/\s+/).filter((w: string) => w.length > 0).length;
      }
      if (validatedUpdates.chapters !== undefined) updateData.chapters = validatedUpdates.chapters; // 🔥 chapters 업데이트 로직 추가
      if (validatedUpdates.progress !== undefined) updateData.progress = validatedUpdates.progress;
      if (validatedUpdates.genre) updateData.genre = validatedUpdates.genre;
      if (validatedUpdates.status) updateData.status = validatedUpdates.status;
      if (validatedUpdates.author) updateData.author = validatedUpdates.author;

      // 🔥 디버깅 로그: 저장할 데이터 확인
      Logger.debug('PROJECT_CRUD_IPC', 'Backend about to save updateData', {
        hasChapters: !!updateData.chapters,
        chaptersLength: updateData.chapters?.length,
        chaptersPreview: updateData.chapters?.substring(0, 100)
      });

      const updateResult = await projectService.updateProject(id, validatedUpdates);
      if (!updateResult.success) throw new Error(updateResult.error || 'Failed to update project');

      const updatedProject = updateResult.data as any;

      const convertedProject: Project = mapPrismaProjectToDomain(updatedProject);

      Logger.info('PROJECT_CRUD_IPC', '✅ 프로젝트 업데이트 완료', {
        id: convertedProject.id,
        wordCount: convertedProject.wordCount,
        hasChapters: !!convertedProject.chapters,
        chaptersLength: convertedProject.chapters?.length,
        duration: `${Date.now() - Date.now()}ms`
      });

      return {
        success: true,
        data: convertedProject,
        timestamp: new Date(),
      };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', '❌ 프로젝트 업데이트 실패', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  });

  // 프로젝트 삭제
  ipcMain.handle('projects:delete', async (_event: IpcMainInvokeEvent, id: string): Promise<IpcResponse<boolean>> => {
    try {
      Logger.debug('PROJECT_CRUD_IPC', 'Deleting project from DB', { id });

      const result = await projectService.deleteProject(id);

      if (!result.success) throw new Error(result.error || 'Failed to delete project');

      Logger.info('PROJECT_CRUD_IPC', '✅ Project deleted successfully', { id });

      // result.data is boolean

      return {
        success: true,
        data: result.data,
        timestamp: new Date(),
      };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', 'Failed to delete project', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  });

  // 🔥 기가차드 샘플 프로젝트 생성
  ipcMain.handle('projects:create-sample', async (): Promise<IpcResponse<Project>> => {
    try {
      const created = await sampleProjectService.createSampleProject();
      if (!created.success) {
        return { success: false, error: created.error || 'Failed to create sample', timestamp: new Date() };
      }

      Logger.info('PROJECT_CRUD_IPC', `샘플 프로젝트 생성됨: ${created.data?.title}`, { genre: created.data?.genre, wordCount: created.data?.wordCount });
      return { success: true, data: created.data as Project, timestamp: new Date() };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', 'Failed to create sample project', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  });

  // 🔥 기가차드 프로젝트 파일 가져오기 (텍스트 파일 지원)
  ipcMain.handle('projects:import-file', async (): Promise<IpcResponse<Project>> => {
    try {
      Logger.debug('PROJECT_CRUD_IPC', 'Starting file import process');

      const { dialog } = require('electron');
      const fs = require('fs').promises;
      const path = require('path');

      // 파일 선택 다이얼로그 열기
      const dialogResult = await dialog.showOpenDialog({
        title: 'Loop 프로젝트로 가져올 파일 선택',
        filters: [
          { name: '텍스트 파일', extensions: ['txt', 'md', 'rtf'] },
          { name: 'Markdown 파일', extensions: ['md', 'markdown'] },
          { name: '모든 파일', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (dialogResult.canceled || !dialogResult.filePaths.length) {
        return {
          success: false,
          error: '파일이 선택되지 않았습니다.',
          timestamp: new Date(),
        };
      }

      const filePath = dialogResult.filePaths[0];
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath, path.extname(filePath));
      const fileExtension = path.extname(filePath).toLowerCase();

      // 파일 내용 분석
      const wordCount = fileContent.split(/\s+/).filter((word: string) => word.length > 0).length;

      // 장르 추정 (파일 확장자 기반)
      let estimatedGenre = '일반';
      if (fileExtension === '.md' || fileExtension === '.markdown') {
        estimatedGenre = '기술문서';
      } else if (fileName.includes('소설') || fileName.includes('novel')) {
        estimatedGenre = '소설';
      } else if (fileName.includes('블로그') || fileName.includes('blog')) {
        estimatedGenre = '블로그';
      }

      const importResult = await projectImportService.importFromFile(filePath);
      if (!importResult.success) {
        return { success: false, error: importResult.error || 'Import failed', timestamp: new Date() };
      }

      Logger.info('PROJECT_CRUD_IPC', `파일 가져오기 완료: ${fileName}`, { filePath, wordCount, genre: importResult.data?.genre });
      return { success: true, data: importResult.data as Project, timestamp: new Date() };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', 'Failed to import project file', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '파일 가져오기 중 오류가 발생했습니다.',
        timestamp: new Date(),
      };
    }
  });

  Logger.info('PROJECT_CRUD_IPC', '✅ Project CRUD IPC handlers registered');
}
