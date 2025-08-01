# Authentication & Authorization Guide

## Overview

This comprehensive guide covers all authentication and authorization mechanisms in the EdTech platform, providing a unified reference for developers working across all layers of the system.

## Architecture Layers

The platform implements a three-layer authentication architecture:

1. **User Authentication** - End user authentication via AWS Cognito
2. **Service-to-Service Authentication** - Microservice communication security
3. **GraphQL Gateway Authentication** - AppSync request validation

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

## 1. User Authentication (Cognito User Pool)

### Purpose
Authenticate end users (students, tutors, admins) accessing the platform through client applications.

### Components
- `CognitoAuthService` - User authentication operations
- `CognitoJwtService` - JWT token validation
- `CognitoUserPoolService` - User management operations

### Authentication Flow

1. User provides credentials (username/password or social login)
2. Cognito validates credentials and issues tokens
3. Client receives access token, refresh token, and ID token
4. Client includes access token in subsequent requests
5. Services validate tokens using shared auth library

### Usage Examples

```typescript
// User login
const authResponse = await authService.authenticateUser(username, password);

// Token validation
const authContext = await authService.validateToken(token);

// Role-based access control
const hasRole = await authService.hasRole(userId, "admin");
```

### Supported Authentication Methods
- Username/password authentication
- Social login (Google, Facebook, Apple)
- Multi-factor authentication (MFA)
- Password reset and recovery

## 2. Service-to-Service Authentication

### Purpose
Secure communication between microservices within the platform's private network.

### Architecture Principles

#### Internal-Only APIs
- Microservices expose HTTP APIs only within the private VPC
- No public internet access to microservice APIs
- External access goes through GraphQL Federation (AppSync)

#### Service Identity
- Each service has a unique identity (`SERVICE_NAME`)
- Services authenticate using their identity when calling other services
- Authentication is mutual - both caller and target validate each other

#### Multiple Authentication Methods
- **Primary**: AWS Cognito JWT tokens with service claims
- **Fallback**: AWS IAM role-based authentication with STS
- **Development**: Mock tokens for local development

### Authentication Methods

#### Method 1: Cognito JWT Tokens (Primary)

**How it works:**
- Services authenticate with Cognito using client credentials
- Cognito issues JWT tokens with service-specific claims
- Tokens include service identity and permissions

**Configuration:**
```bash
SERVICE_AUTH_METHOD=cognito
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=your-client-id
COGNITO_CLIENT_SECRET=your-client-secret
```

**Token Structure:**
```json
{
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxx",
  "sub": "service-user-service",
  "aud": "service-learning-service",
  "token_use": "access",
  "scope": "service:internal",
  "client_id": "your-client-id",
  "custom:service_name": "user-service",
  "custom:service_role": "internal-service",
  "exp": 1640995200,
  "iat": 1640991600
}
```

#### Method 2: IAM Role-Based Authentication (Fallback)

**How it works:**
- Services assume IAM roles for cross-service communication
- AWS STS provides temporary credentials
- Requests are signed using AWS Signature V4

**Configuration:**
```bash
SERVICE_AUTH_METHOD=iam
SERVICE_ROLE_ARN=arn:aws:iam::123456789012:role/user-service-role
SERVICE_SESSION_DURATION=3600
```

#### Method 3: Development Authentication (Local)

**How it works:**
- Mock JWT tokens generated for local development
- No AWS services required
- Automatic bypass in development environment

**Configuration:**
```bash
NODE_ENV=development
LOCALSTACK_ENABLED=true
SERVICE_NAME=user-service
```

### Implementation

#### Shared Library Usage
All microservices use the shared `@edtech/service-auth` library:

```typescript
// Import from shared library
import { ServiceAuthModule, ServiceAuthGuard, ServiceAuthService } from "@edtech/service-auth";

// Use in module
@Module({
  imports: [ServiceAuthModule],
  // ...
})
export class AppModule {}

// Use in controller
@Controller("internal/users")
@UseGuards(ServiceAuthGuard)
export class UsersController {
  // Protected endpoints
}
```

#### Making Authenticated Requests

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly serviceAuthService: ServiceAuthService,
    private readonly httpService: HttpService
  ) {}

  async callLearningService(userId: string) {
    const token = await this.serviceAuthService.generateServiceToken(
      "user-service", 
      "learning-service"
    );

    const response = await this.httpService.post(
      "http://learning-service:3002/internal/courses/user-enrollments",
      { userId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Service-Name": "user-service",
        },
      }
    ).toPromise();

    return response.data;
  }
}
```

## 3. GraphQL Gateway Authentication (AppSync)

### Purpose
Authenticate GraphQL requests through AWS AppSync, providing a unified API gateway.

### Components
- `AppSyncAuthGuard` - GraphQL request validation
- `AppSyncAuthInterceptor` - Context injection
- `AppSyncRoleGuard` - Role-based authorization

### Authentication Flow

1. Client sends GraphQL request with Cognito token
2. AppSync validates token and provides identity context
3. Lambda resolver receives validated identity
4. Resolver uses shared auth library for additional validation

### Usage Examples

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

  @Mutation()
  @UseGuards(new AppSyncRoleGuard("admin"))
  async createUser(@Args("input") input: CreateUserInput) {
    // Only admins can create users
  }
}
```

## Shared Authentication Library

### Library Structure

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

### Integration in Microservices

```typescript
// In each microservice
@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    AuthModule, // Shared auth library
  ],
})
export class AppModule {}
```

## Security Features

### Token Validation
- JWT signature verification
- Token expiration checks
- Issuer validation
- Audience validation

### Role-Based Access Control
```typescript
// Check user roles
const hasRole = await authService.hasRole(userId, "admin");

// Get user roles
const roles = await authService.getUserRoles(userId);
```

### Service Identity Validation
- Service name validation
- Service role validation
- Cross-service permission checks

### Rate Limiting
- Request rate limiting
- Authentication attempt limiting
- IP-based blocking

## Local Development

### Mock Authentication
```bash
# Enable mock authentication
MOCK_AUTH=true
BYPASS_AUTH=true

# Use LocalStack for AWS services
AWS_ENDPOINT=http://localhost:4566
LOCALSTACK_ENABLED=true
```

### Mock Token Generation
In development, the system generates mock JWT tokens:

```typescript
private generateMockToken(serviceName: string, targetService?: string): string {
  const payload = {
    iss: 'https://cognito-idp.localhost.localstack.cloud:4566/us-east-1_mock',
    sub: `service-${serviceName}`,
    aud: targetService ? `service-${targetService}` : 'service-internal',
    token_use: 'access',
    scope: 'service:internal',
    'custom:service_name': serviceName,
    'custom:service_role': 'internal-service',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  };

  // Simple base64 encoding for development
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = btoa(JSON.stringify(payload));
  const signature = btoa('mock-signature-for-development');

  return `${header}.${payloadEncoded}.${signature}`;
}
```

## Production Deployment

### Cognito Setup

1. **Create User Pool for Users**
   ```bash
   aws cognito-idp create-user-pool \
     --pool-name "edtech-user-pool" \
     --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}" \
     --auto-verified-attributes email
   ```

2. **Create Service Pool for Inter-Service Communication**
   ```bash
   aws cognito-idp create-user-pool \
     --pool-name "service-authentication-pool" \
     --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}"
   ```

3. **Create Service Client**
   ```bash
   aws cognito-idp create-user-pool-client \
     --user-pool-id us-east-1_xxxxx \
     --client-name "service-client" \
     --generate-secret \
     --explicit-auth-flows ADMIN_NO_SRP_AUTH
   ```

### IAM Role Setup

1. **Create Service Role**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Service": "ecs-tasks.amazonaws.com"
         },
         "Action": "sts:AssumeRole"
       }
     ]
   }
   ```

2. **Attach Minimal Permissions**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["cognito-idp:AdminInitiateAuth", "sts:AssumeRole"],
         "Resource": "*"
       }
     ]
   }
   ```

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

## Monitoring & Troubleshooting

### Authentication Events
```typescript
// Log authentication events
this.logger.log("User authenticated", {
  userId: authContext.userId,
  email: authContext.email,
  timestamp: new Date().toISOString(),
});
```

### Common Issues

**Token Validation Failures:**
- Check Cognito configuration
- Verify client credentials
- Validate token expiration

**IAM Role Assumption Failures:**
- Verify role ARN
- Check trust relationships
- Validate permissions

**LocalStack Issues:**
- Ensure LocalStack is running
- Check endpoint configuration
- Verify mock credentials

### Debug Mode
Enable debug logging:
```bash
LOG_LEVEL=debug
```

## Best Practices

### Security
- **Token Storage**: Never store tokens in code or config files
- **Network Security**: Use private VPC for service communication
- **Audit Logging**: Log all authentication attempts
- **Regular Rotation**: Rotate credentials and tokens regularly
- **Least Privilege**: Grant minimal required permissions

### Performance
- **Token Caching**: Cache tokens for performance
- **Async Operations**: All auth operations are non-blocking
- **Development Bypass**: No overhead in development mode
- **Connection Pooling**: Reuse HTTP connections

### Reliability
- **Retry Logic**: Implement retry for failed auth attempts
- **Circuit Breaker**: Handle auth service failures gracefully
- **Fallback Methods**: Support multiple authentication strategies
- **Health Checks**: Monitor auth service health

## Migration Guide

### From Basic Authentication
1. **Replace basic auth** with service authentication
2. **Update environment variables**
3. **Configure Cognito/IAM** as needed
4. **Test authentication flow**

### From Local Authentication
1. **Remove local auth services**:
   ```bash
   rm -rf src/infrastructure/cognito-auth
   ```

2. **Import shared auth library**:
   ```typescript
   import { AuthModule } from "@edtech/auth";
   ```

3. **Update service dependencies**:
   ```typescript
   constructor(private readonly authService: AuthService) {}
   ```

This comprehensive authentication guide provides a unified reference for all authentication and authorization mechanisms in the EdTech platform, ensuring consistent security across all layers of the system.