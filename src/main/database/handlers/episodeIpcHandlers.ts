import { Logger } from '../../../shared/logger';
import { registerEpisodeQueryHandlers } from './episodes/getHandlers';
import { registerEpisodeMutateHandlers } from './episodes/mutateHandlers';
import { registerEpisodeAnalysisHandlers } from './episodes/analysisHandlers';

export function setupEpisodeIpcHandlers(): void {
  Logger.debug('EPISODE_IPC', 'Setting up episode IPC handlers (delegated)');

  registerEpisodeQueryHandlers();
  registerEpisodeMutateHandlers();
  registerEpisodeAnalysisHandlers();

  Logger.info('EPISODE_IPC', '✅ Episode IPC handlers registered (delegated)');
}

export default setupEpisodeIpcHandlers;
