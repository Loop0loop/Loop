import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse } from '../../../../shared/types';
import type { IdeaItem } from '../../../types/project';
import { IdeaService } from '../../services/ideaService';

export function registerUpdateIdeaHandler(): void {
    ipcMain.handle('projects:update-idea', async (event: IpcMainInvokeEvent, ideaId: string, updates: Partial<Omit<IdeaItem, 'id' | 'createdAt'>>): Promise<IpcResponse<IdeaItem>> => {
        try {
            Logger.debug('IDEA_IPC', 'Updating idea', { ideaId });

            const result = await IdeaService.updateIdea(ideaId, updates);

            if (result.success) {
                Logger.info('IDEA_IPC', `✅ Idea updated successfully`, { id: result.data.id });
                return {
                    success: true,
                    data: result.data,
                    timestamp: new Date(),
                };
            } else {
                Logger.error('IDEA_IPC', 'Failed to update idea', result.error);
                return {
                    success: false,
                    error: result.error,
                    timestamp: new Date(),
                };
            }
        } catch (error) {
            Logger.error('IDEA_IPC', 'Failed to update idea', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            };
        }
    });
}
