import { Logger } from '../../../shared/logger';
import { createSuccess, createError } from '../../../shared/common';
import type { TypingSession, TypingStats } from '../../../shared/types';
import { prismaService } from './PrismaService';

export class TypingSessionService {
  private static instance: TypingSessionService | null = null;

  public static getInstance(): TypingSessionService {
    if (!TypingSessionService.instance) TypingSessionService.instance = new TypingSessionService();
    return TypingSessionService.instance;
  }

  private constructor() {}

  public async saveTypingSession(session: Omit<TypingSession, 'id'>) {
    try {
      const client = await prismaService.getClient();
      Logger.debug('TYPING_SVC', 'Saving typing session', { userId: session.userId, keyCount: session.keyCount });

      const result = await client.typingSession.create({ data: {
        userId: session.userId,
        content: session.content,
        startTime: session.startTime,
        endTime: session.endTime,
        keyCount: session.keyCount,
        wpm: session.wpm,
        accuracy: session.accuracy,
        windowTitle: session.windowTitle,
        appName: session.appName,
      }});

      const sessionId = result && (result as any).id ? String((result as any).id) : 'unknown';
      Logger.info('TYPING_SVC', 'Typing session saved', { id: sessionId });
      return createSuccess(sessionId);
    } catch (err) {
      Logger.error('TYPING_SVC', 'Failed to save typing session', err);
      return createError(err instanceof Error ? err.message : 'Failed to save session');
    }
  }

  public async getTypingSessions(limit = 100, offset = 0) {
    try {
      const client = await prismaService.getClient();
      Logger.debug('TYPING_SVC', 'Fetching typing sessions', { limit, offset });

      const sessions = await client.typingSession.findMany({
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset,
      });

      return createSuccess(sessions as TypingSession[]);
    } catch (err) {
      Logger.error('TYPING_SVC', 'Failed to fetch typing sessions', err);
      return createError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    }
  }

  public async getRecentSessions(days = 7) {
    try {
      const client = await prismaService.getClient();
      Logger.debug('TYPING_SVC', 'Fetching recent sessions', { days });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const sessions = await client.typingSession.findMany({
        where: { startTime: { gte: cutoffDate } },
        orderBy: { startTime: 'desc' }
      });

      return createSuccess(sessions as TypingSession[]);
    } catch (err) {
      Logger.error('TYPING_SVC', 'Failed to fetch recent sessions', err);
      return createError(err instanceof Error ? err.message : 'Failed to fetch recent sessions');
    }
  }

  public async deleteTypingSession(sessionId: string) {
    try {
      const client = await prismaService.getClient();
      Logger.debug('TYPING_SVC', 'Deleting typing session', { sessionId });

      const deleted = await client.typingSession.delete({ where: { id: sessionId } });
      return createSuccess(Boolean(deleted));
    } catch (err) {
      Logger.error('TYPING_SVC', 'Failed to delete typing session', err);
      return createError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }

  public async getTypingStats(days = 30) {
    try {
      const client = await prismaService.getClient();
      Logger.debug('TYPING_SVC', 'Calculating typing stats for days', { days });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const sessions = await client.typingSession.findMany({ where: { startTime: { gte: cutoffDate } } });

      // calculate basic aggregates
      // compute detailed stats similar to DatabaseService.calculateStats
      let totalKeystrokes = 0;
      let totalWpm = 0;
      let totalAccuracy = 0;
      let totalDuration = 0;

      for (const session of sessions) {
        if (session && typeof session === 'object') {
          totalKeystrokes += Number((session as any).keyCount || 0);
          totalWpm += Number((session as any).wpm || 0);
          totalAccuracy += Number((session as any).accuracy || 0);
          const start = (session as any).startTime ? new Date((session as any).startTime) : new Date();
          const end = (session as any).endTime ? new Date((session as any).endTime) : new Date();
          totalDuration += end.getTime() - start.getTime();
        }
      }

      const avgWpm = sessions.length ? totalWpm / sessions.length : 0;
      const avgAccuracy = sessions.length ? totalAccuracy / sessions.length : 0;
      const charactersTyped = Math.floor(totalKeystrokes * 0.8);
      const wordsTyped = Math.floor(charactersTyped / 5);
      const errorsCount = Math.floor(totalKeystrokes * (1 - avgAccuracy / 100));

      const stats: TypingStats = {
        totalKeystrokes,
        wpm: Math.round(avgWpm * 100) / 100,
        accuracy: Math.round(avgAccuracy * 100) / 100,
        sessionDuration: totalDuration,
        charactersTyped,
        wordsTyped,
        errorsCount,
      };

      return createSuccess(stats);
    } catch (err) {
      Logger.error('TYPING_SVC', 'Failed to calculate typing stats', err);
      return createError(err instanceof Error ? err.message : 'Failed to calculate stats');
    }
  }
}

export const typingSessionService = TypingSessionService.getInstance();
