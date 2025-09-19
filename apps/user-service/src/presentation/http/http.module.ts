import { ServiceAuthGuard, ServiceAuthInterceptor } from "@edtech/service-auth";
import { Module } from "@nestjs/common";
import { UserApplicationModule } from "../../application/user-application.module";
import { InfrastructureModule } from "../../infrastructure/infrastructure.module";
import { UsersController } from "./controllers/users.controller";

/**
 * HTTP Presentation Module
 *
 * Provides internal HTTP controllers for service-to-service communication.
 * All endpoints are protected by ServiceAuthGuard and only accessible within the private VPC.
 * External access is handled through GraphQL Federation (AppSync).
 */
@Module({
  imports: [UserApplicationModule, InfrastructureModule],
  controllers: [UsersController],
  providers: [ServiceAuthGuard, ServiceAuthInterceptor],
})
export class HttpModule {}
