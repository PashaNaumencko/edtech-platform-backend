import {
  BaseEnvironmentSchema,
  PostgresEnvironmentSchema,
  RedisEnvironmentSchema,
} from '@edtech/config';

// Learning Service Environment Schema - Only needs base + postgres + redis
export const LearningServiceEnvironmentSchema =
  BaseEnvironmentSchema.merge(PostgresEnvironmentSchema).merge(RedisEnvironmentSchema);
