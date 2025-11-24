// 🔥 기가차드 Prisma 모의 타입 정의 (any 제거용)
interface PrismaSessionData {
  data: {
    id?: string;
    userId: string;
    content: string;
    startTime: Date;
    endTime: Date;
    keyCount: number;
    wpm: number;
    accuracy: number;
    windowTitle: string | null;
    appName: string | null;
    isActive?: boolean;
  };
}

interface PrismaQueryOptions {
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
}

interface PrismaAggregateResult {
  _avg: { wpm: number; accuracy: number };
  _max: { wpm: number };
  _sum: { keyCount: number };
  _count: number;
}

interface PrismaUpsertData {
  where: { id: string };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
}

interface MockPrismaClient {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $queryRaw(): Promise<Array<{ result: number }>>;
  typingSession: {
    create(data: PrismaSessionData): Promise<{ id: string } & PrismaSessionData['data']>;
    findMany(query: PrismaQueryOptions): Promise<Array<Record<string, unknown>>>;
    deleteMany(query: PrismaQueryOptions): Promise<{ count: number }>;
    aggregate(query: PrismaQueryOptions): Promise<PrismaAggregateResult>;
  };
  userPreference: {
    upsert(data: PrismaUpsertData): Promise<Record<string, unknown>>;
    findUnique(query: { where: { id: string } }): Promise<Record<string, unknown> | null>;
  };
}

// 🔥 기가차드 데이터베이스 관리자 - Prisma 통합 관리

import { Logger } from '../../../shared/logger';
import { BaseManager } from '../../common/BaseManager';
import { Result, TypingSession, TypingStats, UserPreferences } from '../../../shared/types';
import { existsSync, copyFileSync, statSync, mkdirSync, readFileSync } from 'fs';
import { promises as fsPromises } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { app } from 'electron';

// #DEBUG: Database manager entry point
Logger.debug('DATABASE_MANAGER', 'Database manager module loaded');

// 🔥 기가차드 데이터베이스 연결 상태
export interface DatabaseConnectionStatus {
  connected: boolean;
  latency: number;
  lastConnected: Date | null;
  connectionAttempts: number;
  lastError: string | null;
}

// 🔥 기가차드 데이터베이스 통계
export interface DatabaseStats {
  totalSessions: number;
  totalKeystrokes: number;
  averageWpm: number;
  bestWpm: number;
  totalTypingTime: number;
  lastSessionDate: Date | null;
}

// 🔥 기가차드 데이터베이스 백업 정보
export interface BackupInfo {
  id: string;
  path: string;
  size: number;
  created: Date;
  checksum: string;
}

/**
 * 🔥 DatabaseManager - Prisma 기반 데이터베이스 관리
 * 타이핑 세션, 사용자 설정, 통계 데이터 관리
 */
export class DatabaseManager extends BaseManager {
  private readonly componentName = 'DATABASE_MANAGER';
  private prisma: MockPrismaClient | null = null; // Prisma 클라이언트
  private connectionStatus: DatabaseConnectionStatus;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 5000; // 5초

  constructor() {
    super();
    this.connectionStatus = {
      connected: false,
      latency: 0,
      lastConnected: null,
      connectionAttempts: 0,
      lastError: null,
    };
  }

  /**
   * BaseManager 구현 - 초기화
   */
  protected async doInitialize(): Promise<void> {
    Logger.info(this.componentName, 'Initializing database manager');
    
    try {
      // Prisma 클라이언트 모의 구현 (실제 환경에서는 @prisma/client 사용)
      this.prisma = {
        $connect: async () => Promise.resolve(),
        $disconnect: async () => Promise.resolve(),
        $queryRaw: async () => Promise.resolve([{ result: 1 }]),
        typingSession: {
          create: async (data: PrismaSessionData) => Promise.resolve({ id: `session_${Date.now()}`, ...data.data }),
          findMany: async (query: PrismaQueryOptions) => Promise.resolve([]),
          deleteMany: async (query: PrismaQueryOptions) => Promise.resolve({ count: 0 }),
          aggregate: async (query: PrismaQueryOptions) => Promise.resolve({
            _avg: { wpm: 0, accuracy: 0 },
            _max: { wpm: 0 },
            _sum: { keyCount: 0 },
            _count: 0,
          }),
        },
        userPreference: {
          upsert: async (data: PrismaUpsertData) => Promise.resolve(data.create || data.update),
          findUnique: async (query: { where: { id: string } }) => Promise.resolve(null),
        },
      };

      Logger.info(this.componentName, 'Database client initialized');
    } catch (error) {
      Logger.error(this.componentName, 'Failed to initialize database client', error);
      throw error;
    }
  }

  /**
   * BaseManager 구현 - 시작
   */
  protected async doStart(): Promise<void> {
    Logger.info(this.componentName, 'Starting database manager');
    await this.connectToDatabase();
  }

  /**
   * BaseManager 구현 - 중지
   */
  protected async doStop(): Promise<void> {
    Logger.info(this.componentName, 'Stopping database manager');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    await this.disconnectFromDatabase();
  }

  /**
   * BaseManager 구현 - 정리
   */
  protected async doCleanup(): Promise<void> {
    Logger.info(this.componentName, 'Cleaning up database manager');
    
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }

  /**
   * 데이터베이스 연결
   */
  private async connectToDatabase(): Promise<void> {
    try {
      this.connectionStatus.connectionAttempts++;
      
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }

      const startTime = Date.now();
      await this.prisma.$connect();
      const latency = Date.now() - startTime;

      this.connectionStatus = {
        connected: true,
        latency,
        lastConnected: new Date(),
        connectionAttempts: this.connectionStatus.connectionAttempts,
        lastError: null,
      };

      Logger.info(this.componentName, 'Database connected', { latency });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.connectionStatus.lastError = errorMessage;
      this.connectionStatus.connected = false;

      Logger.error(this.componentName, 'Database connection failed', error);
      
      // 자동 재연결 시도
      if (this.connectionStatus.connectionAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }

  /**
   * 데이터베이스 연결 해제
   */
  private async disconnectFromDatabase(): Promise<void> {
    try {
      if (this.prisma && this.connectionStatus.connected) {
        await this.prisma.$disconnect();
        this.connectionStatus.connected = false;
        Logger.info(this.componentName, 'Database disconnected');
      }
    } catch (error) {
      Logger.error(this.componentName, 'Error disconnecting from database', error);
    }
  }

  /**
   * 재연결 스케줄링
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      Logger.info(this.componentName, 'Attempting database reconnection', {
        attempt: this.connectionStatus.connectionAttempts,
      });
      
      try {
        await this.connectToDatabase();
      } catch (error) {
        Logger.error(this.componentName, 'Reconnection failed', error);
      }
    }, this.reconnectDelay);
  }

  /**
   * 타이핑 세션 저장
   */
  public async saveTypingSession(session: Omit<TypingSession, 'id'>): Promise<Result<string>> {
    try {
      if (!this.connectionStatus.connected) {
        throw new Error('Database not connected');
      }

      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }

      const result = await this.prisma.typingSession.create({
        data: {
          userId: session.userId,
          content: session.content,
          startTime: session.startTime,
          endTime: session.endTime || new Date(),
          keyCount: session.keyCount,
          wpm: session.wpm,
          accuracy: session.accuracy,
          windowTitle: session.windowTitle || 'Unknown',
          appName: session.appName || 'Unknown',
        },
      });

      Logger.info(this.componentName, 'Typing session saved', { id: result.id });
      return { success: true, data: result.id };
    } catch (error) {
      Logger.error(this.componentName, 'Failed to save typing session', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 타이핑 세션 목록 조회
   */
  public async getTypingSessions(limit = 100, offset = 0): Promise<Result<TypingSession[]>> {
    try {
      if (!this.connectionStatus.connected) {
        throw new Error('Database not connected');
      }

      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }

      const sessions = await this.prisma.typingSession.findMany({
        take: limit,
        skip: offset,
        orderBy: { startTime: 'desc' },
      });

      Logger.debug(this.componentName, 'Retrieved typing sessions', { count: sessions.length });
      return { success: true, data: sessions as unknown as TypingSession[] };
    } catch (error) {
      Logger.error(this.componentName, 'Failed to retrieve typing sessions', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 타이핑 통계 조회
   */
  public async getTypingStats(days = 30): Promise<Result<TypingStats>> {
    try {
      if (!this.connectionStatus.connected) {
        throw new Error('Database not connected');
      }

      const since = new Date();
      since.setDate(since.getDate() - days);

      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }

      const stats = await this.prisma.typingSession.aggregate({
        where: {
          startTime: { gte: since },
        },
        _avg: { wpm: true, accuracy: true },
        _max: { wpm: true },
        _sum: { keyCount: true },
        _count: true,
      } as unknown as PrismaQueryOptions);

      const result: TypingStats = {
        totalKeystrokes: stats._sum.keyCount || 0,
        wpm: Math.round(stats._avg.wpm || 0),
        accuracy: Math.round((stats._avg.accuracy || 0) * 100) / 100,
        sessionDuration: 0, // 계산 필요
        charactersTyped: Math.floor((stats._sum.keyCount || 0) * 0.8), // 추정
        wordsTyped: Math.floor((stats._sum.keyCount || 0) / 5), // 평균 5글자
        errorsCount: 0, // 추가 계산 필요
      };

      Logger.debug(this.componentName, 'Retrieved typing stats', result);
      return { success: true, data: result };
    } catch (error) {
      Logger.error(this.componentName, 'Failed to retrieve typing stats', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 사용자 설정 저장
   */
  public async saveUserPreferences(preferences: UserPreferences): Promise<Result<boolean>> {
    try {
      if (!this.connectionStatus.connected) {
        throw new Error('Database not connected');
      }

      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }

      await this.prisma.userPreference.upsert({
        where: { id: 'default' },
        update: {
          language: preferences.language,
          theme: preferences.theme,
          notifications: preferences.notifications,
          autoStart: preferences.autoStart,
          trackingEnabled: preferences.trackingEnabled,
        },
        create: {
          userId: 'default',
          language: preferences.language,
          theme: preferences.theme,
          notifications: preferences.notifications,
          autoStart: preferences.autoStart,
          trackingEnabled: preferences.trackingEnabled,
        },
      });

      Logger.info(this.componentName, 'User preferences saved');
      return { success: true, data: true };
    } catch (error) {
      Logger.error(this.componentName, 'Failed to save user preferences', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 사용자 설정 조회
   */
  public async getUserPreferences(): Promise<Result<UserPreferences | null>> {
    try {
      if (!this.connectionStatus.connected) {
        throw new Error('Database not connected');
      }

      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }

      const prefs = await this.prisma.userPreference.findUnique({
        where: { id: 'default' },
      });

      Logger.debug(this.componentName, 'Retrieved user preferences');
      return { success: true, data: prefs as unknown as UserPreferences | null };
    } catch (error) {
      Logger.error(this.componentName, 'Failed to retrieve user preferences', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 데이터베이스 상태 확인
   */
  public getConnectionStatus(): DatabaseConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * 헬스 체크 (BaseManager 구현)
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    uptime?: number;
    lastError?: string;
  }> {
    try {
      const startTime = Date.now();
      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }

      await (this.prisma as unknown as { $queryRaw: (query: TemplateStringsArray) => Promise<unknown> }).$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      this.connectionStatus.latency = latency;
      
      const baseHealth = await super.healthCheck();
      
      return {
        healthy: this.connectionStatus.connected && baseHealth.healthy,
        uptime: baseHealth.uptime,
        lastError: this.connectionStatus.lastError || baseHealth.lastError,
      };
    } catch (error) {
      Logger.error(this.componentName, 'Health check failed', error);
      this.connectionStatus.connected = false;
      
      return {
        healthy: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 데이터베이스 백업
   * 🔥 ASYNC: All file operations use fsPromises for non-blocking I/O
   */
  public async createBackup(): Promise<Result<BackupInfo>> {
    try {
      // 백업 디렉토리 생성
      const userDataPath = app.getPath('userData');
      const backupDir = join(userDataPath, 'backups');
      
      try {
        await fsPromises.access(backupDir);
      } catch {
        await fsPromises.mkdir(backupDir, { recursive: true });
      }

      // 데이터베이스 파일 경로 (SQLite 파일 경로를 가정)
      const dbPath = join(userDataPath, 'database.db');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `loop_backup_${timestamp}.db`;
      const backupPath = join(backupDir, backupFileName);

      // 데이터베이스 파일이 존재하는지 확인
      try {
        await fsPromises.access(dbPath);
      } catch {
        Logger.warn(this.componentName, 'Database file not found for backup', { dbPath });
        return { 
          success: false, 
          error: 'Database file not found' 
        };
      }

      // 파일 복사
      await fsPromises.copyFile(dbPath, backupPath);

      // 백업 파일 정보 수집
      const stats = await fsPromises.stat(backupPath);
      const backupData = await fsPromises.readFile(backupPath);
      const checksum = createHash('sha256').update(backupData).digest('hex');

      const backupInfo: BackupInfo = {
        id: `backup_${Date.now()}`,
        path: backupPath,
        size: stats.size,
        created: new Date(),
        checksum: checksum,
      };

      Logger.info(this.componentName, 'Database backup created successfully', {
        path: backupPath,
        size: stats.size,
        checksum: checksum.substring(0, 8),
      });

      return { success: true, data: backupInfo };
    } catch (error) {
      Logger.error(this.componentName, 'Failed to create backup', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 데이터 정리 (오래된 세션 삭제)
   */
  public async cleanupOldData(olderThanDays = 365): Promise<Result<number>> {
    try {
      if (!this.connectionStatus.connected) {
        throw new Error('Database not connected');
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }

      const result = await this.prisma.typingSession.deleteMany({
        where: {
          startTime: { lt: cutoffDate },
        },
      });

      Logger.info(this.componentName, 'Old data cleaned up', { deletedCount: result.count });
      return { success: true, data: result.count };
    } catch (error) {
      Logger.error(this.componentName, 'Failed to cleanup old data', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 타이핑 세션 삭제
   */
  public async deleteTypingSession(sessionId: string): Promise<Result<boolean>> {
    try {
      if (!this.connectionStatus.connected) {
        throw new Error('Database not connected');
      }

      if (!this.prisma) {
        throw new Error('Prisma client not initialized');
      }

      // 세션 삭제 (deleteMany 사용)
      const result = await this.prisma.typingSession.deleteMany({
        where: { id: sessionId },
      });

      if (result.count === 0) {
        Logger.warn(this.componentName, 'Session not found for deletion', { sessionId });
        return { success: false, error: 'Session not found' };
      }

      Logger.info(this.componentName, 'Typing session deleted successfully', { 
        sessionId, 
        deletedCount: result.count 
      });
      return { success: true, data: true };
    } catch (error) {
      Logger.error(this.componentName, 'Failed to delete typing session', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// 🔥 기가차드 전역 데이터베이스 관리자
export const databaseManager = new DatabaseManager();

// #DEBUG: Database manager exit point
Logger.debug('DATABASE_MANAGER', 'Database manager module setup complete');

export default databaseManager;