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
  migrations: {
    path: 'prisma/migrations',
  },
  // Datasource URL used by Prisma at runtime.
  // Keep `datasource` singular to match the runtime config shape expected by `prisma` CLI.
  datasource: {
    url: env('DATABASE_URL'),
  },
});
