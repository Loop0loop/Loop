import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse, Project } from '../../../../shared/types';
import { prismaService } from '../../services/PrismaService';
import { projectService } from '../../services/projectService';
import { ProjectCreateSchema, ProjectUpdateSchema, detectSuspiciousInput } from '../../../../shared/validation/projectValidation';
import { globalRateLimiter, channelLimiters } from '../../../services/RateLimiterService';
import { mapPrismaProjectToDomain } from '../../mappers/projectMapper';

/**
 * Register mutating project handlers (create/update/delete)
 */
export function registerProjectMutateHandlers(): void {
  Logger.debug('PROJECT_CRUD_IPC', 'Registering mutate handlers for projects');

  ipcMain.handle('projects:create', async (_event: IpcMainInvokeEvent, project: Omit<Project, 'id' | 'createdAt' | 'lastModified'>): Promise<IpcResponse<Project>> => {
    try {
      Logger.info('PROJECT_CRUD_IPC', '🔥 Creating new project in DB', { title: project.title, genre: project.genre });

      const rateLimitKey = 'projects:create';
      const limiter = channelLimiters[rateLimitKey] || globalRateLimiter;
      const limitResult = limiter.checkLimit(rateLimitKey);
      if (!limitResult.allowed) return { success: false, error: `프로젝트 생성 요청이 너무 많습니다. ${Math.ceil(limitResult.retryAfter/1000)}초 후 다시 시도해주세요.`, timestamp: new Date() };

      let validatedProject: any;
      try {
        validatedProject = await ProjectCreateSchema.parseAsync(project);
        Logger.debug('PROJECT_CRUD_IPC', '✅ V3 Zod validation passed', { title: validatedProject.title });
      } catch (zodError: any) {
        const errorMessage = zodError.issues?.[0]?.message || '입력값 검증 실패';
        Logger.error('PROJECT_CRUD_IPC', '❌ V3 Zod validation failed', zodError);
        if (detectSuspiciousInput(JSON.stringify(project))) Logger.warn('PROJECT_CRUD_IPC', '⚠️ Suspicious input pattern detected', { title: project.title, genre: project.genre });
        throw new Error(`입력값 검증 실패: ${errorMessage}`);
      }

      if (!validatedProject.title || validatedProject.title.trim().length === 0) throw new Error('프로젝트 제목은 필수입니다.');

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
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  });

  ipcMain.handle('projects:update', async (_event: IpcMainInvokeEvent, id: string, updates: Partial<Project>): Promise<IpcResponse<Project>> => {
    try {
      Logger.debug('PROJECT_CRUD_IPC', '🚀 즉시 프로젝트 업데이트 시작', { id, contentLength: updates.content?.length });

      const rateLimitKey = 'projects:update';
      const limiter = channelLimiters[rateLimitKey] || globalRateLimiter;
      const limitResult = limiter.checkLimit(rateLimitKey);
      if (!limitResult.allowed) return { success: false, error: `프로젝트 업데이트 요청이 너무 많습니다. ${Math.ceil(limitResult.retryAfter/1000)}초 후 다시 시도해주세요.`, timestamp: new Date() };

      let validatedUpdates: any;
      try {
        validatedUpdates = await ProjectUpdateSchema.parseAsync(updates);
        Logger.debug('PROJECT_CRUD_IPC', '✅ V3 Zod update validation passed', { hasTitle: !!validatedUpdates.title });
      } catch (zodError: any) {
        const errorMessage = zodError.issues?.[0]?.message || '입력값 검증 실패';
        Logger.error('PROJECT_CRUD_IPC', '❌ V3 Zod update validation failed', zodError);
        if (detectSuspiciousInput(JSON.stringify(updates))) Logger.warn('PROJECT_CRUD_IPC', '⚠️ Suspicious update pattern detected', { hasGenre: 'genre' in updates, hasStatus: 'status' in updates });
        throw new Error(`입력값 검증 실패: ${errorMessage}`);
      }

      const updateResult = await projectService.updateProject(id, validatedUpdates);
      if (!updateResult.success) throw new Error(updateResult.error || 'Failed to update project');

      const updatedProject = updateResult.data as any;
      const convertedProject: Project = mapPrismaProjectToDomain(updatedProject);

      Logger.info('PROJECT_CRUD_IPC', '✅ 프로젝트 업데이트 완료', { id: convertedProject.id, wordCount: convertedProject.wordCount });

      return { success: true, data: convertedProject, timestamp: new Date() };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', '❌ 프로젝트 업데이트 실패', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  });

  ipcMain.handle('projects:delete', async (_event: IpcMainInvokeEvent, id: string): Promise<IpcResponse<boolean>> => {
    try {
      Logger.debug('PROJECT_CRUD_IPC', 'Deleting project from DB', { id });
      const result = await projectService.deleteProject(id);
      if (!result.success) throw new Error(result.error || 'Failed to delete project');
      Logger.info('PROJECT_CRUD_IPC', '✅ Project deleted successfully', { id });
      return { success: true, data: result.data, timestamp: new Date() };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', 'Failed to delete project', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  });

  Logger.info('PROJECT_CRUD_IPC', '✅ Project mutate handlers registered');
}
