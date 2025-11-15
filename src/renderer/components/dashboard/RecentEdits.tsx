'use client';

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid as GridIcon, List as ListIcon, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * 🔥 RecentEdits: 그리드/리스트 토글
 * 작가 선택 자유도 높임
 */

const RECENT_STYLES = {
  container: 'w-full flex flex-col gap-3',
  header: 'flex items-center justify-between px-1',
  title: 'text-sm font-semibold text-foreground flex items-center gap-2',
  actions: 'flex items-center gap-1',
  viewToggle: 'p-2 rounded-md border border-transparent hover:border-foreground/20 hover:bg-foreground/5 transition-all',
  viewToggleActive: 'bg-foreground/10 border-foreground/20',
  grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  list: 'space-y-2 flex flex-col',
  gridCard: 'rounded-lg overflow-hidden border border-[hsl(var(--card-border))] bg-[hsl(var(--card-bg))]/50 hover:bg-[hsl(var(--card-bg))] transition-all duration-200 cursor-pointer',
  gridImage: 'w-full h-32 bg-gradient-to-br from-[hsl(var(--accent-primary))]/20 to-[hsl(var(--accent-dark))]/20 flex items-center justify-center',
  gridContent: 'p-3',
  gridTitle: 'text-sm font-medium text-foreground truncate',
  gridMeta: 'flex items-center justify-between mt-2',
  gridDate: 'text-xs text-muted-foreground flex items-center gap-1',
  gridStatus: 'text-[0.65rem] font-medium px-2 py-0.5 rounded-full bg-[hsl(var(--accent-primary))]/10 text-[hsl(var(--accent-primary))]',
  listItem: 'flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--card-border))] bg-[hsl(var(--card-bg))]/30 hover:bg-[hsl(var(--card-bg))]/60 transition-all',
  listImage: 'w-12 h-12 rounded-md bg-gradient-to-br from-[hsl(var(--accent-primary))]/20 to-[hsl(var(--accent-dark))]/20 flex-shrink-0',
  listContent: 'flex-1 min-w-0',
  listTitle: 'text-sm font-medium text-foreground truncate',
  listMeta: 'flex items-center gap-2 mt-1 text-xs text-muted-foreground',
  listStatus: 'text-[0.65rem] font-medium px-1.5 py-0.5 rounded bg-[hsl(var(--accent-primary))]/10 text-[hsl(var(--accent-primary))]',
  emptyState: 'text-center py-8 text-muted-foreground',
  emptyIcon: 'w-12 h-12 mx-auto mb-2 opacity-50',
} as const;

type ViewMode = 'grid' | 'list';

interface RecentEdit {
  readonly id: string;
  readonly name: string;
  readonly date: string;
  readonly project?: string;
  readonly wordCount?: number;
  readonly status?: 'draft' | 'editing' | 'completed';
  readonly thumbnail?: string;
}

export interface RecentEditsProps {
  readonly items?: readonly RecentEdit[];
  readonly onSelect?: (id: string) => void;
  readonly onViewAll?: () => void;
}

/**
 * 그리드 뷰 카드
 */
function RecentCardGrid({
  item,
  onSelect,
}: {
  readonly item: RecentEdit;
  readonly onSelect: (id: string) => void;
}): React.ReactElement {
  const handleClick = useCallback(() => {
    onSelect(item.id);
  }, [item.id, onSelect]);

  return (
    <article
      className={RECENT_STYLES.gridCard}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${item.name} - ${item.project}`}
    >
      <div className={RECENT_STYLES.gridImage}>
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-muted-foreground/30 text-xs">이미지</div>
        )}
      </div>
      <div className={RECENT_STYLES.gridContent}>
        <h3 className={RECENT_STYLES.gridTitle}>{item.name}</h3>
        <div className={RECENT_STYLES.gridMeta}>
          <span className={RECENT_STYLES.gridDate}>
            <Clock className="w-3 h-3" aria-hidden="true" />
            {item.date}
          </span>
          {item.status && (
            <span className={RECENT_STYLES.gridStatus}>
              {item.status === 'completed' ? '완성' : item.status === 'editing' ? '편집중' : '초안'}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * 리스트 뷰 아이템
 */
function RecentItemList({
  item,
  onSelect,
}: {
  readonly item: RecentEdit;
  readonly onSelect: (id: string) => void;
}): React.ReactElement {
  const handleClick = useCallback(() => {
    onSelect(item.id);
  }, [item.id, onSelect]);

  return (
    <article
      className={RECENT_STYLES.listItem}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${item.name} - ${item.project}`}
    >
      <div className={RECENT_STYLES.listImage} />
      <div className={RECENT_STYLES.listContent}>
        <h3 className={RECENT_STYLES.listTitle}>{item.name}</h3>
        <div className={RECENT_STYLES.listMeta}>
          <Clock className="w-3 h-3" aria-hidden="true" />
          {item.date}
          {item.project && (
            <>
              <span>·</span>
              <span>{item.project}</span>
            </>
          )}
          {item.status && (
            <span className={RECENT_STYLES.listStatus}>
              {item.status === 'completed' ? '완성' : item.status === 'editing' ? '편집중' : '초안'}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * RecentEdits 메인
 */
export function RecentEdits({
  items = [],
  onSelect,
  onViewAll,
}: RecentEditsProps): React.ReactElement {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const handleSelectItem = useCallback(
    (id: string) => {
      onSelect?.(id);
      navigate(`/editor/${id}`);
    },
    [onSelect, navigate]
  );

  const handleViewAll = useCallback(() => {
    onViewAll?.();
    navigate('/recents');
  }, [onViewAll, navigate]);

  const displayItems = items.slice(0, 6);

  if (displayItems.length === 0) {
    return (
      <div className={RECENT_STYLES.container} role="region" aria-label="최근 편집">
        <div className={RECENT_STYLES.header}>
          <h2 className={RECENT_STYLES.title}>최근 편집</h2>
        </div>
        <div className={RECENT_STYLES.emptyState}>
          <Clock className={RECENT_STYLES.emptyIcon} aria-hidden="true" />
          <p className="text-sm">아직 편집한 소설이 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <section className={RECENT_STYLES.container} role="region" aria-label="최근 편집">
      <div className={RECENT_STYLES.header}>
        <h2 className={RECENT_STYLES.title}>최근 편집</h2>
        <div className={RECENT_STYLES.actions}>
          <Button
            variant="ghost"
            size="sm"
            className={`${RECENT_STYLES.viewToggle} ${viewMode === 'grid' ? RECENT_STYLES.viewToggleActive : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="그리드 보기"
            aria-pressed={viewMode === 'grid'}
          >
            <GridIcon className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`${RECENT_STYLES.viewToggle} ${viewMode === 'list' ? RECENT_STYLES.viewToggleActive : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="리스트 보기"
            aria-pressed={viewMode === 'list'}
          >
            <ListIcon className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleViewAll}>
            모두보기
          </Button>
        </div>
      </div>

      <div className={viewMode === 'grid' ? RECENT_STYLES.grid : RECENT_STYLES.list} role="list">
        {displayItems.map((item: RecentEdit) => (
          <div key={item.id} role="listitem">
            {viewMode === 'grid' ? (
              <RecentCardGrid item={item} onSelect={handleSelectItem} />
            ) : (
              <RecentItemList item={item} onSelect={handleSelectItem} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
