import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
});
