import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Domain and Application modules
import { UserApplicationModule } from './application/user-application.module';
import { UserDomainModule } from './domain/user-domain.module';

// Service-specific Configuration
import { createUserServiceConfigs } from './config/user-service.config-creators';
import { UserServiceConfigurationService } from './config/user-service.configuration';
import { UserServiceEnvironmentSchema } from './config/user-service.environment.schema';

// Shared Configuration Utilities
import { createZodValidation } from '@edtech/config';

@Module({
  imports: [
    // Global configuration with Zod validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: createUserServiceConfigs(),
      ...createZodValidation(UserServiceEnvironmentSchema),
    }),

    // Domain Layer
    UserDomainModule,

    // Application Layer
    UserApplicationModule,

    // Infrastructure Layer (postgres connection will be added in Day 9)
    // PostgresModule, // Commented out until Day 9 when we implement actual database integration
  ],
  providers: [
    // Typed configuration service
    UserServiceConfigurationService,
  ],
  exports: [
    // Export for use in other modules
    UserServiceConfigurationService,
  ],
})
export class AppModule {}
