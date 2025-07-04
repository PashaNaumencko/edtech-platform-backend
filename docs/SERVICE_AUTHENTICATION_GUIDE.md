# Service Authentication Guide

## Overview

This guide explains how service-to-service authentication works in our microservices architecture. We use a production-ready authentication system that supports both AWS Cognito JWT tokens and IAM role-based authentication, with seamless local development support.

## Architecture Principles

### 1. **Internal-Only APIs**

- Microservices expose HTTP APIs only within the private VPC
- No public internet access to microservice APIs
- External access goes through GraphQL Federation (AppSync)

### 2. **Service Identity**

- Each service has a unique identity (`SERVICE_NAME`)
- Services authenticate using their identity when calling other services
- Authentication is mutual - both caller and target validate each other

### 3. **Multiple Authentication Methods**

- **Primary**: AWS Cognito JWT tokens with service claims
- **Fallback**: AWS IAM role-based authentication with STS
- **Development**: Mock tokens for local development

## How It Works

### Authentication Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Service A     │───▶│   Service B     │───▶│   Service C     │
│   (Caller)      │    │   (Target)      │    │   (Target)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ 1. Generate     │    │ 2. Validate     │    │ 3. Validate     │
│    Token        │    │    Token        │    │    Token        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Step-by-Step Process

1. **Token Generation** (Service A)

   ```typescript
   const token = await serviceAuthService.generateServiceToken("user-service", "learning-service");
   ```

2. **Request with Authentication** (Service A)

   ```typescript
   const response = await httpService.post("http://learning-service:3002/internal/courses", data, {
     headers: {
       Authorization: `Bearer ${token}`,
       "X-Service-Name": "user-service",
     },
   });
   ```

3. **Token Validation** (Service B)
   ```typescript
   @Controller("internal/courses")
   @UseGuards(ServiceAuthGuard) // Validates the token
   export class CoursesController {
     // Only authenticated services can access
   }
   ```

## Authentication Methods

### 1. Cognito JWT Tokens (Primary)

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

### 2. IAM Role-Based Authentication (Fallback)

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

**Request Headers:**

```
Authorization: AWS4-HMAC-SHA256 Credential=AKIA.../20231201/us-east-1/sts/aws4_request
X-Amz-Date: 20231201T120000Z
X-Amz-Security-Token: AQoEXAMPLEH4aoAH0gNCAPyJxz4BlCFFxWNE1OPTgk5TthT...
X-Service-Name: user-service
X-Service-Auth-Method: iam
```

### 3. Development Authentication (Local)

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

## Implementation in Microservices

### 1. Shared Library Usage

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

### 2. Configuration

Each service configures authentication in its environment:

```bash
# Service identity
SERVICE_NAME=user-service

# Authentication method
SERVICE_AUTH_METHOD=cognito

# AWS configuration
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566  # For LocalStack

# Cognito configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=your-client-id
COGNITO_CLIENT_SECRET=your-client-secret

# IAM configuration (if using IAM)
SERVICE_ROLE_ARN=arn:aws:iam::123456789012:role/user-service-role
SERVICE_SESSION_DURATION=3600

# Security settings
SERVICE_TOKEN_EXPIRY=3600
SERVICE_AUTH_MAX_RETRIES=3
SERVICE_AUTH_RETRY_DELAY=1000
```

### 3. Making Authenticated Requests

```typescript
@Injectable()
export class UserService {
  constructor(private readonly serviceAuthService: ServiceAuthService, private readonly httpService: HttpService) {}

  async callLearningService(userId: string) {
    // Method 1: Using createAuthenticatedRequest
    const request = await this.serviceAuthService.createAuthenticatedRequest("POST", "http://learning-service:3002/internal/courses/user-enrollments", "learning-service", { userId });

    const response = await this.httpService.post(request.url, request.data, { headers: request.headers }).toPromise();

    return response.data;
  }

  async callWithIamAuth() {
    // Method 2: Using IAM role assumption
    const credentials = await this.serviceAuthService.assumeServiceRole("arn:aws:iam::123456789012:role/learning-service-role", "user-service-session");

    const headers = this.serviceAuthService.createSignedRequest(credentials, "POST", "http://learning-service:3002/internal/courses", {}, JSON.stringify({ title: "New Course" }));

    const response = await this.httpService.post("http://learning-service:3002/internal/courses", { title: "New Course" }, { headers }).toPromise();

    return response.data;
  }
}
```

## Security Features

### 1. Token Validation

The `ServiceAuthGuard` validates incoming requests:

```typescript
// Validates Cognito JWT tokens
private async validateCognitoToken(token: string): Promise<boolean> {
  const payload = await this.cognitoVerifier.verify(token);
  return this.validateServiceClaims(payload);
}

// Validates IAM role authentication
private async validateIamRole(request: Request): Promise<boolean> {
  const response = await this.stsClient.send(new GetCallerIdentityCommand({}));
  return this.validateServiceRole(response.Arn);
}
```

### 2. Service Claims Validation

```typescript
private validateServiceClaims(payload: any): boolean {
  // Check if token is for service-to-service communication
  const isServiceToken = payload.token_use === 'access' &&
                        payload.client_id === this.config.cognito.clientId &&
                        payload.scope?.includes('service:internal');

  // Additional validation for service identity
  const hasServiceIdentity = payload['custom:service_name'] ||
                            payload['custom:service_role'] ||
                            payload.aud === 'service-internal';

  return isServiceToken && hasServiceIdentity;
}
```

### 3. Role Pattern Validation

```typescript
private validateServiceRole(arn: string | undefined): boolean {
  if (!arn) return false;

  const serviceRolePatterns = [
    /:role\/.*-service-role$/,
    /:role\/.*-lambda-role$/,
    /:assumed-role\/.*-service-role/,
  ];

  return serviceRolePatterns.some(pattern => pattern.test(arn));
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

### 2. Development Bypass

The guard automatically bypasses authentication in development:

```typescript
private isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' ||
         process.env.NODE_ENV === 'test' ||
         process.env.LOCALSTACK_ENABLED === 'true';
}
```

### 3. LocalStack Support

Configure for LocalStack:

```bash
AWS_ENDPOINT=http://localhost:4566
LOCALSTACK_ENABLED=true
COGNITO_USER_POOL_ID=us-east-1_mock
COGNITO_CLIENT_ID=mock-client-id
```

## Production Deployment

### 1. Cognito Setup

1. **Create User Pool for Services**

   ```bash
   aws cognito-idp create-user-pool \
     --pool-name "service-authentication-pool" \
     --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
     --auto-verified-attributes email
   ```

2. **Create Service Client**

   ```bash
   aws cognito-idp create-user-pool-client \
     --user-pool-id us-east-1_xxxxx \
     --client-name "service-client" \
     --generate-secret \
     --explicit-auth-flows ADMIN_NO_SRP_AUTH
   ```

3. **Create Service Users**
   ```bash
   aws cognito-idp admin-create-user \
     --user-pool-id us-east-1_xxxxx \
     --username "service-user-service" \
     --temporary-password "TempPass123!" \
     --user-attributes Name="custom:service_name",Value="user-service" Name="custom:service_role",Value="internal-service"
   ```

### 2. IAM Role Setup

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

### 3. Environment Configuration

```bash
# Production environment variables
SERVICE_NAME=user-service
SERVICE_AUTH_METHOD=cognito
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=your-client-id
COGNITO_CLIENT_SECRET=your-client-secret
SERVICE_TOKEN_EXPIRY=3600
```

## Monitoring and Troubleshooting

### 1. Authentication Logs

The system logs all authentication attempts:

```typescript
this.logger.debug("Service authentication successful", {
  serviceName: this.config.serviceName,
  authMethod: this.config.authMethod,
});

this.logger.warn("Service authentication failed", {
  ip: request.ip,
  userAgent: request.headers["user-agent"],
  path: request.path,
  serviceName: this.config.serviceName,
});
```

### 2. Common Issues

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

### 3. Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug
```

This will show detailed authentication flow information.

## Best Practices

### 1. Security

- **Token Storage**: Never store tokens in code or config files
- **Network Security**: Use private VPC for service communication
- **Audit Logging**: Log all service-to-service interactions
- **Regular Rotation**: Rotate credentials and tokens regularly
- **Least Privilege**: Grant minimal required permissions

### 2. Performance

- **Token Caching**: Cache tokens for performance
- **Async Operations**: All auth operations are non-blocking
- **Development Bypass**: No overhead in development mode
- **Connection Pooling**: Reuse HTTP connections

### 3. Reliability

- **Retry Logic**: Implement retry for failed auth attempts
- **Circuit Breaker**: Handle auth service failures gracefully
- **Fallback Methods**: Support multiple authentication strategies
- **Health Checks**: Monitor auth service health

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

This service authentication system provides a robust, secure, and scalable foundation for microservice communication while maintaining developer productivity through excellent local development support.
