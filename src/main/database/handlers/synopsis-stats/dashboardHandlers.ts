import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { prismaService } from '../../services/PrismaService';
import { Logger } from '../../../../shared/logger';
import { resolveWordCount, chooseChapterSnapshots, buildDashboardSummary } from './utils';

const SYNOPSIS_STATS_HANDLER = Symbol.for('SYNOPSIS_STATS_HANDLER');

type ChapterSnapshot = {
    id: string;
    title: string;
    wordCount: number | null;
    sortOrder: number | null;
    status: string | null;
    updatedAt: Date;
    episodeNumber?: number | null;
};

type ChapterOverviewRecord = {
    id: string;
    title: string;
    wordCount: number | null;
    sortOrder: number | null;
    status: string | null;
    updatedAt: Date;
    content?: string | null;
};

type EpisodeOverviewRecord = {
    id: string;
    title: string;
    wordCount: number | null;
    sortOrder: number | null;
    episodeNumber: number | null;
    status: string | null;
    updatedAt: Date;
    content?: string | null;
};

export function registerGetDashboardSummaryHandler() {
    ipcMain.handle('synopsis:getDashboardSummary', async (_event: IpcMainInvokeEvent, projectId: string) => {
        try {
            const prisma = await prismaService.getClient();
            const [chapters, episodes, charactersCount, foreshadowNotes] = await Promise.all([
                prisma.projectStructure.findMany({
                    where: {
                        projectId,
                        type: 'chapter',
                        isActive: true,
                    },
                    select: {
                        id: true,
                        title: true,
                        wordCount: true,
                        sortOrder: true,
                        status: true,
                        updatedAt: true,
                        content: true,
                    },
                    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'asc' }],
                }),
                prisma.episode.findMany({
                    where: {
                        projectId,
                        isActive: true,
                    },
                    select: {
                        id: true,
                        title: true,
                        wordCount: true,
                        content: true,
                        sortOrder: true,
                        episodeNumber: true,
                        status: true,
                        updatedAt: true,
                    },
                    orderBy: [{ sortOrder: 'asc' }, { episodeNumber: 'asc' }],
                }),
                prisma.projectCharacter.count({
                    where: {
                        projectId,
                        isActive: true,
                    },
                }),
                prisma.projectNote.findMany({
                    where: {
                        projectId,
                        type: 'foreshadow',
                        isArchived: false,
                    },
                    select: {
                        id: true,
                        title: true,
                        introducedEpisode: true,
                        resolvedEpisode: true,
                        importance: true,
                    },
                    orderBy: [{ createdAt: 'asc' }],
                }),
            ]);

            const chapterSnapshots = (chapters as ChapterOverviewRecord[]).map((chapter: ChapterOverviewRecord, index: number): ChapterSnapshot => ({
                id: chapter.id,
                title: chapter.title,
                wordCount: resolveWordCount(chapter.wordCount, chapter.content),
                sortOrder: chapter.sortOrder ?? index,
                status: chapter.status,
                updatedAt: chapter.updatedAt,
                episodeNumber: null,
            }));

            const episodeSnapshots = (episodes as EpisodeOverviewRecord[]).map((episode: EpisodeOverviewRecord, index: number): ChapterSnapshot => ({
                id: episode.id,
                title: episode.title,
                wordCount: resolveWordCount(episode.wordCount, episode.content),
                sortOrder: episode.sortOrder ?? episode.episodeNumber ?? index,
                status: episode.status,
                updatedAt: episode.updatedAt,
                episodeNumber: episode.episodeNumber,
            }));

            const snapshots = chooseChapterSnapshots(chapterSnapshots, episodeSnapshots);
            const summary = buildDashboardSummary(projectId, snapshots, charactersCount, foreshadowNotes);
            return summary;
        } catch (error) {
            Logger.error(SYNOPSIS_STATS_HANDLER, 'Error fetching dashboard summary', { projectId, error });
            throw error;
        }
    });
}
