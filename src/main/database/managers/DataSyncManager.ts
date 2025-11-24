// 🔥 기가차드 데이터 동기화 매니저 - 클라우드 백업 및 동기화 전문가!

import { Logger } from '../../../shared/logger';
import { BaseManager } from '../../common/BaseManager';
import { Result } from '../../../shared/types';
import { DataRetentionSettingsSchema } from '../../settings/types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { app } from 'electron';

import type {
  SyncDataItem,
  SyncConflict,
  SyncLog,
  BackupInfo,
  DataSyncConfig,
  SyncStats,
  SyncStatus,
} from './data-sync/types';

import {
  uploadLocalChanges,
  downloadRemoteChanges,
  updateAverageSyncTime as engineUpdateAverageSyncTime,
  generateChecksum,
  collectLocalChanges as engineCollectLocalChanges,
  fetchRemoteChanges as engineFetchRemoteChanges,
  collectAllData as engineCollectAllData,
  processBackupData as engineProcessBackupData,
  logOperation as engineLogOperation,
} from './data-sync/engine';

import { ensureDataDirectory, loadSyncState as storageLoadState, saveSyncState as storageSaveState, cleanupOldBackups } from './data-sync/storage';
import { detectConflicts, resolveConflicts } from './data-sync/resolver';

// #DEBUG: Data sync manager entry point
Logger.debug('DATA_SYNC', 'Data sync manager module loaded');

// 🔥 기가차드 동기화 상태

/**
 * 🔥 DataSyncManager - 클라우드 데이터 동기화 시스템
 * 자동 백업, 충돌 해결, 오프라인 지원, 암호화
 */
export class DataSyncManager extends BaseManager {
  private readonly componentName = 'DATA_SYNC';
  private syncConfig: DataSyncConfig;
  private currentStatus: SyncStatus = 'idle';
  private syncQueue: SyncDataItem[] = [];
  private conflictQueue: SyncConflict[] = [];
  private syncLogs: SyncLog[] = [];
  private backupHistory: BackupInfo[] = [];
  private syncStats: SyncStats;
  private syncInterval: NodeJS.Timeout | null = null;
  private backupInterval: NodeJS.Timeout | null = null;
  private dataDirectory: string;

  constructor(config: Partial<DataSyncConfig> = {}) {
    super({
      name: 'DataSyncManager',
      autoStart: false,
      retryOnError: true,
      maxRetries: 3,
      retryDelay: 5000,
    });

    this.syncConfig = {
      enabled: false, // 기본적으로 비활성화
      provider: 'google-drive',
      autoSync: true,
      syncInterval: 300000, // 5분마다
      backupInterval: 3600000, // 1시간마다
      maxBackups: 10,
      enableConflictResolution: true,
      defaultConflictResolution: 'local',
      enableOfflineMode: true,
      compressionEnabled: true,
      encryptionEnabled: true,
      ...config,
    };

    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsResolved: 0,
      lastSyncTime: null,
      totalDataSynced: 0,
      averageSyncTime: 0,
    };

    this.dataDirectory = join(app.getPath('userData'), 'sync');
    
    Logger.info(this.componentName, 'Data sync manager instance created');
  }

  /**
   * BaseManager 추상 메서드 구현 - 초기화
   */
  protected async doInitialize(): Promise<void> {
    try {
      await this.initializeDataDirectory();
      await this.loadSyncState();
      
      Logger.info(this.componentName, 'Data sync manager initialized successfully');
    } catch (error) {
      const err = error as Error;
      Logger.error(this.componentName, 'Failed to initialize data sync manager', err);
      throw err;
    }
  }

  /**
   * BaseManager 추상 메서드 구현 - 시작
   */
  protected async doStart(): Promise<void> {
    try {
      if (this.syncConfig.enabled) {
        await this.startSyncService();
      }
      
      Logger.info(this.componentName, 'Data sync manager started successfully');
    } catch (error) {
      const err = error as Error;
      Logger.error(this.componentName, 'Failed to start data sync manager', err);
      throw err;
    }
  }

  /**
   * BaseManager 추상 메서드 구현 - 중지
   */
  protected async doStop(): Promise<void> {
    try {
      await this.stopSyncService();
      await this.saveSyncState();
      
      Logger.info(this.componentName, 'Data sync manager stopped successfully');
    } catch (error) {
      const err = error as Error;
      Logger.error(this.componentName, 'Failed to stop data sync manager', err);
      throw err;
    }
  }

  /**
   * BaseManager 추상 메서드 구현 - 정리
   */
  protected async doCleanup(): Promise<void> {
    try {
      await this.doStop();
      this.syncQueue = [];
      this.conflictQueue = [];
      this.currentStatus = 'idle';
      
      Logger.info(this.componentName, 'Data sync manager cleanup completed');
    } catch (error) {
      const err = error as Error;
      Logger.error(this.componentName, 'Failed to cleanup data sync manager', err);
      throw err;
    }
  }

  /**
   * 데이터 디렉토리 초기화
   */
  private async initializeDataDirectory(): Promise<void> {
    try {
      await ensureDataDirectory(this.dataDirectory);
      Logger.debug(this.componentName, 'Data directory initialized', { path: this.dataDirectory });
    } catch (error) {
      Logger.error(this.componentName, 'Failed to initialize data directory', error);
      throw error;
    }
  }

  /**
   * 동기화 상태 로드
   */
  private async loadSyncState(): Promise<void> {
    try {
      const stateFile = join(this.dataDirectory, 'sync-state.json');
      
      const loaded = await storageLoadState(this.dataDirectory, { stats: this.syncStats });
      this.syncStats = loaded.stats || this.syncStats;
      this.backupHistory = loaded.backups || [];
      this.syncLogs = loaded.logs || [];
      Logger.debug(this.componentName, 'Sync state loaded successfully');
    } catch (error) {
      Logger.error(this.componentName, 'Failed to load sync state', error);
    }
  }

  /**
   * 동기화 상태 저장
   */
  private async saveSyncState(): Promise<void> {
    try {
      await storageSaveState(this.dataDirectory, { stats: this.syncStats, backups: this.backupHistory, logs: this.syncLogs });
      Logger.debug(this.componentName, 'Sync state saved successfully');
    } catch (error) {
      Logger.error(this.componentName, 'Failed to save sync state', error);
    }
  }

  /**
   * 동기화 서비스 시작
   */
  private async startSyncService(): Promise<void> {
    if (this.syncConfig.autoSync) {
      this.syncInterval = setInterval(async () => {
        await this.performSync();
      }, this.syncConfig.syncInterval);
    }

    this.backupInterval = setInterval(async () => {
      await this.performBackup();
    }, this.syncConfig.backupInterval);

    Logger.debug(this.componentName, 'Sync service started');
  }

  /**
   * 동기화 서비스 중지
   */
  private async stopSyncService(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }

    Logger.debug(this.componentName, 'Sync service stopped');
  }

  /**
   * 동기화 수행
   */
  private async performSync(): Promise<void> {
    if (this.currentStatus === 'syncing') {
      Logger.debug(this.componentName, 'Sync already in progress, skipping');
      return;
    }

    this.currentStatus = 'syncing';
    try {
      const { runSyncOperation } = await import('./data-sync/runner');
      const result = await runSyncOperation(this.syncConfig, this.syncStats, this.conflictQueue, this.syncLogs);
      if (result.success) {
        engineLogOperation(this.syncLogs, { id: `log_${Date.now()}`, timestamp: new Date(), operation: 'upload', status: 'success', message: 'Sync completed successfully' });
      } else {
        engineLogOperation(this.syncLogs, { id: `log_${Date.now()}`, timestamp: new Date(), operation: 'upload', status: 'failed', message: `Sync failed: ${result.error}` });
      }
    } catch (err) {
      engineLogOperation(this.syncLogs, { id: `log_${Date.now()}`, timestamp: new Date(), operation: 'upload', status: 'failed', message: (err as Error).message });
      Logger.error(this.componentName, 'Sync operation failed', err);
    } finally {
      this.currentStatus = 'idle';
    }
  }

  /**
   * 로컬 변경사항 수집
   */
  private async collectLocalChanges(): Promise<SyncDataItem[]> {
    return engineCollectLocalChanges();
  }

  /**
   * 원격 변경사항 가져오기
   */
  private async fetchRemoteChanges(): Promise<SyncDataItem[]> {
    return engineFetchRemoteChanges();
  }

  /**
   * 충돌 감지
   */

  // conflict detection and resolution delegated to data-sync/resolver.ts

  /**
   * 항목 병합
   */
  // mergeItems, conflict detection and conflict helpers are delegated to the engine

  /**
   * 로컬 변경사항 업로드
   */
  private async uploadLocalChanges(changes: SyncDataItem[]): Promise<void> {
    const totalBytes = await uploadLocalChanges(changes, this.syncConfig);
    this.syncStats.totalDataSynced += totalBytes;
  }

  /**
   * 원격 변경사항 다운로드
   */
  private async downloadRemoteChanges(changes: SyncDataItem[]): Promise<void> {
    // 실제 구현에서는 로컬 데이터베이스 업데이트
    const totalBytes = await downloadRemoteChanges(changes, this.syncConfig);
    this.syncStats.totalDataSynced += totalBytes;
  }

  /**
   * 평균 동기화 시간 업데이트
   */
  private updateAverageSyncTime(syncTime: number): void {
    engineUpdateAverageSyncTime(this.syncStats, syncTime);
  }

  /**
   * 백업 수행
   */
  private async performBackup(): Promise<void> {
    try {
      Logger.debug(this.componentName, 'Starting backup operation');
      const { performBackupOperation } = await import('./data-sync/backup');

      const { backupInfo, backupHistory } = await performBackupOperation(this.dataDirectory, this.syncConfig, this.backupHistory, this.syncStats, this.syncConfig.maxBackups);
      this.backupHistory = backupHistory;

      engineLogOperation(this.syncLogs, { id: `log_${Date.now()}`, timestamp: new Date(), operation: 'upload', status: 'success', message: 'Backup completed successfully' });

      Logger.info(this.componentName, 'Backup completed successfully', { id: backupInfo.id, size: backupInfo.size, itemCount: backupInfo.itemCount });

    } catch (error) {
      engineLogOperation(this.syncLogs, { id: `log_${Date.now()}`, timestamp: new Date(), operation: 'upload', status: 'failed', message: (error as Error).message });
      Logger.error(this.componentName, 'Backup operation failed', error);
    }
  }

  /**
   * 모든 데이터 수집
   */
  private async collectAllData(): Promise<SyncDataItem[]> {
    return engineCollectAllData();
  }

  /**
   * 백업 데이터 처리
   */
  private async processBackupData(data: SyncDataItem[]): Promise<unknown> {
    return engineProcessBackupData(data, this.syncConfig);
  }

  /**
   * 체크섬 생성
   */
  private generateChecksum(data: string): string {
    return generateChecksum(data);
  }

  /**
   * 오래된 백업 정리
   */
  private async cleanupOldBackups(): Promise<void> {
    this.backupHistory = await cleanupOldBackups(this.backupHistory, this.syncConfig.maxBackups);
  }

  /**
   * 동기화 로그 기록
   */
  // log operations are handled via engine.logOperation helper

  /**
   * 공개 API: 수동 동기화
   */
  public async manualSync(): Promise<Result<void>> {
    try {
      await this.performSync();
      return { success: true };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * 공개 API: 수동 백업
   */
  public async manualBackup(): Promise<Result<BackupInfo>> {
    try {
      await this.performBackup();
      const latestBackup = this.backupHistory[this.backupHistory.length - 1];
      return { success: true, data: latestBackup };
    } catch (error) {
      const err = error as Error;
      return { success: false, error: err.message };
    }
  }

  /**
   * 공개 API: 현재 상태 반환
   */
  public getSyncStatus(): SyncStatus {
    return this.currentStatus;
  }

  /**
   * 공개 API: 동기화 통계 반환
   */
  public getSyncStats(): SyncStats {
    return { ...this.syncStats };
  }

  /**
   * 공개 API: 백업 히스토리 반환
   */
  public getBackupHistory(): BackupInfo[] {
    return [...this.backupHistory];
  }

  /**
   * 공개 API: 충돌 큐 반환
   */
  public getConflicts(): SyncConflict[] {
    return [...this.conflictQueue];
  }

  /**
   * 공개 API: 동기화 로그 반환
   */
  public getSyncLogs(): SyncLog[] {
    return [...this.syncLogs];
  }

  /**
   * 공개 API: 설정 업데이트
   */
  public async updateConfig(newConfig: Partial<DataSyncConfig>): Promise<Result<void>> {
    try {
      const oldEnabled = this.syncConfig.enabled;
      this.syncConfig = { ...this.syncConfig, ...newConfig };
      
      // 서비스 재시작이 필요한 경우
      if (this.isRunning() && (oldEnabled !== this.syncConfig.enabled || newConfig.syncInterval)) {
        await this.stopSyncService();
        if (this.syncConfig.enabled) {
          await this.startSyncService();
        }
      }

      Logger.info(this.componentName, 'Data sync config updated', newConfig);
      return { success: true };
    } catch (error) {
      const err = error as Error;
      Logger.error(this.componentName, 'Failed to update config', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * 공개 API: 백업에서 복원
   */
  public async restoreFromBackup(backupId: string): Promise<Result<void>> {
    try {
      const { restoreFromBackupOperation } = await import('./data-sync/backup');
      await restoreFromBackupOperation(backupId, this.backupHistory);

      // TODO: apply parsed data to DB - currently stubbed
      engineLogOperation(this.syncLogs, { id: `log_${Date.now()}`, timestamp: new Date(), operation: 'download', status: 'success', message: `Restored from backup ${backupId}` });
      Logger.info(this.componentName, 'Backup restored successfully', { backupId });

      return { success: true };
    } catch (error) {
      const err = error as Error;
      engineLogOperation(this.syncLogs, { id: `log_${Date.now()}`, timestamp: new Date(), operation: 'download', status: 'failed', message: err.message });
      Logger.error(this.componentName, 'Failed to restore from backup', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * 🔥 데이터 보존 정책 업데이트 메서드 - any 타입 제거용
   */
  public updateRetentionPolicy(policy: DataRetentionSettingsSchema): void {
    // delegate to small helper
    void import('./data-sync/policy').then(m => m.applyRetentionPolicy(policy)).catch(err => Logger.error(this.componentName, 'Failed to apply retention policy', err));
  }
}

// 🔥 기가차드 전역 데이터 동기화 매니저
export const dataSyncManager = new DataSyncManager();

// #DEBUG: Data sync manager module exit point
Logger.debug('DATA_SYNC', 'Data sync manager module setup complete');

export default dataSyncManager;
