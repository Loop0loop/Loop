/*
 * Minimal Prisma client wrapper (scaffold)
 * PR-01: placeholder, uses dynamic require to avoid bundler/runtime issues.
 * Later PRs will replace this with a fully typed, strict client wrapper.
 */

import { Logger } from '../../../shared/logger';

export type PrismaClientType = any;

let clientInstance: PrismaClientType | null = null;

export async function getPrismaClient(): Promise<PrismaClientType> {
  if (clientInstance) return clientInstance;

  try {
    // lazy-load to reduce cold-start & packaging surprises
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client');

    clientInstance = new PrismaClient();

    Logger.info('PRISMA_CLIENT', 'Prisma client lazy-initialized (scaffold)');
    return clientInstance;
  } catch (error) {
    Logger.error('PRISMA_CLIENT', 'Failed to initialize Prisma client', error);
    throw error;
  }
}

export function resetPrismaClient() {
  clientInstance = null;
}

export default { getPrismaClient, resetPrismaClient };
