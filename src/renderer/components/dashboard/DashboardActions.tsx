'use client';

import React, { useCallback } from 'react';
import { Download, BookOpen, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logger } from '../../../shared/logger';

/**
 * 🔥 대시보드 액션 버튼
 * PC에서 가져오기 / 튜토리얼
 */

const ACTION_STYLES = {
  container: 'w-full flex flex-col gap-3',
  actions: 'flex flex-col sm:flex-row gap-2 px-1',
  actionButton: 'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[hsl(var(--border))]/20 hover:border-foreground/40 hover:bg-foreground/5 transition-all duration-200',
  icon: 'w-4 h-4',
} as const;

export interface DashboardActionsProps {
  readonly onImport?: () => Promise<void> | void;
  readonly onTutorial?: () => Promise<void> | void;
}

export function DashboardActions({
  onImport,
  onTutorial,
}: DashboardActionsProps): React.ReactElement {
  const handleImport = useCallback(async () => {
    try {
      Logger.info('DASHBOARD_ACTIONS', 'Import button clicked');
      if (window.electronAPI?.projects) {
        const result = await window.electronAPI.projects.importFile();
        if (result.success) {
          Logger.info('DASHBOARD_ACTIONS', 'File imported successfully');
        }
      }
      onImport?.();
    } catch (error) {
      Logger.error('DASHBOARD_ACTIONS', 'Import failed', error);
    }
  }, [onImport]);

  const handleTutorial = useCallback(async () => {
    try {
      Logger.info('DASHBOARD_ACTIONS', 'Tutorial button clicked');
      onTutorial?.();
    } catch (error) {
      Logger.error('DASHBOARD_ACTIONS', 'Tutorial failed', error);
    }
  }, [onTutorial]);

  return (
    <div className={ACTION_STYLES.container} role="toolbar" aria-label="대시보드 액션">
      <div className={ACTION_STYLES.actions}>
        <Button
          variant="outline"
          className={ACTION_STYLES.actionButton}
          onClick={handleImport}
          aria-label="PC에서 파일 가져오기"
          title="PC 또는 폴더에서 기존 문서를 가져옵니다"
        >
          <Download className={ACTION_STYLES.icon} aria-hidden="true" />
          <span className="text-sm font-medium">PC에서 가져오기</span>
        </Button>

        <Button
          variant="outline"
          className={ACTION_STYLES.actionButton}
          onClick={handleTutorial}
          aria-label="튜토리얼 시작"
          title="Loop 사용법을 배웁니다"
        >
          <HelpCircle className={ACTION_STYLES.icon} aria-hidden="true" />
          <span className="text-sm font-medium">튜토리얼</span>
        </Button>

        <Button
          variant="outline"
          className={ACTION_STYLES.actionButton}
          onClick={() => Logger.info('DASHBOARD_ACTIONS', 'Templates clicked')}
          aria-label="더 많은 템플릿 보기"
          title="다양한 템플릿 라이브러리를 둘러봅니다"
        >
          <BookOpen className={ACTION_STYLES.icon} aria-hidden="true" />
          <span className="text-sm font-medium">템플릿 라이브러리</span>
        </Button>
      </div>
    </div>
  );
}
