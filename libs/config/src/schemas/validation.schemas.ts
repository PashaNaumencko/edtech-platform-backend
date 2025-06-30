import { z } from 'zod';

/**
 * Creates validation configuration for NestJS ConfigModule using Zod schemas
 */
export function createZodValidation<T>(schema: z.ZodSchema<T>) {
  return {
    validate: (config: Record<string, any>) => {
      const result = schema.safeParse(config);
      if (!result.success) {
        throw new Error(`Configuration validation failed: ${result.error.message}`);
      }
      return result.data;
    },
  };
}

// Base Environment Schema - Common to all services
export const BaseEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

// PostgreSQL Schema - For services using PostgreSQL
export const PostgresEnvironmentSchema = z.object({
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('postgres'),
  POSTGRES_DB: z.string().min(1),
});

// Redis Schema - For services using Redis
export const RedisEnvironmentSchema = z.object({
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  REDIS_TTL: z.coerce.number().int().min(1).default(3600),
});

// AWS Services Schema - For services using AWS
export const AwsEnvironmentSchema = z.object({
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
});

// Cognito Schema - For services using Cognito
export const CognitoEnvironmentSchema = z.object({
  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_CLIENT_ID: z.string().min(1),
  COGNITO_IDENTITY_POOL_ID: z.string().optional(),
});

// S3 Schema - For services using S3
export const S3EnvironmentSchema = z.object({
  S3_BUCKET_NAME: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),
});

// Email/SES Schema - For services using email
export const EmailEnvironmentSchema = z.object({
  EMAIL_FROM: z.string().email(),
  EMAIL_FROM_NAME: z.string().default('EdTech Platform'),
  SES_REGION: z.string().default('us-east-1'),
});

// EventBridge Schema - For services using EventBridge
export const EventBridgeEnvironmentSchema = z.object({
  EVENT_BRIDGE_NAME: z.string().default('edtech-platform'),
  EVENT_BRIDGE_REGION: z.string().default('us-east-1'),
});

// Service-specific schemas (compose base + service-specific needs)
export const UserServiceEnvironmentSchema = BaseEnvironmentSchema.merge(PostgresEnvironmentSchema)
  .merge(RedisEnvironmentSchema)
  .merge(AwsEnvironmentSchema)
  .merge(CognitoEnvironmentSchema)
  .merge(S3EnvironmentSchema)
  .merge(EmailEnvironmentSchema)
  .merge(EventBridgeEnvironmentSchema);

export const LearningServiceEnvironmentSchema =
  BaseEnvironmentSchema.merge(PostgresEnvironmentSchema).merge(RedisEnvironmentSchema);

export const TutorMatchingServiceEnvironmentSchema =
  BaseEnvironmentSchema.merge(PostgresEnvironmentSchema); // Will add Neo4j schema later

export const PaymentServiceEnvironmentSchema =
  BaseEnvironmentSchema.merge(PostgresEnvironmentSchema);

export const CommunicationServiceEnvironmentSchema =
  BaseEnvironmentSchema.merge(RedisEnvironmentSchema); // Will add DynamoDB schema later

export const ContentServiceEnvironmentSchema = BaseEnvironmentSchema.merge(S3EnvironmentSchema); // Will add DynamoDB schema later

export const AnalyticsServiceEnvironmentSchema = BaseEnvironmentSchema; // Will add DynamoDB + Redshift later

export const AiServiceEnvironmentSchema = BaseEnvironmentSchema; // Will add Vector DB + DynamoDB later

export const NotificationServiceEnvironmentSchema = BaseEnvironmentSchema.merge(
  EmailEnvironmentSchema
).merge(EventBridgeEnvironmentSchema);

export const ReviewsServiceEnvironmentSchema =
  BaseEnvironmentSchema.merge(PostgresEnvironmentSchema);

// Export types for TypeScript
export type BaseEnvironment = z.infer<typeof BaseEnvironmentSchema>;
export type PostgresEnvironment = z.infer<typeof PostgresEnvironmentSchema>;
export type RedisEnvironment = z.infer<typeof RedisEnvironmentSchema>;
export type AwsEnvironment = z.infer<typeof AwsEnvironmentSchema>;
export type CognitoEnvironment = z.infer<typeof CognitoEnvironmentSchema>;
export type S3Environment = z.infer<typeof S3EnvironmentSchema>;
export type EmailEnvironment = z.infer<typeof EmailEnvironmentSchema>;
export type EventBridgeEnvironment = z.infer<typeof EventBridgeEnvironmentSchema>;

export type UserServiceEnvironment = z.infer<typeof UserServiceEnvironmentSchema>;
export type LearningServiceEnvironment = z.infer<typeof LearningServiceEnvironmentSchema>;
export type TutorMatchingServiceEnvironment = z.infer<typeof TutorMatchingServiceEnvironmentSchema>;
export type PaymentServiceEnvironment = z.infer<typeof PaymentServiceEnvironmentSchema>;
export type CommunicationServiceEnvironment = z.infer<typeof CommunicationServiceEnvironmentSchema>;
export type ContentServiceEnvironment = z.infer<typeof ContentServiceEnvironmentSchema>;
export type AnalyticsServiceEnvironment = z.infer<typeof AnalyticsServiceEnvironmentSchema>;
export type AiServiceEnvironment = z.infer<typeof AiServiceEnvironmentSchema>;
export type NotificationServiceEnvironment = z.infer<typeof NotificationServiceEnvironmentSchema>;
export type ReviewsServiceEnvironment = z.infer<typeof ReviewsServiceEnvironmentSchema>;
