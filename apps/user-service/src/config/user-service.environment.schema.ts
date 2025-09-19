import {
  BaseEnvironmentSchema,
  PostgresEnvironmentSchema,
  RedisEnvironmentSchema,
  AwsEnvironmentSchema,
  CognitoEnvironmentSchema,
  S3EnvironmentSchema,
  EmailEnvironmentSchema,
  EventBridgeEnvironmentSchema,
} from '@edtech/config';

// User Service Environment Schema - Composes all required schemas
export const UserServiceEnvironmentSchema = BaseEnvironmentSchema.merge(PostgresEnvironmentSchema)
  .merge(RedisEnvironmentSchema)
  .merge(AwsEnvironmentSchema)
  .merge(CognitoEnvironmentSchema)
  .merge(S3EnvironmentSchema)
  .merge(EmailEnvironmentSchema)
  .merge(EventBridgeEnvironmentSchema);
