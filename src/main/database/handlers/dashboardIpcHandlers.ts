import { Logger } from '../../../shared/logger';
import { registerDashboardSessionHandlers } from './dashboard/sessionsHandlers';
import { registerDashboardControlHandlers } from './dashboard/controlHandlers';
import { registerDashboardMaintenanceHandlers } from './dashboard/maintenanceHandlers';

Logger.time('DASHBOARD_IPC_SETUP');

export function setupDashboardIpcHandlers(): void {
  Logger.debug('DASHBOARD_IPC', 'Setting up dashboard IPC handlers (delegated)');

  registerDashboardSessionHandlers();
  registerDashboardControlHandlers();
  registerDashboardMaintenanceHandlers();

  Logger.timeEnd('DASHBOARD_IPC_SETUP');
  Logger.info('DASHBOARD_IPC', 'Dashboard IPC handlers setup successfully');
}

export function cleanupDashboardIpcHandlers(): void {
  Logger.debug('DASHBOARD_IPC', 'Cleaning up dashboard IPC handlers (delegated)');
  // reset/cleanup when needed — submodules register/remove their own channels
}

export default setupDashboardIpcHandlers;
