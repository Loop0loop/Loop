/**
 * Lightweight delegator for project-level IPC handlers.
 * All heavy implementations live in handlers/projects/* modules.
 */
import { Logger } from '../../../shared/logger';
import { registerProjectQueryHandlers } from './projects/getHandlers';
import { registerProjectMutateHandlers } from './projects/writeHandlers';
import { registerProjectToolingHandlers } from './projects/toolingHandlers';

export function registerProjectCrudHandlers(): void {
  Logger.debug('PROJECT_CRUD_IPC', 'Registering CRUD IPC handlers (delegating to specialized modules)');

  registerProjectQueryHandlers();
  registerProjectMutateHandlers();
  registerProjectToolingHandlers();

  Logger.info('PROJECT_CRUD_IPC', '✅ Project CRUD IPC handlers registered (delegated)');
}
