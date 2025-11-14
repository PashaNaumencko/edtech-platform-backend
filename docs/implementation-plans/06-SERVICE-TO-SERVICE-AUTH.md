# Service-to-Service Authentication - Implementation Guide

**Purpose:** Secure internal API communication between microservices
**Strategy:** Defense in Depth (Network + Authentication)

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Phase 1: API Key Authentication (MVP)](#phase-1-api-key-authentication-mvp)
3. [Phase 2: JWT Token Authentication (Production)](#phase-2-jwt-token-authentication-production)
4. [Phase 3: AWS IAM Roles (Advanced)](#phase-3-aws-iam-roles-advanced)
5. [Implementation Roadmap](#implementation-roadmap)

---

## Security Architecture

### Defense Layers

```
┌─────────────────────────────────────────────────────┐
│              SECURITY LAYERS                         │
├─────────────────────────────────────────────────────┤
│  Layer 1: VPC + Security Groups                     │
│           ✅ Block external access                   │
│           ✅ Allow only ECS tasks                    │
│                                                      │
│  Layer 2: Service Authentication                    │
│           ✅ API Keys (MVP)                          │
│           ✅ JWT Tokens (Production)                 │
│                                                      │
│  Layer 3: Authorization                             │
│           ✅ Permission-based access                 │
│           ✅ Audit logging                           │
└─────────────────────────────────────────────────────┘
```

### Threat Model

| Threat | Network Only | Network + Auth |
|--------|--------------|----------------|
| External attacker | ✅ Blocked | ✅ Blocked |
| Compromised ECS task | ❌ Full access | ✅ Limited by token |
| Misconfigured security group | ❌ Exposed | ✅ Token required |
| Audit trail | ❌ Limited | ✅ Full logging |

**Recommendation:** Always use Network + Authentication for production.

---

## Phase 1: API Key Authentication (MVP)

**When:** Initial development and MVP
**Complexity:** Low
**Security:** Good (with VPC)

### Step 1.1: Update Service-Auth Library

**`libs/service-auth/src/guards/service-api-key.guard.ts`**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export const SERVICE_API_KEY_HEADER = 'x-service-api-key';

@Injectable()
export class ServiceApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ServiceApiKeyGuard.name);
  private readonly validApiKeys: Map<string, string>; // key -> service name

  constructor(private readonly configService: ConfigService) {
    // Load API keys from environment (stored in SSM Parameter Store)
    const apiKeysJson = this.configService.get<string>('SERVICE_API_KEYS');

    if (!apiKeysJson) {
      this.logger.warn('No service API keys configured');
      this.validApiKeys = new Map();
      return;
    }

    try {
      // Format: { "key1": "tutor-service", "key2": "admin-service" }
      const apiKeysObj = JSON.parse(apiKeysJson);
      this.validApiKeys = new Map(Object.entries(apiKeysObj));
      this.logger.log(`Loaded ${this.validApiKeys.size} service API keys`);
    } catch (error) {
      this.logger.error('Failed to parse SERVICE_API_KEYS', error);
      this.validApiKeys = new Map();
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers[SERVICE_API_KEY_HEADER] as string;

    if (!apiKey) {
      this.logger.warn('Missing service API key', {
        path: request.path,
        method: request.method,
      });
      throw new UnauthorizedException('Service API key is required');
    }

    const serviceName = this.validApiKeys.get(apiKey);

    if (!serviceName) {
      this.logger.warn('Invalid service API key', {
        path: request.path,
        method: request.method,
        apiKeyPrefix: apiKey.substring(0, 8) + '...',
      });
      throw new UnauthorizedException('Invalid service API key');
    }

    // Attach service identity to request
    request['serviceId'] = serviceName;
    request['authenticatedBy'] = 'api-key';

    this.logger.debug(`Authenticated service: ${serviceName}`, {
      path: request.path,
      method: request.method,
    });

    return true;
  }
}
```

**`libs/service-auth/src/decorators/service-identity.decorator.ts`**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ServiceIdentity = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.serviceId || 'unknown';
  },
);

// Usage:
// @Get(':id')
// async getUser(@Param('id') id: string, @ServiceIdentity() callingService: string) {
//   console.log(`User ${id} requested by ${callingService}`);
// }
```

**`libs/service-auth/src/service-auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServiceApiKeyGuard } from './guards/service-api-key.guard';

@Module({
  imports: [ConfigModule],
  providers: [ServiceApiKeyGuard],
  exports: [ServiceApiKeyGuard],
})
export class ServiceAuthModule {}
```

**`libs/service-auth/src/index.ts`**

```typescript
export * from './service-auth.module';
export * from './guards/service-api-key.guard';
export * from './decorators/service-identity.decorator';
export { SERVICE_API_KEY_HEADER } from './guards/service-api-key.guard';
```

### Step 1.2: Protect Internal API (Identity Service)

**`apps/identity-service/src/presentation/http/controllers/internal/user-internal.controller.ts`**

```typescript
import { Controller, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ServiceApiKeyGuard, ServiceIdentity } from '@edtech/service-auth';
import { GetUserQuery } from '../../../../application/queries/get-user/get-user.query';

@Controller('internal/users')
@UseGuards(ServiceApiKeyGuard) // Protect all internal endpoints
export class UserInternalController {
  private readonly logger = new Logger(UserInternalController.name);

  constructor(private readonly queryBus: QueryBus) {}

  @Get(':id')
  async getUserById(
    @Param('id') id: string,
    @ServiceIdentity() callingService: string,
  ) {
    this.logger.log(`User ${id} requested by service: ${callingService}`);

    const user = await this.queryBus.execute(new GetUserQuery(id));

    return user;
  }

  @Get('by-email/:email')
  async getUserByEmail(
    @Param('email') email: string,
    @ServiceIdentity() callingService: string,
  ) {
    this.logger.log(`User with email ${email} requested by service: ${callingService}`);

    // TODO: Implement GetUserByEmailQuery
    return { email };
  }
}
```

### Step 1.3: Configure API Keys in SSM Parameter Store (Terraform)

**`terraform/modules/services/identity/ssm.tf`**

```hcl
# Generate secure random API keys for each service
resource "random_password" "tutor_service_api_key" {
  length  = 64
  special = false
}

resource "random_password" "admin_service_api_key" {
  length  = 64
  special = false
}

# Store mapping of API keys to service names (Identity Service reads this)
resource "aws_ssm_parameter" "identity_service_api_keys" {
  name        = "/${var.environment}/identity-service/service-api-keys"
  description = "Service-to-service API keys for Identity Service"
  type        = "SecureString"

  value = jsonencode({
    "${random_password.tutor_service_api_key.result}"  = "tutor-service"
    "${random_password.admin_service_api_key.result}" = "admin-service"
  })

  tags = {
    Environment = var.environment
    Service     = "identity-service"
  }
}

# Store individual API keys for each calling service
resource "aws_ssm_parameter" "tutor_service_identity_api_key" {
  name        = "/${var.environment}/tutor-service/identity-service-api-key"
  description = "API key for Tutor Service to call Identity Service"
  type        = "SecureString"
  value       = random_password.tutor_service_api_key.result

  tags = {
    Environment = var.environment
    Service     = "tutor-service"
  }
}

resource "aws_ssm_parameter" "admin_service_identity_api_key" {
  name        = "/${var.environment}/admin-service/identity-service-api-key"
  description = "API key for Admin Service to call Identity Service"
  type        = "SecureString"
  value       = random_password.admin_service_api_key.result

  tags = {
    Environment = var.environment
    Service     = "admin-service"
  }
}
```

**Grant ECS tasks permission to read their API keys:**

```hcl
# Identity Service reads all API keys
resource "aws_iam_policy" "identity_service_read_api_keys" {
  name        = "${var.environment}-identity-service-read-api-keys"
  description = "Allow Identity Service to read service API keys"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ]
      Resource = [
        aws_ssm_parameter.identity_service_api_keys.arn
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "identity_service_ssm" {
  role       = aws_iam_role.identity_service_task_role.name
  policy_arn = aws_iam_policy.identity_service_read_api_keys.arn
}

# Tutor Service reads its own API key
resource "aws_iam_policy" "tutor_service_read_api_key" {
  name        = "${var.environment}-tutor-service-read-api-key"
  description = "Allow Tutor Service to read its API key"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameter"
      ]
      Resource = [
        aws_ssm_parameter.tutor_service_identity_api_key.arn
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "tutor_service_ssm" {
  role       = aws_iam_role.tutor_service_task_role.name
  policy_arn = aws_iam_policy.tutor_service_read_api_key.arn
}
```

### Step 1.4: Call Identity Service from Tutor Service

**`apps/tutor-service/src/infrastructure/http/identity-service.client.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SERVICE_API_KEY_HEADER } from '@edtech/service-auth';

export interface UserDto {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

@Injectable()
export class IdentityServiceClient {
  private readonly logger = new Logger(IdentityServiceClient.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('IDENTITY_SERVICE_API_KEY');
    this.baseUrl = this.configService.get<string>('IDENTITY_SERVICE_INTERNAL_URL');

    if (!this.apiKey) {
      this.logger.error('IDENTITY_SERVICE_API_KEY not configured');
    }
  }

  async getUserById(userId: string, correlationId?: string): Promise<UserDto> {
    try {
      this.logger.debug(`Fetching user ${userId} from Identity Service`);

      const response = await firstValueFrom(
        this.httpService.get<UserDto>(
          `${this.baseUrl}/internal/users/${userId}`,
          {
            headers: {
              [SERVICE_API_KEY_HEADER]: this.apiKey,
              'x-correlation-id': correlationId || this.generateCorrelationId(),
            },
            timeout: 5000, // 5 second timeout
          },
        ),
      );

      this.logger.debug(`Successfully fetched user ${userId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch user ${userId}:`, error.message);
      throw new Error(`Failed to fetch user from Identity Service: ${error.message}`);
    }
  }

  async getUserByEmail(email: string, correlationId?: string): Promise<UserDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UserDto>(
          `${this.baseUrl}/internal/users/by-email/${email}`,
          {
            headers: {
              [SERVICE_API_KEY_HEADER]: this.apiKey,
              'x-correlation-id': correlationId || this.generateCorrelationId(),
            },
            timeout: 5000,
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch user by email ${email}:`, error.message);
      throw error;
    }
  }

  private generateCorrelationId(): string {
    return `tutor-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
```

**Register in Tutor Service module:**

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IdentityServiceClient } from './infrastructure/http/identity-service.client';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 0,
    }),
  ],
  providers: [IdentityServiceClient],
  exports: [IdentityServiceClient],
})
export class TutorModule {}
```

### Step 1.5: Environment Configuration

**Identity Service `.env`:**
```bash
# Service API Keys (JSON mapping)
SERVICE_API_KEYS='{"abc123...": "tutor-service", "def456...": "admin-service"}'
```

**Tutor Service `.env`:**
```bash
# API key to call Identity Service
IDENTITY_SERVICE_API_KEY=abc123...

# Internal URL (ALB internal listener)
IDENTITY_SERVICE_INTERNAL_URL=http://internal-alb.edtech.internal:8080
```

**In production (ECS):** Load from SSM Parameter Store using `@edtech/config` library.

---

## Phase 2: JWT Token Authentication (Production)

**When:** Production deployment (Month 4+)
**Complexity:** Medium
**Security:** Better (token expiration, permissions)

### Implementation Overview

1. **Token Exchange Endpoint** - Identity Service issues JWT tokens
2. **JWT Verification Guard** - Validates tokens on internal APIs
3. **Permission-Based Access** - Services have specific permissions
4. **Token Refresh** - Automatic token renewal

**See `05-SHARED-LIBRARIES.md` for JWT implementation in `@edtech/service-auth`**

---

## Phase 3: AWS IAM Roles (Demo/Production)

**When:** Before demo to investors or production deployment
**Complexity:** Medium-High
**Security:** Best (AWS-managed credentials, full audit trail)
**Investor Appeal:** ✅ Enterprise-grade security

### Why IAM Roles for Demo?

**Advantages for startup pitch:**
- ✅ "Zero secrets management" - AWS rotates credentials automatically
- ✅ "Enterprise-grade security" - same as Fortune 500 companies
- ✅ "Full audit trail" - CloudTrail logs every API call
- ✅ "AWS best practice" - follows Well-Architected Framework
- ✅ Differentiates from competitors using basic auth

### Implementation Overview

1. **ECS Task Roles** - Each service has its own IAM role
2. **IAM Policies** - Fine-grained permissions per service
3. **SigV4 Signing** - Sign HTTP requests with AWS credentials
4. **IAM Authentication Guard** - Verify request signatures
5. **CloudTrail** - Full audit trail of all API calls

---

### Step 3.1: Create ECS Task Roles (Terraform)

**`terraform/modules/ecs/iam.tf`**

```hcl
# Identity Service Task Role
resource "aws_iam_role" "identity_service_task_role" {
  name = "${var.project_name}-${var.environment}-identity-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name    = "${var.project_name}-${var.environment}-identity-task-role"
    Service = "identity-service"
  }
}

# Tutor Service Task Role
resource "aws_iam_role" "tutor_service_task_role" {
  name = "${var.project_name}-${var.environment}-tutor-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name    = "${var.project_name}-${var.environment}-tutor-task-role"
    Service = "tutor-service"
  }
}

# Admin Service Task Role
resource "aws_iam_role" "admin_service_task_role" {
  name = "${var.project_name}-${var.environment}-admin-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Name    = "${var.project_name}-${var.environment}-admin-task-role"
    Service = "admin-service"
  }
}
```

### Step 3.2: Define Service-to-Service Permissions

**`terraform/modules/ecs/iam-policies.tf`**

```hcl
# Policy: Allow Tutor Service to call Identity Service internal API
resource "aws_iam_policy" "tutor_call_identity" {
  name        = "${var.environment}-tutor-call-identity"
  description = "Allow Tutor Service to call Identity Service internal API"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "execute-api:Invoke"
      ]
      Resource = [
        # Allow specific endpoints only
        "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*/*/GET/internal/users/*",
        "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*/*/GET/internal/users/by-email/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "tutor_call_identity" {
  role       = aws_iam_role.tutor_service_task_role.name
  policy_arn = aws_iam_policy.tutor_call_identity.arn
}

# Policy: Allow Admin Service to call Identity Service internal API (full access)
resource "aws_iam_policy" "admin_call_identity" {
  name        = "${var.environment}-admin-call-identity"
  description = "Allow Admin Service full access to Identity Service internal API"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "execute-api:Invoke"
      ]
      Resource = [
        "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*/*/*/internal/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "admin_call_identity" {
  role       = aws_iam_role.admin_service_task_role.name
  policy_arn = aws_iam_policy.admin_call_identity.arn
}

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}
```

### Step 3.3: Implement IAM Authentication Guard

**`libs/service-auth/src/guards/service-iam.guard.ts`**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

@Injectable()
export class ServiceIamGuard implements CanActivate {
  private readonly logger = new Logger(ServiceIamGuard.name);
  private readonly stsClient: STSClient;

  constructor() {
    this.stsClient = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract AWS SigV4 signature from headers
    const authHeader = request.headers['authorization'] as string;
    const dateHeader = request.headers['x-amz-date'] as string;
    const securityToken = request.headers['x-amz-security-token'] as string;

    if (!authHeader || !authHeader.startsWith('AWS4-HMAC-SHA256')) {
      this.logger.warn('Missing or invalid AWS SigV4 signature', {
        path: request.path,
        method: request.method,
      });
      throw new UnauthorizedException('AWS SigV4 signature required');
    }

    try {
      // Verify signature and get caller identity
      const callerIdentity = await this.verifyAndGetCaller(authHeader, securityToken);

      // Extract service name from IAM role ARN
      // ARN format: arn:aws:sts::123456789012:assumed-role/edtech-dev-tutor-task-role/...
      const serviceName = this.extractServiceFromArn(callerIdentity.Arn);

      // Attach service identity to request
      request['serviceId'] = serviceName;
      request['authenticatedBy'] = 'iam';
      request['callerArn'] = callerIdentity.Arn;

      this.logger.debug(`Authenticated service via IAM: ${serviceName}`, {
        path: request.path,
        method: request.method,
        arn: callerIdentity.Arn,
      });

      return true;
    } catch (error) {
      this.logger.error('IAM authentication failed:', error);
      throw new UnauthorizedException('Invalid AWS credentials');
    }
  }

  private async verifyAndGetCaller(authHeader: string, securityToken?: string): Promise<any> {
    try {
      // Use STS GetCallerIdentity to verify the request is from a valid AWS principal
      const command = new GetCallerIdentityCommand({});
      const response = await this.stsClient.send(command);

      return response;
    } catch (error) {
      this.logger.error('Failed to verify caller identity:', error);
      throw error;
    }
  }

  private extractServiceFromArn(arn: string): string {
    // Parse ARN to extract service name
    // Example: arn:aws:sts::123456789012:assumed-role/edtech-dev-tutor-task-role/abc123
    const parts = arn.split('/');
    if (parts.length >= 2) {
      const roleName = parts[1];
      // Extract service name from role name (e.g., edtech-dev-tutor-task-role -> tutor)
      const match = roleName.match(/([a-z]+)-task-role$/);
      return match ? `${match[1]}-service` : 'unknown';
    }
    return 'unknown';
  }
}
```

**Note:** The above is a simplified implementation. For production, use a proper AWS SigV4 verification library.

### Step 3.4: Implement SigV4 Signing in Service Clients

**Install AWS SDK dependencies:**

```bash
pnpm add @aws-sdk/signature-v4 @aws-sdk/protocol-http @aws-crypto/sha256-js @aws-sdk/credential-provider-node
```

**`apps/tutor-service/src/infrastructure/http/identity-service-iam.client.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

export interface UserDto {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

@Injectable()
export class IdentityServiceIamClient {
  private readonly logger = new Logger(IdentityServiceIamClient.name);
  private readonly baseUrl: string;
  private readonly signer: SignatureV4;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('IDENTITY_SERVICE_INTERNAL_URL');

    // Initialize SigV4 signer
    this.signer = new SignatureV4({
      service: 'execute-api',
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: defaultProvider(),
      sha256: Sha256,
    });
  }

  async getUserById(userId: string, correlationId?: string): Promise<UserDto> {
    try {
      this.logger.debug(`Fetching user ${userId} from Identity Service (IAM auth)`);

      // Parse URL
      const url = new URL(`${this.baseUrl}/internal/users/${userId}`);

      // Create HTTP request
      const request = new HttpRequest({
        method: 'GET',
        hostname: url.hostname,
        port: url.port ? parseInt(url.port) : undefined,
        path: url.pathname,
        protocol: url.protocol,
        headers: {
          host: url.hostname,
          'x-correlation-id': correlationId || this.generateCorrelationId(),
        },
      });

      // Sign request with SigV4
      const signedRequest = await this.signer.sign(request);

      // Make HTTP call with signed headers
      const response = await firstValueFrom(
        this.httpService.get<UserDto>(url.toString(), {
          headers: signedRequest.headers as any,
          timeout: 5000,
        }),
      );

      this.logger.debug(`Successfully fetched user ${userId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch user ${userId}:`, error.message);
      throw new Error(`Failed to fetch user from Identity Service: ${error.message}`);
    }
  }

  async getUserByEmail(email: string, correlationId?: string): Promise<UserDto> {
    try {
      const url = new URL(`${this.baseUrl}/internal/users/by-email/${email}`);

      const request = new HttpRequest({
        method: 'GET',
        hostname: url.hostname,
        port: url.port ? parseInt(url.port) : undefined,
        path: url.pathname,
        protocol: url.protocol,
        headers: {
          host: url.hostname,
          'x-correlation-id': correlationId || this.generateCorrelationId(),
        },
      });

      const signedRequest = await this.signer.sign(request);

      const response = await firstValueFrom(
        this.httpService.get<UserDto>(url.toString(), {
          headers: signedRequest.headers as any,
          timeout: 5000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch user by email ${email}:`, error.message);
      throw error;
    }
  }

  private generateCorrelationId(): string {
    return `tutor-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
```

### Step 3.5: Dual Guard Strategy (Support Both API Keys and IAM)

**For smooth migration, support both authentication methods:**

**`libs/service-auth/src/guards/service-dual.guard.ts`**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceApiKeyGuard } from './service-api-key.guard';
import { ServiceIamGuard } from './service-iam.guard';

@Injectable()
export class ServiceDualGuard implements CanActivate {
  private readonly logger = new Logger(ServiceDualGuard.name);
  private readonly apiKeyGuard: ServiceApiKeyGuard;
  private readonly iamGuard: ServiceIamGuard;
  private readonly authMode: 'api-key' | 'iam' | 'both';

  constructor(private readonly configService: ConfigService) {
    this.apiKeyGuard = new ServiceApiKeyGuard(configService);
    this.iamGuard = new ServiceIamGuard();
    this.authMode = this.configService.get('SERVICE_AUTH_MODE', 'both') as any;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check which authentication method to use
    const hasApiKey = !!request.headers['x-service-api-key'];
    const hasAwsAuth = !!request.headers['authorization']?.startsWith('AWS4-HMAC-SHA256');

    if (this.authMode === 'api-key') {
      return this.apiKeyGuard.canActivate(context);
    }

    if (this.authMode === 'iam') {
      return this.iamGuard.canActivate(context);
    }

    // Both mode: try IAM first, fallback to API key
    if (hasAwsAuth) {
      try {
        return await this.iamGuard.canActivate(context);
      } catch (error) {
        this.logger.warn('IAM authentication failed, trying API key');
      }
    }

    if (hasApiKey) {
      return this.apiKeyGuard.canActivate(context);
    }

    throw new UnauthorizedException('No valid authentication method provided');
  }
}
```

**Usage:**

```typescript
@Controller('internal/users')
@UseGuards(ServiceDualGuard) // Supports both API Key and IAM
export class UserInternalController {
  // ... endpoints
}
```

**Environment variable:**

```bash
# Local development: use API keys
SERVICE_AUTH_MODE=api-key

# Demo/Production: use IAM
SERVICE_AUTH_MODE=iam

# Migration: support both
SERVICE_AUTH_MODE=both
```

### Step 3.6: Enable CloudTrail Logging

**`terraform/modules/cloudtrail/main.tf`**

```hcl
# S3 bucket for CloudTrail logs
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "${var.project_name}-${var.environment}-cloudtrail"

  tags = {
    Name = "${var.project_name}-${var.environment}-cloudtrail"
  }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudTrail
resource "aws_cloudtrail" "main" {
  name                          = "${var.project_name}-${var.environment}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_logging                = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type = "AWS::Lambda::Function"
      values = ["arn:aws:lambda"]
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cloudtrail"
  }
}
```

**Query CloudTrail logs:**

```bash
# View all API calls from Tutor Service
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=tutor-service \
  --max-results 50

# View specific resource access
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=/internal/users/123
```

---

## Implementation Roadmap

### Phase 1: Development (API Keys)

**When:** Local development and testing
**Duration:** 2-3 hours

```
✅ API Key Authentication
  - Generate API keys in SSM Parameter Store
  - Implement ServiceApiKeyGuard
  - Protect internal API endpoints
  - Configure service clients with API keys
  - Test service-to-service calls
```

**Why:** Fast to implement, good for rapid iteration

### Phase 2: Demo/Production (AWS IAM Roles)

**When:** Before demo to investors or production deployment
**Duration:** 1-2 days

```
✅ AWS IAM Roles with SigV4 Signing
  - Create IAM roles per service (ECS Task Roles)
  - Implement IAM authentication guard
  - Add SigV4 request signing to service clients
  - Enable CloudTrail logging
  - Test with real AWS credentials
```

**Why:**
- ✅ Zero secrets management (AWS manages credentials)
- ✅ Automatic credential rotation
- ✅ Full audit trail in CloudTrail
- ✅ Impressive for investors (enterprise-grade security)
- ✅ AWS best practice

### Migration Path

**Local Dev → Demo/Production:**
1. Keep API Key guard for backward compatibility
2. Add IAM authentication guard
3. Use environment variable to switch between them
4. Test IAM auth in staging
5. Switch to IAM auth in production
6. Remove API Key guard after verification

---

## Security Best Practices

### DO

✅ **Use HTTPS** for all internal communication (ALB with TLS)
✅ **Rotate API keys** every 90 days
✅ **Use SSM Parameter Store** for secrets (never hardcode)
✅ **Log all internal API calls** with service identity
✅ **Implement rate limiting** on internal APIs
✅ **Use correlation IDs** for request tracing
✅ **Set timeouts** on HTTP clients (5-10 seconds)
✅ **Handle failures gracefully** (circuit breaker pattern)

### DON'T

❌ **Don't hardcode API keys** in code or environment files
❌ **Don't skip authentication** even in private VPC
❌ **Don't trust network location alone** (defense in depth)
❌ **Don't log API keys** in application logs
❌ **Don't reuse keys across environments** (dev vs prod)
❌ **Don't expose internal APIs** to the internet

---

## Testing Service Authentication

### Unit Test

```typescript
describe('ServiceApiKeyGuard', () => {
  let guard: ServiceApiKeyGuard;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('{"test-key": "test-service"}'),
    } as any;

    guard = new ServiceApiKeyGuard(configService);
  });

  it('should allow valid API key', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-service-api-key': 'test-key' },
        }),
      }),
    } as any;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject invalid API key', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-service-api-key': 'wrong-key' },
        }),
      }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
```

### Integration Test

```typescript
describe('Internal API Authentication (e2e)', () => {
  let app: INestApplication;
  const validApiKey = 'test-api-key-123';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [IdentityModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key) => {
          if (key === 'SERVICE_API_KEYS') {
            return `{"${validApiKey}": "test-service"}`;
          }
          return null;
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /internal/users/:id - should return 401 without API key', () => {
    return request(app.getHttpServer())
      .get('/internal/users/123')
      .expect(401);
  });

  it('GET /internal/users/:id - should return 200 with valid API key', () => {
    return request(app.getHttpServer())
      .get('/internal/users/123')
      .set('x-service-api-key', validApiKey)
      .expect(200);
  });

  it('GET /internal/users/:id - should return 401 with invalid API key', () => {
    return request(app.getHttpServer())
      .get('/internal/users/123')
      .set('x-service-api-key', 'wrong-key')
      .expect(401);
  });
});
```

---

## Summary

### Quick Start (MVP)

1. ✅ Generate API keys in SSM Parameter Store (Terraform)
2. ✅ Add `ServiceApiKeyGuard` to `@edtech/service-auth`
3. ✅ Protect internal controllers with `@UseGuards(ServiceApiKeyGuard)`
4. ✅ Configure service clients with API keys
5. ✅ Test service-to-service communication

**Time:** 2-3 hours
**Security:** API Keys + VPC + Security Groups = Good enough for MVP

### Production Upgrade

When ready, migrate to JWT tokens for better security (expiring tokens, permissions).

---

## Next Steps

1. **Implement Phase 1** during Identity Service development
2. **Test thoroughly** with integration tests
3. **Document API keys rotation** process
4. **Plan migration to JWT** for production launch
