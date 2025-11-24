import { Logger } from '../../../shared/logger';
import { createSuccess, createError } from '../../../shared/common';
import { prismaService } from './PrismaService';

/**
 * Project persistence and read helpers extracted from DatabaseService.
 * Keeps project-related DB logic isolated and easier to test.
 */
export class ProjectService {
  private static instance: ProjectService | null = null;

  public static getInstance(): ProjectService {
    if (!ProjectService.instance) ProjectService.instance = new ProjectService();
    return ProjectService.instance;
  }

  private constructor() {}

  public async getProjectsData() {
    try {
      const client = await prismaService.getClient();

      Logger.debug('PROJECT_SVC', 'Getting projects data');

      const projects = await client.project.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          genre: true,
          status: true,
          progress: true,
          wordCount: true,
          author: true,
          createdAt: true,
          lastModified: true,
        },
        orderBy: { lastModified: 'desc' },
      });

      return createSuccess(projects);
    } catch (err) {
      Logger.error('PROJECT_SVC', 'Failed to get projects', err);
      return createError(err instanceof Error ? err.message : 'Failed to get projects');
    }
  }

  public async getCharactersData() {
    try {
      const client = await prismaService.getClient();

      Logger.debug('PROJECT_SVC', 'Getting characters data');

      const characters = await client.projectCharacter.findMany({
        select: {
          id: true,
          name: true,
          role: true,
          description: true,
          personality: true,
          background: true,
          avatar: true,
          color: true,
          createdAt: true,
          project: { select: { title: true, genre: true } },
        },
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      return createSuccess(characters);
    } catch (err) {
      Logger.error('PROJECT_SVC', 'Failed to get characters', err);
      return createError(err instanceof Error ? err.message : 'Failed to get characters');
    }
  }
}

export const projectService = ProjectService.getInstance();
