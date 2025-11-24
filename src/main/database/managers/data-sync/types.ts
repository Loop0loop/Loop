import type { DataRetentionSettingsSchema } from '../../../settings/types';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'paused' | 'offline';
export type ConflictResolution = 'local' | 'remote' | 'merge' | 'manual';
export type SyncProvider = 'google-drive' | 'dropbox' | 'icloud' | 'onedrive' | 'custom';

export interface SyncDataItem {
  id: string;
  type: 'typing-session' | 'user-settings' | 'keyboard-config' | 'window-history';
  data: unknown;
  timestamp: Date;
  version: number;
  checksum: string;
}

export interface SyncConflict {
  id: string;
  localItem: SyncDataItem;
  remoteItem: SyncDataItem;
  conflictType: 'version' | 'content' | 'timestamp';
  resolution?: ConflictResolution;
  resolvedItem?: SyncDataItem;
}

export interface SyncLog {
  id: string;
  timestamp: Date;
  operation: 'upload' | 'download' | 'delete' | 'conflict' | 'error';
  itemId?: string;
  itemType?: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
  error?: string;
}

export interface BackupInfo {
  id: string;
  timestamp: Date;
  size: number;
  itemCount: number;
  provider: SyncProvider;
  filePath: string;
  checksum: string;
  isAutomatic: boolean;
}

export interface DataSyncConfig {
  enabled: boolean;
  provider: SyncProvider;
  autoSync: boolean;
  syncInterval: number;
  backupInterval: number;
  maxBackups: number;
  enableConflictResolution: boolean;
  defaultConflictResolution: ConflictResolution;
  enableOfflineMode: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflictsResolved: number;
  lastSyncTime: Date | null;
  totalDataSynced: number;
  averageSyncTime: number;
}

export { DataRetentionSettingsSchema };
