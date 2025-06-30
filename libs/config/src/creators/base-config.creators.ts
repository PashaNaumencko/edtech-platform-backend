import { registerAs } from '@nestjs/config';
import {
  BaseAppConfiguration,
  CognitoConfiguration,
  EmailConfiguration,
  EventBridgeConfiguration,
  PostgresConfiguration,
  RedisConfiguration,
  S3Configuration,
} from '../types/configuration.types';

// Base App Configuration Creator - Reusable by all services
export const createBaseAppConfig = () =>
  registerAs(
    'app',
    (): BaseAppConfiguration => ({
      port: parseInt(process.env.PORT || '3001', 10),
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      environment:
        (process.env.NODE_ENV as 'development' | 'staging' | 'production' | 'test') ||
        'development',
      version: '1.0.0',
    })
  );

// PostgreSQL Configuration - Takes service name parameter
export const createPostgresConfig = (serviceName: string) =>
  registerAs('postgres', (): PostgresConfiguration => {
    const environment = process.env.NODE_ENV || 'development';
    const isDevelopment = environment === 'development';
    const isProduction = environment === 'production';

    return {
      type: 'postgres' as const,
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || `edtech_${serviceName}`,
      entities: [`${__dirname}/../../**/*.orm-entity{.ts,.js}`],
      migrations: [`${__dirname}/../../infrastructure/postgres/migrations/*{.ts,.js}`],
      subscribers: [`${__dirname}/../../**/*.subscriber{.ts,.js}`],
      synchronize: isDevelopment,
      logging: isDevelopment,
      migrationsRun: !isDevelopment,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    };
  });

// Redis Configuration
export const createRedisConfig = () =>
  registerAs(
    'redis',
    (): RedisConfiguration => ({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
    })
  );

// Cognito Configuration
export const createCognitoConfig = () =>
  registerAs(
    'cognito',
    (): CognitoConfiguration => ({
      region: process.env.AWS_REGION || 'us-east-1',
      userPoolId: process.env.COGNITO_USER_POOL_ID || '',
      clientId: process.env.COGNITO_CLIENT_ID || '',
      identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID || undefined,
    })
  );

// S3 Configuration
export const createS3Config = () =>
  registerAs(
    's3',
    (): S3Configuration => ({
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
      bucketName: process.env.S3_BUCKET_NAME || '',
    })
  );

// Email Configuration
export const createEmailConfig = () =>
  registerAs(
    'email',
    (): EmailConfiguration => ({
      from: process.env.EMAIL_FROM || '',
      fromName: process.env.EMAIL_FROM_NAME || 'EdTech Platform',
      sesRegion: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
    })
  );

// EventBridge Configuration
export const createEventBridgeConfig = () =>
  registerAs(
    'eventBridge',
    (): EventBridgeConfiguration => ({
      eventBusName: process.env.EVENT_BRIDGE_NAME || 'edtech-platform',
      region: process.env.EVENT_BRIDGE_REGION || process.env.AWS_REGION || 'us-east-1',
    })
  );
