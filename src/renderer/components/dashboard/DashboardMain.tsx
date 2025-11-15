import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Target, Sparkles, type LucideIcon } from 'lucide-react';
import { Card, Button, Badge } from '../ui';
import { WritingStatsHeader } from './WritingStatsHeader';
import { QuickStartCard } from './QuickStartCard';
import { HeroStrip } from './HeroStrip';
import { RecentEdits } from './RecentEdits';
import { AIDashboardChat } from './AIDashboardChat';
import { DashboardSkeleton } from './DashboardSkeleton';
import { Logger } from '../../../shared/logger';
import { useGuidedTour } from '../../modules/tutorial';
import { DASHBOARD_BACKGROUND_IMAGE, DEFAULT_BACKGROUND } from '../../constants/backgroundImage';

// 🔥 작가 친화적 스타일 상수
const DASHBOARD_STYLES = {
  container: 'flex-1 flex flex-col min-h-screen relative overflow-hidden',
  backgroundLayer: 'dashboard-background-layer',
  contentWrapper: 'relative z-10 flex flex-col flex-1 overflow-y-auto',
  header: 'dashboard-header-glass px-6 py-4 flex-shrink-0 border-b border-[hsl(var(--border))]/10',
  headerContent: 'max-w-7xl mx-auto flex items-center justify-between gap-6 w-full',
  headerTitle: 'text-xl font-semibold text-foreground',
  content: 'flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full flex flex-col gap-8',
  projectList: 'space-y-2 overflow-y-auto flex-1 flex flex-col',
  projectItem: 'project-item-glass p-3 rounded-lg transition-colors cursor-pointer hover:bg-foreground/5',
  section: 'rounded-lg overflow-hidden',
  sectionGrid: 'grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0',
  sectionTitle: 'text-sm font-medium text-foreground mb-3 flex items-center gap-2',
} as const;

interface Project {
  readonly id: string;
  readonly title: string;
  readonly status: 'active' | 'draft' | 'completed';
  readonly progress: number;
  readonly goal: string;
  readonly wordCount?: number;
}

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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function DashboardMain(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useGuidedTour();
  
  const tutorialParam = searchParams.get('tutorial');
  React.useEffect(() => {
    if (tutorialParam) {
      Logger.info('DashboardMain', `Tutorial parameter detected: ${tutorialParam}`);
      navigate('/dashboard', { replace: true });
    }
  }, [tutorialParam, navigate]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  const [loadingStates, setLoadingStates] = useState({
    projects: true,
    recentFiles: true,
  });

  const loadDashboardData = useCallback(async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && !window.electronAPI) {
        Logger.warn('DASHBOARD', 'Electron API not available, using default data for web environment');
        setLoadingStates(prev => ({ ...prev, projects: false, recentFiles: false }));
        setProjects([]);
        setRecentFiles([]);
        return;
      }

      const [projectsResult, recentSessionsResult] = await Promise.allSettled([
        window.electronAPI.projects.getAll(),
        window.electronAPI.dashboard.getRecentSessions()
      ]);

      if (projectsResult.status === 'fulfilled' && projectsResult.value.success) {
        const projectsData = (projectsResult.value.data || []) as Array<{ id: string; title: string; updatedAt?: Date; progress?: number; description?: string; status?: 'active' | 'completed' | 'paused'; dueDate?: Date; wordCount?: number }>;
        setProjects(projectsData.map((p) => ({
          id: p.id || '',
          title: p.title || '제목 없음',
          status: (p.status === 'paused' ? 'active' : p.status) || 'draft',
          progress: p.progress || 0,
          goal: p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '목표 미설정',
          wordCount: p.wordCount || 0,
        })));
        setLoadingStates(prev => ({ ...prev, projects: false }));
        Logger.debug('DASHBOARD', '✅ Projects loaded', { count: projectsData.length });
      } else {
        Logger.warn('DASHBOARD', '⚠️ Projects not available, using empty state');
        setProjects([]);
        setLoadingStates(prev => ({ ...prev, projects: false }));
      }

      if (recentSessionsResult.status === 'fulfilled' && recentSessionsResult.value.success) {
        const sessions = recentSessionsResult.value.data || [];
        setRecentFiles(sessions.slice(0, 3).map((session: import('../../../shared/types').TypingSession, index: number) => ({
          id: session.id || `session-${index}`,
          name: `session-${new Date(session.startTime).toLocaleDateString()}.md`,
          project: session.windowTitle || '알 수 없는 앱',
          time: formatTimeAgo((session.endTime ?? session.startTime).toString()),
          status: '완료',
        })));
        setLoadingStates(prev => ({ ...prev, recentFiles: false }));
        Logger.debug('DASHBOARD', '✅ Recent sessions loaded', { count: sessions.length });
      } else {
        Logger.warn('DASHBOARD', '⚠️ Recent sessions not available, using empty state');
        setRecentFiles([]);
        setLoadingStates(prev => ({ ...prev, recentFiles: false }));
      }

    } catch (error) {
      Logger.error('DASHBOARD', '❌ Failed to load dashboard data', error);
    }
  }, []);

  React.useEffect(() => {
    loadDashboardData();

    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}일 전`;
  };

  return (
    <div className={DASHBOARD_STYLES.container} data-tour="dashboard-container">
      <div className={DASHBOARD_STYLES.backgroundLayer} />
      
      <div className={DASHBOARD_STYLES.contentWrapper}>
        {/* 헤더 */}
        <div className={DASHBOARD_STYLES.header} data-tour="dashboard-header">
          <div className={DASHBOARD_STYLES.headerContent}>
            <h1 className={DASHBOARD_STYLES.headerTitle}>홈</h1>
            <Button variant="primary" size="sm" className="ml-auto" onClick={() => navigate('/projects?create=true')}>+ 새 작품</Button>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className={DASHBOARD_STYLES.content}>
          {/* 0. 실시간 쓰기 통계 */}
          <section className={DASHBOARD_STYLES.section}>
            <WritingStatsHeader
              totalWords={projects.reduce((sum, p) => sum + (p.wordCount || 0), 0)}
              todayWords={Math.floor(Math.random() * 1200)}
              dailyGoal={1000}
              activeProjects={projects.filter(p => p.status === 'active').length}
              streakDays={5}
            />
          </section>

          {/* 1. 추천 템플릿 & 최근 작업 */}
          <section className={DASHBOARD_STYLES.section}>
            <HeroStrip
              recent={recentFiles.map(f => ({
                id: f.id,
                title: f.name,
                description: f.project,
                date: f.time,
                status: f.status as 'draft' | 'active' | 'completed',
              }))}
              onSelectRecent={(id) => {
                Logger.info('DASHBOARD', `Recent file selected: ${id}`);
              }}
              onSelectTemplate={(id) => {
                Logger.info('DASHBOARD', `Template selected: ${id}`);
              }}
            />
          </section>

          {/* 2. 빠른 시작 */}
          <section className={DASHBOARD_STYLES.section}>
            <QuickStartCard
              onCreateProject={async () => {
                try {
                  Logger.info('DASHBOARD', '🚀 Creating new project from dashboard');
                  navigate('/projects?create=true');
                } catch (error) {
                  Logger.error('DASHBOARD', 'Failed to navigate to project creation', error);
                }
              }}
              onImportProject={async () => {
                try {
                  Logger.info('DASHBOARD', 'Importing project from quick start');
                  const result = await window.electronAPI.projects.importFile();
                  if (result.success) {
                    Logger.info('DASHBOARD', 'Project import initiated');
                  }
                } catch (error) {
                  Logger.error('DASHBOARD', 'Failed to import project', error);
                }
              }}
              onOpenSample={async () => {
                try {
                  Logger.info('DASHBOARD', 'Opening sample project');
                  const result = await window.electronAPI.projects.createSample();
                  if (result.success) {
                    Logger.info('DASHBOARD', 'Sample project opened');
                    loadDashboardData();
                  }
                } catch (error) {
                  Logger.error('DASHBOARD', 'Failed to open sample project', error);
                }
              }}
              onViewDocs={() => {
                Logger.info('DASHBOARD', 'View documentation');
              }}
            />
          </section>

          {/* 3. 최근 편집 */}
          <section className={DASHBOARD_STYLES.section}>
            <RecentEdits
              items={recentFiles.map((f) => ({
                id: f.id,
                name: f.name,
                date: f.time,
                project: f.project,
                status: (f.status as 'draft' | 'editing' | 'completed') || 'draft',
              }))}
              onSelect={(id) => {
                Logger.info('DASHBOARD', `Recent file selected: ${id}`);
              }}
              onViewAll={() => {
                Logger.info('DASHBOARD', 'View all recent files');
              }}
            />
          </section>

          {/* 4. 활성 프로젝트 + AI 채팅 (사이드 바이 사이드) */}
          <div className={DASHBOARD_STYLES.sectionGrid}>
            {/* 활성 프로젝트 */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col section-glass-dark rounded-lg">
              <Card 
                className="flex flex-col h-full overflow-hidden bg-transparent border-none p-4"
                data-tour="active-projects-section"
              >
                <div className={DASHBOARD_STYLES.sectionTitle}>
                  <Target className="w-4 h-4 text-[hsl(var(--accent-primary))]" />
                  <span>활성 프로젝트</span>
                </div>

                {loadingStates.projects ? (
                  <DashboardSkeleton showKpi={false} showProjects showRecentFiles={false} />
                ) : (
                  <div className="overflow-y-auto flex-1 pr-2">
                    <div className={DASHBOARD_STYLES.projectList}>
                      {projects.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Target className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-70" />
                          <p className="text-sm">아직 프로젝트가 없습니다</p>
                        </div>
                      ) : (
                        projects.map((project) => (
                          <div
                            key={project.id}
                            className={DASHBOARD_STYLES.projectItem}
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-medium text-xs text-[hsl(var(--foreground))] truncate flex-1">{project.title}</h4>
                              <Badge
                                variant={project.status === 'active' ? 'primary' : 'default'}
                                size="sm"
                                className="text-xs flex-shrink-0"
                              >
                                {project.status === 'active' ? '진행중' : '초안'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {project.wordCount || 0} 단어
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* AI 채팅 */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col section-glass-dark rounded-lg">
              <Card 
                className="flex flex-col h-full overflow-hidden bg-transparent border-none p-4"
                data-tour="ai-prompt-section"
              >
                <div className={DASHBOARD_STYLES.sectionTitle}>
                  <Sparkles className="w-4 h-4 text-[hsl(var(--accent-primary))]" />
                  <span>AI 어시스턴트</span>
                </div>
                <AIDashboardChat />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
