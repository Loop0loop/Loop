import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { prismaService } from '../../services/PrismaService';
import { Logger } from '../../../../shared/logger';
import { buildDateRange, aggregateChapterWordCounts, buildEpisodeWordMaps, mapHasPositiveWords } from './utils';
import { formatDateISO } from '../../../../shared/utils/date';

export function registerSynopsisWritingHandlers() {
  ipcMain.handle('synopsis:getWritingActivity', async (_event: IpcMainInvokeEvent, projectId: string, days: number = 7) => {
    try {
      const prisma = await prismaService.getClient();
      const dateRange = buildDateRange(days);
      const startDate = dateRange[0]!;

      const activities = await prisma.writingActivity.findMany({
        where: { projectId, date: { gte: startDate } },
        orderBy: { date: 'asc' },
        select: { date: true, wordCount: true, duration: true },
      });

      const activityMap = new Map<string, { words:number; duration:number }>();
      for (const activity of activities) activityMap.set(formatDateISO(activity.date), { words: activity.wordCount, duration: activity.duration });

      if (activityMap.size === 0) {
        const fallbackMap = await aggregateChapterWordCounts(prisma, projectId, startDate);
        fallbackMap.forEach((words, key) => activityMap.set(key, { words, duration: 0 }));
      }

      if (!mapHasPositiveWords(activityMap)) {
        const episodeWordMaps = await buildEpisodeWordMaps(prisma, projectId, dateRange);
        episodeWordMaps.daily.forEach((words: number, key: string) => {
          const duration = activityMap.get(key)?.duration ?? 0;
          activityMap.set(key, { words, duration });
        });
      }

      return dateRange.map((date: Date) => {
        const key = formatDateISO(date);
        const metrics = activityMap.get(key);
        return { date: key, words: metrics?.words ?? 0, duration: metrics?.duration ?? 0 };
      });
    } catch (error) {
      Logger.error('SYNOPSIS_STATS', 'Error fetching writing activity', { projectId, days, error });
      throw error;
    }
  });

  ipcMain.handle('synopsis:recordWritingActivity', async (_event: IpcMainInvokeEvent, projectId: string, wordCount: number, duration: number, episodeId?: string) => {
    try {
      const prisma = await prismaService.getClient();
      // Reuse writingActivity util from original module
      const { recordDailyWritingActivity } = await import('../../utils/writingActivity');
      await recordDailyWritingActivity(prisma, projectId, wordCount, duration, /* getTodayStart */ (await import('../../../../shared/utils/date')).getTodayStart(), episodeId);
      return { success: true };
    } catch (error) {
      Logger.error('SYNOPSIS_STATS', 'Error recording writing activity', { projectId, wordCount, duration, episodeId, error });
      throw error;
    }
  });
}
