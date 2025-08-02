import { Injectable, Inject } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../interfaces/repository.interface';
import { CreateUserRequestDto } from '../dto/create-user.dto';
import { DI_TOKENS } from '../../constants';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(DI_TOKENS.USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: CreateUserRequestDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create domain entity
    const user = User.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      status: dto.status,
      bio: dto.bio,
      skills: dto.skills,
    });

    // Persist to repository
    await this.userRepository.save(user);

    // Publish domain events
    user.commit();

    return user;
  }
}