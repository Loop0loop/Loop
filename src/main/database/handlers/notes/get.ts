import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse } from '../../../../shared/types';
import { prismaService } from '../../services/PrismaService';

export function registerGetNotesHandler(): void {
  ipcMain.handle('projects:get-notes', async (_event: IpcMainInvokeEvent, projectId: string): Promise<IpcResponse<any[]>> => {
    try {
      Logger.debug('NOTE_IPC', 'Getting project notes', { projectId });

      const prisma = await prismaService.getClient();
      const notes = await prisma.projectNote.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
      });

      return {
        success: true,
        data: notes,
        timestamp: new Date(),
      };
    } catch (error) {
      Logger.error('NOTE_IPC', 'Failed to get notes', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  });
}
