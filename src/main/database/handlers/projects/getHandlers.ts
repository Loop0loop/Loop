import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse, Project } from '../../../../shared/types';
import { prismaService } from '../../services/PrismaService';
import { mapPrismaProjectToDomain } from '../../mappers/projectMapper';

/**
 * Register read-only project handlers (queries)
 */
export function registerProjectQueryHandlers(): void {
  Logger.debug('PROJECT_CRUD_IPC', 'Registering query handlers for projects');

  ipcMain.handle('projects:get-all', async (): Promise<IpcResponse<Project[]>> => {
    try {
      Logger.debug('PROJECT_CRUD_IPC', 'Getting all projects from database');
      const prisma = await prismaService.getClient();

      const projects = await prisma.project.findMany({
        include: {
          episodes: { select: { id: true, title: true, wordCount: true, episodeNumber: true, status: true, createdAt: true, updatedAt: true } },
          characters: true,
          structure: true,
          notes: true,
          writerStats: true,
          publications: true,
        },
        orderBy: { lastModified: 'desc' }
      });

      const convertedProjects: Project[] = projects.map(mapPrismaProjectToDomain);
      Logger.info('PROJECT_CRUD_IPC', `✅ 조회된 프로젝트 수: ${convertedProjects.length}`);

      return { success: true, data: convertedProjects, timestamp: new Date() };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', 'Failed to get projects from database', error);
      return { success: true, data: [], timestamp: new Date() };
    }
  });

  ipcMain.handle('projects:get-by-id', async (_event: IpcMainInvokeEvent, id: string): Promise<IpcResponse<Project>> => {
    try {
      Logger.debug('PROJECT_CRUD_IPC', 'Getting project by ID', { id });
      const prisma = await prismaService.getClient();

      Logger.info('PROJECT_CRUD_IPC', `🔍 실제 요청된 프로젝트 ID: "${id}" (길이: ${id.length})`);

      const project = await prisma.project.findUnique({
        where: { id },
        include: { episodes: { select: { id: true, title: true, wordCount: true, episodeNumber: true, status: true, createdAt: true, updatedAt: true } }, characters: true, structure: true, notes: true, writerStats: true, publications: true }
      });

      Logger.info('PROJECT_CRUD_IPC', `🔍 DB 조회 결과: ${project ? '찾음' : '없음'}`, { requestedId: id, found: !!project, projectTitle: project?.title });

      if (!project) {
        if (id === 'new') {
          const now = new Date();
          const newProjectTemplate: Project = {
            id: 'new', title: '새로운 프로젝트', description: '새로운 이야기를 시작해보세요', content: '', chapters: '{}', progress: 0, wordCount: 0, genre: 'unknown', status: 'active', author: '사용자', createdAt: now, lastModified: now, updatedAt: now,
          };

          Logger.info('PROJECT_CRUD_IPC', 'new 프로젝트 템플릿 반환');
          return { success: true, data: newProjectTemplate, timestamp: new Date() };
        }

        return { success: false, error: '프로젝트를 찾을 수 없습니다.', timestamp: new Date() };
      }

      const convertedProject: Project = mapPrismaProjectToDomain(project);

      return { success: true, data: convertedProject, timestamp: new Date() };
    } catch (error) {
      Logger.error('PROJECT_CRUD_IPC', 'Failed to get project by ID', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  });

  Logger.info('PROJECT_CRUD_IPC', '✅ Project query handlers registered');
}
