import { BaseEnvironmentSchema, PostgresEnvironmentSchema } from '@edtech/config';

// Payment Service Environment Schema - Only needs base + postgres
export const PaymentServiceEnvironmentSchema =
  BaseEnvironmentSchema.merge(PostgresEnvironmentSchema);
