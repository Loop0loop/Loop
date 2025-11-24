import { Logger } from '../../../shared/logger';
import { createSuccess, createError } from '../../../shared/common';
import { PrismaService } from './PrismaService';

/**
 * AnalyticsService
 * Responsible for aggregating projects, characters and session stats into a single structure.
 * Uses other services (projectService, typingSessionService) to fetch data and performs calculations.
 */
export class AnalyticsService {
  private static instance: AnalyticsService | null = null;

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) AnalyticsService.instance = new AnalyticsService();
    return AnalyticsService.instance;
  }

  private constructor() {}

  private calculateStats(sessions: any[]) {
    if (!sessions || sessions.length === 0) {
      return {
        totalKeystrokes: 0,
        wpm: 0,
        accuracy: 0,
        sessionDuration: 0,
        charactersTyped: 0,
        wordsTyped: 0,
        errorsCount: 0,
      };
    }

    let totalKeystrokes = 0;
    let totalWpm = 0;
    let totalAccuracy = 0;
    let totalDuration = 0;

    for (const s of sessions) {
      totalKeystrokes += Number(s.keyCount || 0);
      totalWpm += Number(s.wpm || 0);
      totalAccuracy += Number(s.accuracy || 0);
      const start = s.startTime ? new Date(s.startTime) : new Date();
      const end = s.endTime ? new Date(s.endTime) : new Date();
      totalDuration += end.getTime() - start.getTime();
    }

    const avgWpm = totalWpm / sessions.length;
    const avgAccuracy = totalAccuracy / sessions.length;
    const charactersTyped = Math.floor(totalKeystrokes * 0.8);
    const wordsTyped = Math.floor(charactersTyped / 5);
    const errorsCount = Math.floor(totalKeystrokes * (1 - avgAccuracy / 100));

    return {
      totalKeystrokes,
      wpm: Math.round(avgWpm * 100) / 100,
      accuracy: Math.round(avgAccuracy * 100) / 100,
      sessionDuration: totalDuration,
      charactersTyped,
      wordsTyped,
      errorsCount,
    };
  }

  public async getAnalyticsData() {
    try {
      const projectSvc = (await import('./projectService')).projectService;
      const typingSvc = (await import('./typingSessionService')).typingSessionService;

      Logger.debug('ANALYTICS_SVC', 'Fetching projects, characters and sessions for analytics');

      const [projectsRes, charactersRes, sessionsRes, recentSessionsRes] = await Promise.all([
        projectSvc.getProjectsData(),
        projectSvc.getCharactersData(),
        typingSvc.getTypingSessions(100, 0),
        typingSvc.getRecentSessions(7),
      ]);

      if (!projectsRes.success) throw new Error(projectsRes.error || 'projects fetch failed');
      if (!charactersRes.success) throw new Error(charactersRes.error || 'characters fetch failed');
      if (!sessionsRes.success) throw new Error(sessionsRes.error || 'sessions fetch failed');
      if (!recentSessionsRes.success) throw new Error(recentSessionsRes.error || 'recent sessions fetch failed');

      const projects = projectsRes.data || [];
      const characters = charactersRes.data || [];
      const sessions = sessionsRes.data || [];
      const recentSessions = recentSessionsRes.data || [];

      // create aggregate stats
      const stats: any = {
        totalProjects: projects.length,
        activeProjects: projects.filter((p: any) => p.status === 'active').length,
        completedProjects: projects.filter((p: any) => p.status === 'completed').length,
        totalWords: projects.reduce((sum: number, p: any) => sum + (p.wordCount || 0), 0),

        totalCharacters: characters.length,
        charactersByRole: characters.reduce((acc: Record<string, number>, c: any) => {
          acc[c.role || 'unknown'] = (acc[c.role || 'unknown'] || 0) + 1;
          return acc;
        }, {}),

        totalSessions: sessions.length,
        avgWpm: sessions.length > 0 ? sessions.reduce((sum: number, s: any) => sum + (s.wpm || 0), 0) / sessions.length : 0,
        avgAccuracy: sessions.length > 0 ? sessions.reduce((sum: number, s: any) => sum + (s.accuracy || 0), 0) / sessions.length : 0,

        weeklyWords: recentSessions.reduce((sum: number, s: any) => sum + (s.keyCount || 0), 0),
        weeklyAvgWpm: recentSessions.length > 0 ? recentSessions.reduce((sum: number, s: any) => sum + (s.wpm || 0), 0) / recentSessions.length : 0,
        todayWords: recentSessions.filter((s: any) => {
          const today = new Date();
          const sd = new Date(s.startTime);
          return sd.toDateString() === today.toDateString();
        }).reduce((sum: number, s: any) => sum + (s.keyCount || 0), 0),

        topProjects: (projects || []).slice().sort((a: any, b: any) => (b.wordCount || 0) - (a.wordCount || 0)).slice(0, 5),
        characterDetails: (characters || []).slice(0, 10),
        recentActivity: (recentSessions || []).slice(0, 10),
      };

      const insights: any[] = [];
      const topProject = stats.topProjects[0];
      if (topProject) {
        insights.push({
          id: 'top-project',
          type: 'achievement',
          title: `\'${topProject.title}\'이 가장 활발한 프로젝트입니다`,
          description: `${(topProject.wordCount || 0).toLocaleString()}단어 작성`,
          action: '프로젝트 상세보기',
          priority: 'high',
          actionable: true,
        });
      }

      if (stats.avgWpm > 0) {
        const wpmLevel = stats.avgWpm > 80 ? '높음' : stats.avgWpm > 60 ? '보통' : '개선 필요';
        insights.push({
          id: 'wpm-analysis',
          type: 'performance',
          title: `평균 타이핑 속도가 ${wpmLevel} 수준입니다`,
          description: `분당 ${Math.round(stats.avgWpm)}단어, 정확도 ${Math.round(stats.avgAccuracy)}%`,
          action: '타이핑 연습하기',
          priority: stats.avgWpm > 70 ? 'medium' : 'high',
          actionable: true,
        });
      }

      const result = { ...stats, insights, generatedAt: new Date().toISOString(), hasData: projects.length > 0 || sessions.length > 0 };

      return createSuccess(result);
    } catch (err) {
      Logger.error('ANALYTICS_SVC', 'getAnalyticsData failed', err);
      return createError(err instanceof Error ? err.message : 'Failed to compute analytics');
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();
