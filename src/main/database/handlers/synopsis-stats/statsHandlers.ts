import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { prismaService } from '../../services/PrismaService';
import { Logger } from '../../../../shared/logger';
import { resolveWordCount, hasMeaningfulWordData } from './utils';

const SYNOPSIS_STATS_HANDLER = Symbol.for('SYNOPSIS_STATS_HANDLER');

type ChapterStatsRecord = {
    status: string | null;
    wordCount: number | null;
    content?: string | null;
};

type EpisodeStatsRecord = {
    status: string | null;
    wordCount: number | null;
    content?: string | null;
};

type WordCountStatsRecord = {
    status: string;
    wordCount: number;
};

export function registerGetEpisodeStatsHandler() {
    ipcMain.handle('synopsis:getEpisodeStats', async (_event: IpcMainInvokeEvent, projectId: string) => {
        try {
            const prisma = await prismaService.getClient();

            const chapterRecords = await prisma.projectStructure.findMany({
                where: {
                    projectId,
                    type: 'chapter',
                    isActive: true,
                },
                select: {
                    status: true,
                    wordCount: true,
                    content: true,
                },
            }) as ChapterStatsRecord[];

            let statsSource: WordCountStatsRecord[] = chapterRecords.map((record: ChapterStatsRecord): WordCountStatsRecord => ({
                status: (record.status ?? 'planned').toLowerCase(),
                wordCount: resolveWordCount(record.wordCount, record.content),
            }));

            if (!hasMeaningfulWordData(statsSource)) {
                const episodes = await prisma.episode.findMany({
                    where: {
                        projectId,
                        isActive: true,
                    },
                    select: {
                        status: true,
                        wordCount: true,
                        content: true,
                    },
                }) as EpisodeStatsRecord[];

                statsSource = episodes.map((episode: EpisodeStatsRecord): WordCountStatsRecord => ({
                    status: (episode.status ?? 'draft').toLowerCase(),
                    wordCount: resolveWordCount(episode.wordCount, episode.content),
                }));
            }

            const statusToAct: Record<string, string> = {
                planned: 'intro',
                planning: 'intro',
                'in-progress': 'rising',
                in_progress: 'rising',
                writing: 'rising',
                drafting: 'development',
                draft: 'development',
                completed: 'climax',
                finished: 'climax',
                published: 'conclusion',
                released: 'conclusion',
            };

            const acts = ['intro', 'rising', 'development', 'climax', 'conclusion'];
            const actLabels = { intro: '도입', rising: '발단', development: '전개', climax: '절정', conclusion: '결말' };
            const actColors = { intro: '#3b82f6', rising: '#10b981', development: '#eab308', climax: '#ef4444', conclusion: '#8b5cf6' };

            return acts.map((act) => {
                const actChapters = statsSource.filter((entry: WordCountStatsRecord) => statusToAct[entry.status] === act);
                const count = actChapters.length;
                const avgWords = count > 0
                    ? Math.round(
                        actChapters.reduce((sum: number, entry: WordCountStatsRecord) => sum + entry.wordCount, 0) / count
                    )
                    : 0;

                return {
                    act: actLabels[act as keyof typeof actLabels],
                    count,
                    avgWords,
                    color: actColors[act as keyof typeof actColors],
                };
            });
        } catch (error) {
            Logger.error(SYNOPSIS_STATS_HANDLER, 'Error fetching episode stats', { projectId, error });
            throw error;
        }
    });
}
