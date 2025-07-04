import { Injectable } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";

import { IUseCase } from "@edtech/types";
import { User, UserStatus } from "../../../domain/entities/user.entity";
import { UserDomainService } from "../../../domain/services/user-domain.service";
import { UserRole } from "../../../domain/value-objects";
import {
  Language,
  NotificationType,
  UserPreferences,
} from "../../../domain/value-objects/user-preferences.value-object";
import {
  ExperienceLevel,
  SkillCategory,
  UserProfile,
} from "../../../domain/value-objects/user-profile.value-object";
import { CreateUserRequestDto, CreateUserResponseDto } from "../../dto/create-user.dto";
import { IUserRepository } from "../../interfaces/repository.interface";

/**
 * Create User Use Case
 *
 * Handles user creation with enhanced domain validation and business rules.
 * Leverages domain services for complex business logic.
 */
@Injectable()
export class CreateUserUseCase implements IUseCase<CreateUserRequestDto, CreateUserResponseDto> {
  constructor(
    private readonly userDomainService: UserDomainService,
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(request: CreateUserRequestDto): Promise<CreateUserResponseDto> {
    // 1. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // 2. Create value objects from request
    const role = request.role ? UserRole.create(request.role) : UserRole.student();

    const preferences = request.preferences
      ? UserPreferences.create({
          timezone: request.preferences.timezone || "UTC",
          language: Language.ENGLISH, // Default to English
          notificationSettings: {
            [NotificationType.EMAIL_MARKETING]: false,
            [NotificationType.EMAIL_SYSTEM]: true,
            [NotificationType.PUSH_NOTIFICATIONS]: request.preferences.notifications?.push ?? true,
            [NotificationType.SMS_NOTIFICATIONS]: request.preferences.notifications?.sms ?? false,
            [NotificationType.COURSE_UPDATES]: true,
            [NotificationType.SESSION_REMINDERS]: true,
            [NotificationType.PAYMENT_ALERTS]: true,
            [NotificationType.SECURITY_ALERTS]: true, // Mandatory
          },
        })
      : UserPreferences.createDefault();

    const profile = request.profile
      ? UserProfile.create({
          bio: request.profile.bio,
          dateOfBirth: request.profile.dateOfBirth,
          skills:
            request.profile.skills?.map((skill) => ({
              name: skill,
              category: SkillCategory.OTHER,
              level: ExperienceLevel.BEGINNER,
            })) || [],
          experienceLevel: ExperienceLevel.BEGINNER,
        })
      : UserProfile.createMinimal();

    // 3. Create user entity using enhanced domain factory
    const user = User.create({
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      role,
      status: UserStatus.PENDING_VERIFICATION,
      preferences,
      profile,
    });

    // 4. Save user to repository
    await this.userRepository.save(user);

    // 5. Publish domain events through event bus
    user.getUncommittedEvents().forEach((event) => {
      this.eventBus.publish(event);
    });

    // 6. Return only the data - let the controller wrap it in the appropriate DTO
    return {
      userId: user.id.value,
      email: user.email.value,
      firstName: user.name.firstName,
      lastName: user.name.lastName,
      role: user.role.value,
      status: user.status,
    };
  }
}
