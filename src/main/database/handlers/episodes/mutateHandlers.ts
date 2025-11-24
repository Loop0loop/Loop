import { ipcMain } from 'electron';
import { Logger } from '../../../../shared/logger';
import { EpisodeService } from '../../services/EpisodeService';
import type { CreateEpisodeInput, UpdateEpisodeInput } from '../../../../shared/types/episode';

export function registerEpisodeMutateHandlers(): void {
  const episodeService = new EpisodeService();

  ipcMain.handle('episode:create', async (event: unknown, input: CreateEpisodeInput) => {
    try {
      Logger.debug('EPISODE_IPC', 'Creating episode', { input });
      const episode = await episodeService.createEpisode(input);
      return { success: true, data: episode };
    } catch (error) {
      Logger.error('EPISODE_IPC', 'Failed to create episode', { error, input });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('episode:update', async (event: unknown, id: string, input: UpdateEpisodeInput) => {
    try {
      Logger.debug('EPISODE_IPC', 'Updating episode', { id, input });
      const episode = await episodeService.updateEpisode(id, input);
      return { success: true, data: episode };
    } catch (error) {
      Logger.error('EPISODE_IPC', 'Failed to update episode', { error, id, input });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('episode:delete', async (event: unknown, id: string) => {
    try {
      Logger.debug('EPISODE_IPC', 'Deleting episode', { id });
      await episodeService.deleteEpisode(id);
      return { success: true };
    } catch (error) {
      Logger.error('EPISODE_IPC', 'Failed to delete episode', { error, id });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('episode:hardDelete', async (event: unknown, id: string) => {
    try {
      Logger.debug('EPISODE_IPC', 'Hard deleting episode', { id });
      await episodeService.hardDeleteEpisode(id);
      return { success: true };
    } catch (error) {
      Logger.error('EPISODE_IPC', 'Failed to hard delete episode', { error, id });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('episode:publish', async (event: unknown, id: string) => {
    try {
      Logger.debug('EPISODE_IPC', 'Publishing episode', { id });
      const episode = await episodeService.publishEpisode(id);
      return { success: true, data: episode };
    } catch (error) {
      Logger.error('EPISODE_IPC', 'Failed to publish episode', { error, id });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  Logger.info('EPISODE_IPC', '✅ Episode mutate handlers registered');
}
