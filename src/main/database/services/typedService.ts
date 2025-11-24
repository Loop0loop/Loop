import { createSuccess, createError, type Result } from '../../../shared/common';
import type { TypingSession, TypingStats, UserPreferences, Project, ProjectCharacter } from '../../../shared/types';
import underlyingService from './databaseService';

/**
 * Typed adapter around the legacy databaseService.
 * PR-03 step: provide strong TS signatures while delegating to existing implementations.
 */
export async function initialize(): Promise<Result<boolean>> {
  try {
    const res = await underlyingService.initialize();
    return res;
  } catch (err) {
    return createError(err instanceof Error ? err.message : 'initialize failed');
  }
}

export async function disconnect(): Promise<Result<boolean>> {
  try {
    return await underlyingService.disconnect();
  } catch (err) {
    return createError(err instanceof Error ? err.message : 'disconnect failed');
  }
}

export async function saveTypingSession(session: Omit<TypingSession, 'id'>): Promise<Result<string>> {
  return underlyingService.saveTypingSession(session);
}

export async function getTypingSessions(limit = 100, offset = 0): Promise<Result<TypingSession[]>> {
  return underlyingService.getTypingSessions(limit, offset);
}

export async function deleteTypingSession(sessionId: string): Promise<Result<boolean>> {
  return underlyingService.deleteTypingSession(sessionId);
}

export async function getTypingStats(days = 30): Promise<Result<TypingStats>> {
  return underlyingService.getTypingStats(days);
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<Result<boolean>> {
  return underlyingService.saveUserPreferences(prefs);
}

export async function getUserPreferences(): Promise<Result<UserPreferences | null>> {
  return underlyingService.getUserPreferences();
}

export async function healthCheck(): Promise<Result<{ connected: boolean; latency: number }>> {
  return underlyingService.healthCheck();
}

// Analytics functions
export async function getAnalyticsData(): Promise<Result<any>> {
  return underlyingService.getAnalyticsData();
}

export async function getProjectsData(): Promise<Result<Project[]>> {
  return underlyingService.getProjectsData();
}

export async function getCharactersData(): Promise<Result<ProjectCharacter[]>> {
  return underlyingService.getCharactersData();
}

export async function getRecentSessions(days = 7): Promise<Result<any[]>> {
  return underlyingService.getRecentSessions(days);
}

export default {
  initialize,
  disconnect,
  saveTypingSession,
  getTypingSessions,
  deleteTypingSession,
  getTypingStats,
  saveUserPreferences,
  getUserPreferences,
  healthCheck,
  getAnalyticsData,
  getProjectsData,
  getCharactersData,
  getRecentSessions,
};
