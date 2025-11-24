import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

export interface BackupInfo {
  id: string;
  path: string;
  size: number;
  created: Date;
  checksum: string;
}

export async function createBackup(userDataPath: string): Promise<BackupInfo> {
  const backupDir = join(userDataPath, 'backups');
  try {
    await fsPromises.access(backupDir);
  } catch {
    await fsPromises.mkdir(backupDir, { recursive: true });
  }

  const dbPath = join(userDataPath, 'database.db');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `loop_backup_${timestamp}.db`;
  const backupPath = join(backupDir, backupFileName);

  try {
    await fsPromises.access(dbPath);
  } catch {
    throw new Error('Database file not found');
  }

  await fsPromises.copyFile(dbPath, backupPath);
  const stats = await fsPromises.stat(backupPath);
  const backupData = await fsPromises.readFile(backupPath);
  const checksum = createHash('sha256').update(backupData).digest('hex');

  return {
    id: `backup_${Date.now()}`,
    path: backupPath,
    size: stats.size,
    created: new Date(),
    checksum,
  };
}
