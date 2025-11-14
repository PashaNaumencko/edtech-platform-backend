/**
 * @edtech/nestjs-drizzle
 *
 * Internal NestJS module for Drizzle ORM integration.
 * Provides dependency injection without abstracting Drizzle's API.
 *
 * @example
 * ```typescript
 * // Import module and types
 * import { DrizzleModule, InjectDrizzle, DrizzleDB } from '@edtech/nestjs-drizzle';
 * import * as schema from './schemas';
 *
 * // Configure in app.module.ts
 * @Module({
 *   imports: [
 *     DrizzleModule.forRootAsync<typeof schema>({
 *       useFactory: (config: ConfigService) => ({
 *         config: { host, port, user, password, database },
 *         schema,
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // Use in repository
 * @Injectable()
 * export class UsersRepository {
 *   constructor(@InjectDrizzle() private db: DrizzleDB<typeof schema>) {}
 * }
 * ```
 */

export { DrizzleModule } from './drizzle.module';
export { InjectDrizzle } from './decorators/inject-drizzle.decorator';
export type { DrizzleDB, DrizzleConfig, DrizzleModuleOptions, DrizzleModuleAsyncOptions } from './types';
export { getConnectionToken } from './types';
