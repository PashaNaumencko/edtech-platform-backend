import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/database/schemas/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.LEARNING_DB_HOST || 'localhost',
    port: parseInt(process.env.LEARNING_DB_PORT || '5433'),
    user: process.env.LEARNING_DB_USER || 'postgres',
    password: process.env.LEARNING_DB_PASSWORD || 'password',
    database: process.env.LEARNING_DB_NAME || 'edtech_learning_db',
    ssl: process.env.NODE_ENV === 'production',
  },
  verbose: true,
  strict: true,
});