import { IsString, IsArray, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { TutorSubject, ExperienceLevel } from '../../domain/entities/tutor.entity';

export class CreateMatchingRequestDto {
  @IsString()
  studentId: string;

  @IsEnum(TutorSubject)
  subject: TutorSubject;

  @IsOptional()
  @IsEnum(ExperienceLevel)
  preferredExperienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxHourlyRate?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLanguages?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}