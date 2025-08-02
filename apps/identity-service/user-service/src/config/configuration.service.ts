import { BaseAppConfiguration, PostgresConfiguration } from '@edtech/config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigurationService {
  constructor(private readonly configService: ConfigService) {}

  // App Configuration
  get app(): BaseAppConfiguration {
    return this.configService.get<BaseAppConfiguration>('app')!;
  }

  get port(): number {
    return this.app.port;
  }

  get environment(): string {
    return this.app.environment;
  }

  get corsOrigins(): string[] {
    return this.app.corsOrigins;
  }

  get version(): string {
    return this.app.version;
  }

  // PostgreSQL Configuration
  get postgres(): PostgresConfiguration {
    return this.configService.get<PostgresConfiguration>('postgres')!;
  }

  // Helper methods
  get isDevelopment(): boolean {
    return this.app.environment === 'development';
  }

  get isProduction(): boolean {
    return this.app.environment === 'production';
  }
}
