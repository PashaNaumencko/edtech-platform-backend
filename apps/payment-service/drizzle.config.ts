import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/database/schemas/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.PAYMENT_DB_HOST || 'localhost',
    port: parseInt(process.env.PAYMENT_DB_PORT || '5434'),
    user: process.env.PAYMENT_DB_USER || 'postgres',
    password: process.env.PAYMENT_DB_PASSWORD || 'password',
    database: process.env.PAYMENT_DB_NAME || 'edtech_payment_db',
    ssl: process.env.NODE_ENV === 'production',
  },
  verbose: true,
  strict: true,
});