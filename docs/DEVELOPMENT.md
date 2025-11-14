# Development Workflow Guide

**Complete daily development workflow for EdTech Platform**

**Last Updated:** November 2025

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [SSM + NestJS ConfigModule Integration](#ssm-nestjs-configmodule-integration)
3. [Environment Management](#environment-management)
4. [Daily Development Workflow](#daily-development-workflow)
5. [Service Development](#service-development)
6. [Database Operations](#database-operations)
7. [Testing Workflow](#testing-workflow)
8. [Debugging](#debugging)
9. [Common Tasks](#common-tasks)

---

## Local Development Setup

### Prerequisites

```bash
# Required tools
node --version    # v20+
pnpm --version    # v8+
docker --version  # Latest
aws --version     # v2.x

# Install if missing
npm install -g @nestjs/cli pnpm
```

### Initial Setup

```bash
# 1. Clone repository
git clone <your-repo-url>
cd edtech-platform-backend

# 2. Install dependencies
pnpm install

# 3. Configure AWS credentials (for SSM access)
aws configure
# AWS Access Key ID: [your-key]
# AWS Secret Access Key: [your-secret]
# Default region: us-east-1
# Output format: json

# 4. Start local infrastructure (PostgreSQL, Redis)
cd docker
docker compose up -d

# Verify services are running
docker ps
# You should see: postgres, redis

# 5. Create .env files (see Environment Management below)

# 6. Run migrations
pnpm run migrate:all

# 7. Start services in development mode
pnpm run start:dev identity  # Port 3000/3001
pnpm run start:dev tutor     # Port 3002/3003
pnpm run start:dev admin     # Port 3004/3005
```

---

## SSM + NestJS ConfigModule Integration

### Overview

This setup provides:
- ✅ **Simple environment management** (no `registerAs` methods)
- ✅ **Works locally** (with AWS credentials)
- ✅ **Works on AWS** (with IAM roles)
- ✅ **Type-safe** configuration
- ✅ **Automatic fallback** to `.env` files for local development

### Architecture

```
Environment Variables (.env)
        ↓
NestJS ConfigModule (loads .env)
        ↓
ConfigService + SSM (merges SSM secrets)
        ↓
Application Code
```

### Implementation

#### 1. Shared SSM Configuration Service

Create a reusable SSM service in `libs/shared-kernel`:

```typescript
// libs/shared-kernel/src/infrastructure/config/ssm-config.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

export interface SSMConfigOptions {
  /**
   * AWS Region for SSM Parameter Store
   * Default: us-east-1
   */
  region?: string;

  /**
   * Environment prefix for SSM parameters
   * e.g., 'dev' -> /dev/database/password
   * Default: process.env.NODE_ENV or 'dev'
   */
  environment?: string;

  /**
   * Enable caching of SSM parameters
   * Default: true
   */
  cache?: boolean;

  /**
   * Cache TTL in milliseconds
   * Default: 5 minutes (300000ms)
   */
  cacheTTL?: number;
}

@Injectable()
export class SSMConfigService {
  private readonly logger = new Logger(SSMConfigService.name);
  private readonly ssmClient: SSMClient;
  private readonly environment: string;
  private readonly cacheEnabled: boolean;
  private readonly cacheTTL: number;
  private readonly cache: Map<string, { value: string; expiry: number }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    options: SSMConfigOptions = {},
  ) {
    const region = options.region || this.configService.get('AWS_REGION', 'us-east-1');
    this.environment = options.environment || this.configService.get('NODE_ENV', 'dev');
    this.cacheEnabled = options.cache !== false;
    this.cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 5 minutes

    this.ssmClient = new SSMClient({ region });

    this.logger.log(`SSMConfigService initialized for environment: ${this.environment}`);
  }

  /**
   * Get a parameter from SSM Parameter Store
   * Falls back to ConfigService (env variables) if SSM fails
   *
   * @param parameterKey - Key relative to environment (e.g., 'database/password')
   * @param fallbackEnvKey - Environment variable key to use as fallback
   * @returns Parameter value
   */
  async get(parameterKey: string, fallbackEnvKey?: string): Promise<string | undefined> {
    // 1. Check cache first
    if (this.cacheEnabled) {
      const cached = this.cache.get(parameterKey);
      if (cached && cached.expiry > Date.now()) {
        this.logger.debug(`Cache hit for: ${parameterKey}`);
        return cached.value;
      }
    }

    // 2. Try SSM Parameter Store
    try {
      const parameterName = `/${this.environment}/${parameterKey}`;
      const value = await this.getFromSSM(parameterName);

      // Cache the result
      if (this.cacheEnabled && value) {
        this.cache.set(parameterKey, {
          value,
          expiry: Date.now() + this.cacheTTL,
        });
      }

      return value;
    } catch (error) {
      this.logger.warn(
        `Failed to get parameter from SSM: ${parameterKey}. Falling back to env variable.`,
        error.message,
      );

      // 3. Fallback to environment variable
      if (fallbackEnvKey) {
        const envValue = this.configService.get<string>(fallbackEnvKey);
        if (envValue) {
          this.logger.debug(`Using fallback env variable: ${fallbackEnvKey}`);
          return envValue;
        }
      }

      throw new Error(
        `Parameter not found in SSM or environment: ${parameterKey} / ${fallbackEnvKey}`,
      );
    }
  }

  /**
   * Get a required parameter (throws if not found)
   */
  async getRequired(parameterKey: string, fallbackEnvKey?: string): Promise<string> {
    const value = await this.get(parameterKey, fallbackEnvKey);

    if (!value) {
      throw new Error(
        `Required parameter not found: ${parameterKey} / ${fallbackEnvKey}`,
      );
    }

    return value;
  }

  /**
   * Get multiple parameters at once
   */
  async getMany(
    parameters: Array<{ key: string; fallback?: string }>,
  ): Promise<Record<string, string>> {
    const results = await Promise.all(
      parameters.map(async (param) => {
        const value = await this.get(param.key, param.fallback);
        return { key: param.key, value };
      }),
    );

    return results.reduce((acc, { key, value }) => {
      if (value) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, string>);
  }

  /**
   * Clear the cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('SSM cache cleared');
  }

  /**
   * Get parameter directly from SSM (private helper)
   */
  private async getFromSSM(parameterName: string): Promise<string | undefined> {
    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true, // Decrypt SecureString parameters
      });

      const response = await this.ssmClient.send(command);
      const value = response.Parameter?.Value;

      if (!value) {
        throw new Error(`SSM parameter is empty: ${parameterName}`);
      }

      this.logger.debug(`Retrieved from SSM: ${parameterName}`);
      return value;
    } catch (error) {
      // Re-throw with more context
      throw new Error(`SSM GetParameter failed for ${parameterName}: ${error.message}`);
    }
  }
}
```

#### 2. Export from Shared Kernel

```typescript
// libs/shared-kernel/src/infrastructure/config/index.ts
export * from './ssm-config.service';

// libs/shared-kernel/src/infrastructure/index.ts
export * from './config';

// libs/shared-kernel/src/index.ts
export * from './infrastructure';
```

#### 3. Use in Service Configuration

**Example: Identity Service Database Configuration**

```typescript
// apps/identity/src/infrastructure/config/database.config.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SSMConfigService } from '@app/shared-kernel';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
  idleTimeoutMillis: number;
}

@Injectable()
export class DatabaseConfigService implements OnModuleInit {
  private config: DatabaseConfig | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly ssmConfig: SSMConfigService,
  ) {}

  async onModuleInit() {
    // Load configuration on module initialization
    await this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    // Get database password from SSM, fallback to env
    const password = await this.ssmConfig.get(
      'database/password',        // SSM: /dev/database/password
      'DATABASE_PASSWORD',         // Fallback: DATABASE_PASSWORD from .env
    );

    this.config = {
      host: this.configService.get('DATABASE_HOST', 'localhost'),
      port: this.configService.get('DATABASE_PORT', 5432),
      database: this.configService.get('DATABASE_NAME', 'identity_db'),
      username: this.configService.get('DATABASE_USERNAME', 'edtech_admin'),
      password: password!,
      ssl: this.configService.get('DATABASE_SSL', 'false') === 'true',
      maxConnections: this.configService.get('DATABASE_MAX_CONNECTIONS', 20),
      idleTimeoutMillis: this.configService.get('DATABASE_IDLE_TIMEOUT', 30000),
    };
  }

  getConfig(): DatabaseConfig {
    if (!this.config) {
      throw new Error('Database config not loaded. Did you call onModuleInit?');
    }
    return this.config;
  }

  /**
   * Build PostgreSQL connection string
   */
  getConnectionString(): string {
    const config = this.getConfig();
    const ssl = config.ssl ? '?sslmode=require' : '';
    return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}${ssl}`;
  }
}
```

#### 4. Register in Service Module

```typescript
// apps/identity/src/identity.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SSMConfigService } from '@app/shared-kernel';
import { DatabaseConfigService } from './infrastructure/config/database.config';

@Module({
  imports: [
    // Load .env files
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.local',      // Local overrides (gitignored)
        `.env.${process.env.NODE_ENV}`, // Environment-specific
        '.env',            // Default
      ],
    }),
  ],
  providers: [
    // Provide SSM config service
    {
      provide: SSMConfigService,
      useFactory: (configService: ConfigService) => {
        return new SSMConfigService(configService, {
          region: configService.get('AWS_REGION', 'us-east-1'),
          environment: configService.get('NODE_ENV', 'dev'),
          cache: true,
          cacheTTL: 5 * 60 * 1000, // 5 minutes
        });
      },
      inject: [ConfigService],
    },
    DatabaseConfigService,
    // ... other providers
  ],
})
export class IdentityModule {}
```

#### 5. Use in Drizzle Service

```typescript
// apps/identity/src/infrastructure/database/drizzle.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DatabaseConfigService } from '../config/database.config';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private db: ReturnType<typeof drizzle> | null = null;
  private client: postgres.Sql | null = null;

  constructor(private readonly dbConfig: DatabaseConfigService) {}

  async onModuleInit() {
    const connectionString = this.dbConfig.getConnectionString();
    const config = this.dbConfig.getConfig();

    this.client = postgres(connectionString, {
      max: config.maxConnections,
      idle_timeout: config.idleTimeoutMillis,
    });

    this.db = drizzle(this.client, { schema });
  }

  getDb() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async onModuleDestroy() {
    await this.client?.end();
  }
}
```

---

## Environment Management

### Local Development (.env files)

Create environment-specific `.env` files:

#### `.env` (Base configuration)

```bash
# Environment
NODE_ENV=development

# AWS Configuration (for SSM access)
AWS_REGION=us-east-1
AWS_PROFILE=default  # Use your AWS CLI profile

# Service Configuration
SERVICE_NAME=identity-service
PORT=3000
INTERNAL_PORT=3001

# Database (Local Docker)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=identity_db
DATABASE_USERNAME=edtech_admin
DATABASE_PASSWORD=local_dev_password  # Fallback if SSM fails
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=20
DATABASE_IDLE_TIMEOUT=30000

# Redis (Local Docker)
REDIS_HOST=localhost
REDIS_PORT=6379

# Cognito (Real AWS)
COGNITO_USER_POOL_ID=us-east-1_xxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxx
# COGNITO_CLIENT_SECRET will come from SSM: /dev/identity/cognito-client-secret

# EventBridge
EVENT_BUS_NAME=edtech-event-bus

# Logging
LOG_LEVEL=debug
```

#### `.env.local` (Local overrides - GITIGNORED)

```bash
# Override any values for your local machine
# This file is gitignored

# Example: Use different AWS profile
AWS_PROFILE=personal

# Example: Override database password
DATABASE_PASSWORD=my_local_password

# Example: Disable SSM for offline development
USE_SSM=false
```

#### `.env.production` (AWS deployment)

```bash
# Environment
NODE_ENV=production

# AWS Configuration
AWS_REGION=us-east-1

# Service Configuration
SERVICE_NAME=identity-service
PORT=3000
INTERNAL_PORT=3001

# Database (RDS)
DATABASE_HOST=${RDS_ENDPOINT}  # Injected by ECS task definition
DATABASE_PORT=5432
DATABASE_NAME=identity_db
DATABASE_USERNAME=edtech_admin
# DATABASE_PASSWORD comes from SSM
DATABASE_SSL=true
DATABASE_MAX_CONNECTIONS=50
DATABASE_IDLE_TIMEOUT=30000

# Redis (ElastiCache)
REDIS_HOST=${REDIS_ENDPOINT}  # Injected by ECS task definition
REDIS_PORT=6379

# Cognito
COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}  # Injected by ECS
COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}        # Injected by ECS

# EventBridge
EVENT_BUS_NAME=edtech-event-bus

# Logging
LOG_LEVEL=info
```

### SSM Parameters Structure

```bash
# Create SSM parameters using Terraform or AWS CLI

# Database password (shared across services)
/dev/database/password        = "secure_random_password"
/prod/database/password       = "different_secure_password"

# Service-specific secrets
/dev/identity/cognito-client-secret  = "cognito_client_secret_value"
/dev/identity/jwt-secret             = "jwt_signing_secret"

/dev/tutor/s3-bucket-name            = "edtech-dev-documents"
/dev/tutor/document-signing-key      = "document_signing_key"

/dev/payment/stripe-secret-key       = "sk_test_xxxxxx"
/dev/payment/stripe-webhook-secret   = "whsec_xxxxxx"
```

### IAM Permissions for ECS Tasks

```hcl
# infrastructure/modules/services/ecs-service/iam.tf
resource "aws_iam_role_policy" "ecs_ssm_access" {
  name = "${var.environment}-${var.service_name}-ssm-access"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = var.kms_key_arn  # KMS key used for SSM encryption
      }
    ]
  })
}
```

---

## Daily Development Workflow

### Morning Routine

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
pnpm install

# 3. Start local infrastructure
cd docker
docker compose up -d

# 4. Run database migrations (if any)
pnpm run migrate:all

# 5. Start services you're working on
pnpm run start:dev identity

# Services auto-reload on file changes (watch mode)
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feature/add-email-verification

# 2. Make code changes
# Edit files in apps/identity/src/...

# 3. Test locally
curl http://localhost:3000/health

# 4. Run tests
pnpm test identity

# 5. Lint code (REQUIRED before commit)
pnpm run lint

# 6. Commit changes
git add .
git commit -m "feat(identity): add email verification"

# 7. Push to remote
git push origin feature/add-email-verification
```

### End of Day

```bash
# 1. Stop services (optional, can leave running)
# Ctrl+C in terminal running services

# 2. Stop Docker containers (saves resources)
cd docker
docker compose down

# 3. Commit and push work in progress
git add .
git commit -m "wip: work in progress"
git push
```

---

## Service Development

### Creating a New Service

```bash
# 1. Generate new NestJS app
nest generate app booking

# 2. Create directory structure
cd apps/booking
mkdir -p src/{domain,application,infrastructure,presentation}

# 3. Set up Drizzle for database
mkdir -p src/infrastructure/database
touch src/infrastructure/database/schema.ts
touch drizzle.config.ts

# 4. Copy configuration from existing service
cp ../identity/src/infrastructure/config/database.config.ts src/infrastructure/config/

# 5. Update ports in main.ts
# Public: 3010, Internal: 3011

# 6. Add to package.json scripts
# "start:dev booking": "nest start booking --watch"
```

### Implementing a New Feature

**Example: Add Email Verification to Identity Service**

```bash
# 1. Create domain value object
touch apps/identity/src/domain/value-objects/verification-code.vo.ts

# 2. Update aggregate
# Edit apps/identity/src/domain/aggregates/user-account.aggregate.ts

# 3. Create command
touch apps/identity/src/application/commands/verify-email.command.ts
touch apps/identity/src/application/commands/verify-email.handler.ts

# 4. Create domain event
touch apps/identity/src/domain/events/email-verified.event.ts

# 5. Update repository interface
# Edit apps/identity/src/domain/repositories/user-account.repository.ts

# 6. Implement repository
# Edit apps/identity/src/infrastructure/persistence/drizzle/repositories/user-account.repository.impl.ts

# 7. Create controller endpoint
# Edit apps/identity/src/presentation/http/controllers/public/auth.controller.ts

# 8. Test manually
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "123456"}'
```

---

## Database Operations

### Running Migrations

```bash
# Run all service migrations
pnpm run migrate:all

# Run specific service migration
pnpm run drizzle:identity:migrate
pnpm run drizzle:tutor:migrate
pnpm run drizzle:admin:migrate
```

### Creating Migrations

```bash
# 1. Update schema
# Edit apps/identity/src/infrastructure/database/schema.ts

# 2. Generate migration
pnpm run drizzle:identity:generate

# 3. Review migration
# Check drizzle/identity/migrations/

# 4. Apply migration
pnpm run drizzle:identity:migrate
```

### Database Console Access

```bash
# Connect to local PostgreSQL
docker exec -it edtech-postgres psql -U edtech_admin -d identity_db

# List tables
\dt

# Query users
SELECT * FROM user_accounts;

# Exit
\q
```

---

## Testing Workflow

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests for specific service
pnpm test identity

# Run tests in watch mode
pnpm test:watch identity

# Run tests with coverage
pnpm test:cov identity
```

### Integration Tests

```bash
# Start local infrastructure
docker compose up -d

# Run integration tests
pnpm test:integration identity
```

### Manual Testing with cURL

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "Password123!",
    "role": "student"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "Password123!"
  }'

# Get user profile (with JWT)
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Debugging

### VS Code Launch Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Identity Service",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "start:debug", "identity"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector",
      "port": 9229,
      "autoAttachChildProcesses": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tutor Service",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "start:debug", "tutor"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector",
      "port": 9230,
      "autoAttachChildProcesses": true
    }
  ]
}
```

### Logging

```typescript
// Use NestJS Logger
import { Logger } from '@nestjs/common';

export class MyService {
  private readonly logger = new Logger(MyService.name);

  async doSomething() {
    this.logger.log('Doing something');
    this.logger.debug('Debug info', { context: 'data' });
    this.logger.warn('Warning message');
    this.logger.error('Error occurred', 'stack trace');
  }
}
```

---

## Common Tasks

### Checking AWS SSM Parameters

```bash
# List all parameters for dev environment
aws ssm get-parameters-by-path \
  --path "/dev" \
  --recursive \
  --region us-east-1

# Get specific parameter
aws ssm get-parameter \
  --name "/dev/database/password" \
  --with-decryption \
  --region us-east-1

# Test SSM access from app
# The SSMConfigService will log SSM attempts
LOG_LEVEL=debug pnpm run start:dev identity
```

### Switching Environments

```bash
# Use local .env (default)
pnpm run start:dev identity

# Use production .env
NODE_ENV=production pnpm run start:dev identity

# Override specific env var
DATABASE_PASSWORD=custom pnpm run start:dev identity
```

### Code Quality Checks

```bash
# Lint all code
pnpm run lint

# Fix linting errors
pnpm run lint --fix

# Type check
pnpm run build:check

# Format code
pnpm run format
```

---

## Troubleshooting

### SSM Access Issues

**Problem:** `AccessDeniedException: User is not authorized to perform: ssm:GetParameter`

**Solution:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify IAM permissions
aws iam get-user

# Use different AWS profile
AWS_PROFILE=development pnpm run start:dev identity
```

**Problem:** SSM parameter not found

**Solution:**
```bash
# Verify parameter exists
aws ssm get-parameter --name "/dev/database/password" --region us-east-1

# Check environment variable
echo $NODE_ENV

# Use fallback env variable
DATABASE_PASSWORD=local_password pnpm run start:dev identity
```

### Database Connection Issues

**Problem:** `Connection refused` to PostgreSQL

**Solution:**
```bash
# Check Docker containers
docker ps

# Restart containers
docker compose down
docker compose up -d

# Check connection
docker exec -it edtech-postgres pg_isready
```

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 pnpm run start:dev identity
```

---

## Next Steps

- **Service Implementation:** See [SERVICE_STRUCTURE.md](SERVICE_STRUCTURE.md)
- **Infrastructure Setup:** See [INFRASTRUCTURE.md](INFRASTRUCTURE.md)
- **Deployment:** See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Testing:** See [TESTING.md](TESTING.md)
