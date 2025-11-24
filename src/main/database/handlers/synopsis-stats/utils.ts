import type { PrismaClient } from '@prisma/client';
import { formatDateISO, getTodayStart } from '../../../../shared/utils/date';
import { calculateWordCount } from '../../../../shared/utils/text';
import type { DashboardSummary, ForeshadowSummary, TimelineEpisodeSummary } from '../../../../shared/types';

export type ChapterSnapshot = {
  id: string;
  title: string;
  wordCount: number | null;
  sortOrder: number | null;
  status: string | null;
  updatedAt: Date;
  episodeNumber?: number | null;
};

export type EpisodeWordMaps = {
  daily: Map<string, number>;
  totals: Map<string, number>;
};

export function buildDateRange(days: number): Date[] {
  const safeDays = Math.max(1, Math.floor(days));
  const today = getTodayStart();
  const range: Date[] = [];

  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    range.push(date);
  }

  return range;
}

export async function aggregateChapterWordCounts(prisma: PrismaClient, projectId: string, startDate: Date): Promise<Map<string, number>> {
  const chapters = await prisma.projectStructure.findMany({
    where: { projectId, type: 'chapter', isActive: true, updatedAt: { gte: startDate } },
    select: { updatedAt: true, wordCount: true, content: true },
  });

  const dailyWords = new Map<string, number>();

  chapters.forEach((chapter: { updatedAt: Date; wordCount: number | null; content?: string | null }) => {
    const key = formatDateISO(chapter.updatedAt);
    const current = dailyWords.get(key) ?? 0;
    dailyWords.set(key, current + resolveWordCount(chapter.wordCount, chapter.content));
  });

  if (dailyWords.size === 0) {
    const fallbackChapters = await prisma.projectStructure.findMany({ where: { projectId, type: 'chapter', isActive: true }, select: { updatedAt: true, wordCount: true, content: true } });
    const total = fallbackChapters.reduce((sum: number, chapter) => sum + resolveWordCount(chapter.wordCount, chapter.content), 0);
    if (total > 0) dailyWords.set(formatDateISO(getTodayStart()), total);
  }

  return dailyWords;
}

export function resolveWordCount(explicit: number | null | undefined, content: string | null | undefined): number {
  if (explicit && explicit > 0) return explicit;
  if (content) {
    const normalized = content.trim();
    if (normalized.length > 0) return calculateWordCount(normalized);
  }
  return explicit ?? 0;
}

export function mapHasPositiveWords(map: Map<string, { words: number; duration: number }>): boolean {
  for (const metrics of map.values()) {
    if (metrics.words > 0) return true;
  }
  return false;
}

export function mapHasPositiveNumbers(map: Map<string, number>): boolean {
  for (const value of map.values()) {
    if (value > 0) return true;
  }
  return false;
}

export function hasMeaningfulWordData(records: { wordCount: number }[]): boolean {
  return records.some(record => record.wordCount > 0);
}

export function snapshotsHaveMeaningfulData(snapshots: ChapterSnapshot[]): boolean {
  return snapshots.some(snapshot => (snapshot.wordCount ?? 0) > 0);
}

export function chooseChapterSnapshots(chapterSnapshots: ChapterSnapshot[], episodeSnapshots: ChapterSnapshot[]): ChapterSnapshot[] {
  const chapterTotal = chapterSnapshots.reduce((sum: number, snapshot) => sum + (snapshot.wordCount ?? 0), 0);
  const episodeTotal = episodeSnapshots.reduce((sum: number, snapshot) => sum + (snapshot.wordCount ?? 0), 0);

  if (snapshotsHaveMeaningfulData(chapterSnapshots)) {
    if (!snapshotsHaveMeaningfulData(episodeSnapshots)) return chapterSnapshots;
    if (chapterTotal >= episodeTotal) return chapterSnapshots;
  }

  if (snapshotsHaveMeaningfulData(episodeSnapshots)) return episodeSnapshots;

  return chapterSnapshots.length >= episodeSnapshots.length ? chapterSnapshots : episodeSnapshots;
}

export async function buildEpisodeWordMaps(prisma: PrismaClient, projectId: string, dateRange: Date[]): Promise<EpisodeWordMaps> {
  const startDate = dateRange[0] ?? getTodayStart();
  const episodes = await prisma.episode.findMany({ where: { projectId, isActive: true, updatedAt: { gte: startDate } }, select: { id: true, wordCount: true, updatedAt: true, content: true } });

  const daily = new Map<string, number>();
  const totals = new Map<string, number>();

  for (const episode of episodes) {
    const key = formatDateISO(episode.updatedAt);
    const words = resolveWordCount(episode.wordCount, episode.content);
    daily.set(key, (daily.get(key) ?? 0) + words);
    totals.set(episode.id, words);
  }

  if (!mapHasPositiveNumbers(daily)) {
    const aggregate = await prisma.episode.aggregate({ where: { projectId, isActive: true }, _sum: { wordCount: true } });
    const total = aggregate._sum.wordCount ?? 0;
    if (total > 0) daily.set(formatDateISO(getTodayStart()), total);
  }

  return { daily, totals };
}

export function mapStatusToAct(status: string): string | null {
  const mapping: Record<string, string> = {
    planned: 'intro', planning: 'intro', draft: 'development', drafting: 'development', 'in-progress': 'rising', writing: 'rising', completed: 'climax', finished: 'climax', published: 'conclusion', released: 'conclusion',
  };
  const normalized = status.replace(/[\s_]+/g, '-');
  return mapping[normalized] ?? null;
}

export function computeLastPublishedDate(chapters: Array<{ status: string; updatedAt: Date }>): Date | null {
  const published = chapters.filter(ch => ch.status.includes('publish') || ch.status === 'released').map(ch => ch.updatedAt);
  if (published.length === 0) return null;
  return published.reduce((latest, d) => (latest > d ? latest : d));
}

export function computeConsistencyScore(params: { totalEpisodes: number; completedEpisodes: number; unresolvedForeshadows: number; characterCount: number }): number {
  const { totalEpisodes, completedEpisodes, unresolvedForeshadows, characterCount } = params;
  const completionRatio = totalEpisodes === 0 ? 1 : completedEpisodes / totalEpisodes;
  const characterFactor = Math.min(1, (characterCount || 1) / 5);
  const foreshadowPenalty = Math.min(0.5, unresolvedForeshadows * 0.1);
  const score = (0.6 * completionRatio + 0.3 * characterFactor + 0.1) * 100 * (1 - foreshadowPenalty);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function isCompletedChapter(chapter: { status: string; wordCount: number }): boolean {
  if (chapter.wordCount >= 500) return true;
  const status = chapter.status;
  return status.includes('complete') || status.includes('finish') || status === 'done';
}

export function buildDashboardSummary(
  projectId: string,
  chapters: ChapterSnapshot[],
  characterCount: number,
  foreshadowNotes: Array<{ id: string; title: string; introducedEpisode: number | null; resolvedEpisode: number | null; importance: string | null }>
): DashboardSummary {
  const normalizedChapters = chapters.map((chapter, index) => {
    const wordCount = chapter.wordCount ?? 0;
    const sortOrder = chapter.sortOrder ?? chapter.episodeNumber ?? index;
    const episodeNumber = chapter.episodeNumber ?? index + 1;
    return {
      ...chapter,
      wordCount,
      sortOrder,
      status: (chapter.status ?? 'planned').toLowerCase(),
      episodeNumber,
    };
  });

  const totalEpisodes = normalizedChapters.length;
  const totalWordCount = normalizedChapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
  const completedEpisodes = normalizedChapters.filter(isCompletedChapter).length;
  const publishedEpisodes = normalizedChapters.filter(chapter => chapter.status.includes('publish') || chapter.status === 'released').length;
  const reserveEpisodes = Math.max(0, completedEpisodes - publishedEpisodes);
  const averageWordCount = totalEpisodes > 0 ? Math.round(totalWordCount / totalEpisodes) : 0;
  const unresolvedForeshadows = foreshadowNotes.filter(note => note.resolvedEpisode == null).length;
  const lastUpdated = normalizedChapters.reduce<Date | null>((latest, chapter) => {
    if (!latest || latest < chapter.updatedAt) {
      return chapter.updatedAt;
    }
    return latest;
  }, null) ?? new Date();

  const draftEpisodes = normalizedChapters.filter(chapter => chapter.status === 'planned' || chapter.status.includes('draft')).length;
  const inProgressEpisodes = normalizedChapters.filter(chapter => chapter.status.includes('progress') || chapter.status.includes('writing')).length;

  const reserves = {
    totalEpisodes,
    draftEpisodes,
    inProgressEpisodes,
    completedEpisodes,
    publishedEpisodes,
    reserveCount: reserveEpisodes,
    lastPublishedDate: computeLastPublishedDate(normalizedChapters),
    nextScheduledPublish: null,
    totalWordCount,
    averageWordCount,
  };

  const timelineEpisodes: TimelineEpisodeSummary[] = normalizedChapters
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      episodeNumber: chapter.episodeNumber,
      wordCount: chapter.wordCount,
      sortOrder: chapter.sortOrder ?? chapter.episodeNumber ?? 0,
      status: chapter.status,
      act: mapStatusToAct(chapter.status),
      updatedAt: chapter.updatedAt.toISOString(),
    }))
    .sort((a, b) => {
      const left = a.sortOrder ?? a.episodeNumber ?? 0;
      const right = b.sortOrder ?? b.episodeNumber ?? 0;
      if (left === right) {
        return (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0);
      }
      return left - right;
    });

  const foreshadows: ForeshadowSummary[] = foreshadowNotes.map(note => ({
    id: note.id,
    title: note.title,
    introducedEpisode: note.introducedEpisode ?? null,
    resolvedEpisode: note.resolvedEpisode ?? null,
    importance: note.importance ?? null,
  }));

  const consistencyScore = computeConsistencyScore({
    totalEpisodes,
    completedEpisodes,
    unresolvedForeshadows,
    characterCount,
  });

  return {
    projectId,
    totalEpisodes,
    completedEpisodes,
    publishedEpisodes,
    reserveEpisodes,
    totalWordCount,
    averageWordCount,
    characterCount,
    unresolvedForeshadows,
    consistencyScore,
    lastUpdated: lastUpdated.toISOString(),
    reserves,
    timelineEpisodes,
    foreshadows,
  };
}
