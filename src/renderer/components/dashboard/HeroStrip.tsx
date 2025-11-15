'use client';

import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import { Card } from '../ui';

/**
 * 🔥 개선된 HeroStrip: 최근 사용 + 추천 템플릿
 * Notion/Ulysses 영감: 빠른 접근 + 발견 가능성
 */

const HERO_STYLES = {
  container: 'w-full flex flex-col gap-4',
  section: 'flex flex-col gap-3',
  sectionHeader: 'flex items-center justify-between px-1',
  sectionTitle: 'text-sm font-semibold text-foreground flex items-center gap-2',
  actionButton: 'text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 hover:bg-foreground/5 rounded-md',
  viewAllButton: 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-foreground/10 hover:border-foreground/20 hover:bg-foreground/5 transition-all duration-200 group',
  viewAllIcon: 'w-3 h-3 group-hover:translate-x-0.5 transition-transform',
  strip: 'flex gap-3 overflow-x-auto py-2 px-1 pb-2 snap-x scrollbar-hide',
  card: 'snap-start w-56 min-w-[14rem] h-28 rounded-lg overflow-hidden flex-shrink-0 bg-[hsl(var(--card-bg))] border border-[hsl(var(--card-border))] shadow-sm hover:shadow-md hover:border-foreground/20 transition-all duration-200 cursor-pointer group',
  imageWrap: 'w-28 h-full bg-gradient-to-br from-[hsl(var(--accent-primary))]/20 to-[hsl(var(--accent-dark))]/20 flex-shrink-0 flex items-center justify-center',
  imageIcon: 'w-12 h-12 text-muted-foreground/50 group-hover:text-foreground/30 transition-colors',
  content: 'p-3 flex flex-col justify-between flex-1',
  cardTitle: 'text-xs font-semibold text-foreground truncate line-clamp-1',
  cardDesc: 'text-[hsl(var(--muted-foreground))] text-xs line-clamp-1 mt-1',
  cardMeta: 'flex items-center justify-between mt-2',
  cardDate: 'text-[0.7rem] text-muted-foreground/70',
  startButton: 'h-6 px-2 text-[0.65rem] opacity-0 group-hover:opacity-100 transition-opacity',
} as const;

interface CardItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly image?: string;
  readonly date?: string;
  readonly status?: 'draft' | 'active' | 'completed';
}

export interface HeroStripProps {
  readonly recent?: readonly CardItem[];
  readonly templates?: readonly CardItem[];
  readonly onSelectRecent?: (id: string) => void;
  readonly onSelectTemplate?: (id: string) => void;
}

const DEFAULT_TEMPLATES = [
  {
    id: 'tmpl-1',
    title: '위대한 개츠비',
    description: '클래식 문학 템플릿',
    date: '템플릿',
  },
  {
    id: 'tmpl-2',
    title: '오디세이아',
    description: '서사시 형식',
    date: '템플릿',
  },
  {
    id: 'tmpl-3',
    title: '현대 로맨스',
    description: '연애 소설',
    date: '템플릿',
  },
  {
    id: 'tmpl-4',
    title: '판타지 세계',
    description: '세계관 구축',
    date: '템플릿',
  },
  {
    id: 'tmpl-5',
    title: '미스터리 소설',
    description: '추리 구조',
    date: '템플릿',
  },
] as const;

/**
 * 개별 카드 컴포넌트
 */
function HeroCard({
  item,
  onSelect,
  variant = 'default',
}: {
  readonly item: CardItem;
  readonly onSelect: (id: string) => void;
  readonly variant?: 'recent' | 'template' | 'default';
}): React.ReactElement {
  const handleClick = useCallback(() => {
    onSelect(item.id);
  }, [item.id, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <article
      key={item.id}
      className={HERO_STYLES.card}
      role="button"
      tabIndex={0}
      aria-label={`${item.title} - ${item.description || item.date}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={HERO_STYLES.imageWrap}>
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookOpen className={HERO_STYLES.imageIcon} aria-hidden="true" />
        )}
      </div>

      <div className={HERO_STYLES.content}>
        <div>
          <h3 className={HERO_STYLES.cardTitle}>{item.title}</h3>
          <p className={HERO_STYLES.cardDesc}>{item.description}</p>
        </div>

        <div className={HERO_STYLES.cardMeta}>
          <span className={HERO_STYLES.cardDate}>{item.date}</span>
          <button
            className={HERO_STYLES.startButton}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            aria-label={`${item.title} 시작`}
          >
            시작
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * HeroStrip 메인 컴포넌트
 */
export function HeroStrip({
  recent = [],
  templates = DEFAULT_TEMPLATES,
  onSelectRecent,
  onSelectTemplate,
}: HeroStripProps): React.ReactElement {
  const navigate = useNavigate();

  const handleSelectRecent = useCallback((id: string) => {
    onSelectRecent?.(id);
    navigate(`/editor/${id}`);
  }, [onSelectRecent, navigate]);

  const handleSelectTemplate = useCallback((id: string) => {
    onSelectTemplate?.(id);
    navigate(`/projects/create?template=${id}`);
  }, [onSelectTemplate, navigate]);

  const hasRecent = recent.length > 0;

  return (
    <div className={HERO_STYLES.container} aria-label="빠른 접근">
      {/* 최근 사용 섹션 */}
      {hasRecent && (
        <div className={HERO_STYLES.section}>
          <div className={HERO_STYLES.sectionHeader}>
            <h2 className={HERO_STYLES.sectionTitle}>
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              최근 작업
            </h2>
            <button
              onClick={() => navigate('/recents')}
              className={HERO_STYLES.viewAllButton}
              aria-label="모든 최근 작업 보기"
            >
              <span className="text-xs font-medium">모두보기</span>
              <ChevronRight className={HERO_STYLES.viewAllIcon} aria-hidden="true" />
            </button>
          </div>
          <div className={HERO_STYLES.strip} data-testid="hero-recent">
            {recent.map(item => (
              <HeroCard
                key={item.id}
                item={item}
                onSelect={handleSelectRecent}
                variant="recent"
              />
            ))}
          </div>
        </div>
      )}

      {/* 추천 템플릿 섹션 */}
      <div className={HERO_STYLES.section}>
        <div className={HERO_STYLES.sectionHeader}>
          <h2 className={HERO_STYLES.sectionTitle}>
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            추천 템플릿
          </h2>
          <button
            onClick={() => navigate('/templates')}
            className={HERO_STYLES.viewAllButton}
            aria-label="모든 추천 템플릿 보기"
          >
            <span className="text-xs font-medium">모두보기</span>
            <ChevronRight className={HERO_STYLES.viewAllIcon} aria-hidden="true" />
          </button>
        </div>
        <div className={HERO_STYLES.strip} data-testid="hero-templates">
          {templates.map(item => (
            <HeroCard
              key={item.id}
              item={item}
              onSelect={handleSelectTemplate}
              variant="template"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
