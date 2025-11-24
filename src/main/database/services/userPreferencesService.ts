import { Logger } from '../../../shared/logger';
import { createSuccess, createError } from '../../../shared/common';
import type { UserPreferences } from '../../../shared/types';
import { prismaService } from './PrismaService';

export class UserPreferencesService {
  private static instance: UserPreferencesService | null = null;

  public static getInstance(): UserPreferencesService {
    if (!UserPreferencesService.instance) UserPreferencesService.instance = new UserPreferencesService();
    return UserPreferencesService.instance;
  }

  private constructor() {}

  public async saveUserPreferences(preferences: UserPreferences) {
    try {
      const client = await prismaService.getClient();
      Logger.debug('PREFERENCES_SVC', 'Saving user preferences', { type: typeof preferences });

      let parsed = preferences as any;
      if (typeof preferences === 'string') {
        try { parsed = JSON.parse(preferences); } catch (e) { throw new Error('Invalid preferences'); }
      }

      const settingsData = {
        theme: (typeof parsed.theme === 'string' ? parsed.theme : 'light'),
        language: (typeof parsed.language === 'string' ? parsed.language : 'ko'),
        keyboardLayout: parsed.keyboardLayout ?? 'qwerty',
        showRealTimeWpm: parsed.showRealTimeWpm ?? true,
        enableSounds: Boolean(parsed.enableSounds ?? false),
        autoSaveInterval: parsed.autoSaveInterval ?? 30,
        privacyMode: Boolean(parsed.privacyMode ?? false),
        monitoringEnabled: Boolean(parsed.monitoringEnabled ?? true),
        targetWpm: parsed.targetWpm ?? 60,
        sessionGoalMinutes: parsed.sessionGoalMinutes ?? 30,
      } as any;

      await client.$executeRaw`
        INSERT OR IGNORE INTO users (id, username, email, createdAt, updatedAt)
        VALUES ('default', 'default_user', 'default@loop.app', datetime('now'), datetime('now'))
      `;

      await client.userSettings.upsert({
        where: { userId: 'default' },
        create: { userId: 'default', ...settingsData },
        update: { ...settingsData },
      });

      Logger.info('PREFERENCES_SVC', 'User preferences saved');
      return createSuccess(true);
    } catch (err) {
      Logger.error('PREFERENCES_SVC', 'Failed to save preferences', err);
      return createError(err instanceof Error ? err.message : 'Failed to save preferences');
    }
  }

  public async getUserPreferences() {
    try {
      const client = await prismaService.getClient();
      Logger.debug('PREFERENCES_SVC', 'Fetching user preferences');

      const preferences = await client.userSettings.findUnique({ where: { userId: 'default' } });
      return createSuccess(preferences as UserPreferences | null);
    } catch (err) {
      Logger.error('PREFERENCES_SVC', 'Failed to fetch preferences', err);
      return createError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    }
  }
}

export const userPreferencesService = UserPreferencesService.getInstance();
