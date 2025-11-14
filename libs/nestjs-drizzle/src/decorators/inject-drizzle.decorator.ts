import { Inject } from '@nestjs/common';
import { getConnectionToken } from '../types';

/**
 * Injects the Drizzle database instance
 *
 * @param connectionName - Optional connection name for multiple databases (default: 'default')
 *
 * @example
 * ```typescript
 * // Single database
 * constructor(@InjectDrizzle() private db: DrizzleDB<typeof schema>) {}
 *
 * // Multiple databases
 * constructor(
 *   @InjectDrizzle('userDb') private userDb: DrizzleDB<typeof userSchema>,
 *   @InjectDrizzle('analyticsDb') private analyticsDb: DrizzleDB<typeof analyticsSchema>,
 * ) {}
 * ```
 */
export const InjectDrizzle = (connectionName?: string): ParameterDecorator => {
  return Inject(getConnectionToken(connectionName));
};
