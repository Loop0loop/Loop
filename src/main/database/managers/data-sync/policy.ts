import { Logger } from '../../../../shared/logger';
import type { DataRetentionSettingsSchema } from '../../../settings/types';

export function applyRetentionPolicy(policy: DataRetentionSettingsSchema) {
  Logger.info('DATA_SYNC_POLICY', 'Retention policy applied', policy);

  const retentionPeriod = policy.retentionPeriod;
  const autoCleanup = policy.autoDeleteOldData;

  Logger.debug('DATA_SYNC_POLICY', `Retention period set to: ${retentionPeriod} days`);
  Logger.debug('DATA_SYNC_POLICY', `Auto cleanup ${autoCleanup ? 'enabled' : 'disabled'}`);

  if (policy.typingData?.enabled) {
    Logger.debug('DATA_SYNC_POLICY', `Typing data retention: ${policy.typingData.retentionDays} days`);
  }

  if (policy.keystrokeData?.enabled) {
    Logger.debug('DATA_SYNC_POLICY', `Keystroke data retention: ${policy.keystrokeData.retentionDays} days`);
  }
}

export default { applyRetentionPolicy };
