/**
 * 📖 Episode Service - 한국 웹소설 회차 관리 서비스 (메인 프로세스)
 *
 * Episode CRUD + 비축 현황 + 5막 구조 매핑
 */

import { prismaService } from './PrismaService';
import type { Prisma, Episode as PrismaEpisodeModel } from '@prisma/client';
import type {
  Episode,
  EpisodeStatus,
  FiveActType,
  CreateEpisodeInput,
  UpdateEpisodeInput,
  ManuscriptReserves,
  FiveActAnalysis,
  EpisodeFilterOptions,
  EpisodeSortOptions,
  EpisodeStats
} from '../../../shared/types/episode';
import type { PlatformType } from '../../../shared/constants/platform-requirements';
import { calculateWordCount } from '../../../shared/utils/text';
import { recordDailyWritingActivity } from '../utils/writingActivity';
import { toPrismaEpisode, calculateActRanges, getActName, getActDescription, getEmptyFiveActAnalysis } from './episode-utils';

/**
 * 🔥 Episode Service Class (메인 프로세스용)
 */
export class EpisodeService {
  private prismaService = prismaService;

  /**
   * 회차 생성
   */
  async createEpisode(input: CreateEpisodeInput): Promise<Episode> {
    const prisma = await this.prismaService.getClient();
    const episode = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
       const computedWordCount = calculateWordCount(input.content);

       const createdEpisode = await tx.episode.create({
         data: {
           projectId: input.projectId,
           episodeNumber: input.episodeNumber,
           title: input.title,
           content: input.content || '',
           wordCount: computedWordCount,
           targetWordCount: input.targetWordCount || 5500,
           status: input.status || 'draft',
           act: input.act || null,
           notes: input.notes || null,
           sortOrder: input.episodeNumber,
         } as any,
       });

       if (computedWordCount !== 0) {
         await tx.project.update({
           where: { id: input.projectId },
           data: { wordCount: { increment: computedWordCount } },
         });

         await recordDailyWritingActivity(tx, input.projectId, computedWordCount, 0, createdEpisode.updatedAt, createdEpisode.id);
       }

       return createdEpisode;
     });

    return this.toPrismaEpisode(episode);
  }

  /**
   * 회차 조회 (ID)
   */
  async getEpisode(id: string): Promise<Episode | null> {
    const prisma = await this.prismaService.getClient();
    const episode = await prisma.episode.findUnique({
      where: { id },
    });

    return episode ? this.toPrismaEpisode(episode) : null;
  }

  /**
   * 회차 조회 (프로젝트 + 회차 번호)
   */
  async getEpisodeByNumber(projectId: string, episodeNumber: number): Promise<Episode | null> {
    const prisma = await this.prismaService.getClient();
    const episode = await prisma.episode.findUnique({
      where: {
        projectId_episodeNumber: {
          projectId,
          episodeNumber,
        },
      },
    });

    return episode ? this.toPrismaEpisode(episode) : null;
  }

  /**
   * 회차 목록 조회
   */
  async listEpisodes(
    projectId: string,
    filter?: EpisodeFilterOptions,
    sort?: EpisodeSortOptions
  ): Promise<Episode[]> {
    const prisma = await this.prismaService.getClient();
    const where: Prisma.EpisodeWhereInput = {
      projectId,
      isActive: true,
    };

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.act) {
      where.act = filter.act;
    }

    if (filter?.hasCliffhanger !== undefined) {
      where.cliffhangerType = filter.hasCliffhanger ? { not: null } : null;
    }

    if (filter?.minWordCount !== undefined) {
      where.wordCount = { gte: filter.minWordCount };
    }

    if (filter?.maxWordCount !== undefined) {
      where.wordCount = { 
        ...(typeof where.wordCount === 'object' ? where.wordCount : {}), 
        lte: filter.maxWordCount 
      };
    }

    if (filter?.publishedAfter) {
      where.publishedAt = { gte: filter.publishedAfter };
    }

    if (filter?.publishedBefore) {
      where.publishedAt = { 
        ...(typeof where.publishedAt === 'object' ? where.publishedAt : {}), 
        lte: filter.publishedBefore 
      };
    }

    let orderBy: Prisma.EpisodeOrderByWithRelationInput = { episodeNumber: 'asc' };

    if (sort?.field) {
      orderBy = {
        [sort.field]: sort.direction || 'asc',
      };
    }

    const episodes = await prisma.episode.findMany({
      where,
      orderBy,
      take: filter?.limit || 100,
      skip: filter?.offset || 0,
    });

    type ListEpisode = typeof episodes[0];
    return episodes.map((episode: ListEpisode) => this.toPrismaEpisode(episode));
  }

  /**
   * 회차 수정
   */
  async updateEpisode(id: string, input: UpdateEpisodeInput): Promise<Episode> {
    const prisma = await this.prismaService.getClient();
    const episode = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
       const existing = await tx.episode.findUnique({ where: { id } });
       if (!existing) {
         throw new Error('Episode not found');
       }

       const updateData: Prisma.EpisodeUpdateInput = {};

       if (input.title !== undefined) updateData.title = input.title;
       if (input.content !== undefined) {
         updateData.content = input.content;
         updateData.wordCount = calculateWordCount(input.content);
       }
       if (input.wordCount !== undefined) {
         updateData.wordCount = input.wordCount;
       }
       if (input.targetWordCount !== undefined) updateData.targetWordCount = input.targetWordCount;
       if (input.status !== undefined) updateData.status = input.status;
       if (input.act !== undefined) updateData.act = input.act;
       if (input.cliffhangerType !== undefined) updateData.cliffhangerType = input.cliffhangerType;
       if (input.cliffhangerIntensity !== undefined) updateData.cliffhangerIntensity = input.cliffhangerIntensity;
       if (input.notes !== undefined) updateData.notes = input.notes;
       // Platform field update will be handled via raw query if needed
       // if (input.platform !== undefined) updateData.platform = input.platform;

       updateData.updatedAt = new Date();

       const updated = await tx.episode.update({
         where: { id },
         data: updateData,
       });

       const previousWordCount = existing.wordCount ?? 0;
       const newWordCount = updated.wordCount ?? previousWordCount;
       const delta = newWordCount - previousWordCount;

       if (delta !== 0) {
         await tx.project.update({
           where: { id: updated.projectId },
           data: { wordCount: { increment: delta } },
         });

         if (delta > 0) {
           await recordDailyWritingActivity(tx, updated.projectId, delta, 0, updated.updatedAt, updated.id);
         }
       }

       return updated;
     });

    return this.toPrismaEpisode(episode);
  }

  /**
   * 회차 삭제 (소프트 삭제)
   */
  async deleteEpisode(id: string): Promise<void> {
    const prisma = await this.prismaService.getClient();
    await prisma.episode.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 회차 완전 삭제
   */
  async hardDeleteEpisode(id: string): Promise<void> {
    const prisma = await this.prismaService.getClient();
    await prisma.episode.delete({
      where: { id },
    });
  }

  /**
   * 회차 발행
   */
  async publishEpisode(id: string): Promise<Episode> {
    const prisma = await this.prismaService.getClient();
    const episode = await prisma.episode.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return this.toPrismaEpisode(episode);
  }

  /**
   * 비축 현황 조회
   */
  async getManuscriptReserves(projectId: string): Promise<ManuscriptReserves> {
    const prisma = await this.prismaService.getClient();
    const episodes = await prisma.episode.findMany({
      where: {
        projectId,
        isActive: true,
      },
    });

    type ReserveEpisode = typeof episodes[0];

    const totalEpisodes = episodes.length;
    const draftEpisodes = episodes.filter((e: ReserveEpisode) => e.status === 'draft').length;
    const inProgressEpisodes = episodes.filter((e: ReserveEpisode) => e.status === 'in-progress').length;
    const completedEpisodes = episodes.filter((e: ReserveEpisode) => e.status === 'completed').length;
    const publishedEpisodes = episodes.filter((e: ReserveEpisode) => e.status === 'published').length;
    const reserveCount = completedEpisodes - publishedEpisodes;

    const totalWordCount = episodes.reduce((sum: number, e: ReserveEpisode) => sum + e.wordCount, 0);
    const averageWordCount = totalEpisodes > 0 ? Math.round(totalWordCount / totalEpisodes) : 0;

    const lastPublishedEpisode = episodes
      .filter((e: ReserveEpisode) => e.publishedAt)
      .sort((a: ReserveEpisode, b: ReserveEpisode) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0))[0];

    return {
      totalEpisodes,
      draftEpisodes,
      inProgressEpisodes,
      completedEpisodes,
      publishedEpisodes,
      reserveCount,
      lastPublishedDate: lastPublishedEpisode?.publishedAt || null,
      nextScheduledPublish: null, // TODO: 스케줄링 기능 추가 시 구현
      totalWordCount,
      averageWordCount,
    };
  }

  /**
   * 5막 구조 분석
   */
  async analyzeFiveActStructure(projectId: string): Promise<FiveActAnalysis[]> {
    const prisma = await this.prismaService.getClient();
    const episodes = await prisma.episode.findMany({
      where: {
        projectId,
        isActive: true,
      },
      orderBy: { episodeNumber: 'asc' },
    });

    type PrismaEpisode = typeof episodes[0];

    const totalEpisodes = episodes.length;
    if (totalEpisodes === 0) {
      return this.getEmptyFiveActAnalysis();
    }

    const actRanges = this.calculateActRanges(totalEpisodes);
    const actAnalysis: FiveActAnalysis[] = [];

    for (const act of ['introduction', 'rising', 'development', 'climax', 'conclusion'] as FiveActType[]) {
      const range = actRanges[act];
      const actEpisodes = episodes.filter((e: PrismaEpisode) => e.episodeNumber >= range.start && e.episodeNumber <= range.end);

      const currentWordCount = actEpisodes.reduce((sum: number, e: PrismaEpisode) => sum + e.wordCount, 0);
      const targetWordCount = range.targetPercentage * 0.01 * (totalEpisodes * 5500); // 5500: target word count per episode
      const currentPercentage = totalEpisodes > 0 ? (actEpisodes.length / totalEpisodes) * 100 : 0;

      actAnalysis.push({
        act,
        name: this.getActName(act),
        description: this.getActDescription(act),
        targetPercentage: range.targetPercentage,
        currentPercentage,
        targetWordCount: Math.round(targetWordCount),
        currentWordCount,
        episodes: actEpisodes.map((e: PrismaEpisode) => this.toPrismaEpisode(e)),
        isComplete: currentPercentage >= range.targetPercentage * 0.8, // 80% 이상이면 완료로 간주
      });
    }

    return actAnalysis;
  }

  /**
   * 회차 통계 조회
   */
  async getEpisodeStats(projectId: string): Promise<EpisodeStats> {
    const prisma = await this.prismaService.getClient();
    const episodes = await prisma.episode.findMany({
      where: {
        projectId,
        isActive: true,
      },
    });

    type StatsEpisode = typeof episodes[0];

    if (episodes.length === 0) {
      return {
        totalEpisodes: 0,
        byStatus: { draft: 0, 'in-progress': 0, completed: 0, published: 0 },
        byAct: {},
        totalWordCount: 0,
        averageWordCount: 0,
        longestEpisode: null,
        shortestEpisode: null,
        withCliffhanger: 0,
      };
    }

    const sortedByWordCount = [...episodes].sort((a: StatsEpisode, b: StatsEpisode) => b.wordCount - a.wordCount);
    const longest = sortedByWordCount[0];
    const shortest = sortedByWordCount[sortedByWordCount.length - 1];

    const publishedEpisodes = episodes.filter((e: StatsEpisode) => e.publishedAt).sort((a: StatsEpisode, b: StatsEpisode) =>
      (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0)
    );

    return {
      totalEpisodes: episodes.length,
      byStatus: {
        draft: episodes.filter((e: StatsEpisode) => e.status === 'draft').length,
        'in-progress': episodes.filter((e: StatsEpisode) => e.status === 'in-progress').length,
        completed: episodes.filter((e: StatsEpisode) => e.status === 'completed').length,
        published: episodes.filter((e: StatsEpisode) => e.status === 'published').length,
      },
      byAct: episodes.reduce((acc: Record<string, number>, e: StatsEpisode) => {
        if (e.act) {
          acc[e.act] = (acc[e.act] || 0) + 1;
        }
        return acc;
      }, {}),
      totalWordCount: episodes.reduce((sum: number, e: StatsEpisode) => sum + e.wordCount, 0),
      averageWordCount: Math.round(episodes.reduce((sum: number, e: StatsEpisode) => sum + e.wordCount, 0) / episodes.length),
      longestEpisode: longest ? {
        episodeNumber: longest.episodeNumber,
        wordCount: longest.wordCount,
      } : null,
      shortestEpisode: shortest ? {
        episodeNumber: shortest.episodeNumber,
        wordCount: shortest.wordCount,
      } : null,
      withCliffhanger: episodes.filter((e: StatsEpisode) => e.cliffhangerType).length,
    };
  }

  /**
   * 회차를 5막 구조에 매핑
   */
  mapEpisodeToAct(episodeNumber: number, totalEpisodes: number): FiveActType {
    const ranges = calculateActRanges(totalEpisodes);

    for (const [act, range] of Object.entries(ranges)) {
      if (episodeNumber >= range.start && episodeNumber <= range.end) {
        return act as FiveActType;
      }
    }

    return 'introduction'; // fallback
  }

  // ===== PRIVATE METHODS =====

  private toPrismaEpisode(prismaEpisode: PrismaEpisodeModel): Episode {
    return toPrismaEpisode(prismaEpisode as any as PrismaEpisodeModel);
  }

  private calculateActRanges(totalEpisodes: number) {
    return calculateActRanges(totalEpisodes);
  }

  private getActName(act: FiveActType): string {
    return getActName(act);
  }

  private getActDescription(act: FiveActType): string {
    return getActDescription(act);
  }

  private getEmptyFiveActAnalysis(): FiveActAnalysis[] {
    return getEmptyFiveActAnalysis();
  }
}