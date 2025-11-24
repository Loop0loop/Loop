import type { DataSyncConfig, SyncDataItem, SyncStats, SyncLog } from './types';
import { Logger } from '../../../../shared/logger';
import {
  collectLocalChanges as engineCollectLocalChanges,
  fetchRemoteChanges as engineFetchRemoteChanges,
  uploadLocalChanges as engineUploadLocalChanges,
  downloadRemoteChanges as engineDownloadRemoteChanges,
  updateAverageSyncTime as engineUpdateAverageSyncTime,
} from './engine';
import { detectConflicts, resolveConflicts } from './resolver';

export async function runSyncOperation(config: DataSyncConfig, stats: SyncStats, conflictQueue: any[], logs: SyncLog[]) {
  const startTime = Date.now();
  stats.totalSyncs = (stats.totalSyncs || 0) + 1;

  try {
    Logger.debug('DATA_SYNC_RUNNER', 'Starting runSyncOperation');

    const localChanges: SyncDataItem[] = await engineCollectLocalChanges();
    const remoteChanges: SyncDataItem[] = await engineFetchRemoteChanges();

    const conflicts = detectConflicts(localChanges, remoteChanges);
    if (conflicts.length > 0) {
      await resolveConflicts(conflicts, config.defaultConflictResolution, stats, conflictQueue);
    }

    // upload
    const uploadedBytes = await engineUploadLocalChanges(localChanges, config);
    stats.totalDataSynced = (stats.totalDataSynced || 0) + uploadedBytes;

    // download
    const downloadedBytes = await engineDownloadRemoteChanges(remoteChanges, config);
    stats.totalDataSynced = (stats.totalDataSynced || 0) + downloadedBytes;

    stats.successfulSyncs = (stats.successfulSyncs || 0) + 1;
    stats.lastSyncTime = new Date();
    const syncTime = Date.now() - startTime;
    engineUpdateAverageSyncTime(stats, syncTime);

    // basic operation log
    logs.push({ id: `log_${Date.now()}`, timestamp: new Date(), operation: 'upload', status: 'success', message: 'Sync completed' });

    Logger.info('DATA_SYNC_RUNNER', 'Sync completed successfully', {
      durationMs: syncTime,
      localChanges: localChanges.length,
      remoteChanges: remoteChanges.length,
      conflicts: conflicts.length,
    });

    return { success: true, durationMs: syncTime, localCount: localChanges.length, remoteCount: remoteChanges.length, conflicts: conflicts.length };
  } catch (err) {
    stats.failedSyncs = (stats.failedSyncs || 0) + 1;
    logs.push({ id: `log_${Date.now()}`, timestamp: new Date(), operation: 'upload', status: 'failed', message: String((err as any)?.message || err) });
    Logger.error('DATA_SYNC_RUNNER', 'Sync failed', err);
    return { success: false, error: (err as Error).message };
  }
}

export default { runSyncOperation };
