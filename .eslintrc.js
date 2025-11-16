/* eslint-disable no-undef */
/* eslint-env node */
/* global module */
// .eslintrc.cjs - Vite + React + TS 최적화 버전
// 🔥 기가차드 ESLint v8 설정 - Vite + React + TypeScript + Electron 최적화
module.exports = {
  root: true,

  // ✅ Vite/React 환경에 맞게 extends 수정
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    // ❌ 'next/core-web-vitals' 제거
  ],

  parser: '@typescript-eslint/parser',

  // ✅ 'react-refresh' 플러그인 추가 (Vite HMR)
  plugins: ['@typescript-eslint', 'react', 'react-refresh'],

  // 🔥 기가차드 무시 패턴 (유지)
  // (Vite 빌드 폴더 'dist'가 이미 포함되어 있으니 OK)
  ignorePatterns: [
    '.eslintrc.cjs', // 이 파일 자체를 무시
    'out/**/*',
    'build/**/*',
    'dist/**/*',
    // ❌ '.next/**/*', // Next.js 폴더 제거 (있어도 무방)
    'node_modules/**/*',
    '*.min.js',
    'coverage/**/*',
    // ❌ '_next/**/*', // Next.js 폴더 제거
    'static/**/*',
    '*.tsbuildinfo',
    'vendors-*.js',
    'webpack-*.js',
    // ❌ '_buildManifest.js', (Next.js)
    // ❌ '_ssgManifest.js', (Next.js)
    'test',
  ],

  env: {
    browser: true,
    node: true, // Electron 환경을 위해 'node' 유지
    es2022: true,
  },

  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },

  // ✅ React 버전 자동 감지 설정 추가
  settings: {
    react: {
      version: 'detect',
    },
    // ❌ Next.js 설정 제거
    // next: {
    //   rootDir: './src/renderer',
    // },
  },

  rules: {
    // ✅ Vite + React 권장 규칙
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // ✅ React 17+ JSX Transform 사용 시 'React' import 불필요
    'react/react-in-jsx-scope': 'off',

    // 🔥 기가차드 개발용 완화된 ESLint 규칙 (그대로 유지)
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-unsafe-function-type': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',

    // ❌ Next.js 전용 규칙 제거
    // '@next/next/no-html-link-for-pages': 'off',
    // '@next/next/no-assign-module-variable': 'off',
    // '@next/next/no-img-element': 'off',

    // 🔥 나머지 기가차드 규칙 (그대로 유지)
    'prefer-const': 'off',
    'no-console': 'off',
    'no-var': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'import/no-anonymous-default-export': 'off', // (이 룰을 쓰려면 'eslint-plugin-import'가 필요할 수 있습니다)
  },

  // 🔥 Overrides (그대로 유지)
  overrides: [
    {
      // ... (d.ts 파일 규칙)
      files: ['**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-function-type': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/ban-types': 'off',
        'no-var': 'off',
        'no-console': 'off',
      },
    },
    {
      // ... (설정 파일 규칙)
      files: ['**/*.config.{js,mjs,ts}', '**/tailwind.config.*'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
    {
      // ... (테스트 파일 규칙)
      files: [
        '**/*.test.{js,jsx,ts,tsx}',
        '**/__tests__/**/*.{js,jsx,ts,tsx}',
        '**/test/**/*.{js,jsx,ts,tsx}',
      ],
      env: {
        jest: true,
      },
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-namespace': 'off',
        'no-console': 'off',
      },
    },
  ],
};