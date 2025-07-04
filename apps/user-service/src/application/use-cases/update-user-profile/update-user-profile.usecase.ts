import { Inject, Injectable } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";

import { IUseCase } from "@edtech/types";
import { USER_SERVICE_TOKENS } from "../../../constants";
import { User } from "../../../domain/entities/user.entity";
import {
  UpdateUserProfileRequestDto,
  UpdateUserProfileResponseDto,
} from "../../dto/update-user-profile.dto";
import { IUserRepository } from "../../interfaces/repository.interface";

/**
 * Update User Profile Use Case
 *
 * Handles user profile updates with validation.
 */
@Injectable()
export class UpdateUserProfileUseCase
  implements IUseCase<UpdateUserProfileRequestDto, UpdateUserProfileResponseDto>
{
  constructor(
    @Inject(USER_SERVICE_TOKENS.USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(request: UpdateUserProfileRequestDto): Promise<UpdateUserProfileResponseDto> {
    // 1. Find the user
    const user = await this.userRepository.findById(request.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // 2. Update user profile
    user.update(
      {
        firstName: request.firstName,
        lastName: request.lastName,
        bio: request.bio,
        skills: request.skills,
      },
      request.userId
    );

    // 3. Save updated user
    await this.userRepository.save(user);

    // 4. Publish domain events
    user.getUncommittedEvents().forEach((event) => {
      this.eventBus.publish(event);
    });

    // 5. Return updated user data
    return {
      userId: user.id,
      profileCompleteness: this.calculateProfileCompleteness(user),
      becameEligibleForTutoring: false, // Simplified for now
      updatedFields: Object.keys(request).filter(
        (key) => key !== "userId" && request[key] !== undefined
      ),
    };
  }

  private calculateProfileCompleteness(user: User): number {
    let completeness = 0;
    if (user.firstName) completeness += 20;
    if (user.lastName) completeness += 20;
    if (user.email) completeness += 20;
    if (user.bio) completeness += 20;
    if (user.skills && user.skills.length > 0) completeness += 20;
    return completeness;
  }
}
