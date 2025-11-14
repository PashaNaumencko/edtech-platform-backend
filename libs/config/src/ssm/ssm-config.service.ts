import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

/**
 * SSM Config Service - Simple environment management
 *
 * Integrates AWS SSM Parameter Store with NestJS ConfigModule
 * WITHOUT using registerAs() - just simple, direct access.
 *
 * Features:
 * - Automatic fallback to .env files (local development)
 * - Caching with configurable TTL
 * - Works both locally and on AWS
 * - No complex factory patterns
 *
 * @example
 * ```typescript
 * // In any service
 * constructor(private readonly ssmConfig: SSMConfigService) {}
 *
 * async onModuleInit() {
 *   // Try SSM first, fallback to .env
 *   const dbPassword = await this.ssmConfig.get(
 *     'database/password',        // SSM: /dev/database/password
 *     'DATABASE_PASSWORD',         // Fallback: DATABASE_PASSWORD from .env
 *   );
 *
 *   const dbHost = await this.ssmConfig.get(
 *     'database/host',
 *     'DATABASE_HOST',
 *   );
 * }
 * ```
 */
@Injectable()
export class SSMConfigService {
  private readonly logger = new Logger(SSMConfigService.name);
  private readonly ssmClient: SSMClient;
  private readonly cache: Map<string, { value: string; expiry: number }>;
  private readonly environment: string;
  private readonly cacheEnabled: boolean;
  private readonly cacheTTL: number; // milliseconds

  constructor(private readonly configService: ConfigService) {
    this.environment = this.configService.get<string>('NODE_ENV', 'development');
    this.cacheEnabled = this.configService.get<boolean>('SSM_CACHE_ENABLED', true);
    this.cacheTTL = this.configService.get<number>('SSM_CACHE_TTL', 5 * 60 * 1000); // 5 minutes default

    // Initialize SSM client
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.ssmClient = new SSMClient({ region });
    this.cache = new Map();

    this.logger.log(`SSM Config Service initialized (env: ${this.environment}, cache: ${this.cacheEnabled})`);
  }

  /**
   * Get configuration value from SSM Parameter Store with fallback to environment variable
   *
   * @param parameterKey - SSM parameter key (will be prefixed with /{environment}/)
   * @param fallbackEnvKey - Environment variable key to use if SSM fails
   * @returns Configuration value
   *
   * @example
   * ```typescript
   * // Get database password
   * const password = await this.ssmConfig.get(
   *   'database/password',        // Looks for: /dev/database/password in SSM
   *   'DATABASE_PASSWORD',         // Falls back to: DATABASE_PASSWORD from .env
   * );
   * ```
   */
  async get(parameterKey: string, fallbackEnvKey?: string): Promise<string | undefined> {
    // 1. Check cache first
    if (this.cacheEnabled) {
      const cached = this.cache.get(parameterKey);
      if (cached && cached.expiry > Date.now()) {
        this.logger.debug(`Cache hit for parameter: ${parameterKey}`);
        return cached.value;
      }
    }

    // 2. Try SSM Parameter Store
    try {
      const parameterName = `/${this.environment}/${parameterKey}`;
      this.logger.debug(`Fetching from SSM: ${parameterName}`);

      const value = await this.getFromSSM(parameterName);

      // Cache the value
      if (this.cacheEnabled && value) {
        this.cache.set(parameterKey, {
          value,
          expiry: Date.now() + this.cacheTTL,
        });
      }

      return value;
    } catch {
      this.logger.warn(`SSM parameter not found: ${parameterKey}, using fallback`);

      // 3. Fallback to environment variable
      if (fallbackEnvKey) {
        const envValue = this.configService.get<string>(fallbackEnvKey);
        if (envValue) {
          this.logger.debug(`Using environment variable: ${fallbackEnvKey}`);
          return envValue;
        }
      }

      this.logger.error(`No value found for parameter: ${parameterKey}`);
      return undefined;
    }
  }

  /**
   * Get multiple configuration values at once
   *
   * @example
   * ```typescript
   * const config = await this.ssmConfig.getMany([
   *   { key: 'database/host', fallback: 'DATABASE_HOST' },
   *   { key: 'database/password', fallback: 'DATABASE_PASSWORD' },
   *   { key: 'database/name', fallback: 'DATABASE_NAME' },
   * ]);
   *
   * console.log(config['database/host']); // 'localhost' or SSM value
   * ```
   */
  async getMany(
    parameters: Array<{ key: string; fallback?: string }>,
  ): Promise<Record<string, string | undefined>> {
    const results: Record<string, string | undefined> = {};

    await Promise.all(
      parameters.map(async (param) => {
        results[param.key] = await this.get(param.key, param.fallback);
      }),
    );

    return results;
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('SSM cache cleared');
  }

  /**
   * Get value directly from SSM Parameter Store
   */
  private async getFromSSM(parameterName: string): Promise<string | undefined> {
    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true, // Decrypt SecureString parameters
    });

    const response = await this.ssmClient.send(command);
    return response.Parameter?.Value;
  }
}
