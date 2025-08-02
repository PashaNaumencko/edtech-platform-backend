import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { 
  Tutor, 
  MatchingRequest,
  CreateTutorInput, 
  CreateMatchingRequestInput,
  CreateTutorResponse,
  CreateMatchingRequestResponse,
} from '../types/tutor.types';
import { CreateTutorUseCase } from '../../../application/use-cases/create-tutor.usecase';
import { CreateMatchingRequestUseCase } from '../../../application/use-cases/create-matching-request.usecase';
import { ITutorRepository } from '../../../domain/repositories/tutor-repository.interface';
import { IMatchingRequestRepository } from '../../../domain/repositories/matching-request-repository.interface';

@Resolver(() => Tutor)
export class TutorResolver {
  constructor(
    private readonly createTutorUseCase: CreateTutorUseCase,
    @Inject('ITutorRepository')
    private readonly tutorRepository: ITutorRepository,
  ) {}

  @Query(() => [Tutor])
  async tutors(): Promise<Tutor[]> {
    const { tutors } = await this.tutorRepository.findAll(0, 10);
    return tutors.map(tutor => ({
      id: tutor.id,
      userId: tutor.userId,
      bio: tutor.bio,
      subjects: tutor.subjects,
      experienceLevel: tutor.experienceLevel,
      hourlyRate: tutor.hourlyRate,
      currency: tutor.currency,
      languages: tutor.languages,
      education: tutor.education,
      status: tutor.status,
      rating: tutor.rating,
      totalReviews: tutor.totalReviews,
      isActive: tutor.isActive(),
      createdAt: tutor.createdAt,
      updatedAt: tutor.updatedAt,
    }));
  }

  @Mutation(() => CreateTutorResponse)
  async createTutor(@Args('input') input: CreateTutorInput): Promise<CreateTutorResponse> {
    try {
      const tutor = await this.createTutorUseCase.execute({
        userId: input.userId,
        bio: input.bio,
        subjects: input.subjects,
        experienceLevel: input.experienceLevel,
        hourlyRate: input.hourlyRate,
        currency: input.currency,
        languages: input.languages,
        education: input.education,
      });

      return {
        tutor: {
          id: tutor.id,
          userId: tutor.userId,
          bio: tutor.bio,
          subjects: tutor.subjects,
          experienceLevel: tutor.experienceLevel,
          hourlyRate: tutor.hourlyRate,
          currency: tutor.currency,
          languages: tutor.languages,
          education: tutor.education,
          status: tutor.status,
          rating: tutor.rating,
          totalReviews: tutor.totalReviews,
          isActive: tutor.isActive(),
          createdAt: tutor.createdAt,
          updatedAt: tutor.updatedAt,
        },
        errors: [],
      };
    } catch (error) {
      return {
        tutor: undefined,
        errors: [{ field: 'general', message: error.message }],
      };
    }
  }
}

@Resolver(() => MatchingRequest)
export class MatchingRequestResolver {
  constructor(
    private readonly createMatchingRequestUseCase: CreateMatchingRequestUseCase,
    @Inject('IMatchingRequestRepository')
    private readonly matchingRequestRepository: IMatchingRequestRepository,
  ) {}

  @Query(() => [MatchingRequest])
  async matchingRequests(): Promise<MatchingRequest[]> {
    const { requests } = await this.matchingRequestRepository.findAll(0, 10);
    return requests.map(request => ({
      id: request.id,
      studentId: request.studentId,
      subject: request.subject,
      preferredExperienceLevel: request.preferredExperienceLevel,
      maxHourlyRate: request.maxHourlyRate,
      preferredLanguages: request.preferredLanguages,
      description: request.description,
      status: request.status,
      matchedTutorId: request.matchedTutorId,
      isExpired: request.isExpired(),
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      expiresAt: request.expiresAt,
    }));
  }

  @Mutation(() => CreateMatchingRequestResponse)
  async createMatchingRequest(@Args('input') input: CreateMatchingRequestInput): Promise<CreateMatchingRequestResponse> {
    try {
      const request = await this.createMatchingRequestUseCase.execute({
        studentId: input.studentId,
        subject: input.subject,
        preferredExperienceLevel: input.preferredExperienceLevel,
        maxHourlyRate: input.maxHourlyRate,
        preferredLanguages: input.preferredLanguages,
        description: input.description,
      });

      return {
        request: {
          id: request.id,
          studentId: request.studentId,
          subject: request.subject,
          preferredExperienceLevel: request.preferredExperienceLevel,
          maxHourlyRate: request.maxHourlyRate,
          preferredLanguages: request.preferredLanguages,
          description: request.description,
          status: request.status,
          matchedTutorId: request.matchedTutorId,
          isExpired: request.isExpired(),
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          expiresAt: request.expiresAt,
        },
        errors: [],
      };
    } catch (error) {
      return {
        request: undefined,
        errors: [{ field: 'general', message: error.message }],
      };
    }
  }
}