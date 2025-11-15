import React, { useState, useMemo, useCallback, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Target,
  Clock,
  CheckCircle,
  FileText,
  Cloud,
  Play,
  Pause,
  TrendingUp,
  Calendar,
  Zap,
  Folder,
  Edit,
  type LucideIcon
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  ProgressBar,
} from '../ui';
import { QuickStartCard } from './QuickStartCard';
import { AIDashboardChat } from './AIDashboardChat';
// MonitoringControlPanel 제거됨 - 기획 변경으로 불필요
import { DashboardSkeleton } from './DashboardSkeleton';
import { HydrationGuard } from '../ui/HydrationGuard';
import { Logger } from '../../../shared/logger';
import { useGuidedTour, useTutorial } from '../../modules/tutorial';
import { DASHBOARD_BACKGROUND_IMAGE, DEFAULT_BACKGROUND } from '../../constants/backgroundImage';

// 🔥 작가 친화적 스타일 상수 - 미니멀하고 집중할 수 있는 디자인
// CSS 클래스 기반으로 변경 (section-glass.css 참조)
const DASHBOARD_STYLES = {
  container: 'flex-1 flex flex-col min-h-screen relative overflow-hidden',
  backgroundLayer: 'dashboard-background-layer',
  contentWrapper: 'relative z-10 flex flex-col flex-1 overflow-y-auto',
  header: 'dashboard-header-glass px-6 py-4 flex-shrink-0',
  headerContent: 'max-w-6xl mx-auto flex items-center justify-between gap-4',
  headerTitle: 'text-lg font-light text-foreground tracking-tight',
  headerProjects: 'flex items-center gap-2 ml-auto',
  headerProjectItem: 'px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-foreground/10 cursor-pointer truncate max-w-[150px]',
  content: 'flex-1 overflow-hidden p-6 max-w-6xl mx-auto w-full flex flex-col gap-6',
  projectList: 'space-y-3 overflow-y-auto flex-1 flex flex-col',
  projectItem: 'project-item-glass p-3 rounded-lg transition-colors cursor-pointer',
  projectHeader: 'flex items-center justify-between mb-2',
  projectTitle: 'font-medium text-sm text-foreground',
  projectStats: 'flex justify-between items-center text-xs',
  progressText: 'text-xs font-medium text-foreground',
} as const;

// MonitoringData 인터페이스 제거됨 - 모니터링 기능 불필요

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

// 🔥 기가차드 수정: 빈 인터페이스 대신 구체적 타입 정의
export interface DashboardMainProps {
  readonly className?: string; // 선택적 스타일링 지원
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function DashboardMain(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // 🔥 useGuidedTour는 호출하되, startTutorial은 NOT 호출
  // App.tsx에서 URL 파라미터로 전체 튜토리얼 흐름을 관리함
  useGuidedTour();
  
  // 🔥 URL 파라미터 감지 (App.tsx에서 &tutorial=dashboard-intro로 설정됨)
  // 하지만 여기서는 호출하지 않음 - App.tsx/TutorialProvider가 처리함
  const tutorialParam = searchParams.get('tutorial');
  React.useEffect(() => {
    if (tutorialParam) {
      Logger.info('DashboardMain', `� Tutorial parameter detected: ${tutorialParam}`);
      // 🔥 URL에서 파라미터 제거 (뒤로가기 시 재시작 방지)
      navigate('/dashboard', { replace: true });
      // startTutorial은 호출하지 않음 - App.tsx가 처리함
    }
  }, [tutorialParam, navigate]);

  // 모니터링 데이터 상태 제거됨 - 모니터링 기능 불필요

  const [projects, setProjects] = useState<Project[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  // 🔥 로딩 상태 최적화 - 개별 로딩 상태 관리
  const [loadingStates, setLoadingStates] = useState({
    projects: true,
    recentFiles: true,
  });

  // 🔥 대시보드 데이터 로딩 - 메모화로 성능 최적화
  const loadDashboardData = useCallback(async (): Promise<void> => {
    try {
      // 🔥 웹 환경에서는 Electron API가 없으므로 기본값 사용
      if (typeof window !== 'undefined' && !window.electronAPI) {
        Logger.warn('DASHBOARD', 'Electron API not available, using default data for web environment');
        setLoadingStates(prev => ({ ...prev, kpi: false, projects: false, recentFiles: false }));
        setProjects([]);
        setRecentFiles([]);
        return;
      }

      // 🔥 기가차드 규칙: 타입 안전한 IPC 통신 - 병렬 처리
      const [dashboardStatsResult, projectsResult, recentSessionsResult] = await Promise.allSettled([
        window.electronAPI.dashboard.getStats(),
        window.electronAPI.projects.getAll(),
        window.electronAPI.dashboard.getRecentSessions()
      ]);

      // 🔥 대시보드 통계 업데이트 - 제거됨
      if (dashboardStatsResult.status === 'fulfilled' && dashboardStatsResult.value.success) {
        setLoadingStates(prev => ({ ...prev, kpi: false }));
        Logger.debug('DASHBOARD', '✅ Dashboard stats loaded');
      } else {
        // 백엔드에서 데이터를 가져올 수 없는 경우 기본값 사용
        Logger.warn('DASHBOARD', '⚠️ Dashboard stats not available, using defaults');
        setLoadingStates(prev => ({ ...prev, kpi: false }));
      }

      // 🔥 프로젝트 데이터 업데이트
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
        // 프로젝트 데이터가 없는 경우
        Logger.warn('DASHBOARD', '⚠️ Projects not available, using empty state');
        setProjects([]);
        setLoadingStates(prev => ({ ...prev, projects: false }));
      }

      // 🔥 최근 세션 데이터를 파일 형태로 변환
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
        // 세션 데이터가 없는 경우
        Logger.warn('DASHBOARD', '⚠️ Recent sessions not available, using empty state');
        setRecentFiles([]);
        setLoadingStates(prev => ({ ...prev, recentFiles: false }));
      }

    } catch (error) {
      Logger.error('DASHBOARD', '❌ Failed to load dashboard data', error);
    }
  }, []);

  // 🔥 대시보드 데이터 로딩 - 성능 최적화
  React.useEffect(() => {
    loadDashboardData();

    // 🔥 실시간 업데이트 (30초마다로 변경 - 성능 최적화)
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  /**
   * 🔥 변화율 타입 결정 헬퍼 함수
   */
  const getChangeType = (value: number): 'increase' | 'decrease' | 'neutral' => {
    if (value > 0) return 'increase';
    if (value < 0) return 'decrease';
    return 'neutral';
  };

  /**
   * 🔥 변화율 타입 결정 헬퍼 함수
   */  /**
   * 🔥 시간 경과 표시 헬퍼
   */
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

  // 모니터링 및 AI 토글 함수 제거됨 - 기능 불필요

  // 🔥 최근 3개 프로젝트 (최신순)
  const recentProjects = useMemo(() => {
    return projects.slice(0, 3).sort((a, b) => {
      // goal을 날짜로 변환하여 정렬 (최신순)
      const dateA = new Date(a.goal).getTime();
      const dateB = new Date(b.goal).getTime();
      return dateB - dateA;
    });
  }, [projects]);

  return (
    <div className={DASHBOARD_STYLES.container} data-tour="dashboard-container">
      {/* 🎨 배경 레이어 - 극히 미약한 이미지 (배경이 주인공이 아님) */}
      <div className={DASHBOARD_STYLES.backgroundLayer} />
      
      {/* 📄 실제 콘텐츠 (z-index: 10으로 배경 위에 표시) */}
      <div className={DASHBOARD_STYLES.contentWrapper}>
        {/* 헤더 - 축소된 미니멀 헤더 + 최근 프로젝트 */}
        <div className={DASHBOARD_STYLES.header} data-tour="dashboard-header">
          <div className={DASHBOARD_STYLES.headerContent}>
            <h1 className={DASHBOARD_STYLES.headerTitle}>대시보드</h1>
            
            {/* 🔥 최근 프로젝트 3개 - 최신순 */}
            {recentProjects.length > 0 && (
              <div className={DASHBOARD_STYLES.headerProjects}>
                {recentProjects.map((project) => (
                  <button
                    key={project.id}
                    className={`${DASHBOARD_STYLES.headerProjectItem} text-[hsl(var(--foreground))]`}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    title={project.title}
                  >
                    {project.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className={DASHBOARD_STYLES.content}>
        {/* 모니터링 컨트롤 패널 제거됨 - 기획 변경으로 불필요 */}

        {/* KPI 카드 - 제거됨 */}

        {/* 빠른 시작 */}
        <QuickStartCard
          onCreateProject={async () => {
            try {
              Logger.info('DASHBOARD', '🚀 Creating new project from dashboard');
              // 🔥 프로젝트 페이지로 이동하여 새 프로젝트 생성 플로우 시작
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
                // 프로젝트 목록 새로고침
                loadDashboardData();
              }
            } catch (error) {
              Logger.error('DASHBOARD', 'Failed to open sample project', error);
            }
          }}
          onViewDocs={() => {
            Logger.info('DASHBOARD', 'View documentation');
            // TODO: 문서 페이지로 이동 또는 외부 링크 열기
          }}
        />

        {/* 메인 그리드 - Vertical Stack (상하 배치, 50/50) */}
        <div className="w-full flex-1 overflow-hidden flex flex-col gap-6">
          {/* 상단: 활성 프로젝트 (50%) */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col section-glass-dark rounded-lg">
            <Card 
              className="flex flex-col h-full overflow-hidden bg-transparent border-none"
              data-tour="active-projects-section"
            >
              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <Target className="w-4 h-4 text-[hsl(var(--accent-primary))]" />
                <h3 className="font-medium text-sm text-[hsl(var(--foreground))]">활성 프로젝트</h3>
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

          {/* 하단: AI 프롬포트 (50%) */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col section-glass-dark rounded-lg">
            <Card 
              className="flex flex-col h-full overflow-hidden bg-transparent border-none"
              data-tour="ai-prompt-section"
            >
              <AIDashboardChat />
            </Card>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
