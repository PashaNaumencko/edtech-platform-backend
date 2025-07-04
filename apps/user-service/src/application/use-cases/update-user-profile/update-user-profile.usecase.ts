import { Injectable } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";

import { IUseCase } from "@edtech/types";
import { UserId } from "../../../domain/value-objects";
import { UserProfile } from "../../../domain/value-objects/user-profile.value-object";
import {
  UpdateUserProfileRequestDto,
  UpdateUserProfileResponseDto,
} from "../../dto/update-user-profile.dto";
import { IUserRepository } from "../../interfaces/repository.interface";

/**
 * Update User Profile Use Case
 *
 * Handles user profile updates with validation and business rules.
 */
@Injectable()
export class UpdateUserProfileUseCase
  implements IUseCase<UpdateUserProfileRequestDto, UpdateUserProfileResponseDto>
{
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(request: UpdateUserProfileRequestDto): Promise<UpdateUserProfileResponseDto> {
    // 1. Find the user
    const userId = UserId.fromString(request.userId);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // 2. Create updated profile from request data
    const updatedProfile = UserProfile.create({
      bio: request.bio,
      skills:
        request.skills?.map((skill) => ({
          name: skill,
          category: "other" as any, // Simplified for now
          level: "beginner" as any, // Simplified for now
        })) || [],
      experienceLevel: (request.experienceLevel as any) || user.profile.experienceLevel,
      dateOfBirth: request.dateOfBirth,
      location: request.location,
      education:
        request.education?.map((edu) => ({
          institution: edu.institution,
          degree: edu.degree,
          endDate: edu.graduationYear ? new Date(edu.graduationYear, 0, 1) : undefined,
        })) || [],
      achievements:
        request.achievements?.map((achievement) => ({
          title: achievement.title,
          description: achievement.description,
          dateAchieved: achievement.dateAchieved,
        })) || [],
    });

    // 3. Update user profile
    user.updateProfile(updatedProfile);

    // 4. Save updated user
    await this.userRepository.save(user);

    // 5. Publish domain events
    user.getUncommittedEvents().forEach((event) => {
      this.eventBus.publish(event);
    });

    // 6. Return updated user data
    return {
      userId: user.id.value,
      profileCompleteness: user.profile.calculateCompleteness() * 10, // Convert to percentage
      becameEligibleForTutoring: false, // Simplified for now
      updatedFields: Object.keys(request).filter(
        (key) => key !== "userId" && request[key] !== undefined,
      ),
    };
  }
}
