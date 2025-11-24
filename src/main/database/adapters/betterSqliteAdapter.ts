/*
 * Adapter loader for Prisma + better-sqlite3 in Electron.
 * Exposes a small, testable function that given a databaseUrl returns
 * an adapter instance or throws a clear, logged error.
 */
import { Logger } from '../../../shared/logger';

export async function loadBetterSqliteAdapter(databaseUrl: string) {
  if (!databaseUrl || typeof databaseUrl !== 'string') {
    throw new Error('databaseUrl must be a non-empty string');
  }

  try {
    // load adapter runtime dynamically (CommonJS require keeps bundlers out)
    // keep the require inside function to avoid top-level load-time errors
    // when adapter is not installed in certain environments.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

    if (!PrismaBetterSqlite3) {
      throw new Error('PrismaBetterSqlite3 factory not found in @prisma/adapter-better-sqlite3');
    }

    const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
    Logger.debug('DB_ADAPTER', 'better-sqlite3 adapter instantiated', { databaseUrl });
    return adapter as any;
  } catch (err) {
    Logger.error('DB_ADAPTER', 'Failed to load better-sqlite3 adapter', err);
    throw err;
  }
}
