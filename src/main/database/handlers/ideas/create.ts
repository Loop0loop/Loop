import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse } from '../../../../shared/types';
import type { IdeaItem } from '../../../types/project';
import { IdeaService } from '../../services/ideaService';

export function registerCreateIdeaHandler(): void {
    ipcMain.handle('projects:create-idea', async (event: IpcMainInvokeEvent, projectId: string, ideaData: Omit<IdeaItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<IpcResponse<IdeaItem>> => {
        try {
            Logger.debug('IDEA_IPC', 'Creating new idea', { projectId, title: ideaData.title });

            const result = await IdeaService.createIdea(projectId, ideaData);

            if (result.success) {
                Logger.info('IDEA_IPC', `✅ Idea created successfully`, { id: result.data.id });
                return {
                    success: true,
                    data: result.data,
                    timestamp: new Date(),
                };
            } else {
                Logger.error('IDEA_IPC', 'Failed to create idea', result.error);
                return {
                    success: false,
                    error: result.error,
                    timestamp: new Date(),
                };
            }
        } catch (error) {
            Logger.error('IDEA_IPC', 'Failed to create idea', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            };
        }
    });
}
