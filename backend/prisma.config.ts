import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Validation and generation do not need a live database or a fabricated URL.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
