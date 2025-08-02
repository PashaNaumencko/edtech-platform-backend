import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/database/schemas/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.IDENTITY_DB_HOST || 'localhost',
    port: parseInt(process.env.IDENTITY_DB_PORT || '5432'),
    user: process.env.IDENTITY_DB_USER || 'postgres',
    password: process.env.IDENTITY_DB_PASSWORD || 'password',
    database: process.env.IDENTITY_DB_NAME || 'edtech_identity_db',
    ssl: process.env.NODE_ENV === 'production',
  },
  verbose: true,
  strict: true,
});