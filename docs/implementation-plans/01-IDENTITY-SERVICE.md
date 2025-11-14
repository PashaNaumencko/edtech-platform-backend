# Identity Service - Step-by-Step Implementation Guide

**Service:** Identity Service
**Domain:** User registration, authentication, email verification, COPPA compliance
**Database:** `identity_db` (PostgreSQL)
**Ports:** 3000 (public), 3001 (internal)

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Project Setup](#phase-1-project-setup)
3. [Phase 2: Domain Layer](#phase-2-domain-layer)
4. [Phase 3: Infrastructure Layer](#phase-3-infrastructure-layer)
5. [Phase 4: Application Layer](#phase-4-application-layer)
6. [Phase 5: Presentation Layer](#phase-5-presentation-layer)
7. [Phase 6: Testing](#phase-6-testing)
8. [Phase 7: Deployment](#phase-7-deployment)

---

## Overview

### Domain Responsibilities

The Identity Service is the foundational service responsible for:
- User registration and authentication (AWS Cognito integration)
- Email verification workflows
- COPPA compliance for users under 13 years old
- Parent consent management for minors
- Role-based access control (Student, Tutor, Admin)
- Session management

### Key Aggregates

1. **UserAccount** (Root)
   - User identity and authentication
   - Role management
   - Email verification status

2. **StudentProfile**
   - Personal information
   - Date of birth and COPPA compliance
   - Parent consent for minors

3. **Session**
   - Active user sessions
   - Token management

### Domain Events

- `UserCreatedEvent` - Published when new user registers
- `EmailVerifiedEvent` - Published when user verifies email
- `TutorRoleGrantedEvent` - Published when user becomes tutor
- `ParentConsentRequestedEvent` - Published when consent email sent
- `ParentConsentApprovedEvent` - Published when parent approves

---

## Phase 1: Project Setup

### Step 1.1: Create Service Directory Structure

```bash
# Create the service structure
mkdir -p apps/identity-service/src/{domain,application,infrastructure,presentation}

# Create domain subfolders
mkdir -p apps/identity-service/src/domain/{aggregates,entities,value-objects,events,repositories,services,exceptions}

# Create application subfolders
mkdir -p apps/identity-service/src/application/{commands,queries,event-handlers,dtos,interfaces}

# Create infrastructure subfolders
mkdir -p apps/identity-service/src/infrastructure/{persistence/drizzle/{schema,repositories,mappers},messaging,external-services,config}

# Create presentation subfolders
mkdir -p apps/identity-service/src/presentation/http/{controllers/{public,internal},dtos,guards,interceptors,filters}
```

### Step 1.2: Create Configuration Files

**`apps/identity-service/tsconfig.app.json`**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist/apps/identity-service"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

**`apps/identity-service/drizzle.config.ts`**
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/persistence/drizzle/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.IDENTITY_DB_HOST || 'localhost',
    port: parseInt(process.env.IDENTITY_DB_PORT || '5432'),
    user: process.env.IDENTITY_DB_USER || 'postgres',
    password: process.env.IDENTITY_DB_PASSWORD || 'postgres',
    database: process.env.IDENTITY_DB_NAME || 'identity_db',
  },
});
```

### Step 1.3: Update nest-cli.json

Add identity-service to the projects section:

```json
{
  "projects": {
    "identity-service": {
      "type": "application",
      "root": "apps/identity-service",
      "entryFile": "main",
      "sourceRoot": "apps/identity-service/src",
      "compilerOptions": {
        "tsConfigPath": "apps/identity-service/tsconfig.app.json"
      }
    }
  }
}
```

### Step 1.4: Create Environment Variables

Add to `.env.local`:
```bash
# Identity Service Database
IDENTITY_DB_HOST=localhost
IDENTITY_DB_PORT=5432
IDENTITY_DB_USER=postgres
IDENTITY_DB_PASSWORD=postgres
IDENTITY_DB_NAME=identity_db

# AWS Cognito
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id
COGNITO_REGION=us-east-1

# AWS S3
S3_BUCKET_NAME=edtech-identity-dev
S3_REGION=us-east-1

# Service Ports
PUBLIC_PORT_IDENTITY=3000
INTERNAL_PORT_IDENTITY=3001

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## Phase 2: Domain Layer

### Step 2.1: Create Value Objects

**Value objects are immutable, self-validating data types.**

**`src/domain/value-objects/email.vo.ts`**
```typescript
import { ValueObject } from '@edtech/shared-kernel';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static create(email: string): Email {
    // TODO: Implement email validation
    // - Check format with regex
    // - Ensure not empty
    // - Normalize (lowercase, trim)
    // - Throw DomainError if invalid

    return new Email({ value: email });
  }

  get value(): string {
    return this.props.value;
  }
}
```

**Tasks for Step 2.1:**
- [ ] Create `Email` value object with validation
- [ ] Create `PersonalName` value object (first name, last name)
- [ ] Create `DateOfBirth` value object with age calculation
- [ ] Create `ParentConsent` value object (parent email, status, date)
- [ ] Write unit tests for each value object

### Step 2.2: Create Domain Events

**Domain events represent state changes in aggregates.**

**`src/domain/events/user-created.event.ts`**
```typescript
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly role: 'student' | 'tutor' | 'admin',
    public readonly occurredAt: Date = new Date(),
  ) {}
}
```

**Tasks for Step 2.2:**
- [ ] Create `UserCreatedEvent`
- [ ] Create `EmailVerifiedEvent`
- [ ] Create `TutorRoleGrantedEvent`
- [ ] Create `ParentConsentRequestedEvent`
- [ ] Create `ParentConsentApprovedEvent`

### Step 2.3: Create Repository Interfaces

**Repository interfaces define data access contracts (no implementation).**

**`src/domain/repositories/user-account.repository.interface.ts`**
```typescript
import { UserAccount } from '../aggregates/user-account.aggregate';

export interface IUserAccountRepository {
  save(userAccount: UserAccount): Promise<void>;
  findById(id: string): Promise<UserAccount | null>;
  findByEmail(email: string): Promise<UserAccount | null>;
  findByCognitoId(cognitoId: string): Promise<UserAccount | null>;
  delete(id: string): Promise<void>;
}

export const USER_ACCOUNT_REPOSITORY = Symbol('USER_ACCOUNT_REPOSITORY');
```

**Tasks for Step 2.3:**
- [ ] Create `IUserAccountRepository` interface
- [ ] Create `IStudentProfileRepository` interface
- [ ] Create `ISessionRepository` interface
- [ ] Define DI tokens for each repository

### Step 2.4: Create Aggregate Roots

**Aggregates are consistency boundaries with business logic.**

**`src/domain/aggregates/user-account.aggregate.ts`**
```typescript
import { AggregateRoot } from '@edtech/shared-kernel';
import { Email } from '../value-objects/email.vo';
import { UserCreatedEvent } from '../events/user-created.event';

interface UserAccountProps {
  email: Email;
  cognitoUserId: string;
  role: 'student' | 'tutor' | 'admin';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserAccount extends AggregateRoot<UserAccountProps> {
  private constructor(props: UserAccountProps, id?: string) {
    super(props, id);
  }

  // Factory method
  static create(
    email: Email,
    cognitoUserId: string,
    role: 'student' | 'tutor' | 'admin',
  ): UserAccount {
    // TODO: Implement business logic
    // - Validate inputs
    // - Create aggregate
    // - Apply UserCreatedEvent
    // - Return aggregate

    const userAccount = new UserAccount({
      email,
      cognitoUserId,
      role,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Apply domain event
    userAccount.apply(new UserCreatedEvent(
      userAccount.id.value,
      email.value,
      role,
    ));

    return userAccount;
  }

  // Business methods
  verifyEmail(): void {
    // TODO: Implement email verification logic
    // - Check if already verified
    // - Update state
    // - Apply EmailVerifiedEvent
  }

  grantTutorRole(): void {
    // TODO: Implement role upgrade logic
    // - Check if already tutor
    // - Update role
    // - Apply TutorRoleGrantedEvent
  }

  // Getters
  get email(): Email {
    return this.props.email;
  }

  get cognitoUserId(): string {
    return this.props.cognitoUserId;
  }

  get role(): 'student' | 'tutor' | 'admin' {
    return this.props.role;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }
}
```

**Tasks for Step 2.4:**
- [ ] Implement `UserAccount` aggregate with all business methods
- [ ] Implement `StudentProfile` aggregate with COPPA compliance logic
- [ ] Implement `Session` aggregate
- [ ] Add invariant validation (business rules)
- [ ] Write unit tests for aggregate behavior

### Step 2.5: Create Domain Services

**Domain services contain complex logic that doesn't belong to a single aggregate.**

**`src/domain/services/coppa-compliance.service.ts`**
```typescript
export class COPPAComplianceService {
  isMinor(dateOfBirth: Date): boolean {
    // TODO: Implement age calculation
    // - Calculate age from date of birth
    // - Return true if under 13 years old
  }

  requiresParentConsent(dateOfBirth: Date): boolean {
    // TODO: Check if parent consent is required
    return this.isMinor(dateOfBirth);
  }
}
```

**Tasks for Step 2.5:**
- [ ] Implement `COPPAComplianceService`
- [ ] Write unit tests for COPPA logic

---

## Phase 3: Infrastructure Layer

### Step 3.1: Define Database Schema

**Use Drizzle ORM to define PostgreSQL tables.**

**`src/infrastructure/persistence/drizzle/schema/user-accounts.schema.ts`**
```typescript
import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const userAccounts = pgTable('user_accounts', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  cognitoUserId: text('cognito_user_id').notNull().unique(),
  role: text('role').notNull(), // 'student' | 'tutor' | 'admin'
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**`src/infrastructure/persistence/drizzle/schema/index.ts`**
```typescript
export * from './user-accounts.schema';
export * from './student-profiles.schema';
export * from './sessions.schema';
```

**Tasks for Step 3.1:**
- [ ] Define `user_accounts` table schema
- [ ] Define `student_profiles` table schema
- [ ] Define `sessions` table schema
- [ ] Export all schemas from index.ts
- [ ] Generate migration: `pnpm run drizzle:identity:generate`
- [ ] Apply migration: `pnpm run drizzle:identity:migrate`

### Step 3.2: Create Repository Implementations

**Implement repository interfaces using Drizzle ORM.**

**`src/infrastructure/persistence/drizzle/repositories/user-account.repository.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@edtech/nestjs-drizzle';
import { DrizzleDB } from '@edtech/nestjs-drizzle';
import { eq } from 'drizzle-orm';
import * as schema from '../schema';
import { IUserAccountRepository } from '../../../../domain/repositories/user-account.repository.interface';
import { UserAccount } from '../../../../domain/aggregates/user-account.aggregate';
import { UserAccountMapper } from '../mappers/user-account.mapper';

@Injectable()
export class UserAccountRepository implements IUserAccountRepository {
  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB<typeof schema>,
  ) {}

  async save(userAccount: UserAccount): Promise<void> {
    // TODO: Implement save logic
    // - Map domain aggregate to persistence model
    // - Use db.insert() or db.update()
    // - Handle errors
  }

  async findById(id: string): Promise<UserAccount | null> {
    // TODO: Implement findById logic
    // - Query database
    // - Map persistence model to domain aggregate
    // - Return null if not found
  }

  async findByEmail(email: string): Promise<UserAccount | null> {
    // TODO: Implement findByEmail logic
  }

  async findByCognitoId(cognitoId: string): Promise<UserAccount | null> {
    // TODO: Implement findByCognitoId logic
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement delete logic
  }
}
```

**Tasks for Step 3.2:**
- [ ] Implement `UserAccountRepository`
- [ ] Implement `StudentProfileRepository`
- [ ] Implement `SessionRepository`
- [ ] Create mappers (domain ↔ persistence)
- [ ] Write integration tests for repositories

### Step 3.3: Create External Service Adapters

**Integrate with AWS Cognito for authentication.**

**`src/infrastructure/external-services/cognito.adapter.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { CognitoAuthService } from '@edtech/auth';

@Injectable()
export class CognitoAdapter {
  constructor(private readonly cognitoAuthService: CognitoAuthService) {}

  async registerUser(email: string, password: string): Promise<string> {
    // TODO: Implement Cognito user registration
    // - Call AWS Cognito to create user
    // - Return cognito user ID
  }

  async sendVerificationEmail(email: string): Promise<void> {
    // TODO: Trigger email verification
  }

  async verifyEmail(email: string, code: string): Promise<boolean> {
    // TODO: Verify email with code
  }
}
```

**Tasks for Step 3.3:**
- [ ] Create `CognitoAdapter` for authentication
- [ ] Create `S3Adapter` for file uploads
- [ ] Create `EventBridgePublisher` for domain events
- [ ] Write integration tests for adapters

### Step 3.4: Configure Infrastructure Module

**`src/infrastructure/infrastructure.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { DrizzleModule } from '@edtech/nestjs-drizzle';
import { ConfigService } from '@nestjs/config';
import * as schema from './persistence/drizzle/schema';
import { UserAccountRepository } from './persistence/drizzle/repositories/user-account.repository';
import { USER_ACCOUNT_REPOSITORY } from '../domain/repositories/user-account.repository.interface';

@Module({
  imports: [
    DrizzleModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        config: {
          host: config.get('IDENTITY_DB_HOST'),
          port: config.get('IDENTITY_DB_PORT'),
          user: config.get('IDENTITY_DB_USER'),
          password: config.get('IDENTITY_DB_PASSWORD'),
          database: config.get('IDENTITY_DB_NAME'),
        },
        schema,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: USER_ACCOUNT_REPOSITORY,
      useClass: UserAccountRepository,
    },
    // Add other repositories
  ],
  exports: [USER_ACCOUNT_REPOSITORY],
})
export class InfrastructureModule {}
```

**Tasks for Step 3.4:**
- [ ] Configure Drizzle module with database connection
- [ ] Register all repository implementations
- [ ] Export repositories for use in application layer

---

## Phase 4: Application Layer

### Step 4.1: Create Command Handlers

**Commands handle write operations (CQRS pattern).**

**`src/application/commands/create-user/create-user.command.ts`**
```typescript
export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly role: 'student' | 'tutor' | 'admin',
  ) {}
}
```

**`src/application/commands/create-user/create-user.handler.ts`**
```typescript
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateUserCommand } from './create-user.command';
import { IUserAccountRepository, USER_ACCOUNT_REPOSITORY } from '../../../domain/repositories/user-account.repository.interface';
import { UserAccount } from '../../../domain/aggregates/user-account.aggregate';
import { Email } from '../../../domain/value-objects/email.vo';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userAccountRepository: IUserAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateUserCommand): Promise<string> {
    // TODO: Implement user creation logic
    // 1. Validate email doesn't exist
    // 2. Create user in Cognito
    // 3. Create UserAccount aggregate
    // 4. Save to repository
    // 5. Publish domain events
    // 6. Return user ID
  }
}
```

**Tasks for Step 4.1:**
- [ ] Implement `CreateUserHandler`
- [ ] Implement `VerifyEmailHandler`
- [ ] Implement `UpdateProfileHandler`
- [ ] Implement `GrantTutorRoleHandler`
- [ ] Write unit tests for handlers

### Step 4.2: Create Query Handlers

**Queries handle read operations (CQRS pattern).**

**`src/application/queries/get-user/get-user.query.ts`**
```typescript
export class GetUserQuery {
  constructor(public readonly userId: string) {}
}
```

**`src/application/queries/get-user/get-user.handler.ts`**
```typescript
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUserQuery } from './get-user.query';
import { UserDto } from '../../dtos/user.dto';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery, UserDto> {
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userAccountRepository: IUserAccountRepository,
  ) {}

  async execute(query: GetUserQuery): Promise<UserDto> {
    // TODO: Implement user retrieval logic
    // 1. Find user by ID
    // 2. Map to DTO
    // 3. Return DTO
  }
}
```

**Tasks for Step 4.2:**
- [ ] Implement `GetUserHandler`
- [ ] Implement `GetUserByEmailHandler`
- [ ] Implement `GetStudentProfileHandler`
- [ ] Write unit tests for handlers

### Step 4.3: Create Event Handlers

**Event handlers react to domain events.**

**`src/application/event-handlers/user-created.handler.ts`**
```typescript
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from '../../domain/events/user-created.event';

@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent): Promise<void> {
    // TODO: Handle user created event
    // - Send welcome email
    // - Publish to EventBridge for other services
    // - Log event
  }
}
```

**Tasks for Step 4.3:**
- [ ] Implement `UserCreatedHandler`
- [ ] Implement `EmailVerifiedHandler`
- [ ] Implement `TutorRoleGrantedHandler`
- [ ] Write unit tests for handlers

### Step 4.4: Create DTOs

**DTOs transfer data between layers.**

**`src/application/dtos/user.dto.ts`**
```typescript
export class UserDto {
  id: string;
  email: string;
  role: 'student' | 'tutor' | 'admin';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Tasks for Step 4.4:**
- [ ] Create `UserDto`
- [ ] Create `StudentProfileDto`
- [ ] Create mapper utilities (aggregate → DTO)

---

## Phase 5: Presentation Layer

### Step 5.1: Create Request/Response DTOs

**DTOs for HTTP requests and responses.**

**`src/presentation/http/dtos/create-user-request.dto.ts`**
```typescript
import { IsEmail, IsString, MinLength, IsIn } from 'class-validator';

export class CreateUserRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(['student', 'tutor', 'admin'])
  role: 'student' | 'tutor' | 'admin';
}
```

**Tasks for Step 5.1:**
- [ ] Create request DTOs with validation
- [ ] Create response DTOs
- [ ] Add class-validator decorators

### Step 5.2: Create Public API Controllers

**Public API endpoints (port 3000).**

**`src/presentation/http/controllers/public/auth.controller.ts`**
```typescript
import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateUserRequestDto } from '../../dtos/create-user-request.dto';
import { CreateUserCommand } from '../../../../application/commands/create-user/create-user.command';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('register')
  async register(@Body() dto: CreateUserRequestDto) {
    // TODO: Implement registration endpoint
    // 1. Create command from DTO
    // 2. Execute command via CommandBus
    // 3. Return response
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailRequestDto) {
    // TODO: Implement email verification
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    // TODO: Get current user from JWT token
  }
}
```

**Tasks for Step 5.2:**
- [ ] Implement `AuthController`
- [ ] Implement `ProfileController`
- [ ] Add authentication guards
- [ ] Add validation pipes
- [ ] Write E2E tests

### Step 5.3: Create Internal API Controllers

**Internal API endpoints (port 3001) for service-to-service communication.**

**`src/presentation/http/controllers/internal/user-internal.controller.ts`**
```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetUserQuery } from '../../../../application/queries/get-user/get-user.query';

@Controller('internal/users')
export class UserInternalController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    // TODO: Implement internal user lookup
    return this.queryBus.execute(new GetUserQuery(id));
  }

  @Get('by-email/:email')
  async getUserByEmail(@Param('email') email: string) {
    // TODO: Implement user lookup by email
  }
}
```

**Tasks for Step 5.3:**
- [ ] Implement `UserInternalController`
- [ ] No authentication guards (trusted internal network)
- [ ] Write integration tests

### Step 5.4: Create Root Module

**`src/identity.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { AuthController } from './presentation/http/controllers/public/auth.controller';
import { UserInternalController } from './presentation/http/controllers/internal/user-internal.controller';
import { CreateUserHandler } from './application/commands/create-user/create-user.handler';
import { GetUserHandler } from './application/queries/get-user/get-user.handler';
import { UserCreatedHandler } from './application/event-handlers/user-created.handler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CqrsModule,
    InfrastructureModule,
  ],
  controllers: [AuthController, UserInternalController],
  providers: [
    // Command Handlers
    CreateUserHandler,
    // Query Handlers
    GetUserHandler,
    // Event Handlers
    UserCreatedHandler,
  ],
})
export class IdentityModule {}
```

**Tasks for Step 5.4:**
- [ ] Wire up all controllers
- [ ] Register all command handlers
- [ ] Register all query handlers
- [ ] Register all event handlers

### Step 5.5: Create Main Entry Point

**`src/main.ts`**
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IdentityModule } from './identity.module';

const logger = new Logger('Identity-Service');

async function bootstrapPublicAPI() {
  const app = await NestFactory.create(IdentityModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*' });

  const port = process.env.PUBLIC_PORT_IDENTITY || 3000;
  await app.listen(port);
  logger.log(`✅ Public API listening on port ${port}`);
}

async function bootstrapInternalAPI() {
  const app = await NestFactory.create(IdentityModule);
  const port = process.env.INTERNAL_PORT_IDENTITY || 3001;
  await app.listen(port);
  logger.log(`✅ Internal API listening on port ${port}`);
}

async function bootstrap() {
  await Promise.all([bootstrapPublicAPI(), bootstrapInternalAPI()]);
}

bootstrap();
```

**Tasks for Step 5.5:**
- [ ] Create dual-port bootstrap (public + internal)
- [ ] Add global validation pipe
- [ ] Configure CORS for public API
- [ ] Add error handling

---

## Phase 6: Testing

### Step 6.1: Unit Tests

**Test domain logic in isolation.**

```typescript
// src/domain/aggregates/__tests__/user-account.aggregate.spec.ts
describe('UserAccount', () => {
  it('should create a new user account', () => {
    // TODO: Test aggregate creation
  });

  it('should verify email', () => {
    // TODO: Test email verification
  });

  it('should grant tutor role', () => {
    // TODO: Test role upgrade
  });
});
```

**Tasks for Step 6.1:**
- [ ] Write unit tests for all value objects
- [ ] Write unit tests for all aggregates
- [ ] Write unit tests for domain services
- [ ] Aim for 80%+ code coverage

### Step 6.2: Integration Tests

**Test repository implementations with real database.**

```typescript
// src/infrastructure/persistence/drizzle/repositories/__tests__/user-account.repository.spec.ts
describe('UserAccountRepository', () => {
  let repository: UserAccountRepository;
  let db: DrizzleDB;

  beforeEach(async () => {
    // TODO: Set up test database
  });

  afterEach(async () => {
    // TODO: Clean up test data
  });

  it('should save and retrieve user account', async () => {
    // TODO: Test save/retrieve flow
  });
});
```

**Tasks for Step 6.2:**
- [ ] Write integration tests for all repositories
- [ ] Use test database (separate from dev)
- [ ] Clean up test data after each test

### Step 6.3: E2E Tests

**Test complete API flows.**

```typescript
// test/e2e/identity-service.e2e-spec.ts
describe('Identity Service (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // TODO: Bootstrap test app
  });

  it('POST /auth/register - should register new user', async () => {
    // TODO: Test registration endpoint
  });

  it('POST /auth/verify-email - should verify email', async () => {
    // TODO: Test email verification
  });
});
```

**Tasks for Step 6.3:**
- [ ] Write E2E tests for all public endpoints
- [ ] Write E2E tests for all internal endpoints
- [ ] Test authentication flows
- [ ] Test error cases

---

## Phase 7: Deployment

### Step 7.1: Local Development

```bash
# Start service
pnpm run start:identity

# Run in watch mode
nest start identity-service --watch
```

### Step 7.2: Docker Container

**Create `apps/identity-service/Dockerfile`:**
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm run build identity-service

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000 3001
CMD ["node", "dist/apps/identity-service/main"]
```

**Tasks for Step 7.2:**
- [ ] Create Dockerfile
- [ ] Build Docker image
- [ ] Test locally with Docker

### Step 7.3: AWS Infrastructure

See separate guide: `docs/implementation-plans/04-INFRASTRUCTURE-TERRAFORM.md`

**Tasks for Step 7.3:**
- [ ] Set up RDS PostgreSQL database
- [ ] Set up ECS Fargate service
- [ ] Set up ALB with dual ports
- [ ] Set up AWS Cognito User Pool
- [ ] Configure environment variables in SSM
- [ ] Deploy to AWS

---

## Checklist Summary

### Domain Layer
- [ ] Value objects created and tested
- [ ] Domain events defined
- [ ] Repository interfaces defined
- [ ] Aggregates implemented with business logic
- [ ] Domain services created

### Infrastructure Layer
- [ ] Database schemas defined
- [ ] Migrations generated and applied
- [ ] Repositories implemented
- [ ] External service adapters created
- [ ] Infrastructure module configured

### Application Layer
- [ ] Command handlers implemented
- [ ] Query handlers implemented
- [ ] Event handlers implemented
- [ ] DTOs created

### Presentation Layer
- [ ] Request/response DTOs created
- [ ] Public API controllers implemented
- [ ] Internal API controllers implemented
- [ ] Guards and interceptors added
- [ ] Root module wired up
- [ ] Main entry point created

### Testing
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests written
- [ ] E2E tests written

### Deployment
- [ ] Local development working
- [ ] Docker container built
- [ ] AWS infrastructure deployed

---

## Next Steps

After completing Identity Service, proceed to:
1. **Tutor Service** - See `docs/implementation-plans/02-TUTOR-SERVICE.md`
2. **Admin Service** - See `docs/implementation-plans/03-ADMIN-SERVICE.md`

---

## References

- [Architecture Overview](../ARCHITECTURE.md)
- [Service Structure Guide](../SERVICE_STRUCTURE.md)
- [CQRS & Event Sourcing](../CQRS_EVENT_SOURCING.md)
- [Drizzle ORM Guide](../DRIZZLE_NESTJS_MODULE.md)
