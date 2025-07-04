import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

import { UserRoleType } from "../../domain/value-objects/user-role.value-object";
import { AchievementDto, EducationDto, NotificationSettingsDto } from "./user.dto";

/**
 * Create User Request DTO
 *
 * Data transfer object for user creation requests
 */
export class CreateUserRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsOptional()
  @IsEnum(UserRoleType)
  role?: UserRoleType = UserRoleType.STUDENT;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  preferences?: CreateUserPreferencesDto;

  @IsOptional()
  profile?: CreateUserProfileDto;
}

/**
 * Create User Preferences DTO
 */
export class CreateUserPreferencesDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  notifications?: Partial<NotificationSettingsDto>;
}

/**
 * Create User Profile DTO
 */
export class CreateUserProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsEnum(["beginner", "intermediate", "advanced", "expert"])
  experienceLevel?: string;

  @IsOptional()
  @IsArray()
  education?: EducationDto[];

  @IsOptional()
  @IsArray()
  achievements?: AchievementDto[];
}

/**
 * Create User Response Data
 */
export interface CreateUserResponseData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRoleType;
  status: string;
}

/**
 * Create User Response DTO
 *
 * Uses the new standardized SingleEntityResponseDto pattern
 */
export type CreateUserResponseDto = CreateUserResponseData;
