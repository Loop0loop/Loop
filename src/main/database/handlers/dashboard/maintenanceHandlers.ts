import { ipcMain } from 'electron';
import { Logger } from '../../../../shared/logger';
import { createSafeAsyncIpcHandler } from '../../../../shared/ipc-utils';
import { databaseService } from '../../services/databaseService';

export function registerDashboardMaintenanceHandlers(): void {
  // 🔥 데이터베이스 헬스 체크
  ipcMain.handle('dashboard:health-check', createSafeAsyncIpcHandler(async () => {
    Logger.debug('DASHBOARD_IPC', 'IPC: Health check requested');
    const dbHealth = await databaseService.healthCheck();
    return { database: dbHealth.success ? dbHealth.data : null, timestamp: new Date() };
  }, 'DASHBOARD_IPC', 'Health check'));

  // 🔥 세션 삭제
  ipcMain.handle('dashboard:delete-session', createSafeAsyncIpcHandler(async (_event, ...args: unknown[]) => {
    const sessionId = args[0] as string;
    Logger.debug('DASHBOARD_IPC', 'IPC: Delete session requested', { sessionId });
    if (!sessionId || typeof sessionId !== 'string') {
      Logger.warn('DASHBOARD_IPC', 'Invalid session ID provided');
      return false;
    }

    try {
      const result = await databaseService.deleteTypingSession(sessionId);
      if (result.success) { Logger.info('DASHBOARD_IPC', 'Session deleted successfully', { sessionId }); return true; }
      Logger.error('DASHBOARD_IPC', 'Failed to delete session', { sessionId, error: 'error' in result ? result.error : 'Unknown error' });
      return false;
    } catch (error) {
      Logger.error('DASHBOARD_IPC', 'Error deleting session', { sessionId, error });
      return false;
    }
  }, 'DASHBOARD_IPC', 'Delete session'));

  // 🔥 데이터 내보내기
  ipcMain.handle('dashboard:export-data', createSafeAsyncIpcHandler(async (_event, ...args: unknown[]) => {
    const format = (args[0] as 'json' | 'csv') || 'json';
    Logger.debug('DASHBOARD_IPC', 'IPC: Export data requested', { format });

    try {
      const sessionsResult = await databaseService.getTypingSessions(1000, 0);
      if (!sessionsResult.success || !sessionsResult.data) { Logger.error('DASHBOARD_IPC', 'Failed to retrieve sessions for export'); return null; }

      const sessions = sessionsResult.data;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `loop-typing-data-${timestamp}.${format}`;

      if (format === 'csv') {
        const csvHeaders = 'ID,Start Time,End Time,Duration(s),WPM,Accuracy(%),Key Count,Language,App Name,Window Title\n';
        const csvRows = sessions.map(session => [
          session.id,
          session.startTime?.toISOString() || '',
          session.endTime?.toISOString() || '',
          session.startTime && session.endTime ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000) : 0,
          session.wpm || 0,
          session.accuracy || 0,
          session.keyCount || 0,
          'ko',
          session.windowTitle || '',
          session.windowTitle || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');

        return { filename, content: csvHeaders + csvRows, mimeType: 'text/csv' };
      }

      const exportObject = { exportInfo: { exportDate: new Date().toISOString(), version: '1.0.0', sessionCount: sessions.length, format: 'json' }, sessions: sessions.map(session => ({ id: session.id, startTime: session.startTime?.toISOString(), endTime: session.endTime?.toISOString(), duration: session.endTime && session.startTime ? session.endTime.getTime() - session.startTime.getTime() : 0, wpm: session.wpm, accuracy: session.accuracy, keyCount: session.keyCount, language: 'ko', appName: session.windowTitle?.split(' ')[0] || 'Unknown', windowTitle: session.windowTitle })) };

      return { filename, content: JSON.stringify(exportObject, null, 2), mimeType: 'application/json' };
    } catch (error) {
      Logger.error('DASHBOARD_IPC', 'Failed to export data', error);
      return null;
    }
  }, 'DASHBOARD_IPC', 'Export data'));

  Logger.info('DASHBOARD_IPC', '✅ Dashboard maintenance handlers registered');
}
