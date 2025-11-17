/* eslint-disable no-undef */
/* eslint-env node */

// 🛡️ Loop Production Config - 안정성과 유지보수성을 위한 ESLint 설정
module.exports = {
  root: true,

  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
  ],

  parser: '@typescript-eslint/parser',

  plugins: ['@typescript-eslint', 'react', 'react-refresh'],

  ignorePatterns: [
    '.eslintrc.cjs',
    'dist/**/*',
    'build/**/*',
    'node_modules/**/*',
    '*.min.js',
  ],

  env: {
    browser: true,
    node: true,
    es2022: true,
  },

  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },

  settings: {
    react: {
      version: 'detect',
    },
  },

  rules: {
    // 안정성과 버그 방지를 위한 오류 레벨
    'react-hooks/exhaustive-deps': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'prefer-const': 'error',
    'no-var': 'error',

    // 타이핑 및 클린 코드 경고
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-empty-function': 'warn',

    // 개발 편의성
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-refresh/only-export-components': 'warn',
    'react/no-unescaped-entities': 'off',
  },

  overrides: [
    {
      files: ['**/*.config.{js,mjs,ts}', '**/tailwind.config.*'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
    {
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
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
  ],
};