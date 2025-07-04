import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

import { AchievementDto, EducationDto } from "./user.dto";

/**
 * Update User Profile Request DTO
 */
export class UpdateUserProfileRequestDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(50)
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
  experienceLevel?: "beginner" | "intermediate" | "advanced" | "expert";

  @IsOptional()
  @IsArray()
  education?: EducationDto[];

  @IsOptional()
  @IsArray()
  achievements?: AchievementDto[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

/**
 * Update User Profile Response Data
 */
export interface UpdateUserProfileResponseData {
  userId: string;
  profileCompleteness: number;
  becameEligibleForTutoring: boolean;
  updatedFields: string[];
}

/**
 * Update User Profile Response DTO
 *
 * Uses the new standardized SingleEntityResponseDto pattern
 */
export type UpdateUserProfileResponseDto = UpdateUserProfileResponseData;
