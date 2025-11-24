jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(true),
    $disconnect: jest.fn().mockResolvedValue(true),
  })),
}));

import { getPrismaClient, disconnectPrismaClient } from '../../../src/main/database/prisma/client';

describe('Prisma client wrapper (scaffold PR-02)', () => {
  it('initializes and returns a client instance', async () => {
    const client = await getPrismaClient();
    expect(client).toBeDefined();
    expect(typeof client.$connect).toBe('function');
  });

  it('disconnects the client without throwing', async () => {
    await expect(disconnectPrismaClient()).resolves.toBeUndefined();
  });
});
