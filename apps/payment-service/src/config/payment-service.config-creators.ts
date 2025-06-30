import { createBaseAppConfig, createPostgresConfig } from '@edtech/config';

// Payment Service Configuration Creators - Only needs PostgreSQL
export const createPaymentServiceConfigs = () => [
  createBaseAppConfig(),
  createPostgresConfig('payment_service'),
];
