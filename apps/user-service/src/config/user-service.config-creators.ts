import {
  createBaseAppConfig,
  createPostgresConfig,
  createRedisConfig,
  createCognitoConfig,
  createS3Config,
  createEmailConfig,
  createEventBridgeConfig,
} from '@edtech/config';

// User Service Configuration Creators using shared base functions

export const createUserServiceConfigs = () => [
  createBaseAppConfig(),
  createPostgresConfig('user_service'),
  createRedisConfig(),
  createCognitoConfig(),
  createS3Config(),
  createEmailConfig(),
  createEventBridgeConfig(),
];
