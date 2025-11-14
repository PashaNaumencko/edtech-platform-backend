# Service Structure Guide

**Complete code organization patterns for all microservices**

**Last Updated:** November 2025

---

## Table of Contents

1. [Standard Service Structure](#standard-service-structure)
2. [Layer Responsibilities](#layer-responsibilities)
3. [Domain Layer](#domain-layer)
4. [Application Layer](#application-layer)
5. [Infrastructure Layer](#infrastructure-layer)
6. [Presentation Layer](#presentation-layer)
7. [Service Examples](#service-examples)
8. [Naming Conventions](#naming-conventions)
9. [Module Organization](#module-organization)
10. [Best Practices](#best-practices)

---

## Standard Service Structure

All services follow this consistent structure based on Clean Architecture and DDD principles:

```
apps/[service-name]/
├── src/
│   ├── domain/                    # Pure business logic (no dependencies)
│   │   ├── aggregates/           # Aggregate roots (consistency boundaries)
│   │   ├── entities/             # Entities within aggregates
│   │   ├── value-objects/        # Immutable, validated data
│   │   ├── events/               # Domain events
│   │   ├── repositories/         # Repository interfaces (no implementation)
│   │   ├── services/             # Domain services (stateless logic)
│   │   └── exceptions/           # Domain-specific exceptions
│   │
│   ├── application/              # Use cases (orchestration)
│   │   ├── commands/             # Write operations (CQRS)
│   │   │   ├── create-entity.command.ts
│   │   │   └── create-entity.handler.ts
│   │   ├── queries/              # Read operations (CQRS)
│   │   │   ├── get-entity.query.ts
│   │   │   └── get-entity.handler.ts
│   │   ├── event-handlers/       # React to domain/integration events
│   │   │   └── entity-created.handler.ts
│   │   ├── dtos/                 # Data transfer objects
│   │   │   └── entity.dto.ts
│   │   └── interfaces/           # Application interfaces
│   │       └── use-case.interface.ts
│   │
│   ├── infrastructure/           # External concerns
│   │   ├── persistence/
│   │   │   └── drizzle/
│   │   │       ├── schema.ts     # Database schema
│   │   │       ├── repositories/ # Repository implementations
│   │   │       │   └── entity.repository.impl.ts
│   │   │       └── mappers/      # Domain ↔ Persistence
│   │   │           └── entity.mapper.ts
│   │   ├── messaging/
│   │   │   ├── eventbridge.publisher.ts
│   │   │   └── sqs.consumer.ts
│   │   ├── external-services/    # Third-party integrations
│   │   │   ├── cognito.adapter.ts
│   │   │   ├── s3.adapter.ts
│   │   │   └── stripe.adapter.ts
│   │   └── config/               # Configuration services
│   │       ├── database.config.ts
│   │       └── service.config.ts
│   │
│   ├── presentation/             # API layer
│   │   ├── http/
│   │   │   ├── controllers/
│   │   │   │   ├── public/       # Port 3000 (external clients)
│   │   │   │   │   └── entity.controller.ts
│   │   │   │   └── internal/     # Port 3001 (service-to-service)
│   │   │   │       └── entity-internal.controller.ts
│   │   │   ├── dtos/             # Request/response DTOs
│   │   │   │   ├── create-entity-request.dto.ts
│   │   │   │   └── entity-response.dto.ts
│   │   │   ├── guards/           # Authentication/authorization
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   ├── interceptors/     # Request/response transformation
│   │   │   │   └── logging.interceptor.ts
│   │   │   └── filters/          # Exception handling
│   │   │       └── http-exception.filter.ts
│   │   └── websocket/            # WebSocket gateways (if needed)
│   │       └── entity.gateway.ts
│   │
│   ├── [service-name].module.ts  # Root module
│   └── main.ts                    # Application entry point (dual-port setup)
│
├── test/
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── e2e/                       # End-to-end tests
│
├── drizzle/                       # Database migrations
│   └── migrations/
│
├── drizzle.config.ts              # Drizzle configuration
├── tsconfig.app.json              # TypeScript config
├── Dockerfile                     # Docker image
└── package.json                   # Service-specific dependencies (if any)
```

---

## Layer Responsibilities

### Domain Layer (Pure Business Logic)

**Purpose:** Contains core business rules and logic

**Rules:**
- ✅ No external dependencies (no imports from infrastructure/presentation)
- ✅ No framework dependencies (pure TypeScript)
- ✅ Can only depend on other domain objects
- ✅ Testable without mocks

**Contains:**
- Aggregates (consistency boundaries)
- Entities (objects with identity)
- Value Objects (immutable, validated data)
- Domain Events (state changes)
- Repository Interfaces (contracts)
- Domain Services (complex logic)

### Application Layer (Use Cases)

**Purpose:** Orchestrates domain objects to fulfill use cases

**Rules:**
- ✅ Can depend on domain layer
- ✅ Uses repository interfaces (not implementations)
- ✅ Publishes domain events
- ✅ No direct database or external service calls

**Contains:**
- Commands (write operations)
- Queries (read operations)
- Event Handlers (react to events)
- DTOs (data transfer)
- Application Services

### Infrastructure Layer (External Concerns)

**Purpose:** Implements technical details and integrations

**Rules:**
- ✅ Implements domain interfaces
- ✅ Handles database, messaging, external APIs
- ✅ Contains framework-specific code
- ✅ No business logic

**Contains:**
- Repository Implementations
- Database Schemas (Drizzle)
- Message Publishers/Consumers
- External Service Adapters
- Configuration Services

### Presentation Layer (API)

**Purpose:** Exposes application functionality via APIs

**Rules:**
- ✅ Transforms HTTP requests to commands/queries
- ✅ Handles authentication/authorization
- ✅ Validates input
- ✅ Maps responses

**Contains:**
- Controllers (REST endpoints)
- WebSocket Gateways
- DTOs (request/response)
- Guards, Interceptors, Filters

---

## Domain Layer

### Aggregate Root

**Purpose:** Enforces invariants and consistency within a boundary

```typescript
// apps/identity/src/domain/aggregates/user-account.aggregate.ts
import { AggregateRoot } from '@nestjs/cqrs';
import { UserId } from '../value-objects/user-id.vo';
import { Email } from '../value-objects/email.vo';
import { UserCreatedEvent } from '../events/user-created.event';
import { EmailVerifiedEvent } from '../events/email-verified.event';

export class UserAccount extends AggregateRoot {
  private constructor(
    private readonly _id: UserId,
    private _email: Email,
    private _cognitoUserId: string,
    private _role: 'student' | 'tutor' | 'admin',
    private _emailVerified: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    super();
  }

  // Factory method (creation)
  static create(
    email: Email,
    cognitoUserId: string,
    role: 'student' | 'tutor' | 'admin',
  ): UserAccount {
    const userId = UserId.generate();
    const now = new Date();

    const user = new UserAccount(
      userId,
      email,
      cognitoUserId,
      role,
      false, // emailVerified
      now,
      now,
    );

    // Emit domain event
    user.apply(
      new UserCreatedEvent(
        userId.value,
        email.value,
        role,
        cognitoUserId,
      ),
    );

    return user;
  }

  // Business logic method
  verifyEmail(): void {
    if (this._emailVerified) {
      throw new Error('Email already verified');
    }

    this._emailVerified = true;
    this._updatedAt = new Date();

    this.apply(new EmailVerifiedEvent(this._id.value, this._email.value));
  }

  // Getters only (immutability)
  get id(): string {
    return this._id.value;
  }

  get email(): string {
    return this._email.value;
  }

  get emailVerified(): boolean {
    return this._emailVerified;
  }

  get role(): string {
    return this._role;
  }

  // Reconstitution from persistence
  static fromPersistence(data: {
    id: string;
    email: string;
    cognitoUserId: string;
    role: 'student' | 'tutor' | 'admin';
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): UserAccount {
    return new UserAccount(
      UserId.from(data.id),
      Email.create(data.email),
      data.cognitoUserId,
      data.role,
      data.emailVerified,
      data.createdAt,
      data.updatedAt,
    );
  }

  // Conversion to persistence
  toPersistence(): {
    id: string;
    email: string;
    cognitoUserId: string;
    role: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this._id.value,
      email: this._email.value,
      cognitoUserId: this._cognitoUserId,
      role: this._role,
      emailVerified: this._emailVerified,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
```

### Value Object

**Purpose:** Immutable, self-validating data objects

```typescript
// apps/identity/src/domain/value-objects/email.vo.ts
import { DomainException } from '../exceptions/domain.exception';

export class Email {
  private readonly _value: string;

  private constructor(value: string) {
    this.validate(value);
    this._value = value.toLowerCase().trim();
  }

  static create(value: string): Email {
    return new Email(value);
  }

  private validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new DomainException('Email is required');
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new DomainException('Email cannot be empty');
    }

    if (trimmed.length > 255) {
      throw new DomainException('Email is too long (max 255 characters)');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new DomainException('Invalid email format');
    }
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
```

### Domain Event

**Purpose:** Captures state changes in the domain

```typescript
// apps/identity/src/domain/events/user-created.event.ts
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly role: 'student' | 'tutor' | 'admin',
    public readonly cognitoUserId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
```

### Repository Interface

**Purpose:** Defines contract for persistence (no implementation)

```typescript
// apps/identity/src/domain/repositories/user-account.repository.ts
import { UserAccount } from '../aggregates/user-account.aggregate';

export interface UserAccountRepository {
  save(userAccount: UserAccount): Promise<void>;
  findById(id: string): Promise<UserAccount | null>;
  findByEmail(email: string): Promise<UserAccount | null>;
  findByCognitoUserId(cognitoUserId: string): Promise<UserAccount | null>;
  exists(email: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}

export const USER_ACCOUNT_REPOSITORY = Symbol('USER_ACCOUNT_REPOSITORY');
```

---

## Application Layer

### Command & Handler

**Purpose:** Execute write operations

```typescript
// apps/identity/src/application/commands/create-user.command.ts
export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly cognitoUserId: string,
    public readonly role: 'student' | 'tutor' | 'admin',
    public readonly correlationId?: string,
  ) {}
}

// apps/identity/src/application/commands/create-user.handler.ts
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateUserCommand } from './create-user.command';
import { UserAccount } from '../../domain/aggregates/user-account.aggregate';
import { Email } from '../../domain/value-objects/email.vo';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from '../../domain/repositories/user-account.repository';
import { EventBridgePublisher } from '@app/shared-kernel';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly repository: UserAccountRepository,
    private readonly eventBus: EventBus, // NestJS CQRS (in-process)
    private readonly eventBridge: EventBridgePublisher, // AWS EventBridge (cross-service)
  ) {}

  async execute(command: CreateUserCommand): Promise<string> {
    // 1. Check if user exists
    const exists = await this.repository.exists(command.email);
    if (exists) {
      throw new Error('User with this email already exists');
    }

    // 2. Create aggregate
    const email = Email.create(command.email);
    const userAccount = UserAccount.create(
      email,
      command.cognitoUserId,
      command.role,
    );

    // 3. Persist
    await this.repository.save(userAccount);

    // 4. Publish events (local)
    const domainEvents = userAccount.getUncommittedEvents();
    domainEvents.forEach((event) => this.eventBus.publish(event));

    // 5. Publish events (cross-service)
    await this.eventBridge.publishBatch(domainEvents, command.correlationId);

    // 6. Clear uncommitted events
    userAccount.commit();

    return userAccount.id;
  }
}
```

### Query & Handler

**Purpose:** Execute read operations

```typescript
// apps/identity/src/application/queries/get-user.query.ts
export class GetUserQuery {
  constructor(public readonly userId: string) {}
}

// apps/identity/src/application/queries/get-user.handler.ts
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetUserQuery } from './get-user.query';
import { UserDto } from '../dtos/user.dto';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from '../../domain/repositories/user-account.repository';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly repository: UserAccountRepository,
  ) {}

  async execute(query: GetUserQuery): Promise<UserDto> {
    const userAccount = await this.repository.findById(query.userId);

    if (!userAccount) {
      throw new NotFoundException(`User not found: ${query.userId}`);
    }

    return UserDto.fromAggregate(userAccount);
  }
}
```

### DTO

**Purpose:** Transfer data between layers

```typescript
// apps/identity/src/application/dtos/user.dto.ts
import { UserAccount } from '../../domain/aggregates/user-account.aggregate';

export class UserDto {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;

  static fromAggregate(user: UserAccount): UserDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.toPersistence().createdAt,
    };
  }
}
```

---

## Infrastructure Layer

### Repository Implementation

```typescript
// apps/identity/src/infrastructure/persistence/drizzle/repositories/user-account.repository.impl.ts
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../drizzle.service';
import { userAccounts } from '../schema';
import { UserAccountRepository } from '../../../../domain/repositories/user-account.repository';
import { UserAccount } from '../../../../domain/aggregates/user-account.aggregate';

@Injectable()
export class UserAccountRepositoryImpl implements UserAccountRepository {
  constructor(private readonly db: DrizzleService) {}

  async save(userAccount: UserAccount): Promise<void> {
    const data = userAccount.toPersistence();

    await this.db.getDb()
      .insert(userAccounts)
      .values(data)
      .onConflictDoUpdate({
        target: userAccounts.id,
        set: {
          emailVerified: data.emailVerified,
          updatedAt: data.updatedAt,
        },
      });
  }

  async findById(id: string): Promise<UserAccount | null> {
    const result = await this.db.getDb()
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.id, id))
      .limit(1);

    return result[0] ? UserAccount.fromPersistence(result[0]) : null;
  }

  async findByEmail(email: string): Promise<UserAccount | null> {
    const result = await this.db.getDb()
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.email, email.toLowerCase()))
      .limit(1);

    return result[0] ? UserAccount.fromPersistence(result[0]) : null;
  }

  async findByCognitoUserId(cognitoUserId: string): Promise<UserAccount | null> {
    const result = await this.db.getDb()
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.cognitoUserId, cognitoUserId))
      .limit(1);

    return result[0] ? UserAccount.fromPersistence(result[0]) : null;
  }

  async exists(email: string): Promise<boolean> {
    const result = await this.db.getDb()
      .select({ id: userAccounts.id })
      .from(userAccounts)
      .where(eq(userAccounts.email, email.toLowerCase()))
      .limit(1);

    return result.length > 0;
  }

  async delete(id: string): Promise<void> {
    await this.db.getDb()
      .delete(userAccounts)
      .where(eq(userAccounts.id, id));
  }
}
```

### Database Schema

```typescript
// apps/identity/src/infrastructure/persistence/drizzle/schema.ts
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const userAccounts = pgTable('user_accounts', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  cognitoUserId: text('cognito_user_id').notNull().unique(),
  role: text('role').notNull(), // 'student', 'tutor', 'admin'
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Type inference
export type UserAccountSchema = typeof userAccounts.$inferSelect;
export type NewUserAccountSchema = typeof userAccounts.$inferInsert;
```

---

## Presentation Layer

### Controller (Public API)

```typescript
// apps/identity/src/presentation/http/controllers/public/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateUserCommand } from '../../../../application/commands/create-user.command';
import { GetUserQuery } from '../../../../application/queries/get-user.query';
import { CreateUserRequestDto } from '../../dtos/create-user-request.dto';
import { UserResponseDto } from '../../dtos/user-response.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: CreateUserRequestDto,
  ): Promise<UserResponseDto> {
    const command = new CreateUserCommand(
      dto.email,
      dto.cognitoUserId,
      dto.role,
    );

    const userId = await this.commandBus.execute<CreateUserCommand, string>(command);

    const query = new GetUserQuery(userId);
    const user = await this.queryBus.execute(query);

    return UserResponseDto.fromDto(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req): Promise<UserResponseDto> {
    const query = new GetUserQuery(req.user.userId);
    const user = await this.queryBus.execute(query);

    return UserResponseDto.fromDto(user);
  }
}
```

### Request/Response DTOs

```typescript
// apps/identity/src/presentation/http/dtos/create-user-request.dto.ts
import { IsEmail, IsString, IsIn } from 'class-validator';

export class CreateUserRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  cognitoUserId: string;

  @IsIn(['student', 'tutor', 'admin'])
  role: 'student' | 'tutor' | 'admin';
}

// apps/identity/src/presentation/http/dtos/user-response.dto.ts
import { UserDto } from '../../../application/dtos/user.dto';

export class UserResponseDto {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;

  static fromDto(dto: UserDto): UserResponseDto {
    return {
      id: dto.id,
      email: dto.email,
      role: dto.role,
      emailVerified: dto.emailVerified,
      createdAt: dto.createdAt.toISOString(),
    };
  }
}
```

---

## Service Examples

### Identity Service

- **Aggregates:** UserAccount, StudentProfile, TutorAccount
- **Key Features:** Registration, login, email verification, COPPA compliance
- **Database:** identity_db (PostgreSQL)
- **Ports:** 3000 (public), 3001 (internal)

### Tutor Service

- **Aggregates:** TutorProfile, VerificationDocument, Subject
- **Key Features:** Profile creation, document upload, verification workflow
- **Database:** tutor_db (PostgreSQL)
- **Ports:** 3002 (public), 3003 (internal)

### Admin Service

- **Aggregates:** AdminUser, VerificationDecision, AuditLog
- **Key Features:** Tutor approval, user management, analytics
- **Database:** admin_db (PostgreSQL)
- **Ports:** 3004 (public), 3005 (internal)

---

## Naming Conventions

### Files

```
// Aggregates
user-account.aggregate.ts

// Value Objects
email.vo.ts
user-id.vo.ts

// Events
user-created.event.ts

// Commands
create-user.command.ts
create-user.handler.ts

// Queries
get-user.query.ts
get-user.handler.ts

// Repositories
user-account.repository.ts           // Interface (domain)
user-account.repository.impl.ts      // Implementation (infrastructure)

// Controllers
auth.controller.ts

// DTOs
create-user-request.dto.ts
user-response.dto.ts
```

### Classes

```typescript
// Aggregates: PascalCase + Aggregate
UserAccount
TutorProfile
StudentProfile

// Value Objects: PascalCase
Email
PersonalName
DateOfBirth

// Events: PascalCase + Event
UserCreatedEvent
EmailVerifiedEvent

// Commands: PascalCase + Command
CreateUserCommand

// Queries: PascalCase + Query
GetUserQuery

// DTOs: PascalCase + Dto
UserDto
CreateUserRequestDto
```

---

## Module Organization

```typescript
// apps/identity/src/identity.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';

// Command Handlers
import { CreateUserHandler } from './application/commands/create-user.handler';

// Query Handlers
import { GetUserHandler } from './application/queries/get-user.handler';

// Event Handlers
import { UserCreatedHandler } from './application/event-handlers/user-created.handler';

// Repositories
import { UserAccountRepositoryImpl } from './infrastructure/persistence/drizzle/repositories/user-account.repository.impl';
import { USER_ACCOUNT_REPOSITORY } from './domain/repositories/user-account.repository';

// Controllers
import { AuthController } from './presentation/http/controllers/public/auth.controller';

// Services
import { DrizzleService } from './infrastructure/database/drizzle.service';
import { DatabaseConfigService } from './infrastructure/config/database.config';
import { SSMConfigService } from '@app/shared-kernel';

@Module({
  imports: [
    CqrsModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [AuthController],
  providers: [
    // Command Handlers
    CreateUserHandler,

    // Query Handlers
    GetUserHandler,

    // Event Handlers
    UserCreatedHandler,

    // Repositories
    {
      provide: USER_ACCOUNT_REPOSITORY,
      useClass: UserAccountRepositoryImpl,
    },

    // Infrastructure
    DrizzleService,
    DatabaseConfigService,
    SSMConfigService,
  ],
})
export class IdentityModule {}
```

---

## Best Practices

### 1. Dependency Direction

```
Presentation → Application → Domain ← Infrastructure
                                ↑
                            (implements)
```

### 2. No Circular Dependencies

```typescript
// ❌ BAD
// domain imports from infrastructure
import { DrizzleService } from '../../infrastructure/database/drizzle.service';

// ✅ GOOD
// infrastructure implements domain interface
export interface UserAccountRepository { ... }
```

### 3. Aggregate Boundaries

```typescript
// ❌ BAD: Direct modification
user.profile.updateName('John');

// ✅ GOOD: Through aggregate root
user.updateProfileName('John');
```

### 4. Value Object Validation

```typescript
// ✅ GOOD: Validate in constructor
class Email {
  private constructor(value: string) {
    this.validate(value);
    this._value = value;
  }

  static create(value: string): Email {
    return new Email(value);
  }
}
```

### 5. Event Publishing

```typescript
// ✅ GOOD: Publish after persistence
await this.repository.save(user);
const events = user.getUncommittedEvents();
events.forEach(event => this.eventBus.publish(event));
user.commit();
```

---

## Next Steps

- **Implementation Guide:** See [MASTER_IMPLEMENTATION_GUIDE.md](MASTER_IMPLEMENTATION_GUIDE.md)
- **Development Workflow:** See [DEVELOPMENT.md](DEVELOPMENT.md)
- **Testing Strategies:** See [TESTING.md](TESTING.md)
- **API Documentation:** See [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
