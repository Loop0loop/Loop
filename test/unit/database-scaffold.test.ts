import db from '../../../src/main/database';

describe('Database scaffold entry', () => {
  it('should load the database module scaffold', () => {
    expect(db).toBeDefined();
  });

  it('should expose a Prisma client getter function', () => {
    // getPrismaClient is provided by prisma/client.ts scaffold
    expect(typeof (db as any).getPrismaClient).toBe('function');
  });

  it('should re-export databaseService and databaseManager shims', () => {
    expect((db as any).databaseService).toBeDefined();
    expect((db as any).databaseService).not.toBeNull();
    expect((db as any).databaseManager).toBeDefined();
  });
});
