# Master Implementation Guide

Complete step-by-step guide for implementing the EdTech Platform backend from scratch, including setting up the development environment, implementing services, and deploying to AWS.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Phase 1: Project Setup](#phase-1-project-setup)
- [Phase 2: Implementing User Service](#phase-2-implementing-user-service)
- [Phase 3: Implementing Tutor Service](#phase-3-implementing-tutor-service)
- [Phase 4: Implementing Admin Service](#phase-4-implementing-admin-service)
- [Phase 5: EventBridge Integration](#phase-5-eventbridge-integration)
- [Phase 6: Infrastructure Deployment](#phase-6-infrastructure-deployment)
- [Phase 7: Testing and Quality Assurance](#phase-7-testing-and-quality-assurance)
- [Common Patterns and Templates](#common-patterns-and-templates)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

```bash
# Node.js 20+
node --version  # v20.x.x

# pnpm (package manager)
npm install -g pnpm
pnpm --version  # 8.x.x

# Docker
docker --version  # 24.x.x
docker-compose --version  # 2.x.x

# Terraform
terraform --version  # 1.6.x

# AWS CLI
aws --version  # 2.x.x

# NestJS CLI
npm install -g @nestjs/cli
nest --version  # 10.x.x
```

### AWS Account Setup

```bash
# Configure AWS credentials
aws configure
# AWS Access Key ID: [your-key]
# AWS Secret Access Key: [your-secret]
# Default region: us-east-1
# Output format: json

# Verify access
aws sts get-caller-identity
```

### Knowledge Requirements

- **TypeScript**: Intermediate level
- **NestJS**: Basic understanding of modules, providers, controllers
- **PostgreSQL**: Basic SQL knowledge
- **Docker**: Basic container concepts
- **DDD**: Understanding of entities, value objects, aggregates
- **CQRS**: Basic understanding of command/query separation

## Phase 1: Project Setup

### Step 1.1: Create NestJS Monorepo

```bash
# Create new NestJS project
nest new edtech-platform-backend
cd edtech-platform-backend

# Initialize pnpm
rm -rf node_modules package-lock.json
pnpm install

# Initialize git
git init
git add .
git commit -m "Initial commit"
```

### Step 1.2: Configure Monorepo Structure

**Update**: `nest-cli.json`

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "apps/edtech-platform-backend/src",
  "compilerOptions": {
    "deleteOutDir": true,
    "webpack": true,
    "tsConfigPath": "apps/edtech-platform-backend/tsconfig.app.json"
  },
  "monorepo": true,
  "root": "apps/edtech-platform-backend",
  "projects": {
    "user-service": {
      "type": "application",
      "root": "apps/user-service",
      "entryFile": "main",
      "sourceRoot": "apps/user-service/src",
      "compilerOptions": {
        "tsConfigPath": "apps/user-service/tsconfig.app.json"
      }
    },
    "tutor-service": {
      "type": "application",
      "root": "apps/tutor-service",
      "entryFile": "main",
      "sourceRoot": "apps/tutor-service/src",
      "compilerOptions": {
        "tsConfigPath": "apps/tutor-service/tsconfig.app.json"
      }
    },
    "shared-kernel": {
      "type": "library",
      "root": "libs/shared-kernel",
      "entryFile": "index",
      "sourceRoot": "libs/shared-kernel/src",
      "compilerOptions": {
        "tsConfigPath": "libs/shared-kernel/tsconfig.lib.json"
      }
    }
  }
}
```

### Step 1.3: Create Shared Libraries

```bash
# Generate shared libraries
nest generate library types
nest generate library auth
nest generate library config
nest generate library drizzle
nest generate library service-auth
nest generate library constants

# Directory structure
libs/
├── types/              # Shared TypeScript types
├── auth/               # AWS Cognito integration
├── config/             # Configuration module
├── drizzle/            # Drizzle ORM setup
├── service-auth/       # Inter-service authentication
└── constants/          # Shared constants
```

### Step 1.4: Install Dependencies

**Update**: `package.json`

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/cqrs": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@aws-sdk/client-cognito-identity-provider": "^3.450.0",
    "@aws-sdk/client-dynamodb": "^3.450.0",
    "@aws-sdk/client-eventbridge": "^3.450.0",
    "@aws-sdk/client-s3": "^3.450.0",
    "@aws-sdk/client-ssm": "^3.450.0",
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "drizzle-kit": "^0.20.0",
    "eslint": "^8.42.0",
    "jest": "^29.5.0",
    "prettier": "^3.0.0",
    "typescript": "^5.1.3"
  }
}
```

```bash
# Install dependencies
pnpm install
```

### Step 1.5: Setup Docker for Local Development

**Create**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: edtech-postgres
    environment:
      POSTGRES_USER: edtech
      POSTGRES_PASSWORD: edtech123
      POSTGRES_DB: edtech_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    container_name: edtech-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Create**: `docker/postgres/init.sql`

```sql
-- Create databases for each service
CREATE DATABASE user_service;
CREATE DATABASE tutor_service;
CREATE DATABASE admin_service;
CREATE DATABASE matching_service;
CREATE DATABASE lesson_service;
CREATE DATABASE payment_service;
```

```bash
# Start local infrastructure
docker-compose up -d

# Verify containers are running
docker ps
```

### Step 1.6: Setup Shared Types Library

**Create**: `libs/types/src/response.dto.ts`

```typescript
export class ErrorDetailDto {
  constructor(
    public readonly message: string,
    public readonly field?: string,
  ) {}
}

export class ErrorResponseDto {
  public readonly success = false;
  public readonly timestamp: string;

  constructor(
    public readonly message: string,
    public readonly errors: string[],
  ) {
    this.timestamp = new Date().toISOString();
  }

  static create(message: string, errors: string[] = []): ErrorResponseDto {
    return new ErrorResponseDto(message, errors);
  }
}

export class SuccessResponseDto<T> {
  public readonly success = true;
  public readonly timestamp: string;

  constructor(
    public readonly data: T,
    public readonly message?: string,
  ) {
    this.timestamp = new Date().toISOString();
  }

  static create<T>(data: T, message?: string): SuccessResponseDto<T> {
    return new SuccessResponseDto(data, message);
  }
}

export class SingleEntityResponseDto<T> {
  constructor(public readonly data: T) {}

  static create<T>(data: T): SingleEntityResponseDto<T> {
    return new SingleEntityResponseDto(data);
  }
}

export class PaginatedResponseDto<T> {
  constructor(
    public readonly items: T[],
    public readonly total: number,
    public readonly limit: number,
    public readonly offset: number,
    public readonly hasNext: boolean,
  ) {}

  static create<T>(params: {
    items: T[];
    total: number;
    limit: number;
    offset?: number;
  }): PaginatedResponseDto<T> {
    const offset = params.offset || 0;
    const hasNext = offset + params.limit < params.total;

    return new PaginatedResponseDto(
      params.items,
      params.total,
      params.limit,
      offset,
      hasNext,
    );
  }
}
```

## Phase 2: Implementing User Service

### Step 2.1: Generate User Service

```bash
# Generate user service application
nest generate app user-service

# Service structure
apps/user-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── events/
│   │   └── services/
│   ├── application/
│   │   ├── use-cases/
│   │   ├── dto/
│   │   ├── event-handlers/
│   │   └── interfaces/
│   ├── infrastructure/
│   │   ├── repositories/
│   │   ├── event-bridge/
│   │   └── persistence/
│   ├── presentation/
│   │   └── http/
│   │       └── controllers/
│   ├── config/
│   ├── app.module.ts
│   └── main.ts
└── test/
```

### Step 2.2: Create Domain Layer

**Create**: `apps/user-service/src/domain/value-objects/user-role.vo.ts`

```typescript
export class UserRole {
  private constructor(private readonly _value: string) {
    this.validate();
  }

  private validate(): void {
    const validRoles = ['student', 'tutor', 'admin', 'superadmin'];
    if (!validRoles.includes(this._value)) {
      throw new Error(`Invalid user role: ${this._value}`);
    }
  }

  static student(): UserRole {
    return new UserRole('student');
  }

  static tutor(): UserRole {
    return new UserRole('tutor');
  }

  static admin(): UserRole {
    return new UserRole('admin');
  }

  static superadmin(): UserRole {
    return new UserRole('superadmin');
  }

  static fromString(value: string): UserRole {
    return new UserRole(value.toLowerCase());
  }

  equals(other: UserRole): boolean {
    return this._value === other._value;
  }

  get value(): string {
    return this._value;
  }

  canManageUsers(): boolean {
    return ['admin', 'superadmin'].includes(this._value);
  }

  canManageTutors(): boolean {
    return ['admin', 'superadmin'].includes(this._value);
  }
}
```

**Create**: `apps/user-service/src/domain/entities/user.entity.ts`

```typescript
import { AggregateRoot } from '@nestjs/cqrs';
import { UserCreatedEvent } from '../events/user-created.event';
import { UserRoleChangedEvent } from '../events/user-role-changed.event';
import { UserRole } from '../value-objects/user-role.vo';

export class User extends AggregateRoot {
  private _id: string;
  private _email: string;
  private _firstName: string;
  private _lastName: string;
  private _role: UserRole;
  private _status: string;
  private _bio?: string;
  private _skills: string[];
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor() {
    super();
  }

  static create(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status?: string;
    bio?: string;
    skills?: string[];
  }): User {
    const user = new User();
    user._id = crypto.randomUUID();
    user._email = data.email;
    user._firstName = data.firstName;
    user._lastName = data.lastName;
    user._role = data.role;
    user._status = data.status || 'pending_verification';
    user._bio = data.bio;
    user._skills = data.skills || [];
    user._createdAt = new Date();
    user._updatedAt = new Date();

    // Apply domain event
    user.apply(new UserCreatedEvent({
      userId: user._id,
      email: user._email,
      firstName: user._firstName,
      lastName: user._lastName,
      role: user._role.value,
      status: user._status,
    }));

    return user;
  }

  changeRole(newRole: UserRole): void {
    if (!this.isActive()) {
      throw new Error('User must be active to change role');
    }

    if (this._role.equals(newRole)) {
      throw new Error('User already has this role');
    }

    const oldRole = this._role;
    this._role = newRole;
    this._updatedAt = new Date();

    this.apply(new UserRoleChangedEvent({
      userId: this._id,
      oldRole: oldRole.value,
      newRole: newRole.value,
    }));
  }

  activate(): void {
    if (this._status === 'active') {
      throw new Error('User is already active');
    }

    this._status = 'active';
    this._updatedAt = new Date();
  }

  updateProfile(data: { bio?: string; skills?: string[] }): void {
    if (data.bio !== undefined) {
      this._bio = data.bio;
    }

    if (data.skills !== undefined) {
      this._skills = data.skills;
    }

    this._updatedAt = new Date();
  }

  isActive(): boolean {
    return this._status === 'active';
  }

  // Getters
  get id(): string { return this._id; }
  get email(): string { return this._email; }
  get firstName(): string { return this._firstName; }
  get lastName(): string { return this._lastName; }
  get role(): UserRole { return this._role; }
  get status(): string { return this._status; }
  get bio(): string | undefined { return this._bio; }
  get skills(): string[] { return this._skills; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  // For persistence mapping
  mergeObjectContext(data: any): void {
    this._id = data.id;
    this._email = data.email;
    this._firstName = data.firstName;
    this._lastName = data.lastName;
    this._role = UserRole.fromString(data.role);
    this._status = data.status;
    this._bio = data.bio;
    this._skills = data.skills || [];
    this._createdAt = data.createdAt;
    this._updatedAt = data.updatedAt;
  }
}
```

**Create**: `apps/user-service/src/domain/events/user-created.event.ts`

```typescript
import { IEvent } from '@nestjs/cqrs';

export interface UserCreatedPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

export class UserCreatedEvent implements IEvent {
  public readonly eventId: string;
  public readonly eventName = 'user.created';
  public readonly occurredAt: Date;

  constructor(
    public readonly payload: UserCreatedPayload,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }

  get userId(): string {
    return this.payload.userId;
  }

  get email(): string {
    return this.payload.email;
  }
}
```

### Step 2.3: Create Application Layer

**Create**: `apps/user-service/src/application/interfaces/repository.interface.ts`

```typescript
import { User } from '../../domain/entities/user.entity';

export interface IUserRepository {
  save(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(offset: number, limit: number): Promise<{
    users: User[];
    total: number;
  }>;
  delete(id: string): Promise<void>;
}
```

**Create**: `apps/user-service/src/application/dto/create-user.dto.ts`

```typescript
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';
import { UserRole } from '../../domain/value-objects/user-role.vo';

export class CreateUserRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  role: UserRole;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsArray()
  @IsOptional()
  skills?: string[];
}

export class CreateUserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  bio?: string;
  skills: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Create**: `apps/user-service/src/application/use-cases/create-user/create-user.usecase.ts`

```typescript
import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { User } from '../../../domain/entities/user.entity';
import { IUserRepository } from '../../interfaces/repository.interface';
import { CreateUserRequestDto, CreateUserResponseDto } from '../../dto/create-user.dto';
import { DI_TOKENS } from '../../../constants';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(DI_TOKENS.USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: CreateUserRequestDto): Promise<CreateUserResponseDto> {
    // 1. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // 2. Create domain entity
    const user = User.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      status: dto.status,
      bio: dto.bio,
      skills: dto.skills,
    });

    // 3. Persist to repository
    await this.userRepository.save(user);

    // 4. Publish domain events
    user.commit();

    // 5. Return response
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.value,
      status: user.status,
      bio: user.bio,
      skills: user.skills,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
```

**Create**: `apps/user-service/src/application/event-handlers/user-created.handler.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from '../../domain/events/user-created.event';

@EventsHandler(UserCreatedEvent)
@Injectable()
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  private readonly logger = new Logger(UserCreatedEventHandler.name);

  async handle(event: UserCreatedEvent): Promise<void> {
    this.logger.log(`User created: ${event.userId}`);

    // TODO: Send welcome email
    // TODO: Initialize user analytics
    // TODO: Publish to EventBridge
  }
}
```

### Step 2.4: Create Infrastructure Layer

**Setup Drizzle**: `apps/user-service/drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/persistence/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://edtech:edtech123@localhost:5432/user_service',
  },
});
```

**Create**: `apps/user-service/src/infrastructure/persistence/schema.ts`

```typescript
import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull(),
  bio: text('bio'),
  skills: jsonb('skills').$type<string[]>().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

**Create**: `apps/user-service/src/infrastructure/repositories/drizzle-user.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@edtech/drizzle';
import { users, User as DrizzleUser } from '../persistence/schema';
import { IUserRepository } from '../../application/interfaces/repository.interface';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async save(user: User): Promise<User> {
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.value,
      status: user.status,
      bio: user.bio || null,
      skills: user.skills || [],
      updatedAt: new Date(),
    };

    const [savedUser] = await this.drizzle.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: userData,
      })
      .returning();

    return this.mapToDomainEntity(savedUser);
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ? this.mapToDomainEntity(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ? this.mapToDomainEntity(user) : null;
  }

  async findAll(offset: number = 0, limit: number = 10): Promise<{
    users: User[];
    total: number;
  }> {
    const foundUsers = await this.drizzle.db
      .select()
      .from(users)
      .offset(offset)
      .limit(limit);

    const [{ count }] = await this.drizzle.db
      .select({ count: users.id })
      .from(users);

    return {
      users: foundUsers.map(user => this.mapToDomainEntity(user)),
      total: count,
    };
  }

  async delete(id: string): Promise<void> {
    await this.drizzle.db
      .delete(users)
      .where(eq(users.id, id));
  }

  private mapToDomainEntity(dbUser: DrizzleUser): User {
    const user = new User();
    user.mergeObjectContext({
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role,
      status: dbUser.status,
      bio: dbUser.bio,
      skills: Array.isArray(dbUser.skills) ? dbUser.skills : [],
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    });
    return user;
  }
}
```

### Step 2.5: Create Presentation Layer

**Create**: `apps/user-service/src/presentation/http/controllers/users.controller.ts`

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  SuccessResponseDto,
  SingleEntityResponseDto,
} from '@edtech/types';
import { CreateUserRequestDto, CreateUserResponseDto } from '../../../application/dto/create-user.dto';
import { CreateUserUseCase } from '../../../application/use-cases/create-user/create-user.usecase';

@Controller('internal/users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserRequestDto,
  ): Promise<SuccessResponseDto<SingleEntityResponseDto<CreateUserResponseDto>>> {
    const result = await this.createUserUseCase.execute(createUserDto);
    const singleResponse = SingleEntityResponseDto.create(result);
    return SuccessResponseDto.create(singleResponse);
  }

  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  getUser(@Param('userId') userId: string) {
    // TODO: Implement
    return SuccessResponseDto.create(
      SingleEntityResponseDto.create({ id: userId }),
    );
  }
}
```

### Step 2.6: Wire Everything Together

**Create**: `apps/user-service/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DrizzleModule } from '@edtech/drizzle';
import { CreateUserUseCase } from './application/use-cases/create-user/create-user.usecase';
import { UserCreatedEventHandler } from './application/event-handlers/user-created.handler';
import { DrizzleUserRepository } from './infrastructure/repositories/drizzle-user.repository';
import { UsersController } from './presentation/http/controllers/users.controller';
import { DI_TOKENS } from './constants';

const useCases = [CreateUserUseCase];
const eventHandlers = [UserCreatedEventHandler];
const repositories = [
  {
    provide: DI_TOKENS.USER_REPOSITORY,
    useClass: DrizzleUserRepository,
  },
];

@Module({
  imports: [
    CqrsModule,
    DrizzleModule.forRoot({
      connectionString: process.env.DATABASE_URL,
    }),
  ],
  controllers: [UsersController],
  providers: [
    ...useCases,
    ...eventHandlers,
    ...repositories,
  ],
})
export class AppModule {}
```

**Create**: `apps/user-service/src/constants/di-tokens.ts`

```typescript
export const DI_TOKENS = {
  USER_REPOSITORY: Symbol('USER_REPOSITORY'),
};
```

### Step 2.7: Run Migrations and Test

```bash
# Generate migration
cd apps/user-service
pnpm drizzle-kit generate

# Run migration
pnpm drizzle-kit migrate

# Start service
pnpm start:dev user-service

# Test endpoint
curl -X POST http://localhost:3001/internal/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  }'
```

## Phase 3: Implementing Tutor Service

Follow the same pattern as User Service:

1. Generate tutor service: `nest generate app tutor-service`
2. Create domain layer (Tutor entity, value objects, events)
3. Create application layer (use cases, DTOs, event handlers)
4. Create infrastructure layer (repositories, persistence)
5. Create presentation layer (controllers)
6. Wire everything in AppModule
7. Run migrations and test

**Key Differences**:
- Additional fields: subjects, hourly rate, verification status
- Document upload to S3
- EventBridge consumer for user.role_changed events

## Phase 4: Implementing Admin Service

Admin service focuses on management operations:

1. Tutor verification review
2. User management
3. Platform analytics
4. System monitoring

Use the same service template pattern.

## Phase 5: EventBridge Integration

### Step 5.1: Create EventBridge Service

**Create**: `libs/shared-kernel/src/infrastructure/event-bridge/event-bridge.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';

@Injectable()
export class EventBridgeService {
  private readonly client: EventBridgeClient;
  private readonly eventBusName: string;

  constructor() {
    this.client = new EventBridgeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.eventBusName = process.env.EVENT_BUS_NAME || 'edtech-event-bus';
  }

  async publishEvent(event: any): Promise<void> {
    const command = new PutEventsCommand({
      Entries: [{
        EventBusName: this.eventBusName,
        Source: 'user-service',
        DetailType: event.eventName,
        Detail: JSON.stringify(event),
        Time: event.occurredAt,
      }],
    });

    await this.client.send(command);
  }
}
```

### Step 5.2: Integrate with Event Handlers

Update `UserCreatedEventHandler` to publish to EventBridge:

```typescript
@EventsHandler(UserCreatedEvent)
@Injectable()
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  constructor(
    private readonly eventBridgeService: EventBridgeService,
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    // Publish to EventBridge
    await this.eventBridgeService.publishEvent(event);
  }
}
```

## Phase 6: Infrastructure Deployment

### Step 6.1: Setup Terraform Backend

```bash
./infrastructure/scripts/setup-backend.sh
```

### Step 6.2: Deploy Infrastructure

```bash
cd infrastructure/environments/dev

terraform init
terraform plan
terraform apply
```

### Step 6.3: Build and Push Docker Images

```bash
# Build images
docker build -t user-service -f apps/user-service/Dockerfile .
docker build -t tutor-service -f apps/tutor-service/Dockerfile .

# Push to ECR
./infrastructure/scripts/push-images.sh
```

### Step 6.4: Start Services

```bash
./infrastructure/scripts/start-services.sh
```

## Phase 7: Testing and Quality Assurance

### Step 7.1: Run Unit Tests

```bash
pnpm test
```

### Step 7.2: Run Integration Tests

```bash
pnpm test --testPathPattern=integration
```

### Step 7.3: Run E2E Tests

```bash
pnpm test:e2e
```

### Step 7.4: Check Code Quality

```bash
# Linting
pnpm lint

# Type checking
pnpm build:check

# Test coverage
pnpm test:cov
```

## Common Patterns and Templates

### Service Template Checklist

When creating a new service, follow this checklist:

- [ ] Generate service: `nest generate app [service-name]`
- [ ] Create domain layer:
  - [ ] Entities (extend AggregateRoot)
  - [ ] Value Objects
  - [ ] Domain Events
  - [ ] Domain Services
- [ ] Create application layer:
  - [ ] Use Cases
  - [ ] DTOs
  - [ ] Repository Interfaces
  - [ ] Event Handlers
- [ ] Create infrastructure layer:
  - [ ] Drizzle schema
  - [ ] Repository implementation
  - [ ] EventBridge integration
- [ ] Create presentation layer:
  - [ ] Controllers (dual-port)
  - [ ] Health check
- [ ] Configure AppModule
- [ ] Run migrations
- [ ] Write tests
- [ ] Update documentation

### Adding a New Use Case

```typescript
// 1. Create DTO
export class [Action][Entity]RequestDto {
  // Fields with validation
}

export class [Action][Entity]ResponseDto {
  // Response fields
}

// 2. Create Use Case
@Injectable()
export class [Action][Entity]UseCase {
  constructor(
    @Inject(DI_TOKENS.[ENTITY]_REPOSITORY)
    private readonly repository: I[Entity]Repository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: [Action][Entity]RequestDto): Promise<[Action][Entity]ResponseDto> {
    // 1. Validate
    // 2. Execute domain logic
    // 3. Persist
    // 4. Publish events
    // 5. Return response
  }
}

// 3. Add to module
providers: [
  // ... existing
  [Action][Entity]UseCase,
]

// 4. Use in controller
@Post('[path]')
async [action][Entity](@Body() dto: [Action][Entity]RequestDto) {
  return await this.useCase.execute(dto);
}
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
psql postgresql://edtech:edtech123@localhost:5432/user_service

# Check connection string
echo $DATABASE_URL
```

### ECS Task Not Starting

```bash
# Check task logs
aws logs tail /ecs/user-service --follow

# Check task status
aws ecs describe-tasks --cluster dev-cluster --tasks [task-id]

# Check service events
aws ecs describe-services --cluster dev-cluster --services user-service-service
```

### EventBridge Events Not Arriving

```bash
# Check EventBridge metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Events \
  --metric-name Invocations \
  --dimensions Name=RuleName,Value=user-created-rule \
  --start-time 2025-11-13T00:00:00Z \
  --end-time 2025-11-13T23:59:59Z \
  --period 3600 \
  --statistics Sum

# Check EventBridge logs
aws logs tail /aws/events/edtech-event-bus --follow
```

### High AWS Costs

```bash
# Check costs
./infrastructure/scripts/check-costs.sh

# Stop all services
./infrastructure/scripts/stop-services.sh

# Verify nothing is running
aws ecs list-tasks --cluster dev-cluster --desired-status RUNNING
```

## Summary

This master implementation guide covers:

- **Complete project setup** from scratch
- **User Service implementation** (full walkthrough)
- **Tutor and Admin services** (same pattern)
- **EventBridge integration** for cross-service communication
- **Infrastructure deployment** with Terraform
- **Testing and quality assurance**
- **Common patterns and templates**
- **Troubleshooting guide**

Follow this guide step-by-step to build the complete EdTech Platform backend with DDD, CQRS, and Event-Driven Architecture.
