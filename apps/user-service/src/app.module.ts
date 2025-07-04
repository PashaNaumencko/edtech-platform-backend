import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

// Domain and Application modules
import { UserApplicationModule } from "./application/user-application.module";
import { UserDomainModule } from "./domain/user-domain.module";

// Infrastructure modules
import { InfrastructureModule } from "./infrastructure/infrastructure.module";

// Service-specific Configuration
import { createUserServiceConfigs } from "./config/user-service.config-creators";
import { UserServiceConfigurationService } from "./config/user-service.configuration";
import { UserServiceEnvironmentSchema } from "./config/user-service.environment.schema";

// Shared Configuration Utilities
import { createZodValidation } from "@edtech/config";

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

    // Infrastructure Layer
    InfrastructureModule,

    // Application Layer
    UserApplicationModule,
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
