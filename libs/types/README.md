# Types Library

Standardized types, DTOs, and utilities for the EdTech Platform backend services.

## Overview

This library provides a comprehensive set of base response DTOs, error handling utilities, and type definitions that ensure consistency across all microservices in the platform.

## Base Response DTOs

### Core Response Classes

#### `SuccessResponseDto<T>`

Simple wrapper for successful responses with only `data` and `timestamp`.

```typescript
// Direct usage
const response = SuccessResponseDto.create(userData);

// With transformation
const response = plainToClass(SuccessResponseDto, {
  data: userData,
  timestamp: new Date(),
});
```

#### `ErrorResponseDto`

Standardized error response with `message`, `errors`, and `timestamp`.

```typescript
const errorResponse = ErrorResponseDto.create("Validation failed", ["Email is required", "Email must be valid"]);
```

#### `SingleEntityResponseDto<T>`

For single entity operations with `data` and `timestamp`.

```typescript
const singleResponse = SingleEntityResponseDto.create(userData);
const successResponse = SuccessResponseDto.create(singleResponse);
```

#### `ListResponseDto<T>`

For non-paginated list operations with `items`, `total`, and `timestamp`.

```typescript
const listResponse = ListResponseDto.create(users);
// Total is automatically calculated from items.length
```

### Pagination with Parameter Objects

#### `PaginatedResponseDto<T>`

For paginated data with cursor-based pagination. Uses parameter objects for better usability.

```typescript
// Using parameter object (recommended for 3+ parameters)
const paginationParams: PaginatedResponseParams<any> = {
  items: users,
  limit: 10,
  total: 100,
  hasNext: true,
  nextCursor: "next-cursor-123",
  previousCursor: "prev-cursor-456",
};

const paginatedResponse = PaginatedResponseDto.create(paginationParams);

// Using getters for convenience
console.log(paginatedResponse.total); // Uses getter
console.log(paginatedResponse.hasNext); // Uses getter
```

#### `PaginationMetaDto`

Pagination metadata with cursor-based fields.

```typescript
const paginationMeta = PaginationMetaDto.create({
  limit: 10,
  total: 100,
  hasNext: true,
  nextCursor: "next-cursor-123",
  previousCursor: "prev-cursor-456",
});
```

### Parameter Objects

For DTOs with more than 3 parameters, we use parameter objects to improve usability:

#### `PaginationMetaParams`

```typescript
interface PaginationMetaParams {
  limit: number;
  total: number;
  hasNext: boolean;
  nextCursor?: string;
  previousCursor?: string;
}
```

#### `PaginatedResponseParams<T>`

```typescript
interface PaginatedResponseParams<T = any> {
  items: T[];
  limit: number;
  total: number;
  hasNext: boolean;
  nextCursor?: string;
  previousCursor?: string;
}
```

## Query Parameters

#### `QueryParamsDto`

Simplified query parameters for cursor-based pagination.

```typescript
// From HTTP request
const queryParams = QueryParamsDto.fromRequest({
  limit: "10",
  sortBy: "createdAt",
  sortOrder: "desc",
  search: "john",
  cursor: "cursor-123",
});

// Get limit for database queries
const limit = queryParams.getLimit(); // 10
```

## Error Handling

### `ErrorDetailDto`

Detailed error information with field-specific validation errors.

```typescript
const errorDetails = [new ErrorDetailDto("Email is required", "email", "REQUIRED"), new ErrorDetailDto("Email must be valid", "email", "INVALID_FORMAT", "invalid-email")];
```

## Usage Examples

### HTTP Controller Example

```typescript
@Controller("users")
export class UsersController {
  @Get()
  async getUsers(@Query() query: QueryParamsDto): Promise<SuccessResponseDto<PaginatedResponseDto<User>>> {
    const users = await this.userService.findUsers(query);

    const paginationParams: PaginatedResponseParams<User> = {
      items: users.data,
      limit: query.limit || 10,
      total: users.total,
      hasNext: users.hasNext,
      nextCursor: users.nextCursor,
      previousCursor: users.previousCursor,
    };

    const paginatedResponse = PaginatedResponseDto.create(paginationParams);
    return SuccessResponseDto.create(paginatedResponse);
  }

  @Get(":id")
  async getUser(@Param("id") id: string): Promise<SuccessResponseDto<SingleEntityResponseDto<User>>> {
    const user = await this.userService.findById(id);
    const singleResponse = SingleEntityResponseDto.create(user);
    return SuccessResponseDto.create(singleResponse);
  }

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto): Promise<SuccessResponseDto<SingleEntityResponseDto<User>>> {
    const user = await this.userService.create(createUserDto);
    const singleResponse = SingleEntityResponseDto.create(user);
    return SuccessResponseDto.create(singleResponse);
  }
}
```

### Use Case Example

```typescript
export class CreateUserUseCase {
  async execute(dto: CreateUserDto): Promise<SingleEntityResponseDto<User>> {
    try {
      const user = await this.userRepository.create(dto);
      return SingleEntityResponseDto.create(user);
    } catch (error) {
      throw new ErrorResponseDto.create("Failed to create user", [error.message]);
    }
  }
}
```

### Repository Example

```typescript
export class UserRepository {
  async findWithPagination(params: QueryParamsDto): Promise<{
    data: User[];
    total: number;
    hasNext: boolean;
    nextCursor?: string;
    previousCursor?: string;
  }> {
    // Database query implementation
    return {
      data: users,
      total: totalCount,
      hasNext: hasMore,
      nextCursor: nextCursor,
      previousCursor: previousCursor,
    };
  }
}
```

## Key Benefits

1. **Consistency**: All services use the same response format
2. **Type Safety**: Full TypeScript support with generics
3. **Validation**: Built-in class-validator decorators
4. **Transformation**: Automatic class-transformer support
5. **Usability**: Parameter objects for complex DTOs
6. **Flexibility**: Support for both paginated and non-paginated responses
7. **Error Handling**: Standardized error response format
8. **Performance**: Efficient transformation with getters

## Best Practices

1. **Use Parameter Objects**: For DTOs with more than 3 parameters, use parameter objects
2. **Leverage Getters**: Use the provided getters for pagination data instead of duplicating fields
3. **Transform Early**: Use `plainToClass` for external data transformation
4. **Validate Inputs**: Use the built-in validation decorators
5. **Handle Errors**: Always use `ErrorResponseDto` for error responses
6. **Return DTOs Explicitly**: Controllers should always return the correct DTOs explicitly

## Migration Guide

### From Old Response Format

```typescript
// Old way (multiple parameters)
const response = PaginatedResponseDto.create(users, 10, 100, true, "next-cursor", "prev-cursor");

// New way (parameter object)
const paginationParams: PaginatedResponseParams<User> = {
  items: users,
  limit: 10,
  total: 100,
  hasNext: true,
  nextCursor: "next-cursor",
  previousCursor: "prev-cursor",
};
const response = PaginatedResponseDto.create(paginationParams);
```

### Benefits of Parameter Objects

1. **Readability**: Parameter names are explicit
2. **Maintainability**: Easy to add/remove parameters
3. **IDE Support**: Better autocomplete and type checking
4. **Optional Parameters**: Clear which parameters are optional
5. **Documentation**: Self-documenting code
