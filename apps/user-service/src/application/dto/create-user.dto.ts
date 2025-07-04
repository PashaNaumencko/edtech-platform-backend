import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

import { UserRoleType } from "../../domain/entities/user.entity";

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
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}

/**
 * Create User Response Data
 */
export interface CreateUserResponseData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

/**
 * Create User Response DTO
 *
 * Uses the new standardized SingleEntityResponseDto pattern
 */
export type CreateUserResponseDto = CreateUserResponseData;
