// 🔥 기가차드 테스트 설정 - 완벽한 테스트 환경 구성

import '@testing-library/jest-dom';
import { vi, expect, beforeEach, afterEach } from 'vitest';

// 🔧 Electron 모킹
Object.defineProperty(global, 'process', {
  value: {
    ...process,
    platform: 'darwin', // 기본 플랫폼
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  }
});

// 🔧 Logger 모킹 (테스트 중 로그 출력 방지)
vi.mock('../src/shared/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn()
  }
}));

// 🔧 Electron IPC 모킹
const mockIpcMain = {
  handle: vi.fn(),
  removeAllListeners: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn()
};

const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeAllListeners: vi.fn(),
  removeListener: vi.fn()
};

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn(() => '1.0.0'),
    getPath: vi.fn((name) => `/mock/path/${name}`),
    quit: vi.fn(),
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    setAsDefaultProtocolClient: vi.fn()
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    webContents: {
      send: vi.fn(),
      on: vi.fn()
    },
    show: vi.fn(),
    hide: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: vi.fn(() => false)
  })),
  ipcMain: mockIpcMain,
  ipcRenderer: mockIpcRenderer,
  contextBridge: {
    exposeInMainWorld: vi.fn()
  },
  Menu: {
    setApplicationMenu: vi.fn(),
    buildFromTemplate: vi.fn()
  },
  Tray: vi.fn().mockImplementation(() => ({
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: vi.fn(() => false)
  })),
  globalShortcut: {
    register: vi.fn(),
    unregister: vi.fn(),
    unregisterAll: vi.fn()
  },
  clipboard: {
    readText: vi.fn(() => 'mock clipboard text'),
    writeText: vi.fn()
  },
  powerMonitor: {
    on: vi.fn(),
    removeAllListeners: vi.fn()
  }
}));

// 🔧 uiohook-napi 모킹
vi.mock('uiohook-napi', () => ({
  UiohookKey: {},
  UiohookMouseButton: {},
  UiohookWheelDirection: {},
  uIOhook: {
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    removeAllListeners: vi.fn()
  }
}));

// 🔧 파일 시스템 모킹
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      access: vi.fn(),
      stat: vi.fn()
    }
  };
});

// 🔧 path 모킹
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('path')>();
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
    resolve: vi.fn((...args) => '/' + args.join('/'))
  };
});

// 🔧 글로벌 테스트 유틸리티
// (Type declarations for Jest matchers live in test/globals.d.ts)

// 🔧 커스텀 매처
expect.extend({
  toBeValidSettingsSchema(received) {
    const isValid = received && typeof received === 'object' && !Array.isArray(received);

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid settings schema`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid settings schema`,
        pass: false,
      };
    }
  },

  toBeValidIpcChannel(received) {
    const channelPattern = /^[a-z]+:[a-z-]+$/;
    const isValid = typeof received === 'string' && channelPattern.test(received);

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid IPC channel`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid IPC channel (format: 'category:action')`,
        pass: false,
      };
    }
  },
});

// 🔧 테스트 전역 설정
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
