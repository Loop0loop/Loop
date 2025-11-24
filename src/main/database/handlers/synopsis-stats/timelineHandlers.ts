import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { prismaService } from '../../services/PrismaService';
import { Logger } from '../../../../shared/logger';
import { formatDateISO, formatDateShort } from '../../../../shared/utils/date';
import { buildDateRange, aggregateChapterWordCounts, buildEpisodeWordMaps, mapHasPositiveNumbers } from './utils';

const SYNOPSIS_STATS_HANDLER = Symbol.for('SYNOPSIS_STATS_HANDLER');

export function registerGetProgressTimelineHandler() {
    ipcMain.handle('synopsis:getProgressTimeline', async (_event: IpcMainInvokeEvent, projectId: string, days: number = 30) => {
        try {
            const prisma = await prismaService.getClient();
            const dateRange = buildDateRange(days);
            const startDate = dateRange[0]!;

            const activities = await prisma.writingActivity.findMany({
                where: {
                    projectId,
                    date: {
                        gte: startDate,
                    },
                },
                orderBy: {
                    date: 'asc',
                },
                select: {
                    date: true,
                    wordCount: true,
                },
            });

            const dailyWords = new Map<string, number>();

            for (const activity of activities) {
                const key = formatDateISO(activity.date);
                dailyWords.set(key, activity.wordCount);
            }

            if (dailyWords.size === 0) {
                const fallbackMap = await aggregateChapterWordCounts(prisma, projectId, startDate);
                fallbackMap.forEach((words, key) => {
                    dailyWords.set(key, words);
                });
            }

            if (!mapHasPositiveNumbers(dailyWords)) {
                const episodeWordMaps = await buildEpisodeWordMaps(prisma, projectId, dateRange);
                dailyWords.clear();
                episodeWordMaps.daily.forEach((words: number, key: string) => {
                    dailyWords.set(key, words);
                });
            }

            let cumulative = 0;
            return dateRange.map((date: Date) => {
                const key = formatDateISO(date);
                const dailyTotal = dailyWords.get(key) ?? 0;
                cumulative += dailyTotal;
                return {
                    date: formatDateShort(date),
                    words: cumulative,
                };
            });
        } catch (error) {
            Logger.error(SYNOPSIS_STATS_HANDLER, 'Error fetching progress timeline', { projectId, days, error });
            throw error;
        }
    });
}
