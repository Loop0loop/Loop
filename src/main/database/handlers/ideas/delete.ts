import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse } from '../../../../shared/types';
import { IdeaService } from '../../services/ideaService';

export function registerDeleteIdeaHandler(): void {
    ipcMain.handle('projects:delete-idea', async (event: IpcMainInvokeEvent, ideaId: string): Promise<IpcResponse<void>> => {
        try {
            Logger.debug('IDEA_IPC', 'Deleting idea', { ideaId });

            const result = await IdeaService.deleteIdea(ideaId);

            if (result.success) {
                Logger.info('IDEA_IPC', `✅ Idea deleted successfully`, { ideaId });
                return {
                    success: true,
                    data: undefined,
                    timestamp: new Date(),
                };
            } else {
                Logger.error('IDEA_IPC', 'Failed to delete idea', result.error);
                return {
                    success: false,
                    error: result.error,
                    timestamp: new Date(),
                };
            }
        } catch (error) {
            Logger.error('IDEA_IPC', 'Failed to delete idea', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            };
        }
    });
}
