# Step 4 (Day 17): Internal HTTP Controllers

**Objective**: Expose the `user-service`'s functionality for secure service-to-service communication via internal RESTful APIs, leveraging the enhanced DTOs and response structures.

## 1. Internal Users Controller

-   **Goal**: Create endpoints for managing users, intended to be called by other backend services (like the GraphQL Lambda resolvers) or an admin panel.
-   **Path**: `/internal/users`

```typescript
// apps/user-service/src/presentation/http/users.controller.ts
import { Controller, Post, Body, Get, Param, UseInterceptors } from '@nestjs/common';
import { CreateUserUseCase } from 'src/application/use-cases/create-user/create-user.usecase';
import { CreateUserRequestDto } from 'src/application/dto/create-user.request.dto';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';
import { SingleEntityResponseDto } from 'src/application/dto/single-entity-response.dto';
import { UserDto } from 'src/application/dto/user.dto';

@Controller('internal/users')
@UseInterceptors(ResponseTransformInterceptor) // Standardize all responses
export class UsersController {
    constructor(private readonly createUserUseCase: CreateUserUseCase) {}

    @Post()
    async createUser(@Body() body: CreateUserRequestDto): Promise<SingleEntityResponseDto<UserDto>> {
        const user = await this.createUserUseCase.execute(body);
        // The interceptor will wrap this in the BaseApiResponse
        return new SingleEntityResponseDto(user);
    }

    @Get(':id')
    async getUserById(@Param('id') id: string): Promise<SingleEntityResponseDto<UserDto>> {
        // ... call GetUserByIdUseCase
    }
}
```

## 2. API Validation

-   **Goal**: Ensure all incoming requests are well-formed before they hit the application layer.
-   **Implementation**: NestJS's built-in `ValidationPipe` combined with `class-validator` decorators on the DTOs.

```typescript
// apps/user-service/src/application/dto/create-user.request.dto.ts
import { IsEmail, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserProfileDto } from './user-profile.dto';

export class CreateUserRequestDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @ValidateNested()
    @Type(() => UserProfileDto)
    profile: UserProfileDto;
}
```
The `ValidationPipe` will be configured globally in `main.ts` to automatically validate all incoming request bodies against their DTO definitions.

## 3. API Documentation

-   **Goal**: Automatically generate API documentation for other developers.
-   **Implementation**: Use the `@nestjs/swagger` package.
    1.  Add decorators to the controller methods (`@ApiOperation`, `@ApiResponse`).
    2.  Initialize Swagger in `main.ts`.
    3.  The documentation will be available at a specific endpoint (e.g., `/internal/api-docs`). This provides an interactive UI for exploring and testing the internal API.
