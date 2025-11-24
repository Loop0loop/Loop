import type { Episode as PrismaEpisodeModel } from '@prisma/client';
import type { Episode, FiveActType, FiveActAnalysis } from '../../../shared/types/episode';
import type { PlatformType } from '../../../shared/constants/platform-requirements';

export function toPrismaEpisode(prismaEpisode: PrismaEpisodeModel): Episode {
  return {
    id: prismaEpisode.id,
    projectId: prismaEpisode.projectId,
    episodeNumber: prismaEpisode.episodeNumber,
    title: prismaEpisode.title,
    content: prismaEpisode.content,
    wordCount: prismaEpisode.wordCount,
    targetWordCount: prismaEpisode.targetWordCount,
    status: prismaEpisode.status as Episode['status'],
    act: prismaEpisode.act as FiveActType | null,
    cliffhangerType: prismaEpisode.cliffhangerType as Episode['cliffhangerType'],
    cliffhangerIntensity: prismaEpisode.cliffhangerIntensity,
    notes: prismaEpisode.notes,
    platform: (prismaEpisode as any).platform as PlatformType | null,
    sortOrder: prismaEpisode.sortOrder,
    isActive: prismaEpisode.isActive,
    createdAt: prismaEpisode.createdAt,
    updatedAt: prismaEpisode.updatedAt,
    publishedAt: prismaEpisode.publishedAt,
  };
}

export function calculateActRanges(totalEpisodes: number) {
  const ranges = {
    introduction: { start: 1, end: Math.ceil(totalEpisodes * 0.1), targetPercentage: 10 },
    rising: { start: Math.ceil(totalEpisodes * 0.1) + 1, end: Math.ceil(totalEpisodes * 0.3), targetPercentage: 20 },
    development: { start: Math.ceil(totalEpisodes * 0.3) + 1, end: Math.ceil(totalEpisodes * 0.6), targetPercentage: 30 },
    climax: { start: Math.ceil(totalEpisodes * 0.6) + 1, end: Math.ceil(totalEpisodes * 0.85), targetPercentage: 25 },
    conclusion: { start: Math.ceil(totalEpisodes * 0.85) + 1, end: totalEpisodes, targetPercentage: 15 },
  };
  return ranges;
}

export function getActName(act: FiveActType): string {
  const names: Record<FiveActType, string> = {
    introduction: '도입',
    rising: '발단',
    development: '전개',
    climax: '절정',
    conclusion: '결말',
  };
  return names[act];
}

export function getActDescription(act: FiveActType): string {
  const descriptions: Record<FiveActType, string> = {
    introduction: '독자를 끌어들이고 세계관을 설정하는 부분',
    rising: '갈등이 시작되고 주인공이 도전에 직면하는 부분',
    development: '갈등이 심화되고 복잡해지는 부분',
    climax: '갈등이 최고조에 달하는 부분',
    conclusion: '갈등이 해결되고 이야기가 마무리되는 부분',
  };
  return descriptions[act];
}

export function getEmptyFiveActAnalysis(): FiveActAnalysis[] {
  const acts: FiveActType[] = ['introduction', 'rising', 'development', 'climax', 'conclusion'];
  return acts.map(act => ({
    act,
    name: getActName(act),
    description: getActDescription(act),
    targetPercentage: 0,
    currentPercentage: 0,
    targetWordCount: 0,
    currentWordCount: 0,
    episodes: [],
    isComplete: false,
  }));
}
