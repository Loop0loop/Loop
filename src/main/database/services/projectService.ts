import { Logger } from '../../../shared/logger';
import { createSuccess, createError } from '../../../shared/common';
import { prismaService } from './PrismaService';
import { databaseMutex } from './DatabaseMutexService';

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

  public async getProjectById(id: string) {
    try {
      const client = await prismaService.getClient();
      const project = await client.project.findUnique({
        where: { id },
        include: {
          episodes: true,
          characters: true,
          structure: true,
          notes: true,
          writerStats: true,
          publications: true,
        },
      });

      return createSuccess(project);
    } catch (err) {
      Logger.error('PROJECT_SVC', 'Failed to get project by id', err);
      return createError(err instanceof Error ? err.message : 'Failed to get project');
    }
  }

  public async createProject(validatedProject: any) {
    try {
      const client = await prismaService.getClient();
      const result = await databaseMutex.acquireWriteLock(async () => {
        const now = new Date();
        return await client.$transaction(async (tx: any) => {
          const project = await tx.project.create({
            data: {
              title: validatedProject.title.trim(),
              description: validatedProject.description?.trim() || '새로운 프로젝트입니다.',
              content: validatedProject.content || '',
              progress: 0,
              wordCount: validatedProject.content ? validatedProject.content.split(/\s+/).filter((w: string) => w.length > 0).length : 0,
              genre: validatedProject.genre || 'unknown',
              status: validatedProject.status || 'active',
              author: validatedProject.author || '사용자',
              createdAt: now,
              lastModified: now,
            }
          });

          try {
            await tx.projectCharacter.create({
              data: {
                id: `char_${project.id}_main`,
                projectId: project.id,
                name: '주인공',
                role: 'protagonist',
                description: '프로젝트의 주요 캐릭터입니다.',
                isActive: true,
                createdAt: now,
                updatedAt: now,
              }
            });
          } catch (charErr) {
            Logger.warn('PROJECT_SVC', 'Failed to create default character', { err: charErr });
          }

          return project;
        });
      });

      return createSuccess(result);
    } catch (err) {
      Logger.error('PROJECT_SVC', 'Failed to create project', err);
      return createError(err instanceof Error ? err.message : 'Failed to create project');
    }
  }

  public async updateProject(id: string, validatedUpdates: any) {
    try {
      const client = await prismaService.getClient();

      const updateData: any = { lastModified: new Date() };
      if (validatedUpdates.title) updateData.title = validatedUpdates.title.trim();
      if (validatedUpdates.description !== undefined) updateData.description = validatedUpdates.description;
      if (validatedUpdates.content !== undefined) {
        updateData.content = validatedUpdates.content;
        updateData.wordCount = validatedUpdates.content.split(/\s+/).filter((w: string) => w.length > 0).length;
      }
      if (validatedUpdates.chapters !== undefined) updateData.chapters = validatedUpdates.chapters;
      if (validatedUpdates.progress !== undefined) updateData.progress = validatedUpdates.progress;
      if (validatedUpdates.genre) updateData.genre = validatedUpdates.genre;
      if (validatedUpdates.status) updateData.status = validatedUpdates.status;
      if (validatedUpdates.author) updateData.author = validatedUpdates.author;

      const updated = await databaseMutex.acquireWriteLock(async () => {
        return await client.project.update({ where: { id }, data: updateData });
      });

      return createSuccess(updated);
    } catch (err) {
      Logger.error('PROJECT_SVC', 'Failed to update project', err);
      return createError(err instanceof Error ? err.message : 'Failed to update project');
    }
  }

  public async deleteProject(id: string) {
    try {
      const client = await prismaService.getClient();
      await databaseMutex.acquireWriteLock(async () => {
        await client.project.delete({ where: { id } });
      });
      return createSuccess(true);
    } catch (err) {
      Logger.error('PROJECT_SVC', 'Failed to delete project', err);
      return createError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  }

  // ---------- Bulk save / relations helpers (was in PrismaService) ----------
  // Save a project together with characters, structure and notes in a single transaction
  public async saveProjectWithRelations(
    projectData: {
      project: any;
      characters?: any[];
      structure?: any[];
      notes?: any[];
    }
  ) {
    try {
      const client = await prismaService.getClient();

      await databaseMutex.acquireWriteLock(async () => {
        await client.$transaction(async (tx: any) => {
          Logger.debug('PROJECT_SVC', 'Starting project save transaction', {
            projectId: projectData.project.id,
            charactersCount: projectData.characters?.length || 0,
            structureCount: projectData.structure?.length || 0,
            notesCount: projectData.notes?.length || 0,
          });

          // project upsert
          const project = await tx.project.upsert({
            where: { id: projectData.project.id },
            update: {
              title: projectData.project.title,
              content: projectData.project.content,
              wordCount: projectData.project.wordCount || 0,
              progress: projectData.project.progress || 0,
              lastModified: new Date(),
            },
            create: {
              id: projectData.project.id,
              title: projectData.project.title,
              content: projectData.project.content ?? null,
              wordCount: projectData.project.wordCount ?? 0,
              progress: projectData.project.progress ?? 0,
              lastModified: projectData.project.lastModified ? new Date(projectData.project.lastModified) : new Date(),
            } as any,
          });

          // characters
          if (projectData.characters && projectData.characters.length > 0) {
            for (const character of projectData.characters) {
              await tx.projectCharacter.upsert({
                where: { id: character.id },
                update: {
                  name: character.name,
                  description: character.description ?? null,
                  role: character.role ?? '',
                } as any,
                create: {
                  id: character.id,
                  name: character.name,
                  description: character.description ?? null,
                  role: character.role ?? '',
                  projectId: project.id,
                } as any,
              });
            }
          }

          // structure
          if (projectData.structure && projectData.structure.length > 0) {
            for (const structureItem of projectData.structure) {
              await tx.projectStructure.upsert({
                where: { id: structureItem.id },
                update: {
                  title: structureItem.title,
                  content: structureItem.content ?? null,
                  description: structureItem.description ?? null,
                  status: (structureItem as any).status ?? 'draft',
                } as any,
                create: {
                  id: structureItem.id,
                  projectId: project.id,
                  type: structureItem.type,
                  title: structureItem.title,
                  description: structureItem.description ?? null,
                  content: structureItem.content ?? null,
                  status: (structureItem as any).status ?? 'draft',
                  wordCount: (structureItem as any).wordCount ?? 0,
                  sortOrder: (structureItem as any).sortOrder ?? 0,
                  parentId: (structureItem as any).parentId ?? null,
                } as any,
              });
            }
          }

          // notes
          if (projectData.notes && projectData.notes.length > 0) {
            for (const note of projectData.notes) {
              await tx.projectNote.upsert({
                where: { id: note.id },
                update: {
                  title: note.title,
                  content: note.content ?? '',
                  type: (note as any).type ?? 'note',
                  tags: (note as any).tags ?? null,
                } as any,
                create: {
                  id: note.id,
                  projectId: project.id,
                  title: note.title,
                  content: note.content ?? '',
                  type: (note as any).type ?? 'note',
                  tags: (note as any).tags ?? null,
                } as any,
              });
            }
          }
        });
      });

      Logger.info('PROJECT_SVC', '✅ Project saved with all relations successfully');
      return createSuccess(true);
    } catch (err) {
      Logger.error('PROJECT_SVC', 'Failed to save project with relations', err);
      return createError(err instanceof Error ? err.message : 'Failed to save project relations');
    }
  }

  // debounced/force save mechanism for real-time persistence
  private saveQueue = new Map<string, NodeJS.Timeout>();

  public async debouncedSave(projectId: string, saveFunction: () => Promise<void>, delay = 1000) {
    if (!projectId || typeof projectId !== 'string') throw new Error('Valid projectId is required');
    if (!saveFunction || typeof saveFunction !== 'function') throw new Error('Valid saveFunction is required');
    if (!Number.isInteger(delay) || delay < 0) throw new Error('Delay must be non-negative integer');

    const existing = this.saveQueue.get(projectId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      try {
        await saveFunction();
      } catch (error) {
        Logger.error('PROJECT_SVC', 'Debounced save failed', error);
      } finally {
        this.saveQueue.delete(projectId);
      }
    }, delay);

    this.saveQueue.set(projectId, timer);
  }

  public async forceSave(projectId: string, saveFunction: () => Promise<void>) {
    if (!projectId || typeof projectId !== 'string') throw new Error('Valid projectId is required');
    if (!saveFunction || typeof saveFunction !== 'function') throw new Error('Valid saveFunction is required');

    const existing = this.saveQueue.get(projectId);
    if (existing) {
      clearTimeout(existing);
      this.saveQueue.delete(projectId);
    }

    try {
      await saveFunction();
      Logger.info('PROJECT_SVC', 'Force save completed', { projectId });
    } catch (err) {
      Logger.error('PROJECT_SVC', 'Force save failed', err);
      throw err;
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
