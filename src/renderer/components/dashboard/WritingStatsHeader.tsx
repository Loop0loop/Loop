'use client';

import React, { useMemo } from 'react';
import { Target, TrendingUp, Zap } from 'lucide-react';

/**
 * 🔥 작가 친화적 실시간 쓰기 통계 헤더
 * Ulysses 대시보드 영감: 진행도, 목표, 오늘의 성취
 */

const STATS_STYLES = {
  container: 'w-full flex flex-col gap-2 mb-6',
  header: 'flex items-center justify-between gap-4',
  title: 'text-lg font-semibold text-foreground flex items-center gap-2',
  stats: 'grid grid-cols-3 gap-3',
  stat: 'rounded-lg border border-[hsl(var(--border))]/20 bg-[hsl(var(--card-bg))]/50 p-3 flex flex-col gap-1 backdrop-blur-sm',
  statLabel: 'text-xs font-medium text-muted-foreground uppercase tracking-wide',
  statValue: 'text-lg font-bold text-foreground tabular-nums',
  statSubtext: 'text-xs text-muted-foreground',
  progressBar: 'w-full h-1 bg-[hsl(var(--border))]/20 rounded-full overflow-hidden',
  progressFill: 'h-full bg-gradient-to-r from-[hsl(var(--accent-primary))] to-[hsl(var(--accent-dark))] transition-all duration-500 ease-out rounded-full',
} as const;

export interface WritingStatsHeaderProps {
  readonly totalWords?: number;
  readonly todayWords?: number;
  readonly dailyGoal?: number;
  readonly activeProjects?: number;
  readonly streakDays?: number;
}

/**
 * 단어수를 읽기 쉬운 형식으로 변환
 * 1000 → 1.0K, 10500 → 10.5K, 1000000 → 1.0M
 */
function formatWordCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * 진행도 퍼센티지 계산
 */
function calculateProgress(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min((current / goal) * 100, 100);
}

export function WritingStatsHeader({
  totalWords = 0,
  todayWords = 0,
  dailyGoal = 1000,
  activeProjects = 0,
  streakDays = 0,
}: WritingStatsHeaderProps): React.ReactElement {
  const progress = useMemo(() => calculateProgress(todayWords, dailyGoal), [todayWords, dailyGoal]);
  const remainingWords = Math.max(dailyGoal - todayWords, 0);

  return (
    <div className={STATS_STYLES.container} role="region" aria-label="작성 통계">
      <div className={STATS_STYLES.header}>
        <h2 className={STATS_STYLES.title}>
          <Zap className="w-5 h-5 text-[hsl(var(--accent-primary))]" aria-hidden="true" />
          오늘의 쓰기
        </h2>
      </div>

      <div className={STATS_STYLES.stats}>
        {/* 오늘의 목표 진행도 */}
        <div className={STATS_STYLES.stat}>
          <div className={STATS_STYLES.statLabel}>
            <Target className="w-3 h-3 inline mr-1" aria-hidden="true" />
            목표 진행도
          </div>
          <div className={STATS_STYLES.statValue}>{Math.round(progress)}%</div>
          <div className={STATS_STYLES.progressBar}>
            <div
              className={STATS_STYLES.progressFill}
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`일일 목표 진행도: ${todayWords} / ${dailyGoal} 단어`}
            />
          </div>
          <div className={STATS_STYLES.statSubtext}>
            {todayWords.toLocaleString()} / {dailyGoal.toLocaleString()} 단어
            {remainingWords > 0 && ` · 남은 ${remainingWords.toLocaleString()}`}
          </div>
        </div>

        {/* 총 단어수 */}
        <div className={STATS_STYLES.stat}>
          <div className={STATS_STYLES.statLabel}>
            <TrendingUp className="w-3 h-3 inline mr-1" aria-hidden="true" />
            총 단어수
          </div>
          <div className={STATS_STYLES.statValue}>{formatWordCount(totalWords)}</div>
          <div className={STATS_STYLES.statSubtext}>
            {totalWords.toLocaleString()} 단어
          </div>
        </div>

        {/* 작성 스트릭 */}
        <div className={STATS_STYLES.stat}>
          <div className={STATS_STYLES.statLabel}>
            <span className="inline-block">🔥 연속 작성</span>
          </div>
          <div className={STATS_STYLES.statValue}>{streakDays} 일</div>
          <div className={STATS_STYLES.statSubtext}>
            {activeProjects > 0 ? `${activeProjects}개 진행 중` : '프로젝트 준비 중'}
          </div>
        </div>
      </div>
    </div>
  );
}
