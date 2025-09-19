import { Injectable, Inject } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { MatchingRequest } from '../../domain/entities/matching-request.entity';
import { IMatchingRequestRepository } from '../../domain/repositories/matching-request-repository.interface';
import { CreateMatchingRequestDto } from '../dto/create-matching-request.dto';
import { DI_TOKENS } from '../../constants';

@Injectable()
export class CreateMatchingRequestUseCase {
  constructor(
    @Inject(DI_TOKENS.MATCHING_REQUEST_REPOSITORY)
    private readonly matchingRequestRepository: IMatchingRequestRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: CreateMatchingRequestDto): Promise<MatchingRequest> {
    // Create domain entity
    const request = MatchingRequest.create({
      studentId: dto.studentId,
      subject: dto.subject,
      preferredExperienceLevel: dto.preferredExperienceLevel,
      maxHourlyRate: dto.maxHourlyRate,
      preferredLanguages: dto.preferredLanguages,
      description: dto.description,
    });

    // Persist to repository
    await this.matchingRequestRepository.save(request);

    // Publish domain events
    request.commit();

    return request;
  }
}