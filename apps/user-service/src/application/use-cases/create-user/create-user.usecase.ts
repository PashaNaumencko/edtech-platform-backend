import { Inject, Injectable } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";

import { IUseCase } from "@edtech/types";
import { USER_SERVICE_TOKENS } from "../../../constants";
import { User } from "../../../domain/entities/user.entity";
import { CreateUserRequestDto, CreateUserResponseDto } from "../../dto/create-user.dto";
import { IUserRepository } from "../../interfaces/repository.interface";

/**
 * Create User Use Case
 *
 * Handles user creation with simplified domain validation.
 */
@Injectable()
export class CreateUserUseCase implements IUseCase<CreateUserRequestDto, CreateUserResponseDto> {
  constructor(
    @Inject(USER_SERVICE_TOKENS.USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(request: CreateUserRequestDto): Promise<CreateUserResponseDto> {
    // 1. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // 2. Create user entity
    const user = User.create({
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      role: request.role,
      bio: request.bio,
      skills: request.skills,
    });

    // 3. Save user to repository
    await this.userRepository.save(user);

    // 4. Publish domain events through event bus
    user.getUncommittedEvents().forEach((event) => {
      this.eventBus.publish(event);
    });

    // 5. Return response data
    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
    };
  }
}
