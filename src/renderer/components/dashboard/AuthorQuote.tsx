'use client';

import React, { useMemo } from 'react';

/**
 * 🔥 작가 영감 명언 모음
 * Loop 워드프로세서에 맞는 한국 작가 / 국제 문학인 명언
 */

interface Quote {
  readonly text: string;
  readonly author: string;
  readonly source?: string;
}

const AUTHOR_QUOTES: readonly Quote[] = [
  {
    text: '쓰기란 빈 페이지를 두려워하지 않고, 첫 문장을 적는 용기다.',
    author: '무라카미 하루키',
    source: '기사도 정신으로',
  },
  {
    text: '완벽한 원고를 기다리지 말고, 완벽한 초안을 쓴 다음 고쳐라.',
    author: '앤 라모트',
    source: '버드 바이 버드',
  },
  {
    text: '글쓰기는 읽기의 반대가 아니다. 글쓰기는 읽기를 깊게 한다.',
    author: '수전 손택',
  },
  {
    text: '매일 조금씩 쓰면, 한 달 뒤엔 책이 된다.',
    author: '스티픈 킹',
    source: '유혹하는 글쓰기',
  },
  {
    text: '자신의 이야기를 쓰지 않으면, 누군가가 대신 너의 이야기를 쓸 것이다.',
    author: '신디 윌슨',
  },
  {
    text: '창작의 고통은 완성의 기쁨이 된다.',
    author: '톨스토이',
  },
  {
    text: '글을 잘 쓰려면 먼저 많이 읽고, 그 다음 많이 써야 한다.',
    author: '윌리엄 포크너',
  },
  {
    text: '좋은 글은 수정 중에 탄생한다. 첫 드래프트는 단지 시작일 뿐이다.',
    author: '조안 디디온',
  },
  {
    text: '작가가 되려면, 먼저 훌륭한 독자가 되어야 한다.',
    author: '조지 알렉 ',
  },
  {
    text: '이 페이지를 비우고 싶은 공포를 느낄 때, 그것이 바로 창작이 시작되는 순간이다.',
    author: '페르난도 페소아',
  },
];

/**
 * 랜덤 명언 선택
 */
function getRandomQuote(): Quote {
  const randomIndex = Math.floor(Math.random() * AUTHOR_QUOTES.length);
  return AUTHOR_QUOTES[randomIndex] as Quote;
}

/**
 * 명언 컴포넌트
 */
const QUOTE_STYLES = {
  container: 'w-full flex flex-col gap-3 py-4 px-1',
  quoteBox: 'rounded-lg border border-[hsl(var(--border))]/30 bg-gradient-to-br from-[hsl(var(--accent-primary))]/5 to-[hsl(var(--accent-dark))]/5 p-4 backdrop-blur-sm',
  quoteText: 'text-sm font-medium italic text-foreground leading-relaxed',
  quoteAuthor: 'text-xs text-muted-foreground mt-2 flex items-start gap-1 before:content-["—"]',
  quoteSource: 'text-[0.65rem] text-muted-foreground/60 ml-0',
} as const;

export interface AuthorQuoteProps {
  readonly quote?: Quote;
}

export function AuthorQuote({ quote }: AuthorQuoteProps): React.ReactElement {
  const displayQuote = useMemo(() => quote || getRandomQuote(), [quote]);

  return (
    <div className={QUOTE_STYLES.container} role="region" aria-label="작가 영감 명언">
      <div className={QUOTE_STYLES.quoteBox}>
        <p className={QUOTE_STYLES.quoteText}>"{displayQuote.text}"</p>
        <p className={QUOTE_STYLES.quoteAuthor}>
          <span>{displayQuote.author}</span>
        </p>
        {displayQuote.source && (
          <p className={QUOTE_STYLES.quoteSource}>
            — {displayQuote.source}
          </p>
        )}
      </div>
    </div>
  );
}

export function getRandomAuthorQuote(): Quote {
  return getRandomQuote();
}

export function getAllQuotes(): readonly Quote[] {
  return AUTHOR_QUOTES;
}
