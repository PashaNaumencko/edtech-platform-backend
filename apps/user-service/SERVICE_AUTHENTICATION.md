# Service Authentication Implementation

## Overview

This document describes the production-ready service authentication implementation for the User Service, supporting both local development and cloud deployment with minimal overhead.

## Architecture

### Authentication Methods

1. **Cognito JWT Tokens** (Primary)

   - Service-to-service JWT tokens via AWS Cognito
   - Custom claims for service identity
   - Automatic token refresh

2. **IAM Role-Based Authentication** (Fallback)

   - AWS IAM role assumption
   - STS temporary credentials
   - AWS Signature V4 signing

3. **Development Bypass** (Local)
   - Mock tokens for local development
   - LocalStack support
   - Environment-based configuration

## Components

### 1. ServiceAuthGuard

**Location**: `src/presentation/http/guards/service-auth.guard.ts`

Validates incoming service requests using multiple strategies:

```typescript
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  // Validates Cognito JWT tokens
  private async validateCognitoToken(token: string): Promise<boolean>;

  // Validates IAM role authentication
  private async validateIamRole(request: Request): Promise<boolean>;

  // Development environment bypass
  private isDevelopmentEnvironment(): boolean;
}
```

### 2. ServiceAuthService

**Location**: `src/infrastructure/auth/service-auth.service.ts`

Handles token generation and credential management:

```typescript
@Injectable()
export class ServiceAuthService {
  // Generate service authentication tokens
  async generateServiceToken(serviceName: string, targetService?: string): Promise<string>;

  // Assume IAM roles for cross-service communication
  async assumeServiceRole(roleArn: string, sessionName: string): Promise<Credentials>;

  // Create AWS signed requests
  createSignedRequest(credentials: Credentials, method: string, url: string): Headers;
}
```

### 3. ServiceAuthInterceptor

**Location**: `src/presentation/http/interceptors/service-auth.interceptor.ts`

Automatically adds authentication headers to outgoing requests:

```typescript
@Injectable()
export class ServiceAuthInterceptor implements NestInterceptor {
  // Add service auth headers to responses
  async addServiceAuthHeaders(request: any, targetService?: string): Promise<Headers>;

  // Create authenticated requests
  async createAuthenticatedRequest(method: string, url: string, targetService: string): Promise<RequestConfig>;
}
```

## Configuration

### Environment Variables

```bash
# Service Identity
SERVICE_NAME=user-service

# Authentication Method
SERVICE_AUTH_METHOD=cognito  # cognito | iam

# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=your-client-id
COGNITO_CLIENT_SECRET=your-client-secret

# IAM Configuration
SERVICE_ROLE_ARN=arn:aws:iam::123456789012:role/user-service-role
SERVICE_SESSION_DURATION=3600

# AWS Configuration
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566  # For LocalStack
LOCALSTACK_ENABLED=true

# Security Settings
SERVICE_TOKEN_EXPIRY=3600
SERVICE_AUTH_MAX_RETRIES=3
SERVICE_AUTH_RETRY_DELAY=1000
```

### Configuration Service

**Location**: `src/config/service-auth.config.ts`

```typescript
export const serviceAuthConfig = registerAs("serviceAuth", () => ({
  serviceName: process.env.SERVICE_NAME || "user-service",
  authMethod: process.env.SERVICE_AUTH_METHOD || "cognito",
  cognito: {
    /* Cognito settings */
  },
  iam: {
    /* IAM settings */
  },
  aws: {
    /* AWS settings */
  },
  development: {
    /* Development settings */
  },
  security: {
    /* Security settings */
  },
}));
```

## Usage Examples

### 1. Protecting Internal Endpoints

```typescript
@Controller("internal/users")
@UseGuards(ServiceAuthGuard)
export class UsersController {
  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    // Only authenticated services can access this endpoint
  }
}
```

### 2. Making Authenticated Service Calls

```typescript
@Injectable()
export class UserService {
  constructor(private readonly serviceAuthService: ServiceAuthService, private readonly httpService: HttpService) {}

  async callLearningService(userId: string) {
    const token = await this.serviceAuthService.generateServiceToken("user-service", "learning-service");

    const response = await this.httpService
      .post(
        "http://learning-service:3002/internal/courses/user-enrollments",
        { userId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Service-Name": "user-service",
          },
        }
      )
      .toPromise();

    return response.data;
  }
}
```

### 3. Using IAM Role Authentication

```typescript
async callWithIamAuth() {
  const credentials = await this.serviceAuthService.assumeServiceRole(
    'arn:aws:iam::123456789012:role/learning-service-role',
    'user-service-session'
  );

  const headers = this.serviceAuthService.createSignedRequest(
    credentials,
    'POST',
    'http://learning-service:3002/internal/courses',
    {},
    JSON.stringify({ title: 'New Course' })
  );

  const response = await this.httpService.post(
    'http://learning-service:3002/internal/courses',
    { title: 'New Course' },
    { headers }
  ).toPromise();

  return response.data;
}
```

## Local Development

### 1. Mock Token Generation

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

### 2. LocalStack Support

Configure for LocalStack:

```bash
AWS_ENDPOINT=http://localhost:4566
LOCALSTACK_ENABLED=true
COGNITO_USER_POOL_ID=us-east-1_mock
COGNITO_CLIENT_ID=mock-client-id
```

### 3. Development Bypass

The guard automatically bypasses authentication in development:

```typescript
private isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' ||
         process.env.NODE_ENV === 'test' ||
         process.env.LOCALSTACK_ENABLED === 'true';
}
```

## Production Deployment

### 1. Cognito Setup

1. Create a Cognito User Pool for services
2. Create a service client with client credentials
3. Configure custom attributes for service identity
4. Set up service users with appropriate scopes

### 2. IAM Role Setup

1. Create service roles with minimal permissions
2. Configure cross-account role assumption if needed
3. Set up proper trust relationships

### 3. Security Best Practices

1. **Token Expiry**: Set reasonable token expiration times
2. **Scope Limitation**: Use minimal required scopes
3. **Role Permissions**: Follow principle of least privilege
4. **Monitoring**: Log all authentication attempts
5. **Rotation**: Regularly rotate client secrets and keys

## Monitoring and Logging

### Authentication Logs

The system logs all authentication attempts:

```typescript
this.logger.debug("Service authentication successful", {
  clientId: payload.client_id,
  scope: payload.scope,
});

this.logger.warn("Service authentication failed", {
  ip: request.ip,
  userAgent: request.headers["user-agent"],
  path: request.path,
});
```

### Metrics to Monitor

1. **Authentication Success Rate**
2. **Token Generation Latency**
3. **Failed Authentication Attempts**
4. **Service-to-Service Call Volume**
5. **Token Expiry Events**

## Troubleshooting

### Common Issues

1. **Token Validation Failures**

   - Check Cognito configuration
   - Verify client credentials
   - Validate token expiration

2. **IAM Role Assumption Failures**

   - Verify role ARN
   - Check trust relationships
   - Validate permissions

3. **LocalStack Issues**
   - Ensure LocalStack is running
   - Check endpoint configuration
   - Verify mock credentials

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug
```

This will show detailed authentication flow information.

## Migration Guide

### From Public APIs

1. **Add ServiceAuthGuard** to all internal endpoints
2. **Update client services** to use service authentication
3. **Remove public API exposure**
4. **Update documentation** and client SDKs

### From Basic Authentication

1. **Replace basic auth** with service authentication
2. **Update environment variables**
3. **Configure Cognito/IAM** as needed
4. **Test authentication flow**

## Security Considerations

1. **Token Storage**: Never store tokens in code or config files
2. **Network Security**: Use private VPC for service communication
3. **Audit Logging**: Log all service-to-service interactions
4. **Regular Rotation**: Rotate credentials and tokens regularly
5. **Least Privilege**: Grant minimal required permissions

## Performance Impact

- **Minimal Overhead**: Authentication adds ~10-50ms per request
- **Caching**: Tokens are cached for performance
- **Async Operations**: All auth operations are non-blocking
- **Development Bypass**: No overhead in development mode
