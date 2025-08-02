import { Injectable, Inject } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Tutor } from '../../domain/entities/tutor.entity';
import { ITutorRepository } from '../../domain/repositories/tutor-repository.interface';
import { CreateTutorDto } from '../dto/create-tutor.dto';
import { DI_TOKENS } from '../../constants';

@Injectable()
export class CreateTutorUseCase {
  constructor(
    @Inject(DI_TOKENS.TUTOR_REPOSITORY)
    private readonly tutorRepository: ITutorRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: CreateTutorDto): Promise<Tutor> {
    // Check if tutor already exists for this user
    const existingTutor = await this.tutorRepository.findByUserId(dto.userId);
    if (existingTutor) {
      throw new Error('Tutor profile already exists for this user');
    }

    // Create domain entity
    const tutor = Tutor.create({
      userId: dto.userId,
      bio: dto.bio,
      subjects: dto.subjects,
      experienceLevel: dto.experienceLevel,
      hourlyRate: dto.hourlyRate,
      currency: dto.currency,
      languages: dto.languages,
      education: dto.education,
    });

    // Persist to repository
    await this.tutorRepository.save(tutor);

    // Publish domain events
    tutor.commit();

    return tutor;
  }
}