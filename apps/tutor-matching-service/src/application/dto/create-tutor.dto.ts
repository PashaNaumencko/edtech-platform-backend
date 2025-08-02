import { IsString, IsArray, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { TutorSubject, ExperienceLevel } from '../../domain/entities/tutor.entity';

export class CreateTutorDto {
  @IsString()
  userId: string;

  @IsString()
  bio: string;

  @IsArray()
  @IsEnum(TutorSubject, { each: true })
  subjects: TutorSubject[];

  @IsEnum(ExperienceLevel)
  experienceLevel: ExperienceLevel;

  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsArray()
  @IsString({ each: true })
  languages: string[];

  @IsString()
  education: string;
}