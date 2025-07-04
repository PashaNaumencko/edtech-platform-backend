import { plainToClass } from "class-transformer";
import {
  ErrorResponseDto,
  ListResponseDto,
  PaginatedResponseDto,
  PaginatedResponseParams,
  QueryParamsDto,
  SingleEntityResponseDto,
  SuccessResponseDto,
} from "./base-response.dto";
import { ErrorDetailDto } from "./error-response.dto";

/**
 * Response Examples
 *
 * Demonstrates how to use the simplified base response DTOs with plainToClass transformation
 */

// Example 1: Single Entity Response
export function createSingleEntityResponse() {
  // Raw data from use case
  const rawUserData = {
    id: "user-123",
    email: "john.doe@example.com",
    firstName: "John",
    lastName: "Doe",
    role: "student",
    status: "active",
  };

  // Transform to SingleEntityResponseDto
  const singleResponse = SingleEntityResponseDto.create(rawUserData);

  // Wrap in SuccessResponseDto
  const successResponse = SuccessResponseDto.create(singleResponse);

  return successResponse;
}

// Example 2: Paginated Response with Parameter Object
export function createPaginatedResponse() {
  // Raw data from repository
  const rawUsers = [
    { id: "1", email: "user1@example.com", firstName: "John", lastName: "Doe" },
    { id: "2", email: "user2@example.com", firstName: "Jane", lastName: "Smith" },
  ];

  // Create paginated response using parameter object
  const paginationParams: PaginatedResponseParams<any> = {
    items: rawUsers,
    limit: 10,
    total: 100,
    hasNext: true,
    nextCursor: "next-cursor-123",
    previousCursor: "prev-cursor-456",
  };

  const paginatedResponse = PaginatedResponseDto.create(paginationParams);

  // Wrap in SuccessResponseDto
  const successResponse = SuccessResponseDto.create(paginatedResponse);

  return successResponse;
}

// Example 3: List Response (non-paginated)
export function createListResponse() {
  // Raw data from repository
  const rawUsers = [
    { id: "1", email: "user1@example.com", firstName: "John", lastName: "Doe" },
    { id: "2", email: "user2@example.com", firstName: "Jane", lastName: "Smith" },
    { id: "3", email: "user3@example.com", firstName: "Bob", lastName: "Johnson" },
  ];

  // Create list response
  const listResponse = ListResponseDto.create(rawUsers);

  // Wrap in SuccessResponseDto
  const successResponse = SuccessResponseDto.create(listResponse);

  return successResponse;
}

// Example 4: Error Response
export function createErrorResponse() {
  // Create validation error details
  const errorDetails = [
    new ErrorDetailDto("Email is required", "email", "REQUIRED"),
    new ErrorDetailDto("Email must be valid", "email", "INVALID_FORMAT", "invalid-email"),
  ];

  // Create error response
  const errorResponse = ErrorResponseDto.create(
    "Validation failed",
    errorDetails.map((detail) => detail.message),
  );

  return errorResponse;
}

// Example 5: Using plainToClass for transformation
export function transformPlainObject() {
  // Plain object from external source (e.g., database, external API)
  const plainUser = {
    id: "user-123",
    email: "john.doe@example.com",
    firstName: "John",
    lastName: "Doe",
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  // Transform to SingleEntityResponseDto using plainToClass
  const singleResponse = plainToClass(SingleEntityResponseDto, {
    data: plainUser,
    timestamp: new Date(),
  });

  // Transform to SuccessResponseDto
  const successResponse = plainToClass(SuccessResponseDto, {
    data: singleResponse,
    timestamp: new Date(),
  });

  return successResponse;
}

// Example 6: Query Parameters Transformation
export function transformQueryParams() {
  // Raw query parameters from HTTP request
  const rawQuery = {
    limit: "10",
    sortBy: "createdAt",
    sortOrder: "desc",
    search: "john",
    cursor: "cursor-123",
  };

  // Transform using plainToClass
  const queryParams = plainToClass(QueryParamsDto, rawQuery);

  return queryParams;
}

// Example 7: Complex Response with Nested Objects
export function createComplexResponse() {
  // Complex user data with nested objects
  const complexUser = {
    id: "user-123",
    email: "john.doe@example.com",
    profile: {
      bio: "Software developer",
      skills: ["JavaScript", "TypeScript", "Node.js"],
      experienceLevel: "intermediate",
    },
    preferences: {
      timezone: "UTC",
      language: "en",
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
    },
  };

  // Create response with complex data
  const singleResponse = SingleEntityResponseDto.create(complexUser);
  const successResponse = SuccessResponseDto.create(singleResponse);

  return successResponse;
}

// Example 8: Response with Metadata
export function createResponseWithMetadata() {
  // Response with additional metadata
  const userData = {
    id: "user-123",
    email: "john.doe@example.com",
    firstName: "John",
    lastName: "Doe",
  };

  const metadata = {
    lastModified: new Date(),
    version: "1.0",
    source: "database",
  };

  const singleResponse = SingleEntityResponseDto.create({ ...userData, metadata });
  const successResponse = SuccessResponseDto.create(singleResponse);

  return successResponse;
}

// Example 9: Bulk Operation Response
export function createBulkOperationResponse() {
  // Bulk operation results
  const bulkResults = {
    total: 100,
    successful: 95,
    failed: 5,
    errors: [
      { id: "user-1", error: "Email already exists" },
      { id: "user-2", error: "Invalid data format" },
    ],
  };

  const singleResponse = SingleEntityResponseDto.create(bulkResults);
  const successResponse = SuccessResponseDto.create(singleResponse);

  return successResponse;
}

// Example 10: Conditional Response Based on Result
export function createConditionalResponse(success: boolean, data?: any, error?: string) {
  if (success && data) {
    const singleResponse = SingleEntityResponseDto.create(data);
    return SuccessResponseDto.create(singleResponse);
  } else {
    return ErrorResponseDto.create(error || "Operation failed", ["Unknown error occurred"]);
  }
}

// Example 11: Using getters for pagination data
export function demonstratePaginationGetters() {
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

  // Using getters instead of duplicated fields
  console.log("Total:", paginatedResponse.total); // Uses getter
  console.log("Has Next:", paginatedResponse.hasNext); // Uses getter
  console.log("Pagination Total:", paginatedResponse.pagination.total); // Direct access

  return paginatedResponse;
}

// Example 12: Simplified List Response
export function demonstrateSimplifiedListResponse() {
  const users = [
    { id: "1", email: "user1@example.com" },
    { id: "2", email: "user2@example.com" },
    { id: "3", email: "user3@example.com" },
  ];

  // Simplified - no need to pass total separately
  const listResponse = ListResponseDto.create(users);

  // Total is automatically calculated from items.length
  console.log("Total:", listResponse.total); // 3

  return listResponse;
}

// Example 13: Direct Success Response (no wrapper needed)
export function createDirectSuccessResponse() {
  const userData = {
    id: "user-123",
    email: "john.doe@example.com",
    name: "John Doe",
  };

  // Direct success response without wrapper
  return SuccessResponseDto.create(userData);
}

// Example 14: Cursor-based Pagination with Parameter Object
export function demonstrateCursorPagination() {
  const users = [
    { id: "1", email: "user1@example.com" },
    { id: "2", email: "user2@example.com" },
  ];

  // Cursor-based pagination using parameter object
  const paginationParams: PaginatedResponseParams<any> = {
    items: users,
    limit: 10,
    total: 100,
    hasNext: true,
    nextCursor: "eyJpZCI6IjEwIn0=", // base64 encoded cursor
    previousCursor: "eyJpZCI6IjEiIn0=", // previous cursor
  };

  const paginatedResponse = PaginatedResponseDto.create(paginationParams);

  return paginatedResponse;
}

// Example 15: Partial Pagination Parameters
export function demonstratePartialPaginationParams() {
  const users = [
    { id: "1", email: "user1@example.com" },
    { id: "2", email: "user2@example.com" },
  ];

  // Using partial parameters (cursors are optional)
  const paginationParams: PaginatedResponseParams<any> = {
    items: users,
    limit: 10,
    total: 100,
    hasNext: true,
    // nextCursor and previousCursor are optional
  };

  const paginatedResponse = PaginatedResponseDto.create(paginationParams);

  return paginatedResponse;
}
