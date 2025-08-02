import { DrizzleConfig } from './drizzle.config';

/**
 * Factory for creating service-specific Drizzle configurations
 * Each microservice gets its own database configuration
 */
export class DrizzleConfigFactory {
  /**
   * Create database configuration for a specific service
   * @param serviceName - Name of the service (identity, learning, payment, etc.)
   * @returns DrizzleConfig for the service
   */
  static createConfig(serviceName: string): DrizzleConfig {
    const serviceUpperCase = serviceName.toUpperCase().replace('-', '_');
    
    return {
      host: process.env[`${serviceUpperCase}_DB_HOST`] || 'localhost',
      port: parseInt(process.env[`${serviceUpperCase}_DB_PORT`] || '5432'),
      username: process.env[`${serviceUpperCase}_DB_USER`] || 'postgres',
      password: process.env[`${serviceUpperCase}_DB_PASSWORD`] || 'password',
      database: process.env[`${serviceUpperCase}_DB_NAME`] || `edtech_${serviceName}_db`,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      schema: process.env[`${serviceUpperCase}_DB_SCHEMA`] || 'public',
    };
  }

  /**
   * Get database URL for a specific service
   * @param serviceName - Name of the service
   * @returns Database connection URL
   */
  static getDatabaseUrl(serviceName: string): string {
    const config = this.createConfig(serviceName);
    const sslParam = config.ssl ? '?sslmode=require' : '';
    
    return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}${sslParam}`;
  }

  /**
   * Validate database configuration for a service
   * @param serviceName - Name of the service
   * @returns boolean indicating if configuration is valid
   */
  static validateConfig(serviceName: string): boolean {
    const config = this.createConfig(serviceName);
    
    return !!(
      config.host &&
      config.port &&
      config.username &&
      config.password &&
      config.database
    );
  }

  /**
   * Get environment variable names for a service database configuration
   * @param serviceName - Name of the service
   * @returns Object with environment variable names
   */
  static getEnvVarNames(serviceName: string) {
    const serviceUpperCase = serviceName.toUpperCase().replace('-', '_');
    
    return {
      host: `${serviceUpperCase}_DB_HOST`,
      port: `${serviceUpperCase}_DB_PORT`,
      user: `${serviceUpperCase}_DB_USER`,
      password: `${serviceUpperCase}_DB_PASSWORD`,
      database: `${serviceUpperCase}_DB_NAME`,
      schema: `${serviceUpperCase}_DB_SCHEMA`,
    };
  }
}