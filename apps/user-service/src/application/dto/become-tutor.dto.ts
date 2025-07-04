import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

/**
 * Become Tutor Request DTO
 */
export class BecomeTutorRequestDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  motivation?: string;

  @IsOptional()
  @IsString()
  teachingExperience?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @IsString()
  @MinLength(50)
  bio: string;

  @IsArray()
  @IsString({ each: true })
  skills: string[];
}

/**
 * Tutor Eligibility Checks DTO
 */
export class TutorEligibilityChecksDto {
  @IsBoolean()
  ageRequirement: boolean;

  @IsBoolean()
  registrationTime: boolean;

  @IsBoolean()
  profileCompleteness: boolean;

  @IsBoolean()
  overallEligible: boolean;
}

/**
 * Become Tutor Response Data
 */
export interface BecomeTutorResponseData {
  userId: string;
  newRole: string;
  requiresApproval: boolean;
  eligibilityChecks: TutorEligibilityChecksDto;
}

/**
 * Become Tutor Response DTO
 *
 * Uses the new standardized SingleEntityResponseDto pattern
 */
export type BecomeTutorResponseDto = BecomeTutorResponseData;
