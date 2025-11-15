import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { existsSync, readFileSync } from 'fs'
import { parse } from 'dotenv'

// 🔥 GIGA-CHAD 보안 강화: NEXT_PUBLIC_* 환경변수 제거
// API 키는 main process에서만 관리, renderer는 IPC를 통해서만 접근
// ⚠️ CRITICAL: GEMINI_API_KEY는 절대 렌더러에 노출하면 안 됨!
// 렌더러는 IPC를 통해 main process의 Gemini 기능을 호출만 함
const PUBLIC_RENDERER_ENV_KEYS = [] as const

type PublicRendererEnvKey = (typeof PUBLIC_RENDERER_ENV_KEYS)[number]

const RENDERER_ENV_DEFAULTS: Record<string, string> = {
  NODE_ENV: 'development',
  DEBUG: 'false',
  LOG_LEVEL: 'debug',
  VERBOSE_LOGGING: 'false'
}

const loadEnvironmentVariables = (mode: string): Record<string, string> => {
  const cwd = process.cwd()
  const files = ['.env', '.env.local']
  if (mode) {
    files.push(`.env.${mode}`, `.env.${mode}.local`)
  }

  const env: Record<string, string> = {}

  for (const file of files) {
    const filePath = resolve(cwd, file)
    if (!existsSync(filePath)) {
      continue
    }
    try {
      const parsed = parse(readFileSync(filePath))
      Object.assign(env, parsed)
    } catch {
      // ignore malformed env files to avoid crashing dev server
    }
  }

  return env
}

export default defineConfig(({ mode }) => {
  const env = loadEnvironmentVariables(mode)

  const readEnv = (key: string, fallback = ''): string => {
    // 🔥 NODE_ENV는 process.env를 우선으로 (cross-env 지원)
    if (key === 'NODE_ENV' && process.env.NODE_ENV) {
      console.log(`[vite-config] NODE_ENV from cross-env: ${process.env.NODE_ENV}`);
      return process.env.NODE_ENV
    }
    const value = env[key] ?? process.env[key]
    if (key === 'NODE_ENV') {
      const result = typeof value === 'string' && value.length > 0 ? value : fallback
      console.log(`[vite-config] NODE_ENV fallback to: ${result}`)
      return result
    }
    return typeof value === 'string' && value.length > 0 ? value : fallback
  }

  const rendererEnvDefinition: Record<string, string> = {}
  for (const [key, fallback] of Object.entries(RENDERER_ENV_DEFAULTS)) {
    // 🔥 GIGA-CHAD: NODE_ENV는 cross-env가 설정한 process.env를 우선 사용
    // readEnv에서 이미 process.env.NODE_ENV 체크하므로 여기서는 RENDERER_ENV_DEFAULTS 폴백 사용 가능
    const value = readEnv(key, fallback) || fallback
    rendererEnvDefinition[key] = JSON.stringify(value)
  }

  // Build a JS object literal (as code string) that represents process.env for the renderer.
  // rendererEnvDefinition values are already JSON.stringified, so we can interpolate them directly.
  const rendererProcessEnvCode = `{ ${Object.entries(rendererEnvDefinition)
    .map(([k, v]) => `${JSON.stringify(k)}: ${v}`)
    .join(', ')} }`

  // 🔥 GIGA-CHAD 보안: 렌더러에는 PUBLIC 환경변수만 주입
  // 민감한 API 키는 main process에서만 접근 가능
  // PUBLIC_RENDERER_ENV_KEYS는 빈 배열 유지 (현재 모든 PUBLIC 값은 RENDERER_ENV_DEFAULTS에 있음)

  // 🔥 GIGA-CHAD: PUBLIC_RENDERER_ENV_KEYS가 비어있으므로 Gemini API 키 체크 제거
  // Gemini API 키는 main process에서만 관리, renderer는 IPC를 통해서만 접근
  const privateGeminiApiKey = readEnv('GEMINI_API_KEY')

  if (!privateGeminiApiKey && mode !== 'production') {
    console.warn('[Loop][env] GEMINI_API_KEY가 설정되지 않았습니다. AI 분석 기능이 비활성화됩니다. .env 파일을 확인하세요.')
  }

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      build: {
        rollupOptions: {
          // 외부 의존성 최적화
          external: [
            'electron',
            'electron-updater',
            'ttf2woff2',
            '@prisma/client',
            '.prisma/client'
          ]
        }
      },
      // 🔥 GIGA-CHAD: 빌드 타임 환경변수 주입 (CI/CD GitHub Secrets → process.env)
      define: {
        // 기본 환경
        'process.env.NODE_ENV': JSON.stringify(readEnv('NODE_ENV', 'development')),
        
        // 포트 설정
        'process.env.PORT': JSON.stringify(readEnv('PORT', '5173')),
        'process.env.ELECTRON_PORT': JSON.stringify(readEnv('ELECTRON_PORT', '5173')),
        'process.env.RENDERER_PORT': JSON.stringify(readEnv('RENDERER_PORT', '5173')),
        'process.env.STATIC_SERVER_ORIGIN': JSON.stringify(readEnv('STATIC_SERVER_ORIGIN', '35821')),
        
        // URL 설정
        'process.env.ELECTRON_RENDERER_URL': JSON.stringify(readEnv('ELECTRON_RENDERER_URL', 'http://localhost:5173')),
        'process.env.VITE_DEV_SERVER_URL': JSON.stringify(readEnv('VITE_DEV_SERVER_URL', 'http://localhost:5173')),
        'process.env.NEXT_PUBLIC_SHARE_WEB_URL': JSON.stringify(readEnv('NEXT_PUBLIC_SHARE_WEB_URL', 'https://eloop.kro.kr')),
        'process.env.NEXT_PUBLIC_SHARE_API_URL': JSON.stringify(readEnv('NEXT_PUBLIC_SHARE_API_URL', 'https://api.eloop.kro.kr')),
        
        // Logger 설정
        'process.env.LOG_LEVEL': JSON.stringify(readEnv('LOG_LEVEL', 'debug')),
        'process.env.DEBUG': JSON.stringify(readEnv('DEBUG', 'true')),
        'process.env.VERBOSE_LOGGING': JSON.stringify(readEnv('VERBOSE_LOGGING', 'true')),
        
        // 데이터베이스
        'process.env.DATABASE_URL': JSON.stringify(readEnv('DATABASE_URL', 'file:../prisma/loop.db')),
        
        // 성능 모니터링
        'process.env.ENABLE_PERFORMANCE_TRACKING': JSON.stringify(readEnv('ENABLE_PERFORMANCE_TRACKING', 'true')),
        'process.env.MEMORY_MONITORING': JSON.stringify(readEnv('MEMORY_MONITORING', 'true')),
        
        // 키보드 모니터링
        'process.env.KEYBOARD_MONITORING_ENABLED': JSON.stringify(readEnv('KEYBOARD_MONITORING_ENABLED', 'true')),
        'process.env.KEYBOARD_DEBUG_MODE': JSON.stringify(readEnv('KEYBOARD_DEBUG_MODE', 'true')),
        
        // AI/분석 기능
        'process.env.AI_ANALYSIS_ENABLED': JSON.stringify(readEnv('AI_ANALYSIS_ENABLED', 'true')),
        'process.env.MOCK_AI_RESPONSES': JSON.stringify(readEnv('MOCK_AI_RESPONSES', 'true')),
        
        // 개발자 도구
        'process.env.REACT_DEVELOPER_TOOLS': JSON.stringify(readEnv('REACT_DEVELOPER_TOOLS', 'true')),
        'process.env.REDUX_DEVTOOLS': JSON.stringify(readEnv('REDUX_DEVTOOLS', 'true')),
        
        // 🔥 GIGA-CHAD 보안: Main process에만 민감한 API 키 주입
        // 렌더러에는 절대 주입 안 함 (console에서 접근 불가)
        
        // Google OAuth 설정 (Main only)
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(readEnv('GOOGLE_CLIENT_ID', '')),
        'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(readEnv('GOOGLE_CLIENT_SECRET', '')),
        'process.env.GOOGLE_API_KEY': JSON.stringify(readEnv('GOOGLE_API_KEY', '')),
        'process.env.GOOGLE_REDIRECT_URI': JSON.stringify(readEnv('GOOGLE_REDIRECT_URI', 'http://localhost:35821/oauth/callback')),
        
        // 암호화 키 (Main only)
        'process.env.ENCRYPT_SNAPSHOT_KEY': JSON.stringify(readEnv('ENCRYPT_SNAPSHOT_KEY', '')),
        
        // 🔥 Gemini AI 설정 (Main only - 렌더러는 IPC로만 접근)
        'process.env.GEMINI_API_KEY': JSON.stringify(readEnv('GEMINI_API_KEY', '')),
        'process.env.GEMINI_MODEL': JSON.stringify(readEnv('GEMINI_MODEL', 'gemini-2.5-flash')),
        'process.env.GEMINI_MAX_TOKENS': JSON.stringify(readEnv('GEMINI_MAX_TOKENS', '8192')),
        'process.env.GEMINI_TEMPERATURE': JSON.stringify(readEnv('GEMINI_TEMPERATURE', '0.9')),
        
        // 🔥 GitHub 토큰 (Main only - 비밀)
        'process.env.GH_TOKEN': JSON.stringify(readEnv('GH_TOKEN', '')),
        
        // 🔥 Firebase 설정 (Main only - 비밀)
        'process.env.FIREBASE_API_KEY': JSON.stringify(readEnv('FIREBASE_API_KEY', '')),
        'process.env.FIRE_AUTH_DOMAIN': JSON.stringify(readEnv('FIRE_AUTH_DOMAIN', '')),
        'process.env.FIRE_PROJECT_ID': JSON.stringify(readEnv('FIRE_PROJECT_ID', '')),
        'process.env.STORAGE_BUCKET': JSON.stringify(readEnv('STORAGE_BUCKET', '')),
        'process.env.MESSAGING_SENDER_ID': JSON.stringify(readEnv('MESSAGING_SENDER_ID', '')),
        'process.env.APP_ID': JSON.stringify(readEnv('APP_ID', '')),
        'process.env.MEASUREMENT_ID': JSON.stringify(readEnv('MEASUREMENT_ID', ''))
      }
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        rollupOptions: {
          external: ['electron']
        }
      }
    },
    renderer: {
      root: 'src/renderer',
      publicDir: 'public',
      plugins: [
        react(),
        // 🔥 번들 분석기 (ANALYZE=true 환경변수로 활성화)
        process.env.ANALYZE === 'true' && (require('rollup-plugin-visualizer').default)({
          open: true,
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true
        })
      ].filter(Boolean),
      // 🔥 Electron 환경에 맞는 base path 설정
      base: readEnv('NODE_ENV', RENDERER_ENV_DEFAULTS.NODE_ENV) === 'development' ? '/' : './',
      // 🔥 폰트 파일을 asset으로 인식하도록 설정
      assetsInclude: ['**/*.ttf', '**/*.otf', '**/*.woff', '**/*.woff2', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg'],
      envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'LOOP_'],
      optimizeDeps: {
        include: ['react', 'react-dom', 'zustand'],
        // exclude: ['@tailwindcss/vite'], // 제거 - TailwindCSS 처리 방해
        force: true
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src/renderer'),
          '@components': resolve(__dirname, 'src/renderer/components'),
          '@app': resolve(__dirname, 'src/renderer/app'),
          '@hooks': resolve(__dirname, 'src/renderer/hooks'),
          '@utils': resolve(__dirname, 'src/renderer/utils'),
          '@styles': resolve(__dirname, 'src/renderer/styles')
        }
      },

      define: {
        // Expose full process.env object in renderer (so runtime reads of process.env work)
        'process.env': rendererProcessEnvCode,
        // Also keep individual keys mapped for direct replacements
        ...Object.fromEntries(
          Object.entries(rendererEnvDefinition).map(([key, value]) => [
            `process.env.${key}`,
            value
          ])
        )
      },
      server: {
        port: parseInt(readEnv('RENDERER_PORT', '4000')),
        host: true,
        middlewareMode: false,
        fs: {
          allow: ['..']
        },
        watch: {
          usePolling: true,
          interval: 1000,
          ignored: ['!**/src/**/*.{js,ts,jsx,tsx}']
        },
        // 🔥 폰트 파일 MIME 타입 설정
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      },
      build: {
        // 🔥 프로덕션 빌드 최적화
        minify: 'esbuild', // esbuild가 terser보다 빠름
        sourcemap: mode === 'development' ? 'inline' : false,
        reportCompressedSize: false, // 빌드 속도 향상
        rollupOptions: {
          output: {
            // 🔥 청킹 전략 최적화 - vendor 분리
            manualChunks: (id) => {
              // React 생태계
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'react-vendor'
              }
              // Zustand 상태관리
              if (id.includes('zustand')) {
                return 'state-vendor'
              }
              // Tiptap 에디터
              if (id.includes('@tiptap') || id.includes('prosemirror')) {
                return 'editor-vendor'
              }
              // Radix UI 컴포넌트
              if (id.includes('@radix-ui')) {
                return 'ui-vendor'
              }
              // Google AI 관련
              if (id.includes('@google/generative-ai')) {
                return 'ai-vendor'
              }
              // 기타 node_modules
              if (id.includes('node_modules')) {
                return 'vendor'
              }
            }
          }
        },
        // 🔥 청크 크기 경고 임계값 조정
        chunkSizeWarningLimit: 800
      }
    }
  }
})