'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Download, BookOpen, type LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Logger } from '../../../shared/logger';
import { useTutorial } from '../../modules/tutorial';
import { getRandomQuote, QUOTE_THEME } from '../../constants/inspirationalQuotes';

// 🔥 기가차드 규칙: 프리컴파일된 스타일 상수 - 작가 친화적 다크모드
const QUICK_START_STYLES = {
  container: 'rounded-lg overflow-hidden',
  card: 'bg-transparent border-none',
  content: 'text-center py-6 px-5',
  title: 'text-2xl font-bold text-[hsl(var(--foreground))] mb-3 leading-tight',
  description: `text-base italic ${QUOTE_THEME.textColor} mb-6 max-w-xl mx-auto leading-relaxed min-h-8`,
  actionGrid: 'grid grid-cols-2 gap-2 max-w-xs mx-auto',
  actionButton: 'h-auto py-2 px-3 flex-col gap-1 text-xs hover:scale-[1.01] transition-all duration-200 shadow-sm hover:shadow-md border border-foreground/20 hover:border-foreground/40 hover:bg-foreground/5',
  icon: 'w-4 h-4',
  emptyState: 'text-muted-foreground text-xs',
} as const;

// 🔥 기가차드 규칙: 명시적 타입 정의
interface QuickAction {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly variant: 'primary' | 'secondary' | 'outline';
  readonly onClick: () => void;
  readonly ariaLabel?: string;
}

export interface QuickStartCardProps {
  readonly title?: string;
  readonly description?: string;
  readonly onCreateProject?: () => void;
  readonly onImportProject?: () => void;
  readonly onOpenSample?: () => void;
  readonly onViewDocs?: () => void;
  readonly showActions?: boolean;
}

export function QuickStartCard({
  title = '당신의 창작을 계속하세요',
  description,
  onCreateProject,
  onImportProject,
  onOpenSample,
  onViewDocs,
  showActions = true
}: QuickStartCardProps): React.ReactElement {
  const navigate = useNavigate();
  const [displayQuote, setDisplayQuote] = useState<string>('');
  
  // 🔥 튜토리얼 시스템
  const { startTutorial } = useTutorial();

  // 마운트 시 랜덤 명언 선택
  useEffect(() => {
    const quote = getRandomQuote();
    setDisplayQuote(quote.full);
  }, []);

  const handleAction = (actionId: string, callback?: () => void): void => {
    Logger.info('QUICK_START', `Quick action triggered: ${actionId}`);
    callback?.();
  };

  const handleCreateProject = async (): Promise<void> => {
    Logger.info('QUICK_START', '🚀 "새 프로젝트" button clicked - navigating to /projects?create=true');
    onCreateProject?.();
  };

  const handleViewDocs = async (): Promise<void> => {
    // 🔥 라우팅 아키텍처: Dashboard로 이동하면서 튜토리얼 자동 시작
    Logger.info('QUICK_START', '📖 Navigating to dashboard with tutorial');
    navigate('/dashboard?tutorial=dashboard-intro');
    
    // onViewDocs 콜백도 호출 (있으면)
    onViewDocs?.();
  };

  const quickActions: readonly QuickAction[] = [
    {
      id: 'create',
      label: '새로운 소설',
      icon: Plus,
      variant: 'primary',
      onClick: () => handleAction('create', handleCreateProject),
      ariaLabel: '새 프로젝트 만들기'
    },
    {
      id: 'import',
      label: 'PC에서 가져오기',
      icon: Download,
      variant: 'secondary',
      onClick: () => handleAction('import', onImportProject),
      ariaLabel: '기존 프로젝트 가져오기'
    },
    {
      id: 'sample',
      label: '샘플 열기',
      icon: FileText,
      variant: 'outline',
      onClick: () => handleAction('sample', onOpenSample),
      ariaLabel: '샘플 프로젝트 열기'
    },
    {
      id: 'docs',
      label: '사용법 보기',
      icon: BookOpen,
      variant: 'outline',
      onClick: () => handleAction('docs', handleViewDocs),
      ariaLabel: '사용 가이드 보기'
    }
  ] as const;

  return (
    <div className={`${QUICK_START_STYLES.container} section-glass-dark`}>
      <Card className="bg-transparent border-none" role="region" aria-label="빠른 시작" data-tour="quick-start-card">
        <div className={QUICK_START_STYLES.content}>
          <h3 className={QUICK_START_STYLES.title}>{title}</h3>
          <p className={QUICK_START_STYLES.description}>{displayQuote || description || '새 프로젝트를 만들거나 기존 프로젝트를 가져올 수 있습니다.'}</p>
          
          {showActions ? (
            <div className={QUICK_START_STYLES.actionGrid}>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant={action.variant}
                    className={QUICK_START_STYLES.actionButton}
                    onClick={action.onClick}
                    aria-label={action.ariaLabel}
                    data-tour={`action-${action.id}`}
                  >
                    <Icon className={QUICK_START_STYLES.icon} aria-hidden="true" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className={QUICK_START_STYLES.emptyState}>
              아직 프로젝트가 없습니다.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
