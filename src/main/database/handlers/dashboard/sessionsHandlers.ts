import { ipcMain } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IPC_CHANNELS } from '../../../../shared/types';
import { createSafeAsyncIpcHandler } from '../../../../shared/ipc-utils';
import { databaseService } from '../../services/databaseService';

export function registerDashboardSessionHandlers(): void {
  // 🔥 타이핑 세션 목록 조회
  ipcMain.handle(
    IPC_CHANNELS.DATABASE.GET_SESSIONS,
    createSafeAsyncIpcHandler(
      async (...args: unknown[]) => {
        const [, limit, offset] = args;
        Logger.debug('DASHBOARD_IPC', 'IPC: Get sessions requested', { limit, offset });

        const result = await databaseService.getTypingSessions(
          typeof limit === 'number' ? limit : 50,
          typeof offset === 'number' ? offset : 0
        );
        if (!result.success) {
          throw new Error('error' in result ? result.error : 'Unknown error');
        }
        return result.data;
      },
      'DASHBOARD_IPC',
      'Get typing sessions'
    )
  );

  // 🔥 타이핑 통계 조회
  ipcMain.handle(
    IPC_CHANNELS.DATABASE.GET_STATS,
    createSafeAsyncIpcHandler(
      async (...args: unknown[]) => {
        const [, days] = args;
        Logger.debug('DASHBOARD_IPC', 'IPC: Get stats requested', { days });

        const result = await databaseService.getTypingStats(typeof days === 'number' ? days : 30);
        if (!result.success) throw new Error('error' in result ? result.error : 'Unknown error');
        return result.data;
      },
      'DASHBOARD_IPC',
      'Get typing statistics'
    )
  );

  // 🔥 종합 분석 데이터 조회 (새로 추가)
  ipcMain.handle(
    IPC_CHANNELS.DATABASE.GET_ANALYTICS,
    createSafeAsyncIpcHandler(
      async (..._args: unknown[]) => {
        Logger.debug('DASHBOARD_IPC', 'IPC: Get analytics data requested');
        const result = await databaseService.getAnalyticsData();
        if (!result.success) throw new Error('error' in result ? result.error : 'Unknown error');
        return result.data;
      },
      'DASHBOARD_IPC',
      'Get comprehensive analytics data'
    )
  );

  Logger.info('DASHBOARD_IPC', '✅ Dashboard session/stat handlers registered');
}
