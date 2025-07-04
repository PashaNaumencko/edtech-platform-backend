import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";

import {
  ErrorResponseDto,
  PaginatedResponseDto,
  SingleEntityResponseDto,
  SuccessResponseDto,
} from "@edtech/types";

import {
  BecomeTutorRequestDto,
  BecomeTutorResponseDto,
} from "../../../application/dto/become-tutor.dto";
import {
  CreateUserRequestDto,
  CreateUserResponseDto,
} from "../../../application/dto/create-user.dto";
import {
  UpdateUserProfileRequestDto,
  UpdateUserProfileResponseDto,
} from "../../../application/dto/update-user-profile.dto";
import { BecomeTutorUseCase } from "../../../application/use-cases/become-tutor/become-tutor.usecase";
import { CreateUserUseCase } from "../../../application/use-cases/create-user/create-user.usecase";
import { UpdateUserProfileUseCase } from "../../../application/use-cases/update-user-profile/update-user-profile.usecase";

/**
 * Users Controller
 *
 * Provides HTTP endpoints for user management operations.
 * Demonstrates usage of all base response DTOs.
 */
@Controller("users")
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
    private readonly becomeTutorUseCase: BecomeTutorUseCase
  ) {}

  /**
   * Create a new user
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserRequestDto
  ): Promise<SuccessResponseDto<SingleEntityResponseDto<CreateUserResponseDto>>> {
    try {
      const result = await this.createUserUseCase.execute(createUserDto);
      const singleResponse = SingleEntityResponseDto.create(result);
      return SuccessResponseDto.create(singleResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      const errorResponse = ErrorResponseDto.create("Failed to create user", [errorMessage]);
      throw new Error(errorResponse.message);
    }
  }

  /**
   * Update user profile
   */
  @Put(":userId/profile")
  @HttpCode(HttpStatus.OK)
  async updateUserProfile(
    @Param("userId") userId: string,
    @Body() updateProfileDto: UpdateUserProfileRequestDto
  ): Promise<SuccessResponseDto<SingleEntityResponseDto<UpdateUserProfileResponseDto>>> {
    try {
      // Ensure userId from path matches the DTO
      updateProfileDto.userId = userId;

      const result = await this.updateUserProfileUseCase.execute(updateProfileDto);
      const singleResponse = SingleEntityResponseDto.create(result);
      return SuccessResponseDto.create(singleResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      const errorResponse = ErrorResponseDto.create("Failed to update user profile", [
        errorMessage,
      ]);
      throw new Error(errorResponse.message);
    }
  }

  /**
   * Promote user to tutor
   */
  @Post(":userId/become-tutor")
  @HttpCode(HttpStatus.OK)
  async becomeTutor(
    @Param("userId") userId: string,
    @Body() becomeTutorDto: BecomeTutorRequestDto
  ): Promise<SuccessResponseDto<SingleEntityResponseDto<BecomeTutorResponseDto>>> {
    try {
      // Ensure userId from path matches the DTO
      becomeTutorDto.userId = userId;

      const result = await this.becomeTutorUseCase.execute(becomeTutorDto);
      const singleResponse = SingleEntityResponseDto.create(result);
      return SuccessResponseDto.create(singleResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      const errorResponse = ErrorResponseDto.create("Failed to promote user to tutor", [
        errorMessage,
      ]);
      throw new Error(errorResponse.message);
    }
  }

  /**
   * Get user by ID (mock implementation for now)
   */
  @Get(":userId")
  @HttpCode(HttpStatus.OK)
  getUser(@Param("userId") userId: string): SuccessResponseDto<SingleEntityResponseDto<any>> {
    // Mock response for demonstration
    const mockUser = {
      id: userId,
      email: "user@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "student",
      status: "active",
    };

    const singleResponse = SingleEntityResponseDto.create(mockUser);
    return SuccessResponseDto.create(singleResponse);
  }

  /**
   * Get all users with pagination (mock implementation for now)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  getUsers(@Query("limit") limit: number = 10): SuccessResponseDto<PaginatedResponseDto<any>> {
    // Mock response for demonstration
    const mockUsers = [
      {
        id: "1",
        email: "user1@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "student",
      },
      {
        id: "2",
        email: "user2@example.com",
        firstName: "Jane",
        lastName: "Smith",
        role: "tutor",
      },
    ];

    const paginatedResponse = PaginatedResponseDto.create({
      items: mockUsers,
      limit,
      total: 2,
      hasNext: false,
    });

    return SuccessResponseDto.create(paginatedResponse);
  }
}
