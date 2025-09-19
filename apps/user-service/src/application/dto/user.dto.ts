import { IsEmail, IsNotEmpty, IsOptional, IsString, IsDateString, IsArray, IsEnum, IsBoolean } from 'class-validator';


/**
 * Base User DTO
 * 
 * Core user data transfer object leveraging enhanced value objects
 */
export class UserDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(['student', 'tutor', 'admin', 'superadmin'])
  role: string;

  @IsEnum(['active', 'inactive', 'suspended', 'pending_verification'])
  status: string;

  @IsOptional()
  preferences?: UserPreferencesDto;

  @IsOptional()
  profile?: UserProfileDto;

  createdAt: Date;

  updatedAt: Date;

  @IsOptional()
  lastLoginAt?: Date;
}

/**
 * User Preferences DTO
 * 
 * Represents user preferences leveraging enhanced UserPreferences value object
 */
export class UserPreferencesDto {
  @IsString()
  timezone: string;

  @IsString()
  language: string;

  notifications: NotificationSettingsDto;
}

/**
 * Notification Settings DTO
 */
export class NotificationSettingsDto {
  @IsBoolean()
  email: boolean;

  @IsBoolean()
  push: boolean;

  @IsBoolean()
  sms: boolean;

  @IsBoolean()
  marketing: boolean;

  @IsBoolean()
  security: boolean;

  @IsBoolean()
  courseUpdates: boolean;

  @IsBoolean()
  messages: boolean;

  @IsBoolean()
  reviews: boolean;
}

/**
 * User Profile DTO
 * 
 * Represents user profile leveraging enhanced UserProfile value object
 */
export class UserProfileDto {
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
  @IsEnum(['beginner', 'intermediate', 'advanced', 'expert'])
  experienceLevel?: string;

  @IsOptional()
  @IsArray()
  education?: EducationDto[];

  @IsOptional()
  @IsArray()
  achievements?: AchievementDto[];

  completeness: number;

  age?: number;
}

/**
 * Education DTO
 */
export class EducationDto {
  @IsString()
  @IsNotEmpty()
  degree: string;

  @IsString()
  @IsNotEmpty()
  institution: string;

  @IsOptional()
  graduationYear?: number;
}

/**
 * Achievement DTO
 */
export class AchievementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  dateAchieved: Date;
}
