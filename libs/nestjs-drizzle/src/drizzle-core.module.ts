import { DynamicModule, Module, Provider } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DrizzleModuleOptions, DrizzleModuleAsyncOptions, getConnectionToken } from './types';

@Module({})
export class DrizzleCoreModule {
  /**
   * Register Drizzle connection synchronously
   */
  static forRoot(options: DrizzleModuleOptions): DynamicModule {
    const connectionToken = getConnectionToken(options.name);
    const connectionProvider: Provider = {
      provide: connectionToken,
      useFactory: () => {
        const pool = new Pool(options.config);
        return drizzle(pool, { schema: options.schema });
      },
    };

    return {
      module: DrizzleCoreModule,
      providers: [connectionProvider],
      exports: [connectionProvider],
      global: true,
    };
  }

  /**
   * Register Drizzle connection asynchronously
   */
  static forRootAsync(options: DrizzleModuleAsyncOptions): DynamicModule {
    const connectionToken = getConnectionToken(options.name);
    const connectionProvider: Provider = {
      provide: connectionToken,
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args);
        const pool = new Pool(config.config);
        return drizzle(pool, { schema: config.schema });
      },
      inject: options.inject || [],
    };

    return {
      module: DrizzleCoreModule,
      imports: options.imports || [],
      providers: [connectionProvider],
      exports: [connectionProvider],
      global: true,
    };
  }
}
