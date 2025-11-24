import { Logger } from '../../../shared/logger';
import { registerCharacterQueryHandlers } from './characters/getHandlers';
import { registerCharacterMutateHandlers } from './characters/mutateHandlers';

export function registerCharacterHandlers(): void {
  Logger.debug('CHARACTER_IPC', 'Registering character IPC handlers (delegated)');

  registerCharacterQueryHandlers();
  registerCharacterMutateHandlers();

  Logger.info('CHARACTER_IPC', '✅ Character IPC handlers registered (delegated)');
}

export default registerCharacterHandlers;
