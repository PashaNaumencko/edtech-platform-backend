import { DynamicModule, Module } from '@nestjs/common';
import { DrizzleCoreModule } from './drizzle-core.module';
import { DrizzleModuleOptions, DrizzleModuleAsyncOptions } from './types';

/**
 * NestJS module for Drizzle ORM integration
 *
 * Provides dependency injection for Drizzle database connections
 * while maintaining full access to Drizzle's API (no abstractions).
 *
 * @example
 * ```typescript
 * // app.module.ts
 * import { DrizzleModule } from '@edtech/nestjs-drizzle';
 * import * as schema from './infrastructure/database/schemas';
 *
 * @Module({
 *   imports: [
 *     DrizzleModule.forRootAsync({
 *       useFactory: (config: ConfigService) => ({
 *         config: {
 *           host: config.get('DB_HOST'),
 *           port: config.get('DB_PORT'),
 *           user: config.get('DB_USER'),
 *           password: config.get('DB_PASSWORD'),
 *           database: config.get('DB_NAME'),
 *         },
 *         schema,
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // repository.ts
 * import { InjectDrizzle } from '@edtech/nestjs-drizzle';
 * import type { DrizzleDB } from '@edtech/nestjs-drizzle';
 *
 * @Injectable()
 * export class UsersRepository {
 *   constructor(@InjectDrizzle() private db: DrizzleDB<typeof schema>) {}
 *
 *   async findById(id: string) {
 *     return this.db.select().from(users).where(eq(users.id, id));
 *   }
 * }
 * ```
 */
@Module({})
export class DrizzleModule {
  /**
   * Register Drizzle connection synchronously
   *
   * Useful for testing or when configuration is immediately available.
   *
   * @example
   * ```typescript
   * DrizzleModule.forRoot({
   *   config: {
   *     host: 'localhost',
   *     port: 5432,
   *     database: 'test_db',
   *     user: 'postgres',
   *     password: 'postgres',
   *   },
   *   schema,
   * })
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static forRoot<TSchema extends Record<string, unknown> = Record<string, never>>(
    options: DrizzleModuleOptions,
  ): DynamicModule {
    return DrizzleCoreModule.forRoot(options);
  }

  /**
   * Register Drizzle connection asynchronously
   *
   * Use this when you need to inject dependencies (like ConfigService)
   * to build the database configuration.
   *
   * @example
   * ```typescript
   * DrizzleModule.forRootAsync<typeof schema>({
   *   useFactory: (config: ConfigService) => ({
   *     config: {
   *       host: config.get('DB_HOST'),
   *       port: config.get('DB_PORT'),
   *       user: config.get('DB_USER'),
   *       password: config.get('DB_PASSWORD'),
   *       database: config.get('DB_NAME'),
   *     },
   *     schema,
   *   }),
   *   inject: [ConfigService],
   * })
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static forRootAsync<TSchema extends Record<string, unknown> = Record<string, never>>(
    options: DrizzleModuleAsyncOptions,
  ): DynamicModule {
    return DrizzleCoreModule.forRootAsync(options);
  }
}
