// Configuration Type Definitions for All Microservices
// These interfaces define the shape of configuration objects

// Base Application Configuration
export interface BaseAppConfiguration {
  port: number;
  corsOrigins: string[];
  environment: 'development' | 'staging' | 'production' | 'test';
  version: string;
}

// Database Configurations (following our naming convention guide)
export interface PostgresConfiguration {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  entities: string[];
  migrations: string[];
  subscribers: string[];
  synchronize: boolean;
  logging: boolean;
  migrationsRun: boolean;
  ssl: boolean | { rejectUnauthorized: boolean };
}

export interface RedisConfiguration {
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: number;
}

// AWS Service Configurations
export interface CognitoConfiguration {
  region: string;
  userPoolId: string;
  clientId: string;
  identityPoolId?: string;
}

export interface S3Configuration {
  region: string;
  bucketName: string;
}

export interface EmailConfiguration {
  from: string;
  fromName: string;
  sesRegion: string;
}

export interface EventBridgeConfiguration {
  eventBusName: string;
  region: string;
}

// Service-specific Configuration Interfaces
export interface UserServiceConfiguration {
  app: BaseAppConfiguration;
  postgres: PostgresConfiguration;
  redis: RedisConfiguration;
  cognito: CognitoConfiguration;
  s3: S3Configuration;
  email: EmailConfiguration;
  eventBridge: EventBridgeConfiguration;
}

export interface LearningServiceConfiguration {
  app: BaseAppConfiguration;
  postgres: PostgresConfiguration;
  redis: RedisConfiguration;
}

export interface TutorMatchingServiceConfiguration {
  app: BaseAppConfiguration;
  postgres: PostgresConfiguration;
  // neo4j will be added later
}

export interface PaymentServiceConfiguration {
  app: BaseAppConfiguration;
  postgres: PostgresConfiguration;
}

export interface CommunicationServiceConfiguration {
  app: BaseAppConfiguration;
  redis: RedisConfiguration;
  // dynamo will be added later
}

export interface ContentServiceConfiguration {
  app: BaseAppConfiguration;
  s3: S3Configuration;
  // dynamo will be added later
}

export interface AnalyticsServiceConfiguration {
  app: BaseAppConfiguration;
  // dynamo and redshift will be added later
}

export interface AiServiceConfiguration {
  app: BaseAppConfiguration;
  // vector-db and dynamo will be added later
}

export interface NotificationServiceConfiguration {
  app: BaseAppConfiguration;
  email: EmailConfiguration;
  eventBridge: EventBridgeConfiguration;
}

export interface ReviewsServiceConfiguration {
  app: BaseAppConfiguration;
  postgres: PostgresConfiguration;
}
