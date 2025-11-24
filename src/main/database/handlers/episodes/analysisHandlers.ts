import { ipcMain } from 'electron';
import type { IpcMainEvent } from 'electron';
import { Logger } from '../../../../shared/logger';
import { EpisodeService } from '../../services/EpisodeService';

export function registerEpisodeAnalysisHandlers(): void {
  const episodeService = new EpisodeService();

  ipcMain.handle('episode:getManuscriptReserves', async (_event: IpcMainEvent, projectId: string) => {
    try {
      Logger.debug('EPISODE_IPC', 'Getting manuscript reserves', { projectId });
      const reserves = await episodeService.getManuscriptReserves(projectId);
      return { success: true, data: reserves };
    } catch (error) {
      Logger.error('EPISODE_IPC', 'Failed to get manuscript reserves', { error, projectId });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('episode:analyzeFiveActStructure', async (_event: IpcMainEvent, projectId: string) => {
    try {
      Logger.debug('EPISODE_IPC', 'Analyzing five-act structure', { projectId });
      const analysis = await episodeService.analyzeFiveActStructure(projectId);
      return { success: true, data: analysis };
    } catch (error) {
      Logger.error('EPISODE_IPC', 'Failed to analyze five-act structure', { error, projectId });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  Logger.info('EPISODE_IPC', '✅ Episode analysis handlers registered');
}
