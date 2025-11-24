import { Logger } from '../../../shared/logger';
import { ensureDatabaseUrl } from '../utils/prismaPaths';
import { prismaService } from '../services/PrismaService';

export class MigrationManager {
  private static instance: MigrationManager | null = null;

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) MigrationManager.instance = new MigrationManager();
    return MigrationManager.instance;
  }

  private constructor() {}

  public async runMigrations(): Promise<void> {
    try {
      Logger.info('MIGRATION_MGR', 'Starting database migrations');

      const { dbPath, databaseUrl } = await ensureDatabaseUrl();
      Logger.info('MIGRATION_MGR', 'Database path resolved', { dbPath, databaseUrl });

      const client = await prismaService.getClient();

      // create gemini_chat_sessions table if missing
      try {
        const tables: any[] = await client.$queryRaw`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='gemini_chat_sessions'
        `;

        if (!tables || tables.length === 0) {
          Logger.warn('MIGRATION_MGR', 'GeminiChatSession table not found, attempting to create');
          await client.$queryRaw`
            CREATE TABLE IF NOT EXISTS "gemini_chat_sessions" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "projectId" TEXT NOT NULL,
              "title" TEXT,
              "summary" TEXT,
              "metadata" TEXT,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL,
              "lastInteraction" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "gemini_chat_sessions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE
            )
          `;

          await client.$queryRaw`
            CREATE INDEX "gemini_chat_sessions_projectId_idx" ON "gemini_chat_sessions"("projectId")
          `;

          await client.$queryRaw`
            CREATE INDEX "gemini_chat_sessions_lastInteraction_idx" ON "gemini_chat_sessions"("lastInteraction")
          `;

          Logger.info('MIGRATION_MGR', 'GeminiChatSession table created');
        }
      } catch (tableError) {
        Logger.warn('MIGRATION_MGR', 'Table check/creation attempt', tableError);
      }

      // gemini_chat_messages
      try {
        const messages: any[] = await client.$queryRaw`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='gemini_chat_messages'
        `;

        if (!messages || messages.length === 0) {
          Logger.warn('MIGRATION_MGR', 'GeminiChatMessage table not found, attempting to create');

          await client.$queryRaw`
            CREATE TABLE IF NOT EXISTS "gemini_chat_messages" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "sessionId" TEXT NOT NULL,
              "role" TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
              "content" TEXT NOT NULL,
              "tokenUsage" TEXT,
              "isStreaming" BOOLEAN NOT NULL DEFAULT 0,
              "metadata" TEXT,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL,
              CONSTRAINT "gemini_chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "gemini_chat_sessions" ("id") ON DELETE CASCADE
            )
          `;

          await client.$queryRaw`
            CREATE INDEX "gemini_chat_messages_sessionId_idx" ON "gemini_chat_messages"("sessionId")
          `;

          await client.$queryRaw`
            CREATE INDEX "gemini_chat_messages_createdAt_idx" ON "gemini_chat_messages"("createdAt")
          `;

          Logger.info('MIGRATION_MGR', 'GeminiChatMessage table created');
        }
      } catch (tableError) {
        Logger.warn('MIGRATION_MGR', 'Message table check/creation attempt', tableError);
      }

      Logger.info('MIGRATION_MGR', '✅ Database migrations completed');
    } catch (error) {
      Logger.error('MIGRATION_MGR', '❌ Migration failed', error);
      throw error;
    }
  }
}

export const migrationManager = MigrationManager.getInstance();
