import { ipcMain } from 'electron';
import { Logger } from '../../../../shared/logger';
import { IPC_CHANNELS } from '../../../../shared/types';
import { createSafeIpcHandler, createSafeAsyncIpcHandler } from '../../../../shared/ipc-utils';

export function registerDashboardControlHandlers(): void {
  // 🔥 실시간 WPM 업데이트 (향후 구현)
  ipcMain.handle(
    'dashboard:get-realtime-wpm',
    createSafeAsyncIpcHandler(
      async () => {
        Logger.debug('DASHBOARD_IPC', 'IPC: Get realtime WPM requested');
        const unifiedHandler = globalThis.unifiedHandler;
        if (!unifiedHandler) throw new Error('UnifiedHandler not initialized');

        const stats = unifiedHandler.getRealtimeStats();
        return { currentWpm: stats.currentWpm, avgWpm: stats.averageWpm, peakWpm: stats.peakWpm, timestamp: new Date() };
      },
      'DASHBOARD_IPC',
      'Get realtime WPM'
    )
  );

  // 🔥 앱 정보 조회
  ipcMain.handle(
    IPC_CHANNELS.APP.GET_VERSION,
    createSafeIpcHandler((event) => {
      Logger.debug('DASHBOARD_IPC', 'IPC: Get app version requested');
      return process.env.npm_package_version || '1.0.0';
    }, 'DASHBOARD_IPC', 'Get app version')
  );

  ipcMain.handle(
    IPC_CHANNELS.APP.QUIT,
    createSafeAsyncIpcHandler(async () => {
      Logger.debug('DASHBOARD_IPC', 'IPC: Quit app requested');
      const { app } = await import('electron');
      app.quit();
      return true;
    }, 'DASHBOARD_IPC', 'Quit application')
  );

  // Window chrome controls
  ipcMain.handle(IPC_CHANNELS.APP.MINIMIZE, createSafeIpcHandler((...args: unknown[]) => {
    const [event] = args;
    Logger.debug('DASHBOARD_IPC', 'IPC: Minimize window requested');
    if (event && typeof event === 'object' && 'sender' in event) {
      const sender = (event as { sender: { getOwnerBrowserWindow(): unknown } }).sender;
      const window = sender.getOwnerBrowserWindow();
      if (window && typeof window === 'object' && 'minimize' in window) { (window as { minimize(): void }).minimize(); return true; }
    }
    return false;
  }, 'DASHBOARD_IPC', 'Minimize window'));

  ipcMain.handle(IPC_CHANNELS.APP.MAXIMIZE, createSafeIpcHandler((...args: unknown[]) => {
    const [event] = args;
    Logger.debug('DASHBOARD_IPC', 'IPC: Maximize window requested');
    if (event && typeof event === 'object' && 'sender' in event) {
      const sender = (event as { sender: { getOwnerBrowserWindow(): unknown } }).sender;
      const window = sender.getOwnerBrowserWindow();
      if (window && typeof window === 'object' && 'isMaximized' in window && 'maximize' in window && 'unmaximize' in window) {
        const browserWindow = window as { isMaximized(): boolean; maximize(): void; unmaximize(): void };
        if (browserWindow.isMaximized()) browserWindow.unmaximize(); else browserWindow.maximize();
        return true;
      }
    }
    return false;
  }, 'DASHBOARD_IPC', 'Maximize/restore window'));

  Logger.info('DASHBOARD_IPC', '✅ Dashboard control handlers registered');
}
