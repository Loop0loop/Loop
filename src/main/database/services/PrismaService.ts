'use strict';

// 🔥 Prisma 싱글톤 서비스 - 연결 풀링으로 성능 개선
import { Logger } from '../../../shared/logger';
import { Project, ProjectCharacter, ProjectStructure, ProjectNote } from '../../../shared/types';
import { ensureDatabaseUrl } from '../utils/prismaPaths';
import { safePathJoin } from '../../../shared/utils/pathSecurity';

// PrismaClient 타입 정의 (런타임에 동적 로드)
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import type { PrismaBetterSqlite3 as PrismaBetterSqlite3Factory } from '@prisma/adapter-better-sqlite3';
import { loadBetterSqliteAdapter } from '../adapters/betterSqliteAdapter';
import { createPrismaClient } from '../prismaClientFactory';

// 🔥 트랜잭션 클라이언트 타입 정의
type TransactionClient = Omit<PrismaClientType, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

/**
 * 🔥 Prisma 싱글톤 서비스
 * 매번 새로운 연결을 생성하지 않고 하나의 인스턴스를 재사용하여 성능 개선
 */

export class PrismaService {
  private static instance: PrismaService;
  private client: PrismaClientType | null = null;
  private isConnecting = false;

  private constructor() {
    // private 생성자로 싱글톤 보장
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  /**
   * 🔥 Prisma 클라이언트 가져오기 (지연 초기화)
   */
  public async getClient(): Promise<PrismaClientType> {
    if (this.client) {
      return this.client;
    }

    if (this.isConnecting) {
      // 연결 중인 경우 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.getClient();
    }

    try {
      this.isConnecting = true;
      Logger.debug('PRISMA_SERVICE', 'Creating new Prisma client');

      const { dbPath, databaseUrl } = await ensureDatabaseUrl();
      Logger.info('PRISMA_SERVICE', '🔍 Prisma database resolved', {
        dbPath,
        databaseUrl,
        cwd: process.cwd(),
        dirname: __dirname,
        // 🔥 electron-builder asar unpacking 검증
        resourcesPath: process.resourcesPath || 'undefined',
        appPath: process.env.ELECTRON_APP_PATH || 'undefined',
      });

      // 🔥 Prisma 바이너리 경로 디버깅 (Electron asar 관련)
      if (process.env.DEBUG_PRISMA) {
        try {
           
          const fs = require('fs');
          const path = require('path');
          const prismaBinPath = path.join(
            __dirname,
            '../../node_modules/.prisma/client'
          );
          if (fs.existsSync(prismaBinPath)) {
            const files = fs.readdirSync(prismaBinPath);
            Logger.debug('PRISMA_SERVICE', '📁 .prisma/client contents:', files.filter((f: string) => f.endsWith('.node')));
          }
        } catch (err) {
          Logger.warn('PRISMA_SERVICE', 'Could not inspect prisma binary path', err);
        }
      }

      // 🔥 Prisma 클라이언트 로딩 - CommonJS require 방식 (안정적)
      Logger.info('PRISMA_SERVICE', 'Loading Prisma client from @prisma/client');
      // module namespace for dynamic require
      let PrismaPkg: any;
      try {
        PrismaPkg = require('@prisma/client');
      } catch (err) {
        Logger.error('PRISMA_SERVICE', 'Failed to require @prisma/client', err);
        throw new Error(
          'Prisma client load failed. Run `pnpm install` and `pnpm db:generate`. ' +
            'Missing module "@prisma/client-runtime-utils" indicates the runtime dependency was not installed.'
        );
      }

      const { PrismaClient } = PrismaPkg;

      // Prisma 7 SQLite: Must use better-sqlite3 adapter for Electron
      // Adapter loading and client creation are delegated to small factories (testable, isolated)
      const adapter = await loadBetterSqliteAdapter(databaseUrl) as PrismaBetterSqlite3Factory;

      // Create Prisma client via factory
      // The created client may be a runtime object and we cast to the type used across the app
       
      this.client = createPrismaClient(adapter) as unknown as PrismaClientType;

      Logger.info('PRISMA_SERVICE', '✅ Prisma client created successfully with better-sqlite3 adapter');

      return this.client;
    } catch (error) {
      Logger.error('PRISMA_SERVICE', '❌ Failed to connect Prisma client', error);
      this.client = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * 🔥 안전한 클라이언트 연결 해제
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.$disconnect();
        Logger.info('PRISMA_SERVICE', 'Prisma client disconnected');
      } catch (error) {
        Logger.error('PRISMA_SERVICE', 'Error disconnecting Prisma client', error);
      } finally {
        this.client = null;
      }
    }
  }

  /**
   * 🔥 헬스체크 - DB 연결 상태 확인
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      Logger.error('PRISMA_SERVICE', 'Health check failed', error);
      return false;
    }
  }

  /**
   * 🔥 트랜잭션 실행 - Prisma v6 호환
   */
  public async transaction<T>(
    fn: (client: TransactionClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    return client.$transaction(async (prisma: TransactionClient) => {
      return fn(prisma);
    });
  }

  /**
   * 🔥 배치 저장 - 성능 최적화를 위한 여러 작업 일괄 처리
   */
  public async batchWrite<T>(
    operations: Array<(tx: TransactionClient) => Promise<T>>
  ): Promise<T[]> {
    const client = await this.getClient();

    return await client.$transaction(async (tx: TransactionClient) => {
      const results: T[] = [];
      for (const operation of operations) {
        const result = await operation(tx);
        results.push(result);
      }
      return results;
    });
  }

  // NOTE: heavier operations (project-with-relations persistence, debounced saves, and migrations)
  // have been moved into domain managers/services to keep PrismaService focused on connection lifecycle
  // and core transaction utilities.

  /**
   * 🔥 실시간 저장을 위한 debounced 저장 시스템
   */

  /**
   * 🔥 즉시 저장 (debounce 무시)
   */

  /**
   * 🔥 데이터베이스 마이그레이션 실행
   * Production 환경에서 DB 스키마를 최신 상태로 유지
   */
  // NOTE: migration responsibilities were moved into managers/migrationManager.ts
}

// 🔥 싱글톤 인스턴스 내보내기
export const prismaService = PrismaService.getInstance();
export default prismaService;
