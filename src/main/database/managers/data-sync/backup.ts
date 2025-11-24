import { promises as fs } from 'fs';
import { join } from 'path';
import type { DataSyncConfig, BackupInfo, SyncDataItem, SyncStats } from './types';
import { collectAllData as engineCollectAllData, processBackupData as engineProcessBackupData, generateChecksum } from './engine';
import { cleanupOldBackups } from './storage';
import { Logger } from '../../../../shared/logger';

export async function performBackupOperation(dataDirectory: string, config: DataSyncConfig, backupHistory: BackupInfo[], syncStats: SyncStats, maxBackups = 10): Promise<{ backupInfo: BackupInfo; backupHistory: BackupInfo[] }> {
  const backupId = `backup_${Date.now()}`;
  const backupPath = join(dataDirectory, 'backups', `${backupId}.json`);

  const allData: SyncDataItem[] = await engineCollectAllData();
  const processedData = await engineProcessBackupData(allData, config);

  await fs.writeFile(backupPath, JSON.stringify(processedData));

  const info: BackupInfo = {
    id: backupId,
    timestamp: new Date(),
    size: (await fs.stat(backupPath)).size,
    itemCount: allData.length,
    provider: config.provider,
    filePath: backupPath,
    checksum: generateChecksum(JSON.stringify(processedData)),
    isAutomatic: true,
  };

  const newHistory = [...backupHistory, info];
  const trimmed = await cleanupOldBackups(newHistory, maxBackups);

  Logger.info('DATA_SYNC_BACKUP', 'Backup created', { id: info.id, size: info.size, items: info.itemCount });

  // update stats
  syncStats.totalDataSynced = (syncStats.totalDataSynced || 0) + info.size;

  return { backupInfo: info, backupHistory: trimmed };
}

export async function readBackupFile(backupPath: string) {
  return JSON.parse(await fs.readFile(backupPath, 'utf-8'));
}

export async function restoreFromBackupOperation(backupId: string, backupHistory: BackupInfo[]) {
  const backup = backupHistory.find(b => b.id === backupId);
  if (!backup) throw new Error('Backup not found');
  const raw = await readBackupFile(backup.filePath);
  // In a real implementation we'd validate and apply the data to DB
  return raw;
}

export default { performBackupOperation, readBackupFile };
