import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

// Use Cases
import { BecomeTutorUseCase } from "./use-cases/become-tutor/become-tutor.usecase";
import { CreateUserUseCase } from "./use-cases/create-user/create-user.usecase";
import { UpdateUserProfileUseCase } from "./use-cases/update-user-profile/update-user-profile.usecase";

// Event Handlers
import { UserCreatedEventHandler } from "./event-handlers/user-created.handler";
import { UserProfileUpdatedEventHandler } from "./event-handlers/user-profile-updated.handler";
import { UserRoleChangedEventHandler } from "./event-handlers/user-role-changed.handler";

// Domain Module
import { UserDomainModule } from "../domain/user-domain.module";

// Infrastructure Modules

/**
 * User Application Module
 *
 * Orchestrates application layer components:
 * - Use cases implementing business workflows
 * - Event handlers managing side effects
 * - DTOs for data transfer
 * - Integration with domain layer
 */
@Module({
  imports: [
    CqrsModule,
    UserDomainModule, // Import domain services and entities
  ],
  providers: [
    // Use Cases
    CreateUserUseCase,
    UpdateUserProfileUseCase,
    BecomeTutorUseCase,

    // Event Handlers
    UserCreatedEventHandler,
    UserRoleChangedEventHandler,
    UserProfileUpdatedEventHandler,
  ],
  exports: [
    // Export use cases for use in presentation layer
    CreateUserUseCase,
    UpdateUserProfileUseCase,
    BecomeTutorUseCase,
  ],
})
export class UserApplicationModule {}
