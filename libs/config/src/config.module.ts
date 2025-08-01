import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BaseConfigurationService } from './services/base-configuration.service';

export interface ConfigModuleOptions {
  serviceName: string;
  isGlobal?: boolean;
  useValidation?: boolean;
}

@Module({})
export class SharedConfigModule {
  static forRoot(options: ConfigModuleOptions): DynamicModule {
    const { serviceName, isGlobal = true, useValidation = true } = options;

    return {
      module: SharedConfigModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal,
          cache: true,
          expandVariables: true,
          validate: useValidation ? (config) => this.validateConfig(config, serviceName) : undefined,
        }),
      ],
      providers: [
        {
          provide: 'SERVICE_NAME',
          useValue: serviceName,
        },
        BaseConfigurationService,
      ],
      exports: [BaseConfigurationService, 'SERVICE_NAME'],
    };
  }

  private static validateConfig(config: Record<string, unknown>, serviceName: string): Record<string, unknown> {
    // Basic validation - can be enhanced with Zod schemas
    const requiredVars = [
      'NODE_ENV',
      'PORT',
    ];

    const missingVars = requiredVars.filter(varName => !config[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables for ${serviceName}: ${missingVars.join(', ')}`
      );
    }

    return config;
  }
}
