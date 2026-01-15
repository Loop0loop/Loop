/*
 * Small factory that creates a PrismaClient instance using dynamic require.
 * Keeps the creation logic separate from the service and makes it easier to test.
 */
import { Logger } from '../../shared/logger';

export function createPrismaClient(adapter?: unknown) {
  try {
     
    const PrismaPkg = require('@prisma/client');
    const { PrismaClient } = PrismaPkg;

    const client = new PrismaClient({ adapter, log: ['error', 'warn'] });
    Logger.debug('PRISMA_FACTORY', 'PrismaClient instance created');
    return client;
  } catch (err) {
    Logger.error('PRISMA_FACTORY', 'Failed to create PrismaClient', err);
    throw err;
  }
}
