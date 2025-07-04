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
  ListResponseDto,
  PaginatedResponseDto,
  PaginatedResponseParams,
  QueryParamsDto,
  SingleEntityResponseDto,
  SuccessResponseDto,
} from "@edtech/types";

/**
 * Users HTTP Controller
 *
 * Handles HTTP requests for user operations using standardized response DTOs
 * This is a simplified version for demonstration purposes
 */
@Controller("users")
export class UsersController {
  /**
   * Create a new user (simplified example)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() createUserDto: any): SuccessResponseDto<SingleEntityResponseDto<any>> {
    // Mock response for demonstration
    const mockUser = {
      id: "user-123",
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      role: createUserDto.role || "student",
      status: "pending_verification",
    };

    const singleResponse = SingleEntityResponseDto.create(mockUser);
    return SuccessResponseDto.create(singleResponse);
  }

  /**
   * Update user profile (simplified example)
   */
  @Put(":userId/profile")
  @HttpCode(HttpStatus.OK)
  updateUserProfile(
    @Param("userId") userId: string
  ): SuccessResponseDto<SingleEntityResponseDto<any>> {
    // Mock response for demonstration
    const mockUpdatedUser = {
      userId,
      profileCompleteness: 85,
      becameEligibleForTutoring: true,
      updatedFields: ["bio", "skills"],
    };

    const singleResponse = SingleEntityResponseDto.create(mockUpdatedUser);
    return SuccessResponseDto.create(singleResponse);
  }

  /**
   * Promote user to tutor (simplified example)
   */
  @Post(":userId/become-tutor")
  @HttpCode(HttpStatus.OK)
  becomeTutor(@Param("userId") userId: string): SuccessResponseDto<SingleEntityResponseDto<any>> {
    // Mock response for demonstration
    const mockTutorResponse = {
      userId,
      newRole: "tutor",
      requiresApproval: false,
      eligibilityChecks: {
        ageRequirement: true,
        registrationTime: true,
        profileCompleteness: true,
        overallEligible: true,
      },
    };

    const singleResponse = SingleEntityResponseDto.create(mockTutorResponse);
    return SuccessResponseDto.create(singleResponse);
  }

  /**
   * Get users with pagination (example endpoint)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  getUsers(@Query() query: QueryParamsDto): SuccessResponseDto<PaginatedResponseDto<any>> {
    // Example paginated response - in real implementation, this would use a repository
    const mockUsers = [
      { id: "1", email: "user1@example.com", firstName: "John", lastName: "Doe" },
      { id: "2", email: "user2@example.com", firstName: "Jane", lastName: "Smith" },
    ];

    const paginationParams: PaginatedResponseParams<any> = {
      items: mockUsers,
      limit: query.limit || 10,
      total: 100, // total count
      hasNext: true,
      nextCursor: "next-cursor-123",
      previousCursor: "prev-cursor-456",
    };

    const paginatedResponse = PaginatedResponseDto.create(paginationParams);

    return SuccessResponseDto.create(paginatedResponse);
  }

  /**
   * Get user by ID (example endpoint)
   */
  @Get(":userId")
  @HttpCode(HttpStatus.OK)
  getUserById(@Param("userId") userId: string): SuccessResponseDto<SingleEntityResponseDto<any>> {
    // Example single user response - in real implementation, this would use a repository
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
   * Get all users (non-paginated example)
   */
  @Get("all/list")
  @HttpCode(HttpStatus.OK)
  getAllUsers(): SuccessResponseDto<ListResponseDto<any>> {
    // Example list response - in real implementation, this would use a repository
    const mockUsers = [
      { id: "1", email: "user1@example.com", firstName: "John", lastName: "Doe" },
      { id: "2", email: "user2@example.com", firstName: "Jane", lastName: "Smith" },
      { id: "3", email: "user3@example.com", firstName: "Bob", lastName: "Johnson" },
    ];

    const listResponse = ListResponseDto.create(mockUsers);
    return SuccessResponseDto.create(listResponse);
  }

  /**
   * Demonstrate pagination getters (example endpoint)
   */
  @Get("demo/pagination")
  @HttpCode(HttpStatus.OK)
  demonstratePaginationGetters(): SuccessResponseDto<PaginatedResponseDto<any>> {
    const users = [
      { id: "1", email: "user1@example.com" },
      { id: "2", email: "user2@example.com" },
    ];

    const paginationParams: PaginatedResponseParams<any> = {
      items: users,
      limit: 10,
      total: 100,
      hasNext: true,
      nextCursor: "next-cursor-123",
      previousCursor: "prev-cursor-456",
    };

    const paginatedResponse = PaginatedResponseDto.create(paginationParams);

    // Demonstrate using getters instead of duplicated fields
    console.log("Total (from getter):", paginatedResponse.total); // Uses getter
    console.log("Has Next (from getter):", paginatedResponse.hasNext); // Uses getter
    console.log("Pagination Total (direct):", paginatedResponse.pagination.total); // Direct access

    return SuccessResponseDto.create(paginatedResponse);
  }

  /**
   * Demonstrate error response (example endpoint)
   */
  @Get("demo/error")
  @HttpCode(HttpStatus.BAD_REQUEST)
  demonstrateErrorResponse(): ErrorResponseDto {
    return ErrorResponseDto.create("Validation failed", [
      "Email is required",
      "Email must be valid",
    ]);
  }
}
