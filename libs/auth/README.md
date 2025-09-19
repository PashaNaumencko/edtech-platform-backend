# Shared Authentication Library

This library provides shared authentication functionality across the entire EdTech platform, supporting:

- **User Authentication** (AWS Cognito)
- **Service-to-Service Authentication** (AWS IAM)
- **GraphQL Federation Authentication** (JWT tokens)

## Architecture

### Authentication Layers

1. **User Authentication Layer**

   - Handles user login/logout
   - Manages user sessions
   - Validates user tokens

2. **Service-to-Service Authentication Layer**

   - Authenticates microservice communication
   - Uses Cognito service tokens or IAM roles
   - Validates service identity

3. **AppSync GraphQL Authentication Layer**
   - Handles GraphQL request authentication
   - Validates AppSync identity context
   - Provides user context to resolvers

## Usage

### 1. User Service Integration

```typescript
import { AuthModule, AuthService } from "@libs/auth";

@Module({
  imports: [AuthModule],
})
export class UserModule {}

@Injectable()
export class UserService {
  constructor(private readonly authService: AuthService) {}

  async createUser(userData: CreateUserDto) {
    // Create user in Cognito
    const success = await this.authService.createUser(userData.username, userData.email, userData.password, { role: "student" });

    if (success) {
      // Create user in database
      return this.userRepository.create(userData);
    }
  }

  async authenticateUser(username: string, password: string) {
    return this.authService.authenticateUser(username, password);
  }
}
```

### 2. AppSync GraphQL Integration

```typescript
import { AppSyncAuthGuard, AppSyncRoleGuard } from "@libs/auth";

@Resolver()
@UseGuards(AppSyncAuthGuard)
export class UserResolver {
  constructor(private readonly authService: AuthService) {}

  @Query()
  async me(@Req() request: any) {
    const authContext = request.authContext;
    return this.userService.getUser(authContext.userId);
  }

  @Mutation()
  @UseGuards(new AppSyncRoleGuard("admin"))
  async createUser(@Req() request: any, @Args("input") input: CreateUserInput) {
    const authContext = request.authContext;
    return this.userService.createUser(input, authContext.userId);
  }
}
```

### 3. Service-to-Service Authentication

```typescript
import { ServiceAuthGuard } from "@libs/service-auth";

@Controller("users")
@UseGuards(ServiceAuthGuard)
export class UserController {
  @Get(":id")
  async getUser(@Param("id") id: string) {
    return this.userService.getUser(id);
  }
}
```

## Configuration

### Environment Variables

```bash
# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# AppSync Configuration
APPSYNC_API_ID=xxxxxxxxxx
APPSYNC_API_URL=https://xxxxxxxxxx.appsync-api.us-east-1.amazonaws.com/graphql
APPSYNC_API_KEY=da2-xxxxxxxxxxxxxxxxxxxxxxxxxx

# AWS Configuration
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566  # For LocalStack

# Security Configuration
JWT_TOKEN_EXPIRY=3600
JWT_REFRESH_TOKEN_EXPIRY=86400
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
```

### Module Configuration

```typescript
import { authConfig } from "@libs/auth";

@Module({
  imports: [ConfigModule.forFeature(authConfig), AuthModule],
})
export class AppModule {}
```

## Services

### AuthService

Main authentication service that coordinates all auth operations:

```typescript
// User authentication
const authResponse = await authService.authenticateUser(username, password);

// Token validation
const authContext = await authService.validateToken(token);

// AppSync context validation
const authContext = await authService.validateAppSyncContext(identity);

// User management
await authService.createUser(username, email, password, attributes);
await authService.enableUser(username);
await authService.disableUser(username);
```

### CognitoAuthService

Handles direct Cognito operations:

```typescript
// Authenticate user
const response = await cognitoAuthService.authenticate({ username, password });

// Get user details
const user = await cognitoAuthService.getUser(userId);

// Validate user
const isValid = await cognitoAuthService.validateUser(userId);
```

### CognitoJwtService

Handles JWT token operations:

```typescript
// Verify token
const payload = await cognitoJwtService.verifyToken(token);

// Check expiration
const isExpired = await cognitoJwtService.isTokenExpired(token);

// Extract user ID
const userId = await cognitoJwtService.getUserId(token);
```

### CognitoUserPoolService

Handles user pool management:

```typescript
// Create user
await cognitoUserPoolService.createUser({
  username: "john.doe",
  email: "john@example.com",
  password: "password123",
  attributes: { role: "student" },
});

// Manage user status
await cognitoUserPoolService.enableUser(username);
await cognitoUserPoolService.disableUser(username);
```

## Guards

### AppSyncAuthGuard

Validates AppSync GraphQL requests:

```typescript
@UseGuards(AppSyncAuthGuard)
export class UserResolver {
  @Query()
  async me(@Req() request: any) {
    const authContext = request.authContext;
    // authContext contains validated user information
  }
}
```

### AppSyncRoleGuard

Validates user roles for AppSync:

```typescript
@UseGuards(new AppSyncRoleGuard("admin"))
export class AdminResolver {
  @Mutation()
  async createUser(@Args("input") input: CreateUserInput) {
    // Only users with 'admin' role can access this
  }
}
```

## Interceptors

### AppSyncAuthInterceptor

Automatically adds authentication context to requests:

```typescript
@UseInterceptors(AppSyncAuthInterceptor)
export class UserResolver {
  @Query()
  async me(@Req() request: any) {
    // request.authContext is automatically populated
  }
}
```

## Error Handling

The library provides custom error types:

```typescript
import { AuthenticationError, AuthorizationError } from "@libs/auth";

// Authentication errors
throw new AuthenticationError("Invalid credentials", "INVALID_CREDENTIALS");

// Authorization errors
throw new AuthorizationError("Insufficient permissions", "INSUFFICIENT_PERMISSIONS");
```

## Development

### Local Development

For local development, you can use mock authentication:

```bash
MOCK_AUTH=true
BYPASS_AUTH=true
```

### Testing

```typescript
import { AuthService } from "@libs/auth";

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(async () => {
    // Setup test module
  });

  it("should authenticate user", async () => {
    const result = await authService.authenticateUser("test", "password");
    expect(result).toBeDefined();
  });
});
```

## Security Best Practices

1. **Token Expiration**: Always set reasonable token expiration times
2. **Role-Based Access**: Use roles and permissions for authorization
3. **Input Validation**: Validate all authentication inputs
4. **Error Handling**: Don't expose sensitive information in error messages
5. **Logging**: Log authentication events for monitoring
6. **Rate Limiting**: Implement rate limiting for authentication endpoints

## Migration Guide

### From Local Cognito Services

If you're migrating from local Cognito services in individual microservices:

1. Remove local Cognito services
2. Import the shared AuthModule
3. Update service dependencies
4. Update configuration to use shared auth config
5. Test authentication flows

### Example Migration

```typescript
// Before (local service)
import { CognitoAuthService } from "./infrastructure/cognito-auth/services/cognito-auth.service";

// After (shared service)
import { AuthService } from "@libs/auth";
```
