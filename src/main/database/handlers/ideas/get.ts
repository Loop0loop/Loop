import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IpcResponse } from '../../../../shared/types';
import { IdeaService } from '../../services/ideaService';

export function registerGetIdeasHandler(): void {
    ipcMain.handle('projects:get-ideas', async (event: IpcMainInvokeEvent, projectId: string): Promise<IpcResponse<any[]>> => {
        try {
            Logger.debug('IDEA_IPC', 'Getting project ideas', { projectId });

            const result = await IdeaService.getIdeasByProject(projectId);

            if (result.success) {
                Logger.info('IDEA_IPC', `✅ Ideas retrieved successfully`, { count: result.data.length });
                return {
                    success: true,
                    data: result.data,
                    timestamp: new Date(),
                };
            } else {
                Logger.error('IDEA_IPC', 'Failed to get ideas', result.error);
                return {
                    success: false,
                    error: result.error,
                    timestamp: new Date(),
                };
            }
        } catch (error) {
            Logger.error('IDEA_IPC', 'Failed to get ideas', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            };
        }
    });
}
