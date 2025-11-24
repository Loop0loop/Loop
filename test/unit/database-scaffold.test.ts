import db from '../../../src/main/database';

describe('Database scaffold entry', () => {
  it('should load the database module scaffold', () => {
    expect(db).toBeDefined();
  });

  it('should expose a Prisma client getter function', () => {
    // getPrismaClient is provided by prisma/client.ts scaffold
    expect(typeof db['getPrismaClient']).toBe('function');
  });

  it('should re-export databaseService and databaseManager shims', () => {
    expect(db['databaseService']).toBeDefined();
    expect(db['databaseService']).not.toBeNull();
    expect(db['databaseManager']).toBeDefined();
  });
});
