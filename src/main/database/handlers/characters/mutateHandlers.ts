import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse, ProjectCharacter } from '../../../../shared/types';
import { prismaService } from '../../services/PrismaService';
import { databaseMutex } from '../../services/DatabaseMutexService';

export function registerCharacterMutateHandlers(): void {
  Logger.debug('CHARACTER_IPC', 'Registering character mutate handlers');

  // 캐릭터 생성/업데이트
  ipcMain.handle('projects:upsert-character', async (_event: IpcMainInvokeEvent, character: Partial<ProjectCharacter>): Promise<IpcResponse<ProjectCharacter>> => {
    try {
      const rateLimitKey = 'projects:upsert-character';
      // NOTE: RateLimiter is applied at a higher level where needed

      const upsertedCharacter = await databaseMutex.acquireWriteLock(async () => {
        const prisma = await prismaService.getClient();

        return await prisma.projectCharacter.upsert({
          where: { id: character.id || '' },
          update: {
            name: character.name,
            role: character.role,
            description: character.description,
            notes: character.notes,
            appearance: character.appearance,
            personality: character.personality,
            background: character.background,
            goals: character.goals,
            conflicts: character.conflicts,
            avatar: character.avatar,
            color: character.color,
            sortOrder: character.sortOrder,
            isActive: character.isActive,
            updatedAt: new Date(),
          },
          create: {
            id: character.id || '',
            projectId: character.projectId || '',
            name: character.name || '',
            role: character.role || '',
            description: character.description,
            notes: character.notes,
            appearance: character.appearance,
            personality: character.personality,
            background: character.background,
            goals: character.goals,
            conflicts: character.conflicts,
            avatar: character.avatar,
            color: character.color,
            sortOrder: character.sortOrder || 0,
            isActive: character.isActive ?? true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      });

      const convertedCharacter: ProjectCharacter = {
        id: upsertedCharacter.id,
        projectId: upsertedCharacter.projectId,
        name: upsertedCharacter.name,
        role: upsertedCharacter.role,
        description: upsertedCharacter.description || undefined,
        notes: upsertedCharacter.notes || undefined,
        appearance: upsertedCharacter.appearance || undefined,
        personality: upsertedCharacter.personality || undefined,
        background: upsertedCharacter.background || undefined,
        goals: upsertedCharacter.goals || undefined,
        conflicts: upsertedCharacter.conflicts || undefined,
        avatar: upsertedCharacter.avatar || undefined,
        color: upsertedCharacter.color || undefined,
        sortOrder: upsertedCharacter.sortOrder || 0,
        isActive: upsertedCharacter.isActive || true,
        createdAt: upsertedCharacter.createdAt,
        updatedAt: upsertedCharacter.updatedAt,
      };

      Logger.info('CHARACTER_IPC', '✅ Character upserted successfully', { id: convertedCharacter.id });

      return { success: true, data: convertedCharacter, timestamp: new Date() };
    } catch (error) {
      Logger.error('CHARACTER_IPC', 'Failed to upsert character', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  });

  // 캐릭터 삭제
  ipcMain.handle('projects:delete-character', async (_event: IpcMainInvokeEvent, characterId: string): Promise<IpcResponse<boolean>> => {
    try {
      const result = await databaseMutex.acquireWriteLock(async () => {
        const prisma = await prismaService.getClient();
        await prisma.projectCharacter.delete({ where: { id: characterId } });
        return true;
      });

      Logger.info('CHARACTER_IPC', '✅ Character deleted successfully', { characterId });
      return { success: true, data: result, timestamp: new Date() };
    } catch (error) {
      Logger.error('CHARACTER_IPC', 'Failed to delete character', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  });

  // 캐릭터 일괄 업데이트
  ipcMain.handle('projects:update-characters', async (_event: IpcMainInvokeEvent, projectId: string, characters: ProjectCharacter[]): Promise<IpcResponse<ProjectCharacter[]>> => {
    try {
      Logger.debug('CHARACTER_IPC', 'Updating project characters', { projectId, count: characters.length });

      const convertedCharacters = await databaseMutex.acquireWriteLock(async () => {
        const prisma = await prismaService.getClient();

        return await prisma.$transaction(async (tx: any) => {
          await tx.projectCharacter.deleteMany({ where: { projectId } });

          const createdCharacters: any[] = [];
          for (const character of characters) {
            const created = await tx.projectCharacter.create({ data: {
              id: character.id,
              projectId: character.projectId,
              name: character.name || '',
              role: character.role || '',
              description: character.description,
              notes: character.notes || '',
              appearance: character.appearance,
              personality: character.personality,
              background: character.background,
              goals: character.goals,
              conflicts: character.conflicts,
              avatar: character.avatar,
              color: character.color,
              sortOrder: character.sortOrder || 0,
              isActive: character.isActive ?? true,
              createdAt: character.createdAt || new Date(),
              updatedAt: new Date(),
            }});
            createdCharacters.push(created);
          }

          return createdCharacters.map(char => ({
            id: char.id,
            projectId: char.projectId,
            name: char.name,
            role: char.role || '',
            description: char.description || undefined,
            notes: char.notes || undefined,
            appearance: char.appearance || undefined,
            personality: char.personality || undefined,
            background: char.background || undefined,
            goals: char.goals || undefined,
            conflicts: char.conflicts || undefined,
            avatar: char.avatar || undefined,
            color: char.color || undefined,
            sortOrder: char.sortOrder || 0,
            isActive: typeof char.isActive === 'boolean' ? char.isActive : true,
            createdAt: char.createdAt,
            updatedAt: char.updatedAt,
          }));
        });
      });

      Logger.info('CHARACTER_IPC', `✅ Characters updated successfully`, { count: convertedCharacters.length });
      return { success: true, data: convertedCharacters, timestamp: new Date() };
    } catch (error) {
      Logger.error('CHARACTER_IPC', 'Failed to update characters', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  });

  Logger.info('CHARACTER_IPC', '✅ Character mutate handlers registered');
}
