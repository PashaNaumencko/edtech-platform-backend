# Shared Authentication Architecture

## Overview

This document describes the shared authentication architecture implemented across the EdTech platform, providing consistent authentication and authorization across all layers:

- **User Authentication** (Cognito User Pool)
- **Service-to-Service Authentication** (Cognito/IAM)
- **AppSync GraphQL Authentication** (Cognito Identity)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    EdTech Platform                             │
├─────────────────────────────────────────────────────────────────┤
│  Frontend/Client Applications                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Web App   │  │  Mobile App │  │  Admin App  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  AppSync GraphQL Gateway                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Cognito User Pool Authentication                          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │ │
│  │  │ User Auth   │  │ Token Valid │  │ Role Check  │        │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Microservices Layer                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │User Service │  │Course Service│  │Tutor Service│            │
│  │             │  │             │  │             │            │
│  │┌───────────┐│  │┌───────────┐│  │┌───────────┐│            │
│  ││Shared Auth││  ││Shared Auth││  ││Shared Auth││            │
│  ││  Library  ││  ││  Library  ││  ││  Library  ││            │
│  │└───────────┘│  │└───────────┘│  │└───────────┘│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  AWS Cognito                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ User Pool   │  │ Identity    │  │ Service     │            │
│  │ (Users)     │  │ Pool        │  │ Pool        │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Layers

### 1. User Authentication Layer

**Purpose**: Authenticate end users (students, tutors, admins)

**Components**:

- `CognitoAuthService` - User authentication operations
- `CognitoJwtService` - JWT token validation
- `CognitoUserPoolService` - User management operations

**Flow**:

1. User provides credentials (username/password)
2. Cognito validates credentials
3. Returns access token, refresh token, and ID token
4. Client stores tokens for subsequent requests

**Usage**:

```typescript
// User login
const authResponse = await authService.authenticateUser(username, password);

// Token validation
const authContext = await authService.validateToken(token);
```

### 2. Service-to-Service Authentication Layer

**Purpose**: Authenticate communication between microservices

**Components**:

- `ServiceAuthService` - Service token generation
- `ServiceAuthGuard` - Service request validation
- `ServiceAuthInterceptor` - Automatic token injection

**Flow**:

1. Service A needs to call Service B
2. Service A generates service token using Cognito
3. Service A includes token in request to Service B
4. Service B validates token using ServiceAuthGuard

**Usage**:

```typescript
// Generate service token
const token = await serviceAuthService.generateServiceToken("user-service");

// Validate service request
@UseGuards(ServiceAuthGuard)
export class UserController {
  @Get(":id")
  async getUser(@Param("id") id: string) {
    // Request is authenticated
  }
}
```

### 3. AppSync GraphQL Authentication Layer

**Purpose**: Authenticate GraphQL requests through AppSync

**Components**:

- `AppSyncAuthGuard` - GraphQL request validation
- `AppSyncAuthInterceptor` - Context injection
- `AppSyncRoleGuard` - Role-based authorization

**Flow**:

1. Client sends GraphQL request with Cognito token
2. AppSync validates token and provides identity context
3. Lambda resolver receives validated identity
4. Resolver uses shared auth library for additional validation

**Usage**:

```typescript
// GraphQL resolver with authentication
@Resolver()
@UseGuards(AppSyncAuthGuard)
export class UserResolver {
  @Query()
  async me(@Req() request: any) {
    const authContext = request.authContext;
    return this.userService.getUser(authContext.userId);
  }
}
```

## Shared Library Structure

### Core Services

```
libs/auth/src/
├── auth.service.ts              # Main authentication coordinator
├── cognito-auth.service.ts      # User authentication
├── cognito-jwt.service.ts       # JWT token operations
├── cognito-user-pool.service.ts # User management
├── guards/
│   ├── appsync-auth.guard.ts    # AppSync authentication
│   └── appsync-role.guard.ts    # Role-based authorization
├── interceptors/
│   ├── appsync-auth.interceptor.ts # Context injection
│   └── appsync-context.interceptor.ts # AppSync context
├── config/
│   └── auth.config.ts           # Shared configuration
├── types/
│   └── auth.types.ts            # Shared types
└── auth.module.ts               # Module exports
```

### Key Interfaces

```typescript
// Authentication context
interface AuthContext {
  userId: string;
  email?: string;
  username?: string;
  roles?: string[];
  customAttributes?: Record<string, string>;
  isAuthenticated: boolean;
}

// AppSync context
interface AppSyncContext {
  requestId: string;
  apiId: string;
  fieldName?: string;
  operationName?: string;
  variables?: Record<string, any>;
  identity?: any;
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

# Service Authentication
SERVICE_AUTH_METHOD=cognito
SERVICE_NAME=user-service
SERVICE_ROLE_ARN=arn:aws:iam::123456789012:role/service-role

# Security
JWT_TOKEN_EXPIRY=3600
RATE_LIMIT_ENABLED=true
```

### Module Configuration

```typescript
// In each microservice
@Module({
  imports: [ConfigModule.forFeature(authConfig), AuthModule],
})
export class AppModule {}
```

## Integration Patterns

### 1. Microservice Integration

```typescript
// user-service/src/app.module.ts
@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    AuthModule,
    InfrastructureModule, // Uses shared auth
  ],
})
export class AppModule {}

// user-service/src/infrastructure/infrastructure.module.ts
@Module({
  imports: [
    AuthModule, // Shared auth library
    PostgresModule,
    RedisModule,
    S3Module,
  ],
  exports: [AuthModule, PostgresModule, RedisModule, S3Module],
})
export class InfrastructureModule {}
```

### 2. GraphQL Resolver Integration

```typescript
// In any GraphQL resolver
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
  async createUser(@Args("input") input: CreateUserInput) {
    // Only admins can create users
  }
}
```

### 3. HTTP Controller Integration

```typescript
// In any HTTP controller
@Controller("users")
@UseGuards(ServiceAuthGuard)
export class UserController {
  constructor(private readonly authService: AuthService) {}

  @Get(":id")
  async getUser(@Param("id") id: string) {
    return this.userService.getUser(id);
  }
}
```

## Security Features

### 1. Token Validation

- JWT signature verification
- Token expiration checks
- Issuer validation
- Audience validation

### 2. Role-Based Access Control

```typescript
// Check user roles
const hasRole = await authService.hasRole(userId, "admin");

// Get user roles
const roles = await authService.getUserRoles(userId);
```

### 3. Service Identity Validation

- Service name validation
- Service role validation
- Cross-service permission checks

### 4. Rate Limiting

- Request rate limiting
- Authentication attempt limiting
- IP-based blocking

## Error Handling

### Custom Error Types

```typescript
// Authentication errors
throw new AuthenticationError("Invalid credentials", "INVALID_CREDENTIALS");

// Authorization errors
throw new AuthorizationError("Insufficient permissions", "INSUFFICIENT_PERMISSIONS");
```

### Error Responses

```typescript
// Standardized error format
{
  error: {
    code: 'AUTHENTICATION_FAILED',
    message: 'Invalid credentials',
    timestamp: '2024-01-01T00:00:00Z',
    details: {}
  }
}
```

## Development and Testing

### Local Development

```bash
# Enable mock authentication
MOCK_AUTH=true
BYPASS_AUTH=true

# Use LocalStack for AWS services
AWS_ENDPOINT=http://localhost:4566
LOCALSTACK_ENABLED=true
```

### Testing

```typescript
// Mock authentication for tests
const mockAuthService = {
  validateToken: jest.fn().mockResolvedValue({
    userId: "test-user",
    email: "test@example.com",
    isAuthenticated: true,
  }),
};
```

## Migration Guide

### From Local Authentication

1. **Remove local auth services**:

   ```bash
   rm -rf src/infrastructure/cognito-auth
   ```

2. **Import shared auth library**:

   ```typescript
   import { AuthModule } from "@libs/auth";
   ```

3. **Update service dependencies**:

   ```typescript
   constructor(private readonly authService: AuthService) {}
   ```

4. **Update configuration**:
   ```typescript
   // Use shared auth config instead of local
   ```

### Benefits of Shared Architecture

1. **Consistency**: Same authentication logic across all services
2. **Maintainability**: Single source of truth for auth logic
3. **Security**: Centralized security updates and patches
4. **Testing**: Shared test utilities and mocks
5. **Documentation**: Single comprehensive documentation
6. **Performance**: Optimized shared implementations

## Monitoring and Logging

### Authentication Events

```typescript
// Log authentication events
this.logger.log("User authenticated", {
  userId: authContext.userId,
  email: authContext.email,
  timestamp: new Date().toISOString(),
});
```

### Metrics

- Authentication success/failure rates
- Token validation performance
- Service-to-service auth latency
- Role check frequency

## Future Enhancements

1. **Multi-Factor Authentication (MFA)**
2. **OAuth Integration** (Google, Facebook, Apple)
3. **Single Sign-On (SSO)**
4. **Advanced Role Management**
5. **Audit Logging**
6. **Real-time Security Monitoring**
