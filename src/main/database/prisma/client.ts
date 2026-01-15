/*
 * Minimal Prisma client wrapper (scaffold)
 * PR-01: placeholder, uses dynamic require to avoid bundler/runtime issues.
 * Later PRs will replace this with a fully typed, strict client wrapper.
 */

import { Logger } from '../../../shared/logger';

import { ensureDatabaseUrl } from '../utils/prismaPaths';

// Use `import type` for runtime-free typings so code uses dynamic require at runtime
import type { PrismaClient } from '@prisma/client';

let clientInstance: PrismaClient | null = null;
let isConnecting = false;

/**
 * Returns the singleton Prisma client. Lazy-initializes and connects.
 * This function is safe to call multiple times — it will reuse the existing
 * instance when possible.
 */
export async function getPrismaClient(): Promise<PrismaClient> {
  if (clientInstance) return clientInstance;

  // If another call is already initializing, wait until it's done
  if (isConnecting) {
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    if (clientInstance) return clientInstance;
  }

  try {
    isConnecting = true;

    // Ensure env DATABASE_URL and engine path are configured for Prisma runtime
    const { databaseUrl } = await ensureDatabaseUrl();

     
    const { PrismaClient: PrismaCtor } = require('@prisma/client');

    // Create typed instance but keep require dynamic to avoid packaging surprises
    clientInstance = new (PrismaCtor as unknown as { new (opts?: unknown): PrismaClient })({
      datasources: {
        db: { url: databaseUrl },
      },
      // enable basic runtime logging in development
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    // Connect eagerly so subsequent queries are predictable
    await clientInstance.$connect();

    Logger.info('PRISMA_CLIENT', 'Prisma client initialized and connected', { databaseUrl });
    return clientInstance;
  } catch (error) {
    Logger.error('PRISMA_CLIENT', 'Prisma client initialization failed', error);
    clientInstance = null;
    throw error;
  } finally {
    isConnecting = false;
  }
}

export async function disconnectPrismaClient(): Promise<void> {
  if (!clientInstance) return;
  try {
    await clientInstance.$disconnect();
    Logger.info('PRISMA_CLIENT', 'Prisma client disconnected');
  } catch (error) {
    Logger.warn('PRISMA_CLIENT', 'Failed to disconnect Prisma client', error);
  } finally {
    clientInstance = null;
  }
}

export default { getPrismaClient, disconnectPrismaClient };
