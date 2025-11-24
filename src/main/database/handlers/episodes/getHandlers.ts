import { ipcMain } from 'electron';
import { Logger } from '../../../../shared/logger';
import type { IpcMainEvent } from 'electron';
import { prismaService } from '../../services/PrismaService';
import { calculateWordCount } from '../../../../shared/utils/text';
import type { EpisodeFilterOptions, EpisodeSortOptions, Episode } from '../../../../shared/types/episode';

export function registerEpisodeQueryHandlers(): void {
  Logger.debug('EPISODE_IPC', 'Registering episode query handlers');

  ipcMain.handle('episode:get', async (event: IpcMainEvent, id: string) => {
    try {
      Logger.debug('EPISODE_IPC', 'Getting episode', { id });
      const episode = await new (await import('../../services/EpisodeService')).EpisodeService().getEpisode(id);
      return { success: true, data: episode };
    } catch (error) {
      Logger.error('EPISODE_IPC', 'Failed to get episode', { error, id });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('episode:getByNumber', async (event: IpcMainEvent, projectId: string, episodeNumber: number) => {
    try {
      Logger.debug('EPISODE_IPC', 'Getting episode by number', { projectId, episodeNumber });
      const episode = await new (await import('../../services/EpisodeService')).EpisodeService().getEpisodeByNumber(projectId, episodeNumber);
      return { success: true, data: episode };
    } catch (error) {
      Logger.error('EPISODE_IPC', 'Failed to get episode by number', { error, projectId, episodeNumber });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('episode:list', async (event: IpcMainEvent, projectId: string, filter?: EpisodeFilterOptions, sort?: EpisodeSortOptions) => {
    try {
      Logger.debug('EPISODE_IPC', 'Listing chapters as episodes', { projectId, filter, sort });

      const prisma = await prismaService.getClient();

      type ChapterRecord = {
        id: string; projectId: string; title: string; status: string | null; wordCount: number; sortOrder: number; createdAt: Date; updatedAt: Date; isActive: boolean; content: string | null;
      };

      const chapters = await prisma.projectStructure.findMany({ where: { projectId, type: 'chapter', isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, projectId: true, title: true, status: true, wordCount: true, sortOrder: true, createdAt: true, updatedAt: true, isActive: true, content: true } });

      const normalizeStatus = (rawStatus?: string | null): string => (rawStatus ?? 'planned').toLowerCase();

      const statusToEpisodeStatus: Record<string, string> = { planned: 'draft', planning: 'draft', draft: 'draft', drafting: 'draft', 'in-progress': 'in-progress', in_progress: 'in-progress', writing: 'in-progress', completed: 'completed', finished: 'completed', published: 'published', released: 'published' };
      const statusToAct: Record<string, string> = { planned: 'introduction', planning: 'introduction', draft: 'development', drafting: 'development', 'in-progress': 'rising', in_progress: 'rising', writing: 'rising', completed: 'climax', finished: 'climax', published: 'conclusion', released: 'conclusion' };

      const applyFilters = (records: ChapterRecord[]): ChapterRecord[] => records.filter((chapter) => {
        const normalized = normalizeStatus(chapter.status);
        const mappedStatus = statusToEpisodeStatus[normalized] ?? 'draft';
        const mappedAct = statusToAct[normalized] ?? null;
        if (filter?.status && mappedStatus !== filter.status) return false;
        if (filter?.act && mappedAct !== filter.act) return false;
        if (filter?.minWordCount !== undefined && chapter.wordCount < filter.minWordCount) return false;
        if (filter?.maxWordCount !== undefined && chapter.wordCount > filter.maxWordCount) return false;
        return true;
      });

      const applySorting = (records: ChapterRecord[]): ChapterRecord[] => {
        const sortField = sort?.field ?? sort?.sortBy ?? 'sortOrder';
        const direction = sort?.direction ?? sort?.order ?? 'asc';
        const compare = (a: ChapterRecord, b: ChapterRecord): number => {
          switch (sortField) {
            case 'episodeNumber': case 'sortOrder': return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
            case 'wordCount': return (a.wordCount ?? 0) - (b.wordCount ?? 0);
            case 'createdAt': return a.createdAt.getTime() - b.createdAt.getTime();
            case 'updatedAt': return a.updatedAt.getTime() - b.updatedAt.getTime();
            case 'status': return (statusToEpisodeStatus[normalizeStatus(a.status)] ?? 'draft').localeCompare(statusToEpisodeStatus[normalizeStatus(b.status)] ?? 'draft');
            default: return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          }
        };
        const sorted = [...records].sort(compare);
        return direction === 'desc' ? sorted.reverse() : sorted;
      };

      const paginate = (records: ChapterRecord[]): ChapterRecord[] => { const offset = filter?.offset ?? 0; const limit = filter?.limit ?? records.length; return records.slice(offset, offset + limit); };

      const filteredChapters = paginate(applySorting(applyFilters(chapters)));

      const resolveWordCount = (explicit: number | null | undefined, content: string | null | undefined): number => {
        if (explicit && explicit > 0) return explicit;
        if (content) { const normalized = content.trim(); if (normalized.length > 0) return calculateWordCount(normalized); }
        return 0;
      };

      const episodes: Episode[] = filteredChapters.map((chapter, index) => {
        const normalized = normalizeStatus(chapter.status);
        const mappedStatus = statusToEpisodeStatus[normalized] ?? 'draft';
        const mappedAct = statusToAct[normalized] ?? null;
        const episodeNumber = chapter.sortOrder ?? index;

        const episode: Episode = { id: chapter.id, projectId: chapter.projectId, episodeNumber: episodeNumber + 1, title: chapter.title || `Chapter ${episodeNumber + 1}`, content: chapter.content ?? '', wordCount: resolveWordCount(chapter.wordCount, chapter.content), targetWordCount: 5500, status: mappedStatus as any, act: mappedAct as any, cliffhangerType: null, cliffhangerIntensity: null, notes: null, platform: null, sortOrder: chapter.sortOrder ?? episodeNumber, isActive: chapter.isActive, createdAt: chapter.createdAt, updatedAt: chapter.updatedAt, publishedAt: mappedStatus === 'published' ? chapter.updatedAt : null };

        return episode;
      });

      return { success: true, data: episodes };
    } catch (error) {
      Logger.error('EPISODE_IPC', 'Failed to list chapters as episodes', { error, projectId, filter, sort });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('episode:getStats', async (event: IpcMainEvent, projectId: string) => {
    try {
      Logger.debug('EPISODE_IPC', 'Getting episode stats', { projectId });
      const stats = await new (await import('../../services/EpisodeService')).EpisodeService().getEpisodeStats(projectId);
      return { success: true, data: stats };
    } catch (error) {
      Logger.error('EPISODE_IPC', 'Failed to get episode stats', { error, projectId });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // manuscript reserves and five-act analysis remain in analysis module if needed

  Logger.info('EPISODE_IPC', '✅ Episode query handlers registered');
}
