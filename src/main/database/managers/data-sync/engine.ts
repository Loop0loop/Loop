import type {
  SyncDataItem,
  SyncConflict,
  SyncLog,
  BackupInfo,
  SyncStats,
  DataSyncConfig,
} from './types';

/**
 * Pure helpers used by the DataSyncManager to keep implementation small.
 */
export function hasConflict(localItem: SyncDataItem, remoteItem: SyncDataItem): boolean {
  return (
    localItem.version !== remoteItem.version ||
    localItem.checksum !== remoteItem.checksum ||
    localItem.timestamp.getTime() !== remoteItem.timestamp.getTime()
  );
}

export function determineConflictType(localItem: SyncDataItem, remoteItem: SyncDataItem): SyncConflict['conflictType'] {
  if (localItem.version !== remoteItem.version) return 'version';
  if (localItem.checksum !== remoteItem.checksum) return 'content';
  return 'timestamp';
}

export async function mergeItems(localItem: SyncDataItem, remoteItem: SyncDataItem): Promise<SyncDataItem> {
  // Default merge policy: choose latest timestamp (domain-specific merge can be injected later)
  return localItem.timestamp > remoteItem.timestamp ? localItem : remoteItem;
}

export function generateChecksum(data: string): string {
  // Placeholder - production should use sha256 or similar
  return `checksum_${data.length}_${Date.now()}`;
}

export function updateAverageSyncTime(stats: SyncStats, syncTime: number): void {
  const totalTime = stats.averageSyncTime * (stats.successfulSyncs - 1) + syncTime;
  stats.averageSyncTime = totalTime / stats.successfulSyncs;
}

// The following operations are placeholders that will be implemented by providers/adapters
export async function uploadLocalChanges(_changes: SyncDataItem[], _config?: DataSyncConfig): Promise<number> {
  // Return number of bytes written (approx)
  return _changes.reduce((sum, item) => sum + JSON.stringify(item).length, 0);
}

export async function downloadRemoteChanges(_changes: SyncDataItem[], _config?: DataSyncConfig): Promise<number> {
  return _changes.reduce((sum, item) => sum + JSON.stringify(item).length, 0);
}

export async function collectLocalChanges(): Promise<SyncDataItem[]> {
  // Domain-specific implementation should be provided by DataSyncManager
  return [];
}

export async function fetchRemoteChanges(): Promise<SyncDataItem[]> {
  // Domain-specific implementation should be provided by DataSyncManager
  return [];
}

export async function collectAllData(): Promise<SyncDataItem[]> {
  // Collect all user data for backup; left as a stub for now
  return [];
}

export async function processBackupData(data: SyncDataItem[], config?: DataSyncConfig): Promise<unknown> {
  let processedData: unknown = data;
  if (config?.compressionEnabled) {
    // placeholder: actual compression
    processedData = data;
  }
  if (config?.encryptionEnabled) {
    // placeholder: actual encryption
    processedData = data;
  }
  return processedData;
}

export function logOperation(logs: SyncLog[], op: SyncLog): void {
  logs.push(op);
  if (logs.length > 1000) logs.splice(0, logs.length - 500);
}
