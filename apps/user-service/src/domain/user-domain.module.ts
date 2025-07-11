import { Module } from "@nestjs/common";
import { UserDomainService } from "./services/user-domain.service";

/**
 * User Domain Module
 *
 * Provides:
 * - Consolidated domain service with all business logic
 * - Simplified domain events compatible with NestJS/CQRS
 * - User aggregate and value objects
 * - Domain events and error handling
 */
@Module({
  providers: [UserDomainService],
  exports: [UserDomainService],
})
export class UserDomainModule {}
