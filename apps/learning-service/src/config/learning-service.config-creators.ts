import { createBaseAppConfig, createPostgresConfig, createRedisConfig } from '@edtech/config';

// Learning Service Configuration Creators - Only needs PostgreSQL and Redis
export const createLearningServiceConfigs = () => [
  createBaseAppConfig(),
  createPostgresConfig('learning_service'),
  createRedisConfig(),
];
