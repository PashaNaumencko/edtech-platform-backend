import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './libs/drizzle/src/schemas/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'edtech_user_db',
    ssl: process.env.NODE_ENV === 'production',
  },
  verbose: true,
  strict: true,
});