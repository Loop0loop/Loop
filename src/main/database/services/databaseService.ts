// 🔥 DatabaseService (compat facade)
// Backwards-compatible facade for legacy callers. Delegates work to smaller, testable
// services (PrismaService, TypingSessionService, ProjectService, UserPreferencesService,
// AnalyticsService) to keep the public API stable while the codebase migrates.

import { Logger } from '../../../shared/logger';
import { createSuccess, createError, type Result } from '../../../shared/common';
import type { TypingSession, TypingStats, UserPreferences } from '../../../shared/types';
import { prismaService } from './PrismaService';

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private prisma: unknown | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) DatabaseService.instance = new DatabaseService();
    return DatabaseService.instance;
  }

  public async initialize(): Promise<Result<boolean>> {
    try {
      Logger.debug('DATABASE', 'Initializing database (compat facade)');
      const client = await prismaService.getClient();
      this.prisma = client;
      this.isConnected = true;
      Logger.info('DATABASE', 'Database facade initialized');
      return createSuccess(true);
    } catch (err) {
      Logger.error('DATABASE', 'Failed to initialize database', err);
      return createError(err instanceof Error ? err.message : 'Database initialization failed');
    }
  }

  public async disconnect(): Promise<Result<boolean>> {
    try {
      if (!this.prisma || !this.isConnected) return createSuccess(true);

      Logger.debug('DATABASE', 'Disconnecting from database');
      try {
        await prismaService.disconnect();
      } catch (err) {
        Logger.warn('DATABASE', 'PrismaService.disconnect failed', err);
      }

      this.isConnected = false;
      this.prisma = null;
      Logger.info('DATABASE', 'Database disconnected successfully');
      return createSuccess(true);
    } catch (err) {
      Logger.error('DATABASE', 'Failed to disconnect from database', err);
      return createError(err instanceof Error ? err.message : 'Database disconnect failed');
    }
  }

  public async saveTypingSession(session: Omit<TypingSession, 'id'>): Promise<Result<string>> {
    try {
      if (!this.ensureConnection()) throw new Error('Database not connected');

      Logger.debug('DATABASE', 'Saving typing session (delegating)');
      const { typingSessionService } = await import('./typingSessionService');
      return typingSessionService.saveTypingSession(session) as any;
    } catch (err) {
      Logger.error('DATABASE', 'Failed to save typing session', err);
      return createError(err instanceof Error ? err.message : 'Failed to save session');
    }
  }

  public async getTypingSessions(limit = 100, offset = 0): Promise<Result<TypingSession[]>> {
    try {
      if (!this.ensureConnection()) throw new Error('Database not connected');
      Logger.debug('DATABASE', 'Fetching typing sessions (delegating)', { limit, offset });
      const { typingSessionService } = await import('./typingSessionService');
      return typingSessionService.getTypingSessions(limit, offset) as any;
    } catch (err) {
      Logger.error('DATABASE', 'Failed to fetch typing sessions', err);
      return createError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    }
  }

  public async deleteTypingSession(sessionId: string): Promise<Result<boolean>> {
    try {
      if (!this.ensureConnection()) throw new Error('Database not connected');
      Logger.debug('DATABASE', 'Deleting typing session (delegating)', { sessionId });
      const { typingSessionService } = await import('./typingSessionService');
      return typingSessionService.deleteTypingSession(sessionId) as any;
    } catch (err) {
      Logger.error('DATABASE', 'Failed to delete typing session', err);
      return createError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }

  public async getTypingStats(days = 30): Promise<Result<TypingStats>> {
    try {
      if (!this.ensureConnection()) throw new Error('Database not connected');
      Logger.debug('DATABASE', 'Calculating typing stats (delegating)', { days });
      const { typingSessionService } = await import('./typingSessionService');
      return typingSessionService.getTypingStats(days) as any;
    } catch (err) {
      Logger.error('DATABASE', 'Failed to calculate typing stats', err);
      return createError(err instanceof Error ? err.message : 'Failed to calculate stats');
    }
  }

  public async saveUserPreferences(preferences: UserPreferences): Promise<Result<boolean>> {
    try {
      if (!this.ensureConnection()) throw new Error('Database not connected');
      Logger.debug('DATABASE', 'Saving user preferences (delegating)');
      const { userPreferencesService } = await import('./userPreferencesService');
      return userPreferencesService.saveUserPreferences(preferences as any) as any;
    } catch (err) {
      Logger.error('DATABASE', 'Failed to save user preferences', err);
      return createError(err instanceof Error ? err.message : 'Failed to save preferences');
    }
  }

  public async getUserPreferences(): Promise<Result<UserPreferences | null>> {
    try {
      if (!this.ensureConnection()) throw new Error('Database not connected');
      Logger.debug('DATABASE', 'Fetching user preferences (delegating)');
      const { userPreferencesService } = await import('./userPreferencesService');
      return userPreferencesService.getUserPreferences() as any;
    } catch (err) {
      Logger.error('DATABASE', 'Failed to fetch user preferences', err);
      return createError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    }
  }

  public async healthCheck(): Promise<Result<{ connected: boolean; latency: number }>> {
    try {
      if (!this.prisma) return createSuccess({ connected: false, latency: 0 });

      const startTime = Date.now();
      const ok = await prismaService.healthCheck();
      const latency = Date.now() - startTime;
      return createSuccess({ connected: Boolean(ok), latency: ok ? latency : -1 });
    } catch (err) {
      Logger.error('DATABASE', 'Database health check failed', err);
      return createSuccess({ connected: false, latency: -1 });
    }
  }

  public async getAnalyticsData(): Promise<Result<any>> {
    try {
      if (!this.ensureConnection()) throw new Error('Database not connected');
      Logger.debug('DATABASE', 'Delegating analytics request to AnalyticsService');
      const { analyticsService } = await import('./analyticsService');
      return analyticsService.getAnalyticsData() as any;
    } catch (err) {
      Logger.error('DATABASE', 'Failed to get analytics data (delegation)', err);
      return createError(err instanceof Error ? err.message : 'Failed to get analytics data');
    }
  }

  public async getProjectsData(): Promise<Result<any[]>> {
    try {
      if (!this.ensureConnection()) throw new Error('Database not connected');
      const { projectService } = await import('./projectService');
      return projectService.getProjectsData();
    } catch (err) {
      Logger.error('DATABASE', 'Failed to get projects data (delegation)', err);
      return createError(err instanceof Error ? err.message : 'Failed to get projects');
    }
  }

  public async getCharactersData(): Promise<Result<any[]>> {
    try {
      if (!this.ensureConnection()) throw new Error('Database not connected');
      const { projectService } = await import('./projectService');
      return projectService.getCharactersData();
    } catch (err) {
      Logger.error('DATABASE', 'Failed to get characters data (delegation)', err);
      return createError(err instanceof Error ? err.message : 'Failed to get characters');
    }
  }

  public async getRecentSessions(days = 7): Promise<Result<any[]>> {
    try {
      if (!this.ensureConnection()) throw new Error('Database not connected');
      Logger.debug('DATABASE', 'Getting recent sessions (delegating)', { days });
      const { typingSessionService } = await import('./typingSessionService');
      return typingSessionService.getRecentSessions(days) as any;
    } catch (err) {
      Logger.error('DATABASE', 'Failed to get recent sessions', err);
      return createError(err instanceof Error ? err.message : 'Failed to get recent sessions');
    }
  }

  private ensureConnection(): boolean {
    if (!this.prisma || !this.isConnected) {
      Logger.warn('DATABASE', 'Database not connected');
      return false;
    }
    return true;
  }
}

export const databaseService = DatabaseService.getInstance();
Logger.debug('DATABASE', 'Database service module setup complete');
export default databaseService;

