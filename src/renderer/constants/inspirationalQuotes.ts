/**
 * 🔥 작가들을 위한 영감 명언 상수
 * 테마 색상과 함께 관리되는 명언 배열
 */

export interface InspirationalQuote {
  readonly text: string;
  readonly author: string;
  readonly full: string; // "명언 - 작가명" 형식
}

/**
 * 테마 색상 정의 (CSS 변수와 동일하게 매칭)
 * dark.png 배경과 어울리는 색상 팔레트
 */
export const QUOTE_THEME = {
  /** 명언 본문 - 밝은 회색 (가독성 높음) */
  textColor: 'text-gray-200',
  
  /** 명언 강조 - 파랑 액센트 */
  accentColor: 'text-blue-400',
  
  /** 배경 오버레이 - 반투명 검정 */
  bgOverlay: 'bg-black/40',
  
  /** 카드 배경 - 반투명 다크 */
  cardBg: 'bg-slate-900/80',
} as const;

/**
 * 작가 명언 배열 - 무작위로 선택됨
 * 각 명언은 영감과 실용성을 함께 제공
 */
export const INSPIRATIONAL_QUOTES: readonly InspirationalQuote[] = [
  {
    text: '제대로 쓰려하지 말고 무조건 써라.',
    author: '제임스 서버',
    full: '제대로 쓰려하지 말고 무조건 써라. - 제임스 서버',
  },
  {
    text: '영감이 찾아오길 기다려서는 안 된다. 직접 찾으러 나서야 한다.',
    author: '잭 런던',
    full: '영감이 찾아오길 기다려서는 안 된다. 직접 찾으러 나서야 한다. - 잭 런던',
  },
  {
    text: '매일 글을 써라. 강렬하게 독서해라.',
    author: '래이 브래드 버리',
    full: '매일 글을 써라. 강렬하게 독서해라. - 래이 브래드 버리',
  },
  {
    text: '글쓰기는 엉덩이로 쓰는 것이다.',
    author: '강원국',
    full: '글쓰기는 엉덩이로 쓰는 것이다. - 강원국',
  },
  {
    text: '영감은 당신이 쓰고 있을 때 온다.',
    author: '매들렌 렝글',
    full: '영감은 당신이 쓰고 있을 때 온다. - 매들렌 렝글',
  },
  {
    text: '글을 쓸 때 중요한 것은 나 자신을 믿으라고 무언가가 이루어질 것이라고 자기 최면을 거는 것이다.',
    author: '앤 라모트',
    full: '글을 쓸 때 중요한 것은 나 자신을 믿으라고 무언가가 이루어질 것이라고 자기 최면을 거는 것이다. - 앤 라모트',
  },
  {
    text: '위대한 글쓰기는 존재하지 않는다. 오직 위대한 고쳐 쓰기만 존재할 뿐이다.',
    author: 'E.B. 화이트',
    full: '위대한 글쓰기는 존재하지 않는다. 오직 위대한 고쳐 쓰기만 존재할 뿐이다. - E.B. 화이트',
  },
  {
    text: '당신이 읽고 싶은 책이 있는데 그 이야기가 책으로 나오지 않았다면, 당신은 그 이야기를 쓰면 된다.',
    author: '토니 모리슨',
    full: '당신이 읽고 싶은 책이 있는데 그 이야기가 책으로 나오지 않았다면, 당신은 그 이야기를 쓰면 된다. - 토니 모리슨',
  },
  {
    text: '글쓰기는 세상에서 가장 외로운 노동이다.',
    author: '존 스타인벡',
    full: '글쓰기는 세상에서 가장 외로운 노동이다. - 존 스타인벡',
  },
  {
    text: '아마추어는 앉아서 영감을 기다리지만, 나머지 사람들은 일어나서 일하러 간다.',
    author: '스티븐 킹',
    full: '아마추어는 앉아서 영감을 기다리지만, 나머지 사람들은 일어나서 일하러 간다. - 스티븐 킹',
  },
  {
    text: '글을 쓰고 싶다면 기꺼이 위험을 무릅쓰고 모험을 해야 한다.',
    author: '제서민 웨스트',
    full: '글을 쓰고 싶다면 기꺼이 위험을 무릅쓰고 모험을 해야 한다. - 제서민 웨스트',
  },
  {
    text: '독서를 하지 않고 글을 쓰려 함은 홀로 작은 배를 타고 위험천만하게 바다로 향하는 일과 같다.',
    author: '테이아 오브레트',
    full: '독서를 하지 않고 글을 쓰려 함은 홀로 작은 배를 타고 위험천만하게 바다로 향하는 일과 같다. - 테이아 오브레트',
  },
  {
    text: '작가로서의 삶을 시작하는 사람들에게 글쓰기 재능을 연마하기 전에 뻔뻔함을 키우라고 말하고 싶다.',
    author: '하퍼 리',
    full: '작가로서의 삶을 시작하는 사람들에게 글쓰기 재능을 연마하기 전에 뻔뻔함을 키우라고 말하고 싶다. - 하퍼 리',
  },
  {
    text: '난 한 문장, 한 아이디어, 한 이미지를 갖고 시작한다. 그 이상으론 아무것도 모른다.',
    author: '데이비드 라비',
    full: '난 한 문장, 한 아이디어, 한 이미지를 갖고 시작한다. 그 이상으론 아무것도 모른다. - 데이비드 라비',
  },
  {
    text: '테크닉만으로는 충분하지 않다. 열정을 가져야 한다.',
    author: '레이먼드 첸들러',
    full: '테크닉만으로는 충분하지 않다. 열정을 가져야 한다. - 레이먼드 첸들러',
  },
  {
    text: '모든 글의 초고는 끔찍하다. 죽치고 앉아 쓰는 수밖에 없다.',
    author: '어니스트 헤밍웨이',
    full: '모든 글의 초고는 끔찍하다. 죽치고 앉아 쓰는 수밖에 없다. - 어니스트 헤밍웨이',
  },
] as const;

/**
 * 명언 배열 길이
 */
export const QUOTE_COUNT = INSPIRATIONAL_QUOTES.length;

/**
 * 랜덤 명언 선택 함수
 */
export function getRandomQuote(): InspirationalQuote {
  const randomIndex = Math.floor(Math.random() * QUOTE_COUNT);
  const quote = INSPIRATIONAL_QUOTES[randomIndex];
  if (!quote) {
    // Fallback - 첫 번째 명언
    return INSPIRATIONAL_QUOTES[0]!;
  }
  return quote;
}
