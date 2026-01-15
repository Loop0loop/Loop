// 🔥 기가차드 SessionManager 단위 테스트

import { SessionManager, SessionState } from '../../../src/main/managers/SessionManager';
import { Logger } from '../../../src/shared/logger';

// Mock Logger
vi.mock('../../../src/shared/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('🔥 SessionManager 단위 테스트', () => {
  let sessionManager: SessionManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    sessionManager = new SessionManager();
    await sessionManager.initialize();
    await sessionManager.start();
  });

  afterEach(async () => {
    if (sessionManager) {
      await sessionManager.cleanup();
    }
  });

  describe('초기화', () => {
    it('정상적으로 생성되어야 함', () => {
      expect(sessionManager).toBeDefined();
      expect(sessionManager.isInitialized()).toBe(true);
    });

    it('헬스 체크가 정상 상태를 반환해야 함', async () => {
      const health = await sessionManager.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('세션 관리', () => {
    it('새 세션을 시작할 수 있어야 함', async () => {
      const result = await sessionManager.startSession('Test Window', 'en');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      if (result.success) {
        expect(result.data).toMatch(/^session_\d+_\d+$/);
      }
    });

    it('세션 시작 시 로그를 남겨야 함', async () => {
      await sessionManager.startSession('Test Window', 'en');
      
      expect(Logger.info).toHaveBeenCalledWith(
        'SESSION_MANAGER',
        'Session started',
        expect.objectContaining({
          sessionId: expect.any(String),
          windowTitle: 'Test Window',
          language: 'en'
        })
      );
    });

    it('활성 세션 수를 반환할 수 있어야 함', async () => {
      expect(sessionManager.getActiveSessionCount()).toBe(0);
      
      await sessionManager.startSession('Test Window 1');
      expect(sessionManager.getActiveSessionCount()).toBe(1);
      
      await sessionManager.startSession('Test Window 2');
      expect(sessionManager.getActiveSessionCount()).toBe(2);
    });

    it('세션을 ID로 조회할 수 있어야 함', async () => {
      const result = await sessionManager.startSession('Test Window');
      expect(result.success).toBe(true);
      
      if (result.success && result.data) {
        const sessionId = result.data;
        const session = sessionManager.getSession(sessionId);
        
        expect(session).toBeDefined();
        expect(session?.id).toBe(sessionId);
        expect(session?.windowTitle).toBe('Test Window');
        expect(session?.state).toBe(SessionState.ACTIVE);
      }
    });

    it('존재하지 않는 세션 ID로 조회 시 null을 반환해야 함', () => {
      const session = sessionManager.getSession('nonexistent-id');
      expect(session).toBeNull();
    });

    it('세션 존재 여부를 확인할 수 있어야 함', async () => {
      const result = await sessionManager.startSession('Test Window');
      expect(result.success).toBe(true);
      
      if (result.success && result.data) {
        const sessionId = result.data;
        expect(sessionManager.hasSession(sessionId)).toBe(true);
        expect(sessionManager.hasSession('nonexistent-id')).toBe(false);
      }
    });
  });

  describe('키 이벤트 처리', () => {
    let sessionId: string;

    beforeEach(async () => {
      const result = await sessionManager.startSession('Test Window');
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        sessionId = result.data;
      }
    });

    it('키 이벤트를 추가할 수 있어야 함', async () => {
      const result = await sessionManager.addKeyEvent(sessionId, 'a');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      
      const session = sessionManager.getSession(sessionId);
      expect(session?.keyCount).toBe(1);
      expect(session?.content).toBe('a');
    });

    it('여러 키 이벤트를 연속으로 추가할 수 있어야 함', async () => {
      const keys = ['h', 'e', 'l', 'l', 'o'];
      
      for (const key of keys) {
        const result = await sessionManager.addKeyEvent(sessionId, key);
        expect(result.success).toBe(true);
      }
      
      const session = sessionManager.getSession(sessionId);
      expect(session?.keyCount).toBe(5);
      expect(session?.content).toBe('hello');
    });

    it('에러 키 이벤트를 처리할 수 있어야 함', async () => {
      // 정상 키 입력
      await sessionManager.addKeyEvent(sessionId, 'a');
      
      // 에러 키 입력
      const result = await sessionManager.addKeyEvent(sessionId, 'b', true);
      expect(result.success).toBe(true);
      
      const session = sessionManager.getSession(sessionId);
      expect(session?.keyCount).toBe(2);
      expect(session?.errorCount).toBeGreaterThan(0);
    });

    it('존재하지 않는 세션에 키 이벤트 추가 시 실패해야 함', async () => {
      const result = await sessionManager.addKeyEvent('nonexistent-id', 'a');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('비활성 세션에 키 이벤트 추가 시 실패해야 함', async () => {
      // 세션 일시정지
      await sessionManager.pauseSession(sessionId);
      
      const result = await sessionManager.addKeyEvent(sessionId, 'a');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not active');
    });
  });

  describe('세션 상태 관리', () => {
    let sessionId: string;

    beforeEach(async () => {
      const result = await sessionManager.startSession('Test Window');
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        sessionId = result.data;
      }
    });

    it('세션을 일시정지할 수 있어야 함', async () => {
      const result = await sessionManager.pauseSession(sessionId);
      
      expect(result.success).toBe(true);
      
      const session = sessionManager.getSession(sessionId);
      expect(session?.state).toBe(SessionState.PAUSED);
    });

    it('일시정지된 세션을 재개할 수 있어야 함', async () => {
      await sessionManager.pauseSession(sessionId);
      
      const result = await sessionManager.resumeSession(sessionId);
      
      expect(result.success).toBe(true);
      
      const session = sessionManager.getSession(sessionId);
      expect(session?.state).toBe(SessionState.ACTIVE);
    });

    it('세션을 종료할 수 있어야 함', async () => {
      // 몇 개의 키 이벤트 추가
      await sessionManager.addKeyEvent(sessionId, 'h');
      await sessionManager.addKeyEvent(sessionId, 'i');
      
      const result = await sessionManager.endSession(sessionId, true);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // 세션이 제거되었는지 확인
      expect(sessionManager.hasSession(sessionId)).toBe(false);
    });

    it('세션 종료 시 TypingSession 객체를 반환해야 함', async () => {
      await sessionManager.addKeyEvent(sessionId, 't');
      await sessionManager.addKeyEvent(sessionId, 'e');
      await sessionManager.addKeyEvent(sessionId, 's');
      await sessionManager.addKeyEvent(sessionId, 't');
      
      const result = await sessionManager.endSession(sessionId, true);
      
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        const typingSession = result.data;
        expect(typingSession.id).toBeDefined();
        expect(typingSession.content).toBe('test');
        expect(typingSession.keyCount).toBe(4);
        expect(typingSession.startTime).toBeInstanceOf(Date);
        expect(typingSession.endTime).toBeInstanceOf(Date);
        expect(typingSession.isActive).toBe(false);
      }
    });
  });

  describe('윈도우별 세션 검색', () => {
    it('윈도우 제목으로 세션을 찾을 수 있어야 함', async () => {
      await sessionManager.startSession('Visual Studio Code');
      await sessionManager.startSession('Chrome Browser');
      
      const vscodeSession = sessionManager.findSessionByWindow('Visual Studio Code');
      const chromeSession = sessionManager.findSessionByWindow('Chrome Browser');
      const nonexistentSession = sessionManager.findSessionByWindow('Nonexistent Window');
      
      expect(vscodeSession).toBeDefined();
      expect(vscodeSession?.windowTitle).toBe('Visual Studio Code');
      
      expect(chromeSession).toBeDefined();
      expect(chromeSession?.windowTitle).toBe('Chrome Browser');
      
      expect(nonexistentSession).toBeNull();
    });
  });

  describe('세션 설정', () => {
    it('세션 설정을 업데이트할 수 있어야 함', () => {
      const newConfig = {
        minDuration: 5000,
        autoSave: false,
        trackErrors: false
      };
      
      sessionManager.updateSessionConfig(newConfig);
      
      const config = sessionManager.getSessionConfig();
      expect(config.minDuration).toBe(5000);
      expect(config.autoSave).toBe(false);
      expect(config.trackErrors).toBe(false);
    });

    it('세션 설정 조회가 가능해야 함', () => {
      const config = sessionManager.getSessionConfig();
      
      expect(config).toBeDefined();
      expect(typeof config.minDuration).toBe('number');
      expect(typeof config.autoSave).toBe('boolean');
      expect(typeof config.trackErrors).toBe('boolean');
    });
  });

  describe('세션 통계', () => {
    let sessionId: string;

    beforeEach(async () => {
      const result = await sessionManager.startSession('Test Window');
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        sessionId = result.data;
      }
    });

    it('세션 통계를 조회할 수 있어야 함', async () => {
      // 키 이벤트 추가
      await sessionManager.addKeyEvent(sessionId, 'h');
      await sessionManager.addKeyEvent(sessionId, 'e');
      await sessionManager.addKeyEvent(sessionId, 'l');
      await sessionManager.addKeyEvent(sessionId, 'l');
      await sessionManager.addKeyEvent(sessionId, 'o');
      
      const stats = sessionManager.getSessionStats(sessionId);
      
      expect(stats).toBeDefined();
      expect(typeof stats?.wpm).toBe('number');
      expect(typeof stats?.accuracy).toBe('number');
      expect(typeof stats?.duration).toBe('number');
      expect(typeof stats?.keyRate).toBe('number');
      expect(typeof stats?.errorRate).toBe('number');
    });

    it('존재하지 않는 세션의 통계 조회 시 null을 반환해야 함', () => {
      const stats = sessionManager.getSessionStats('nonexistent-id');
      expect(stats).toBeNull();
    });
  });

  describe('활성 세션 목록', () => {
    it('활성 세션 목록을 반환할 수 있어야 함', async () => {
      expect(sessionManager.getActiveSessions()).toEqual([]);
      
      await sessionManager.startSession('Window 1');
      await sessionManager.startSession('Window 2');
      
      const sessions = sessionManager.getActiveSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions[0].windowTitle).toBe('Window 1');
      expect(sessions[1].windowTitle).toBe('Window 2');
    });
  });

  describe('에러 처리', () => {
    it('존재하지 않는 세션 일시정지 시 실패해야 함', async () => {
      const result = await sessionManager.pauseSession('nonexistent-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('존재하지 않는 세션 재개 시 실패해야 함', async () => {
      const result = await sessionManager.resumeSession('nonexistent-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('존재하지 않는 세션 종료 시 실패해야 함', async () => {
      const result = await sessionManager.endSession('nonexistent-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('메모리 관리', () => {
    it('정리 후 모든 활성 세션이 제거되어야 함', async () => {
      await sessionManager.startSession('Window 1');
      await sessionManager.startSession('Window 2');
      
      expect(sessionManager.getActiveSessionCount()).toBe(2);
      
      await sessionManager.cleanup();
      
      expect(sessionManager.getActiveSessionCount()).toBe(0);
    });

    it('매니저 중지 시 모든 세션이 종료되어야 함', async () => {
      await sessionManager.startSession('Window 1');
      await sessionManager.startSession('Window 2');
      
      expect(sessionManager.getActiveSessionCount()).toBe(2);
      
      await sessionManager.stop();
      
      expect(sessionManager.getActiveSessionCount()).toBe(0);
    });
  });
});
