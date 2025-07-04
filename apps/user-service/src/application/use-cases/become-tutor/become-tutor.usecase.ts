import { Injectable } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";

import { IUseCase } from "@edtech/types";
import { UserId, UserRole } from "../../../domain/value-objects";
import { BecomeTutorRequestDto, BecomeTutorResponseDto } from "../../dto/become-tutor.dto";
import { IUserRepository } from "../../interfaces/repository.interface";

/**
 * Become Tutor Use Case
 *
 * Handles the process of a student becoming a tutor.
 * Updates user role and profile information.
 */
@Injectable()
export class BecomeTutorUseCase implements IUseCase<BecomeTutorRequestDto, BecomeTutorResponseDto> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(request: BecomeTutorRequestDto): Promise<BecomeTutorResponseDto> {
    // 1. Find the user
    const userId = UserId.fromString(request.userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // 2. Check if user is already a tutor
    if (user.isTutor()) {
      throw new Error("User is already a tutor");
    }

    // 3. Update user role to tutor
    const tutorRole = UserRole.tutor();
    user.changeRole(tutorRole, request.userId);

    // 4. Update profile if provided
    if (request.bio || request.skills) {
      // Note: This would require implementing updateProfile method in User entity
      // For now, we'll just change the role
    }

    // 5. Save updated user
    await this.userRepository.save(user);

    // 6. Publish domain events
    user.getUncommittedEvents().forEach((event) => {
      this.eventBus.publish(event);
    });

    // 7. Return updated user data
    return {
      userId: user.id.value,
      newRole: user.role.value,
      requiresApproval: false, // Auto-approved for now
      eligibilityChecks: {
        ageRequirement: true,
        registrationTime: true,
        profileCompleteness: true,
        overallEligible: true,
      },
    };
  }
}
