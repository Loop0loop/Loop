(async () => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

    const client = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./tmp-test.db' }) });

    await client.$connect();
    console.log('Prisma client connected OK');
    await client.$disconnect();
    console.log('Prisma client disconnected OK');
  } catch (e) {
    console.error('Prisma connect error', e);
    process.exitCode = 1;
  }
})();
