/**
 * 🎨 배경 및 섹션 스타일 - Theme System 통합
 * CSS 변수 기반으로 Light/Dark 모드 모두 지원
 * 모든 색상은 theme.css의 CSS 변수 사용
 */

/**
 * 📌 Dark 모드 섹션 스타일 (유리 질감)
 * - CSS 변수 기반으로 Light 모드에서 자동 변환됨
 * - backdrop-filter로 깊이감 표현
 */
export const SECTION_GLASS_DARK = {
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(30px) brightness(1.1)',
  WebkitBackdropFilter: 'blur(30px) brightness(1.1)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
} as const;

/**
 * � Light 모드 섹션 스타일 (유리 질감)
 * - rgba(0, 0, 0, ...) 기반으로 어두운 배경에 섹션을 표현
 */
export const SECTION_GLASS_LIGHT = {
  background: 'rgba(0, 0, 0, 0.02)',
  backdropFilter: 'blur(30px) brightness(0.9)',
  WebkitBackdropFilter: 'blur(30px) brightness(0.9)',
  border: '1px solid rgba(0, 0, 0, 0.08)',
} as const;

/**
 * � 대시보드 배경 이미지 (극히 미약함)
 * - opacity: 15% → 배경이 거의 보이지 않음
 * - blur: 40px → 형태 완전히 뭉개짐
 */
export const DASHBOARD_BACKGROUND_IMAGE = {
  backgroundImage: `url('/assets/background/dark.png')`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
  backgroundRepeat: 'no-repeat',
  opacity: 0.15,
  filter: 'blur(40px)',
} as const;

/**
 * 📄 기본 배경 (대시보드 제외 다른 페이지)
 * - CSS 그라데이션만 사용 (이미지 없음)
 */
export const DEFAULT_BACKGROUND = {
  background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--background)))',
} as const;


