import { Field, ObjectType, InputType, registerEnumType, ID, Float, Int } from '@nestjs/graphql';
import { 
  TutorStatus, 
  TutorSubject, 
  ExperienceLevel 
} from '../../../domain/entities/tutor.entity';
import { MatchingRequestStatus } from '../../../domain/entities/matching-request.entity';

// Register enums with GraphQL
registerEnumType(TutorStatus, {
  name: 'TutorStatus',
  description: 'Status of a tutor in the system',
});

registerEnumType(TutorSubject, {
  name: 'TutorSubject',
  description: 'Subject that a tutor can teach',
});

registerEnumType(ExperienceLevel, {
  name: 'ExperienceLevel',
  description: 'Experience level of a tutor',
});

registerEnumType(MatchingRequestStatus, {
  name: 'MatchingRequestStatus',
  description: 'Status of a matching request',
});

@ObjectType()
export class Tutor {
  @Field(() => ID)
  id!: string;

  @Field()
  userId!: string;

  @Field()
  bio!: string;

  @Field(() => [TutorSubject])
  subjects!: TutorSubject[];

  @Field(() => ExperienceLevel)
  experienceLevel!: ExperienceLevel;

  @Field(() => Float)
  hourlyRate!: number;

  @Field()
  currency!: string;

  @Field(() => [String])
  languages!: string[];

  @Field()
  education!: string;

  @Field(() => TutorStatus)
  status!: TutorStatus;

  @Field(() => Float)
  rating!: number;

  @Field(() => Int)
  totalReviews!: number;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class MatchingRequest {
  @Field(() => ID)
  id!: string;

  @Field()
  studentId!: string;

  @Field(() => TutorSubject)
  subject!: TutorSubject;

  @Field(() => ExperienceLevel, { nullable: true })
  preferredExperienceLevel?: ExperienceLevel;

  @Field(() => Float, { nullable: true })
  maxHourlyRate?: number;

  @Field(() => [String])
  preferredLanguages!: string[];

  @Field({ nullable: true })
  description?: string;

  @Field(() => MatchingRequestStatus)
  status!: MatchingRequestStatus;

  @Field({ nullable: true })
  matchedTutorId?: string;

  @Field({ nullable: true })
  matchedTutor?: Tutor;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field()
  expiresAt!: Date;

  @Field()
  isExpired!: boolean;
}

@ObjectType()
export class TutorMatch {
  @Field(() => Tutor)
  tutor!: Tutor;

  @Field(() => Float)
  matchScore!: number;

  @Field()
  reason!: string;
}

@ObjectType()
export class FieldError {
  @Field()
  field!: string;

  @Field()
  message!: string;
}

@ObjectType()
export class CreateTutorResponse {
  @Field(() => Tutor, { nullable: true })
  tutor?: Tutor;

  @Field(() => [FieldError])
  errors!: FieldError[];
}

@ObjectType()
export class CreateMatchingRequestResponse {
  @Field(() => MatchingRequest, { nullable: true })
  request?: MatchingRequest;

  @Field(() => [FieldError])
  errors!: FieldError[];
}

@ObjectType()
export class FindTutorsResponse {
  @Field(() => [TutorMatch])
  matches!: TutorMatch[];

  @Field(() => Int)
  total!: number;
}

@InputType()
export class CreateTutorInput {
  @Field()
  userId!: string;

  @Field()
  bio!: string;

  @Field(() => [TutorSubject])
  subjects!: TutorSubject[];

  @Field(() => ExperienceLevel)
  experienceLevel!: ExperienceLevel;

  @Field(() => Float)
  hourlyRate!: number;

  @Field({ defaultValue: 'USD' })
  currency!: string;

  @Field(() => [String])
  languages!: string[];

  @Field()
  education!: string;
}

@InputType()
export class UpdateTutorInput {
  @Field({ nullable: true })
  bio?: string;

  @Field(() => [TutorSubject], { nullable: true })
  subjects?: TutorSubject[];

  @Field(() => ExperienceLevel, { nullable: true })
  experienceLevel?: ExperienceLevel;

  @Field(() => Float, { nullable: true })
  hourlyRate?: number;

  @Field(() => [String], { nullable: true })
  languages?: string[];

  @Field({ nullable: true })
  education?: string;
}

@InputType()
export class CreateMatchingRequestInput {
  @Field()
  studentId!: string;

  @Field(() => TutorSubject)
  subject!: TutorSubject;

  @Field(() => ExperienceLevel, { nullable: true })
  preferredExperienceLevel?: ExperienceLevel;

  @Field(() => Float, { nullable: true })
  maxHourlyRate?: number;

  @Field(() => [String], { nullable: true })
  preferredLanguages?: string[];

  @Field({ nullable: true })
  description?: string;
}

@InputType()
export class FindTutorsInput {
  @Field(() => TutorSubject)
  subject!: TutorSubject;

  @Field(() => ExperienceLevel, { nullable: true })
  experienceLevel?: ExperienceLevel;

  @Field(() => Float, { nullable: true })
  maxHourlyRate?: number;

  @Field(() => [String], { nullable: true })
  languages?: string[];

  @Field(() => Int, { defaultValue: 10 })
  limit!: number;

  @Field(() => Int, { defaultValue: 0 })
  offset!: number;
}