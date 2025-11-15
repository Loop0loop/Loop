'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Plus } from 'lucide-react';
import { Logger } from '../../../shared/logger';

/**
 * 🔥 추천 템플릿 전체 페이지
 * 모든 사용 가능한 템플릿을 그리드로 표시
 */

const TEMPLATE_STYLES = {
  container: 'flex-1 flex flex-col min-h-screen bg-[hsl(var(--background))]',
  header: 'sticky top-0 z-40 border-b border-[hsl(var(--border))]/10 bg-[hsl(var(--background))]/95 backdrop-blur-sm',
  headerContent: 'max-w-7xl mx-auto px-6 py-4 flex items-center justify-between',
  headerTitle: 'flex items-center gap-3',
  backButton: 'p-2 rounded-lg hover:bg-foreground/10 transition-colors cursor-pointer',
  titleText: 'text-2xl font-bold text-foreground',
  content: 'flex-1 overflow-y-auto p-6',
  contentInner: 'max-w-7xl mx-auto',
  sectionTitle: 'text-lg font-semibold text-foreground mb-4 flex items-center gap-2',
  grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8',
  card: 'group relative rounded-lg overflow-hidden border border-[hsl(var(--card-border))] bg-[hsl(var(--card-bg))]/50 hover:bg-[hsl(var(--card-bg))] transition-all duration-200 cursor-pointer',
  cardInner: 'flex flex-col h-full overflow-hidden',
  imageWrap: 'relative w-full aspect-[3/4] bg-gradient-to-br from-[hsl(var(--accent-primary))]/20 to-[hsl(var(--accent-dark))]/20 flex items-center justify-center overflow-hidden',
  image: 'w-full h-full object-cover',
  imageIcon: 'absolute w-16 h-16 text-muted-foreground/40 group-hover:text-foreground/20 transition-colors',
  imageOverlay: 'absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity',
  cardContent: 'p-4 flex flex-col flex-1 justify-between',
  cardTitle: 'text-sm font-semibold text-foreground line-clamp-2',
  cardDesc: 'text-xs text-muted-foreground mt-1 line-clamp-2',
  cardFooter: 'flex items-center justify-between mt-3 pt-3 border-t border-[hsl(var(--border))]/10',
  cardMeta: 'text-[0.7rem] text-muted-foreground/70',
  cardButton: 'px-3 py-1.5 rounded-md bg-[hsl(var(--accent-primary))]/10 hover:bg-[hsl(var(--accent-primary))]/20 text-[0.75rem] font-medium text-[hsl(var(--accent-primary))] transition-colors opacity-0 group-hover:opacity-100',
} as const;

interface Template {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: 'classic' | 'genre' | 'structure' | 'experimental';
  readonly image?: string;
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  readonly tags?: readonly string[];
}

const TEMPLATES: readonly Template[] = [
  {
    id: 'tmpl-classic-1',
    title: '위대한 개츠비',
    description: '클래식 문학 템플릿 - 시대 소설의 정석',
    category: 'classic',
    difficulty: 'beginner',
    tags: ['클래식', '문학', '서사'],
  },
  {
    id: 'tmpl-classic-2',
    title: '오디세이아',
    description: '서사시 형식 - 영웅의 여정',
    category: 'classic',
    difficulty: 'intermediate',
    tags: ['서사시', '영웅', '모험'],
  },
  {
    id: 'tmpl-genre-romance',
    title: '현대 로맨스',
    description: '연애 소설 템플릿 - 감정의 깊이',
    category: 'genre',
    difficulty: 'beginner',
    tags: ['로맨스', '감정', '관계'],
  },
  {
    id: 'tmpl-genre-fantasy',
    title: '판타지 세계',
    description: '세계관 구축 템플릿 - 마법과 모험',
    category: 'genre',
    difficulty: 'advanced',
    tags: ['판타지', '마법', '세계관'],
  },
  {
    id: 'tmpl-genre-mystery',
    title: '미스터리 소설',
    description: '추리 구조 템플릿 - 반전과 클라이맥스',
    category: 'genre',
    difficulty: 'intermediate',
    tags: ['추리', '미스터리', '반전'],
  },
  {
    id: 'tmpl-genre-scifi',
    title: '공상 과학 소설',
    description: '미래 세계 템플릿 - 기술과 철학',
    category: 'genre',
    difficulty: 'advanced',
    tags: ['SF', '과학', '미래'],
  },
  {
    id: 'tmpl-structure-threeact',
    title: '3막 구조',
    description: '고전 드라마 구조 - 시작, 중간, 끝',
    category: 'structure',
    difficulty: 'beginner',
    tags: ['구조', '극', '드라마'],
  },
  {
    id: 'tmpl-structure-hero',
    title: '영웅의 여정',
    description: '조셉 캠벨의 영웅 서사구조',
    category: 'structure',
    difficulty: 'intermediate',
    tags: ['영웅', '변화', '구조'],
  },
  {
    id: 'tmpl-exp-experimental',
    title: '실험적 내러티브',
    description: '비선형 서사 - 시간과 시점의 조합',
    category: 'experimental',
    difficulty: 'advanced',
    tags: ['실험', '내러티브', '창의성'],
  },
  {
    id: 'tmpl-exp-stream',
    title: '의식의 흐름',
    description: '내적 독백 - 인물의 생각과 감정',
    category: 'experimental',
    difficulty: 'intermediate',
    tags: ['의식', '심리', '감정'],
  },
];

const CATEGORY_INFO = {
  classic: { label: '클래식', icon: '📚', color: 'from-blue-500 to-blue-600' },
  genre: { label: '장르별', icon: '🎭', color: 'from-purple-500 to-purple-600' },
  structure: { label: '구조별', icon: '🏗️', color: 'from-amber-500 to-amber-600' },
  experimental: { label: '실험적', icon: '✨', color: 'from-pink-500 to-pink-600' },
} as const;

function TemplateCard({
  template,
  onSelect,
}: {
  readonly template: Template;
  readonly onSelect: (id: string) => void;
}): React.ReactElement {
  const handleClick = useCallback(() => {
    onSelect(template.id);
  }, [template.id, onSelect]);

  return (
    <article
      className={TEMPLATE_STYLES.card}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${template.title} - ${template.description}`}
    >
      <div className={TEMPLATE_STYLES.cardInner}>
        {/* 이미지 영역 */}
        <div className={TEMPLATE_STYLES.imageWrap}>
          {template.image ? (
            <img src={template.image} alt={template.title} className={TEMPLATE_STYLES.image} />
          ) : (
            <BookOpen className={TEMPLATE_STYLES.imageIcon} aria-hidden="true" />
          )}
          <div className={TEMPLATE_STYLES.imageOverlay} />
        </div>

        {/* 콘텐츠 영역 */}
        <div className={TEMPLATE_STYLES.cardContent}>
          <div>
            <h3 className={TEMPLATE_STYLES.cardTitle}>{template.title}</h3>
            <p className={TEMPLATE_STYLES.cardDesc}>{template.description}</p>

            {/* 태그 */}
            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {template.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-[hsl(var(--accent-primary))]/10 text-[hsl(var(--accent-primary))]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className={TEMPLATE_STYLES.cardFooter}>
            <span className={TEMPLATE_STYLES.cardMeta}>
              {template.difficulty === 'beginner'
                ? '초급'
                : template.difficulty === 'intermediate'
                  ? '중급'
                  : '고급'}
            </span>
            <button
              className={TEMPLATE_STYLES.cardButton}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              aria-label={`${template.title} 템플릿으로 프로젝트 생성`}
            >
              <Plus className="w-3 h-3 inline mr-1" aria-hidden="true" />
              시작
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Templates(): React.ReactElement {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 카테고리별로 템플릿 그룹화
  const groupedTemplates = useMemo(() => {
    const groups = {
      classic: [] as Template[],
      genre: [] as Template[],
      structure: [] as Template[],
      experimental: [] as Template[],
    };

    TEMPLATES.forEach((template) => {
      groups[template.category].push(template);
    });

    return groups;
  }, []);

  const handleSelectTemplate = useCallback((templateId: string) => {
    Logger.info('TEMPLATES', `Template selected: ${templateId}`);
    navigate(`/projects/create?template=${templateId}`);
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  return (
    <div className={TEMPLATE_STYLES.container}>
      {/* 헤더 */}
      <header className={TEMPLATE_STYLES.header}>
        <div className={TEMPLATE_STYLES.headerContent}>
          <div className={TEMPLATE_STYLES.headerTitle}>
            <button
              onClick={handleBack}
              className={TEMPLATE_STYLES.backButton}
              aria-label="대시보드로 돌아가기"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <div>
              <h1 className={TEMPLATE_STYLES.titleText}>추천 템플릿</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {TEMPLATES.length}개의 템플릿 | 새 프로젝트를 쉽게 시작하세요
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className={TEMPLATE_STYLES.content}>
        <div className={TEMPLATE_STYLES.contentInner}>
          {/* 클래식 */}
          {groupedTemplates.classic.length > 0 && (
            <section>
              <h2 className={TEMPLATE_STYLES.sectionTitle}>
                <span className="text-lg">📚</span>
                클래식
              </h2>
              <div className={TEMPLATE_STYLES.grid}>
                {groupedTemplates.classic.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelectTemplate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 장르별 */}
          {groupedTemplates.genre.length > 0 && (
            <section>
              <h2 className={TEMPLATE_STYLES.sectionTitle}>
                <span className="text-lg">🎭</span>
                장르별
              </h2>
              <div className={TEMPLATE_STYLES.grid}>
                {groupedTemplates.genre.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelectTemplate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 구조별 */}
          {groupedTemplates.structure.length > 0 && (
            <section>
              <h2 className={TEMPLATE_STYLES.sectionTitle}>
                <span className="text-lg">🏗️</span>
                구조별
              </h2>
              <div className={TEMPLATE_STYLES.grid}>
                {groupedTemplates.structure.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelectTemplate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 실험적 */}
          {groupedTemplates.experimental.length > 0 && (
            <section>
              <h2 className={TEMPLATE_STYLES.sectionTitle}>
                <span className="text-lg">✨</span>
                실험적
              </h2>
              <div className={TEMPLATE_STYLES.grid}>
                {groupedTemplates.experimental.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelectTemplate}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
