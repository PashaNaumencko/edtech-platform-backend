import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { serviceAuthConfig } from "./config/service-auth.config";
import { ServiceAuthGuard } from "./guards/service-auth.guard";
import { ServiceAuthInterceptor } from "./interceptors/service-auth.interceptor";
import { ServiceAuthService } from "./services/service-auth.service";

/**
 * Service Authentication Module
 *
 * Provides production-ready service-to-service authentication for microservices.
 * Supports AWS Cognito JWT tokens, IAM role-based authentication, and local development.
 *
 * Features:
 * - ServiceAuthGuard: Validates incoming service requests
 * - ServiceAuthService: Generates tokens and manages credentials
 * - ServiceAuthInterceptor: Adds auth headers to outgoing requests
 * - Configuration: Environment-driven settings
 */
@Module({
  imports: [ConfigModule.forFeature(serviceAuthConfig)],
  providers: [ServiceAuthGuard, ServiceAuthService, ServiceAuthInterceptor],
  exports: [ServiceAuthGuard, ServiceAuthService, ServiceAuthInterceptor],
})
export class ServiceAuthModule {}
