'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Logger } from '../../../shared/logger';

/**
 * 🔥 추천 템플릿 - 장르별 캐러셀
 * 좌우 스크롤 구조로 템플릿 탐색
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
  
  // 섹션 스타일
  section: 'mb-8',
  sectionTitle: 'text-lg font-semibold text-foreground mb-4 flex items-center gap-2',
  
  // 캐러셀 스타일
  carouselWrapper: 'relative group',
  carousel: 'flex gap-4 overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory scrollbar-hide',
  scrollButton: 'absolute top-1/2 -translate-y-1/2 z-20 p-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0',
  scrollButtonLeft: 'left-0',
  scrollButtonRight: 'right-0',
  
  // 카드 스타일
  card: 'snap-start flex-shrink-0 w-56 h-72 rounded-lg overflow-hidden border border-[hsl(var(--card-border))] bg-[hsl(var(--card-bg))]/50 hover:bg-[hsl(var(--card-bg))] transition-all duration-200 cursor-pointer group/card',
  cardInner: 'flex flex-col h-full overflow-hidden',
  imageWrap: 'relative w-full h-48 bg-gradient-to-br from-[hsl(var(--accent-primary))]/20 to-[hsl(var(--accent-dark))]/20 flex items-center justify-center overflow-hidden',
  image: 'w-full h-full object-cover',
  imageIcon: 'absolute w-16 h-16 text-muted-foreground/40 group-hover/card:text-foreground/20 transition-colors',
  imageOverlay: 'absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity',
  
  // 카드 콘텐츠
  cardContent: 'p-4 flex flex-col flex-1 justify-between',
  cardTitle: 'text-sm font-semibold text-foreground line-clamp-2',
  cardDesc: 'text-xs text-muted-foreground mt-1 line-clamp-2',
  
  // 카드 푸터
  cardFooter: 'flex items-center justify-between mt-3 pt-3 border-t border-[hsl(var(--border))]/10',
  cardMeta: 'text-[0.7rem] text-muted-foreground/70',
  cardButton: 'px-3 py-1.5 rounded-md bg-[hsl(var(--accent-primary))]/10 hover:bg-[hsl(var(--accent-primary))]/20 text-[0.75rem] font-medium text-[hsl(var(--accent-primary))] transition-colors opacity-0 group-hover/card:opacity-100',
} as const;

interface Template {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly genre: 'romance' | 'mystery' | 'fantasy' | 'scifi' | 'thriller' | 'literary';
  readonly image?: string;
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  readonly tags?: readonly string[];
}

const GENRE_INFO = {
  romance: { label: '로맨스', icon: '💕', color: 'from-rose-500 to-pink-600' },
  mystery: { label: '미스터리', icon: '🔍', color: 'from-indigo-500 to-purple-600' },
  fantasy: { label: '판타지', icon: '✨', color: 'from-violet-500 to-purple-600' },
  scifi: { label: '공상과학', icon: '🚀', color: 'from-cyan-500 to-blue-600' },
  thriller: { label: '스릴러', icon: '⚡', color: 'from-orange-500 to-red-600' },
  literary: { label: '문학', icon: '📖', color: 'from-amber-600 to-yellow-600' },
} as const;

const TEMPLATES: readonly Template[] = [
  // 로맨스
  {
    id: 'tmpl-romance-1',
    title: '현대 로맨스',
    description: '도시 커플의 사랑 이야기',
    genre: 'romance',
    difficulty: 'beginner',
    tags: ['사랑', '감정', '관계'],
  },
  {
    id: 'tmpl-romance-2',
    title: '시간 초월 로맨스',
    description: '다른 시대를 배경으로 한 사랑',
    genre: 'romance',
    difficulty: 'intermediate',
    tags: ['시간여행', '운명', '사랑'],
  },
  {
    id: 'tmpl-romance-3',
    title: '가을의 재회',
    description: '옛 사랑과의 재만남',
    genre: 'romance',
    difficulty: 'beginner',
    tags: ['재회', '추억', '감정'],
  },
  {
    id: 'tmpl-romance-4',
    title: '위험한 애정',
    description: '금지된 사랑의 갈등',
    genre: 'romance',
    difficulty: 'intermediate',
    tags: ['갈등', '금지', '선택'],
  },
  
  // 미스터리
  {
    id: 'tmpl-mystery-1',
    title: '미스터리 소설',
    description: '추리 구조 - 반전과 클라이맥스',
    genre: 'mystery',
    difficulty: 'intermediate',
    tags: ['추리', '반전', '범죄'],
  },
  {
    id: 'tmpl-mystery-2',
    title: '실종된 증거',
    description: '사라진 단서를 따라가는 이야기',
    genre: 'mystery',
    difficulty: 'intermediate',
    tags: ['실종', '단서', '수사'],
  },
  {
    id: 'tmpl-mystery-3',
    title: '심야의 비밀',
    description: '도시의 어두운 비밀',
    genre: 'mystery',
    difficulty: 'advanced',
    tags: ['비밀', '음모', '스릴'],
  },
  {
    id: 'tmpl-mystery-4',
    title: '범죄 현장',
    description: '완벽한 범죄 계획',
    genre: 'mystery',
    difficulty: 'advanced',
    tags: ['범죄', '계획', '추리'],
  },
  
  // 판타지
  {
    id: 'tmpl-fantasy-1',
    title: '판타지 세계',
    description: '세계관 구축 - 마법과 모험',
    genre: 'fantasy',
    difficulty: 'advanced',
    tags: ['판타지', '마법', '세계관'],
  },
  {
    id: 'tmpl-fantasy-2',
    title: '드래곤의 왕국',
    description: '용과 용사의 대립',
    genre: 'fantasy',
    difficulty: 'intermediate',
    tags: ['드래곤', '왕국', '전쟁'],
  },
  {
    id: 'tmpl-fantasy-3',
    title: '마법의 학교',
    description: '마법사 학생들의 모험',
    genre: 'fantasy',
    difficulty: 'beginner',
    tags: ['마법', '학교', '성장'],
  },
  {
    id: 'tmpl-fantasy-4',
    title: '다크 판타지',
    description: '어두운 마법의 세계',
    genre: 'fantasy',
    difficulty: 'advanced',
    tags: ['다크', '마법', '위험'],
  },
  
  // 공상과학
  {
    id: 'tmpl-scifi-1',
    title: '공상 과학 소설',
    description: '미래 세계 - 기술과 철학',
    genre: 'scifi',
    difficulty: 'advanced',
    tags: ['SF', '과학', '미래'],
  },
  {
    id: 'tmpl-scifi-2',
    title: '우주 탐험',
    description: '은하계 여행의 모험',
    genre: 'scifi',
    difficulty: 'intermediate',
    tags: ['우주', '탐험', '외계인'],
  },
  {
    id: 'tmpl-scifi-3',
    title: '로봇 혁명',
    description: 'AI와 인간의 갈등',
    genre: 'scifi',
    difficulty: 'intermediate',
    tags: ['AI', '로봇', '미래'],
  },
  {
    id: 'tmpl-scifi-4',
    title: '시간의 종말',
    description: '시간 여행의 역설',
    genre: 'scifi',
    difficulty: 'advanced',
    tags: ['시간', '여행', '역설'],
  },
  
  // 스릴러
  {
    id: 'tmpl-thriller-1',
    title: '심리 스릴러',
    description: '마음의 어둠을 파헤치기',
    genre: 'thriller',
    difficulty: 'intermediate',
    tags: ['심리', '긴장', '반전'],
  },
  {
    id: 'tmpl-thriller-2',
    title: '추격',
    description: '도망자와 추적자',
    genre: 'thriller',
    difficulty: 'intermediate',
    tags: ['추격', '긴장', '위험'],
  },
  {
    id: 'tmpl-thriller-3',
    title: '보복',
    description: '피할 수 없는 복수',
    genre: 'thriller',
    difficulty: 'advanced',
    tags: ['복수', '정의', '절망'],
  },
  
  // 문학
  {
    id: 'tmpl-literary-1',
    title: '위대한 개츠비',
    description: '클래식 문학 템플릿',
    genre: 'literary',
    difficulty: 'beginner',
    tags: ['클래식', '문학', '서사'],
  },
  {
    id: 'tmpl-literary-2',
    title: '오디세이아',
    description: '서사시 형식 - 영웅의 여정',
    genre: 'literary',
    difficulty: 'intermediate',
    tags: ['서사시', '영웅', '모험'],
  },
  {
    id: 'tmpl-literary-3',
    title: '의식의 흐름',
    description: '내적 독백 - 심리 탐구',
    genre: 'literary',
    difficulty: 'advanced',
    tags: ['의식', '심리', '감정'],
  },
];

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
              시작
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function CarouselSection({
  title,
  genre,
  templates,
  onSelect,
}: {
  readonly title: string;
  readonly genre: keyof typeof GENRE_INFO;
  readonly templates: readonly Template[];
  readonly onSelect: (id: string) => void;
}): React.ReactElement {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 300);
    }
  }, [checkScroll]);

  React.useEffect(() => {
    checkScroll();
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', checkScroll);
      return () => carousel.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll]);

  const genreInfo = GENRE_INFO[genre];

  return (
    <section className={TEMPLATE_STYLES.section}>
      <h2 className={TEMPLATE_STYLES.sectionTitle}>
        <span className="text-xl">{genreInfo.icon}</span>
        {title}
      </h2>

      <div className={TEMPLATE_STYLES.carouselWrapper}>
        {/* 좌측 스크롤 버튼 */}
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className={`${TEMPLATE_STYLES.scrollButton} ${TEMPLATE_STYLES.scrollButtonLeft}`}
          aria-label="왼쪽으로 스크롤"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* 캐러셀 */}
        <div ref={carouselRef} className={TEMPLATE_STYLES.carousel}>
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} onSelect={onSelect} />
          ))}
        </div>

        {/* 우측 스크롤 버튼 */}
        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={`${TEMPLATE_STYLES.scrollButton} ${TEMPLATE_STYLES.scrollButtonRight}`}
          aria-label="오른쪽으로 스크롤"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export default function Templates(): React.ReactElement {
  const navigate = useNavigate();

  // 장르별로 템플릿 그룹화
  const groupedTemplates = useMemo(() => {
    const groups = {
      romance: [] as Template[],
      mystery: [] as Template[],
      fantasy: [] as Template[],
      scifi: [] as Template[],
      thriller: [] as Template[],
      literary: [] as Template[],
    };

    TEMPLATES.forEach((template) => {
      groups[template.genre].push(template);
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
                {TEMPLATES.length}개의 템플릿 | 좌우로 탐색하세요
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className={TEMPLATE_STYLES.content}>
        <div className={TEMPLATE_STYLES.contentInner}>
          {/* 로맨스 */}
          {groupedTemplates.romance.length > 0 && (
            <CarouselSection
              title="로맨스"
              genre="romance"
              templates={groupedTemplates.romance}
              onSelect={handleSelectTemplate}
            />
          )}

          {/* 미스터리 */}
          {groupedTemplates.mystery.length > 0 && (
            <CarouselSection
              title="미스터리"
              genre="mystery"
              templates={groupedTemplates.mystery}
              onSelect={handleSelectTemplate}
            />
          )}

          {/* 판타지 */}
          {groupedTemplates.fantasy.length > 0 && (
            <CarouselSection
              title="판타지"
              genre="fantasy"
              templates={groupedTemplates.fantasy}
              onSelect={handleSelectTemplate}
            />
          )}

          {/* 공상과학 */}
          {groupedTemplates.scifi.length > 0 && (
            <CarouselSection
              title="공상과학"
              genre="scifi"
              templates={groupedTemplates.scifi}
              onSelect={handleSelectTemplate}
            />
          )}

          {/* 스릴러 */}
          {groupedTemplates.thriller.length > 0 && (
            <CarouselSection
              title="스릴러"
              genre="thriller"
              templates={groupedTemplates.thriller}
              onSelect={handleSelectTemplate}
            />
          )}

          {/* 문학 */}
          {groupedTemplates.literary.length > 0 && (
            <CarouselSection
              title="문학"
              genre="literary"
              templates={groupedTemplates.literary}
              onSelect={handleSelectTemplate}
            />
          )}
        </div>
      </main>
    </div>
  );
}
