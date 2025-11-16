'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AppHeader } from '../layout/AppHeader';
import { AuthorQuote } from './AuthorQuote';
import { DashboardActions } from './DashboardActions';
import { HeroStrip } from './HeroStrip';
import { RecentEdits } from './RecentEdits';
import { DashboardSkeleton } from './DashboardSkeleton';
import { Logger } from '../../../shared/logger';
import { useGuidedTour } from '../../modules/tutorial';
import { filterRecentEditsBy3Days } from './utils/filterRecentEdits';

/**
 * 🔥 단순화된 대시보드
 * HeroStrip (최근 + 추천) → RecentEdits (토글 가능)
 */

const DASHBOARD_STYLES = {
  container: 'flex-1 flex flex-col min-h-screen relative overflow-hidden',
  backgroundLayer: 'dashboard-background-layer',
  contentWrapper: 'relative z-10 flex flex-col flex-1 overflow-y-auto',
  header: 'dashboard-header-glass px-6 py-6 flex-shrink-0 border-b border-[hsl(var(--border))]/10',
  headerContent: 'max-w-7xl mx-auto flex items-center justify-between gap-6 w-full',
  headerTitle: 'text-3xl font-bold text-foreground',
  content: 'flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full flex flex-col gap-8',
} as const;

interface RecentFile {
  readonly id: string;
  readonly name: string;
  readonly project: string;
  readonly time: string;
  readonly status: string;
}

export interface DashboardMainProps {
  readonly className?: string;
}

export function DashboardMain(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useGuidedTour();
  
  const tutorialParam = searchParams.get('tutorial');
  useEffect(() => {
    if (tutorialParam) {
      Logger.info('DashboardMain', `Tutorial parameter detected: ${tutorialParam}`);
      navigate('/dashboard', { replace: true });
    }
  }, [tutorialParam, navigate]);

  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && !window.electronAPI) {
        Logger.warn('DASHBOARD', 'Electron API not available');
        setRecentFiles([]);
        setIsLoading(false);
        return;
      }

      const result = await window.electronAPI.dashboard.getRecentSessions();
      if (result.success && Array.isArray(result.data)) {
        setRecentFiles(
          result.data.map((item: any) => ({
            id: item.id || '',
            name: item.name || '제목 없음',
            project: item.project || '',
            time: item.time || '방금 전',
            status: item.status || 'draft',
          }))
        );
      }
      setIsLoading(false);
    } catch (error) {
      Logger.error('DASHBOARD', 'Failed to load dashboard data', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className={DASHBOARD_STYLES.container} data-tour="dashboard-container">
      <div className={DASHBOARD_STYLES.backgroundLayer} />
      
      <div className={DASHBOARD_STYLES.contentWrapper}>
        {/* 🔥 동적 Header */}
        <AppHeader
          title="홈"
          rightActions={
            <button
              onClick={() => navigate('/projects?create=true')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[color:var(--accent-primary)] hover:bg-[color:var(--accent-hover)] text-[color:var(--text-inverse,#ffffff)] transition-colors font-medium"
              aria-label="새 작품 만들기"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              새 작품
            </button>
          }
        />

        {/* 메인 콘텐츠 */}
        <div className={DASHBOARD_STYLES.content}>
          {/* 0. 작가 영감 명언 */}
          <section role="region" aria-label="작가 명언">
            <AuthorQuote />
          </section>

          {/* 1. HeroStrip: 최근 사용 + 추천 템플릿 */}
          <section role="region" aria-label="빠른 접근">
            <HeroStrip
              recent={recentFiles.map(f => ({
                id: f.id,
                title: f.name,
                description: f.project,
                date: f.time,
              }))}
              onSelectRecent={(id) => {
                Logger.info('DASHBOARD', `Navigating to recent file: ${id}`);
              }}
              onSelectTemplate={(id) => {
                Logger.info('DASHBOARD', `Creating from template: ${id}`);
              }}
            />
          </section>

          {/* 2. 액션 버튼: PC에서 가져오기 / 튜토리얼 */}
          <section role="region" aria-label="빠른 액션">
            <DashboardActions
              onImport={async () => {
                Logger.info('DASHBOARD', 'Import file triggered');
                await loadDashboardData();
              }}
              onTutorial={() => {
                Logger.info('DASHBOARD', 'Tutorial started');
                navigate('/dashboard?tutorial=intro');
              }}
            />
          </section>

          {/* 3. RecentEdits: 그리드/리스트 토글 */}
          <section role="region" aria-label="최근 편집">
            <RecentEdits
              items={filterRecentEditsBy3Days(recentFiles).map((f) => ({
                id: f.id,
                name: f.name,
                date: f.time,
                project: f.project,
                status: (f.status as 'draft' | 'editing' | 'completed') || 'draft',
              }))}
              onSelect={(id) => {
                Logger.info('DASHBOARD', `Opening recent file: ${id}`);
              }}
              onViewAll={() => {
                Logger.info('DASHBOARD', 'Viewing all recent files');
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
