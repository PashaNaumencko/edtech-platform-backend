import { ModuleMetadata } from '@nestjs/common';
import { PoolConfig } from 'pg';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * Drizzle database instance type with full schema support
 */
export type DrizzleDB<TSchema extends Record<string, unknown> = Record<string, never>> = NodePgDatabase<TSchema>;

/**
 * Drizzle connection configuration
 */
export interface DrizzleConfig {
  /**
   * PostgreSQL connection config
   */
  config: PoolConfig;

  /**
   * Drizzle schema - pass your schemas object here
   * @example
   * import * as schema from './schemas';
   * DrizzleModule.forRoot({ config: poolConfig, schema })
   */
  schema?: Record<string, unknown>;
}

/**
 * Options for DrizzleModule.forRoot()
 */
export interface DrizzleModuleOptions extends DrizzleConfig {
  /**
   * Optional connection name for multiple databases
   * @default 'default'
   */
  name?: string;
}

/**
 * Options for DrizzleModule.forRootAsync()
 */
export interface DrizzleModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Optional connection name for multiple databases
   * @default 'default'
   */
  name?: string;

  /**
   * Factory function that returns DrizzleConfig
   */
  useFactory: (...args: any[]) => Promise<DrizzleConfig> | DrizzleConfig;

  /**
   * Dependencies to inject into useFactory
   */
  inject?: any[];
}

/**
 * Get connection token for dependency injection
 */
export function getConnectionToken(name: string = 'default'): string {
  return `DRIZZLE_CONNECTION_${name.toUpperCase()}`;
}
