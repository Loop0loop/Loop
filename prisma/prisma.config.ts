import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * 🔥 Prisma 7 Configuration
 *
 * In Prisma 7, the datasource URL is centralized in this config file.
 * The schema.prisma no longer contains url = env("DATABASE_URL").
 *
 * Environment variable: DATABASE_URL
 * Format (SQLite): file:/absolute/path/to/loop.db or file:./relative/path.db
 */

export default defineConfig({
  schema: 'prisma/schema.prisma',
  seed: 'tsx prisma/seed.ts',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
