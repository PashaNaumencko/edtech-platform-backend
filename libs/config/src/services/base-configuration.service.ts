import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAppConfiguration } from '../types/configuration.types';

@Injectable()
export abstract class BaseConfigurationService<T> {
  constructor(protected readonly configService: ConfigService) {}

  get app(): BaseAppConfiguration {
    return this.configService.get<BaseAppConfiguration>('app')!;
  }

  get port(): number {
    return this.app.port;
  }

  get environment(): 'development' | 'staging' | 'production' | 'test' {
    return this.app.environment;
  }

  get corsOrigins(): string[] {
    return this.app.corsOrigins;
  }

  get version(): string {
    return this.app.version;
  }

  get isDevelopment(): boolean {
    return this.app.environment === 'development';
  }

  get isProduction(): boolean {
    return this.app.environment === 'production';
  }

  abstract getServiceConfig(): T;
}
