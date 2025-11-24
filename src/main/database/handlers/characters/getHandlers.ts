import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse, ProjectCharacter } from '../../../../shared/types';
import { prismaService } from '../../services/PrismaService';

export function registerCharacterQueryHandlers(): void {
  Logger.debug('CHARACTER_IPC', 'Registering character query handlers');

  ipcMain.handle('projects:get-characters', async (_event: IpcMainInvokeEvent, projectId: string): Promise<IpcResponse<ProjectCharacter[]>> => {
    try {
      Logger.debug('CHARACTER_IPC', 'Getting project characters', { projectId });

      const prisma = await prismaService.getClient();
      const characters = await prisma.projectCharacter.findMany({ where: { projectId }, orderBy: { sortOrder: 'asc' } });

      const convertedCharacters: ProjectCharacter[] = characters.map((char: any) => ({
        id: char.id,
        projectId: char.projectId,
        name: char.name,
        role: char.role,
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
        isActive: char.isActive || true,
        createdAt: char.createdAt,
        updatedAt: char.updatedAt,
      }));

      return { success: true, data: convertedCharacters, timestamp: new Date() };
    } catch (error) {
      Logger.error('CHARACTER_IPC', 'Failed to get characters', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date() };
    }
  });

  Logger.info('CHARACTER_IPC', '✅ Character query handlers registered');
}
