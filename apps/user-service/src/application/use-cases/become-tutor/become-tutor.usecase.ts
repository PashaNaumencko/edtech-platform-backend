import { Inject, Injectable } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";

import { IUseCase } from "@edtech/types";
import { USER_SERVICE_TOKENS } from "../../../constants";
import { UserRoleType } from "../../../domain/entities/user.entity";
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
    @Inject(USER_SERVICE_TOKENS.USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(request: BecomeTutorRequestDto): Promise<BecomeTutorResponseDto> {
    // 1. Find the user
    const user = await this.userRepository.findById(request.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // 2. Check if user is already a tutor
    if (user.isTutor()) {
      throw new Error("User is already a tutor");
    }

    // 3. Update user profile with tutor information
    user.update(
      {
        bio: request.bio,
        skills: request.skills,
      },
      request.userId
    );

    // 4. Change role to tutor
    user.changeRole(UserRoleType.TUTOR, request.userId);

    // 5. Save updated user
    await this.userRepository.save(user);

    // 6. Publish domain events
    user.getUncommittedEvents().forEach((event) => {
      this.eventBus.publish(event);
    });

    // 7. Return updated user data
    return {
      userId: user.id,
      newRole: user.role,
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
