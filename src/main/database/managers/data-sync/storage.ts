import { promises as fs } from 'fs';
import { join } from 'path';
import type { SyncStats, BackupInfo, SyncLog } from './types';

export async function ensureDataDirectory(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const subdirs = ['backups', 'cache', 'conflicts', 'logs'];
  await Promise.all(subdirs.map((s) => fs.mkdir(join(dir, s), { recursive: true })));
}

export async function loadSyncState(dir: string, defaults: { stats: SyncStats }): Promise<{ stats: SyncStats; backups: BackupInfo[]; logs: SyncLog[] }> {
  const stateFile = join(dir, 'sync-state.json');
  try {
    const stateData = await fs.readFile(stateFile, 'utf-8');
    const state = JSON.parse(stateData);
    return {
      stats: state.stats || defaults.stats,
      backups: state.backups || [],
      logs: state.logs || [],
    };
  } catch {
    await saveSyncState(dir, { stats: defaults.stats, backups: [], logs: [] });
    return { stats: defaults.stats, backups: [], logs: [] };
  }
}

export async function saveSyncState(dir: string, payload: { stats: SyncStats; backups: BackupInfo[]; logs: SyncLog[] }): Promise<void> {
  const stateFile = join(dir, 'sync-state.json');
  const state = {
    stats: payload.stats,
    backups: payload.backups,
    logs: payload.logs.slice(-100),
    timestamp: new Date(),
  };
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
}

export async function cleanupOldBackups(backupHistory: BackupInfo[], maxBackups: number): Promise<BackupInfo[]> {
  if (backupHistory.length <= maxBackups) return backupHistory;

  const sorted = [...backupHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const toDelete = sorted.splice(maxBackups);

  for (const b of toDelete) {
    try {
      await fs.unlink(b.filePath).catch(() => undefined);
    } catch {
      // ignore errors here
    }
  }

  return sorted;
}
