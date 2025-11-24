import type { SyncDataItem, SyncConflict, SyncStats } from './types';
import { hasConflict, determineConflictType, mergeItems } from './engine';
import { Logger } from '../../../../shared/logger';

/**
 * Detect conflicts between local and remote change sets.
 */
export function detectConflicts(localChanges: SyncDataItem[], remoteChanges: SyncDataItem[]): SyncConflict[] {
  const conflicts: SyncConflict[] = [];

  for (const local of localChanges) {
    const remote = remoteChanges.find(r => r.id === local.id);
    if (remote && hasConflict(local, remote)) {
      conflicts.push({
        id: `conflict_${local.id}_${Date.now()}`,
        localItem: local,
        remoteItem: remote,
        conflictType: determineConflictType(local, remote),
      } as SyncConflict);
    }
  }

  return conflicts;
}

/**
 * Resolve a single conflict according to the chosen strategy. Updates stats and queue as required.
 */
export async function resolveConflict(
  conflict: SyncConflict,
  strategy: SyncConflict['conflictType'] | 'local' | 'remote' | 'merge' | 'manual',
  stats?: SyncStats,
  conflictQueue?: SyncConflict[]
): Promise<void> {
  switch (strategy) {
    case 'local':
      conflict.resolvedItem = conflict.localItem;
      break;
    case 'remote':
      conflict.resolvedItem = conflict.remoteItem;
      break;
    case 'merge':
      conflict.resolvedItem = await mergeItems(conflict.localItem, conflict.remoteItem);
      break;
    case 'manual':
      conflictQueue?.push(conflict);
      return;
    default:
      conflict.resolvedItem = conflict.localItem;
      break;
  }

  conflict.resolution = strategy as any;
  if (stats) stats.conflictsResolved = (stats.conflictsResolved || 0) + 1;

  Logger.debug('DATA_SYNC_RESOLVER', 'Conflict resolved', { id: conflict.id, strategy });
}

/**
 * Resolve multiple conflicts using the default resolution strategy.
 */
export async function resolveConflicts(conflicts: SyncConflict[], defaultStrategy: 'local' | 'remote' | 'merge' | 'manual', stats?: SyncStats, conflictQueue?: SyncConflict[]) {
  for (const c of conflicts) {
    await resolveConflict(c, defaultStrategy, stats, conflictQueue);
  }
}

export default { detectConflicts, resolveConflict, resolveConflicts };
