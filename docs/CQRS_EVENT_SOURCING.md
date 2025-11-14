# CQRS and Event Sourcing Guide

Comprehensive guide to implementing CQRS (Command Query Responsibility Segregation), Event Sourcing, and Event-Driven Architecture in the EdTech Platform using NestJS CQRS and AWS EventBridge.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Basic CQRS Implementation](#basic-cqrs-implementation)
- [Domain Events](#domain-events)
- [Event Handlers](#event-handlers)
- [EventBridge Integration](#eventbridge-integration)
- [Event Sourcing with DynamoDB](#event-sourcing-with-dynamodb)
- [Advanced CQRS with Read Models](#advanced-cqrs-with-read-models)
- [Saga Patterns](#saga-patterns)
- [Testing CQRS Components](#testing-cqrs-components)
- [Best Practices](#best-practices)

## Architecture Overview

### CQRS Pattern

CQRS separates **write operations** (commands) from **read operations** (queries):

```
┌─────────────────────────────────────────────────────────┐
│                    Client Application                    │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐               ┌──────────────┐
│   Commands    │               │   Queries    │
│  (Write Side) │               │ (Read Side)  │
└───────┬───────┘               └──────┬───────┘
        │                               │
        ▼                               ▼
┌───────────────┐               ┌──────────────┐
│ Write Model   │──── Events ──▶│  Read Model  │
│  (Postgres)   │               │  (Postgres)  │
└───────────────┘               └──────────────┘
```

### Implementation Levels

Our platform uses **three levels** of CQRS:

#### Level 1: Basic CQRS (Identity, User, Tutor, Admin Services)
- **Use Case Services** instead of separate command/query handlers
- Simplified pattern for MVP
- Domain events published via NestJS CQRS
- Single database for reads and writes

#### Level 2: Advanced CQRS (Matching Service - Future)
- Separate read models optimized for queries
- Write to Postgres, read from optimized read store
- Event-driven synchronization between models

#### Level 3: Event Sourcing (Payment Service - Future)
- Complete event log as source of truth
- Store events in DynamoDB Event Store
- Rebuild state from event history
- Temporal queries and audit trail

## Basic CQRS Implementation

### Level 1: Use Case Services Pattern

This simplified approach uses **Use Case Services** instead of separate command/query handlers.

#### Directory Structure

```
apps/user-service/src/
├── domain/
│   ├── entities/
│   │   └── user.entity.ts              # AggregateRoot from NestJS CQRS
│   ├── events/
│   │   ├── user-created.event.ts       # Domain event
│   │   └── user-role-changed.event.ts
│   └── services/
│       └── user-domain.service.ts      # Business logic
├── application/
│   ├── use-cases/
│   │   ├── create-user.usecase.ts      # Write operation
│   │   ├── update-user.usecase.ts      # Write operation
│   │   └── get-user.usecase.ts         # Read operation
│   ├── event-handlers/
│   │   └── user-created.handler.ts     # Event handler
│   └── interfaces/
│       └── repository.interface.ts
└── infrastructure/
    ├── repositories/
    │   └── drizzle-user.repository.ts
    └── event-bridge/
        └── event-bridge.service.ts
```

#### Aggregate Root Entity

**File**: `apps/user-service/src/domain/entities/user.entity.ts`

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

  private constructor() {
    super(); // Initialize AggregateRoot
  }

  // Factory method for creating new users
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

  // Business method
  changeRole(newRole: UserRole): void {
    if (!this.isActive()) {
      throw new Error('User must be active to change role');
    }

    if (this._role.equals(newRole)) {
      throw new Error('User already has this role');
    }

    const oldRole = this._role;
    this._role = newRole;

    // Apply domain event
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
    // Event would be applied here
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

  // Method to merge data from persistence
  mergeObjectContext(data: any): void {
    this._id = data.id;
    this._email = data.email;
    this._firstName = data.firstName;
    this._lastName = data.lastName;
    this._role = UserRole.fromString(data.role);
    this._status = data.status;
    this._bio = data.bio;
    this._skills = data.skills || [];
  }
}
```

#### Use Case Service (Write Operation)

**File**: `apps/user-service/src/application/use-cases/create-user.usecase.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../interfaces/repository.interface';
import { CreateUserRequestDto } from '../dto/create-user.dto';
import { DI_TOKENS } from '../../constants';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(DI_TOKENS.USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: CreateUserRequestDto): Promise<User> {
    // 1. Validate business rules
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
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
    user.commit(); // This publishes all uncommitted events via EventBus

    return user;
  }
}
```

#### Use Case Service (Read Operation)

**File**: `apps/user-service/src/application/use-cases/get-user.usecase.ts`

```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../interfaces/repository.interface';
import { DI_TOKENS } from '../../constants';

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(DI_TOKENS.USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async findAll(offset: number = 0, limit: number = 10): Promise<{
    users: User[];
    total: number;
  }> {
    return await this.userRepository.findAll(offset, limit);
  }
}
```

## Domain Events

Domain events represent **something that happened** in the domain.

### Base Domain Event

**File**: `apps/user-service/src/domain/events/base-domain.event.ts`

```typescript
import { IEvent } from '@nestjs/cqrs';

export interface BaseDomainEventMetadata {
  eventId: string;
  occurredAt: Date;
  aggregateId: string;
  correlationId?: string;
  causationId?: string;
  userId?: string;
}

export abstract class BaseDomainEvent implements IEvent {
  public readonly eventId: string;
  public readonly eventName: string;
  public readonly occurredAt: Date;
  public readonly aggregateId: string;
  public readonly correlationId?: string;
  public readonly causationId?: string;
  public readonly userId?: string;
  public readonly payload: any;

  constructor(
    eventName: string,
    aggregateId: string,
    payload: any,
    options: {
      eventId?: string;
      occurredAt?: Date;
      correlationId?: string;
      causationId?: string;
      userId?: string;
    } = {},
  ) {
    this.eventId = options.eventId || crypto.randomUUID();
    this.eventName = eventName;
    this.occurredAt = options.occurredAt || new Date();
    this.aggregateId = aggregateId;
    this.correlationId = options.correlationId;
    this.causationId = options.causationId;
    this.userId = options.userId;
    this.payload = payload;
  }

  // Convert to EventBridge format
  toEventBridgeFormat(): any {
    return {
      EventBusName: 'edtech-event-bus',
      Source: 'user-service',
      DetailType: this.eventName,
      Detail: JSON.stringify({
        eventId: this.eventId,
        occurredAt: this.occurredAt.toISOString(),
        aggregateId: this.aggregateId,
        correlationId: this.correlationId,
        causationId: this.causationId,
        userId: this.userId,
        payload: this.payload,
      }),
    };
  }
}
```

### Specific Domain Event

**File**: `apps/user-service/src/domain/events/user-created.event.ts`

```typescript
import { BaseDomainEvent } from './base-domain.event';

export interface UserCreatedPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

export class UserCreatedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = 'user.created';

  constructor(
    payload: UserCreatedPayload,
    options: {
      correlationId?: string;
      causationId?: string;
      userId?: string;
    } = {},
  ) {
    super(
      UserCreatedEvent.EVENT_NAME,
      payload.userId,
      payload,
      {
        ...options,
        userId: payload.userId,
      },
    );
  }

  // Convenience getters
  get email(): string {
    return this.payload.email;
  }

  get fullName(): string {
    return `${this.payload.firstName} ${this.payload.lastName}`;
  }

  get role(): string {
    return this.payload.role;
  }
}
```

### User Role Changed Event

**File**: `apps/user-service/src/domain/events/user-role-changed.event.ts`

```typescript
import { BaseDomainEvent } from './base-domain.event';

export interface UserRoleChangedPayload {
  userId: string;
  oldRole: string;
  newRole: string;
}

export class UserRoleChangedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = 'user.role_changed';

  constructor(
    payload: UserRoleChangedPayload,
    options: {
      correlationId?: string;
      causationId?: string;
      userId?: string;
    } = {},
  ) {
    super(
      UserRoleChangedEvent.EVENT_NAME,
      payload.userId,
      payload,
      {
        ...options,
        userId: payload.userId,
      },
    );
  }

  get oldRole(): string {
    return this.payload.oldRole;
  }

  get newRole(): string {
    return this.payload.newRole;
  }
}
```

## Event Handlers

Event handlers react to domain events and trigger side effects.

### Local Event Handler

**File**: `apps/user-service/src/application/event-handlers/user-created.handler.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from '../../domain/events/user-created.event';
import { EventBridgeService } from '../../infrastructure/event-bridge/event-bridge.service';

/**
 * User Created Event Handler
 *
 * Handles side effects after a user is created:
 * 1. Publish event to EventBridge (for other services)
 * 2. Send welcome email
 * 3. Initialize analytics
 * 4. Create default settings
 */
@EventsHandler(UserCreatedEvent)
@Injectable()
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  constructor(
    private readonly eventBridgeService: EventBridgeService,
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    try {
      console.log('Handling UserCreatedEvent:', {
        eventId: event.eventId,
        userId: event.userId,
        email: event.email,
        correlationId: event.correlationId,
      });

      // 1. Publish event to external systems via EventBridge
      await this.eventBridgeService.publishEvent(event);

      // 2. Send welcome email (integration point)
      await this.sendWelcomeEmail(event);

      // 3. Initialize user analytics (integration point)
      await this.initializeUserAnalytics(event);

      // 4. Create default user settings (integration point)
      await this.createDefaultUserSettings(event);

      console.log('UserCreatedEvent handled successfully');
    } catch (error) {
      console.error('Error handling UserCreatedEvent:', error);
      // In production:
      // - Log to monitoring system
      // - Retry failed operations
      // - Send to dead letter queue
      throw error;
    }
  }

  private async sendWelcomeEmail(event: UserCreatedEvent): Promise<void> {
    console.log(`Sending welcome email to ${event.email}`);
    // TODO: Integrate with email service
  }

  private async initializeUserAnalytics(event: UserCreatedEvent): Promise<void> {
    console.log(`Initializing analytics for user ${event.userId}`);
    // TODO: Integrate with analytics service
  }

  private async createDefaultUserSettings(event: UserCreatedEvent): Promise<void> {
    console.log(`Creating default settings for user ${event.userId}`);
    // TODO: Integrate with settings service
  }
}
```

### User Role Changed Handler

**File**: `apps/user-service/src/application/event-handlers/user-role-changed.handler.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserRoleChangedEvent } from '../../domain/events/user-role-changed.event';
import { EventBridgeService } from '../../infrastructure/event-bridge/event-bridge.service';

@EventsHandler(UserRoleChangedEvent)
@Injectable()
export class UserRoleChangedEventHandler implements IEventHandler<UserRoleChangedEvent> {
  constructor(
    private readonly eventBridgeService: EventBridgeService,
  ) {}

  async handle(event: UserRoleChangedEvent): Promise<void> {
    try {
      console.log('Handling UserRoleChangedEvent:', {
        eventId: event.eventId,
        userId: event.userId,
        oldRole: event.oldRole,
        newRole: event.newRole,
      });

      // Publish to EventBridge for other services
      await this.eventBridgeService.publishEvent(event);

      // Handle specific role transitions
      if (event.newRole === 'tutor') {
        await this.handlePromotionToTutor(event);
      }

      if (event.newRole === 'admin') {
        await this.handlePromotionToAdmin(event);
      }

      console.log('UserRoleChangedEvent handled successfully');
    } catch (error) {
      console.error('Error handling UserRoleChangedEvent:', error);
      throw error;
    }
  }

  private async handlePromotionToTutor(event: UserRoleChangedEvent): Promise<void> {
    console.log(`User ${event.userId} promoted to tutor`);
    // Create tutor profile in tutor-service
    // Send notification about tutor onboarding
    // Grant tutor permissions
  }

  private async handlePromotionToAdmin(event: UserRoleChangedEvent): Promise<void> {
    console.log(`User ${event.userId} promoted to admin`);
    // Grant admin permissions
    // Send admin onboarding email
    // Add to admin Cognito group
  }
}
```

## EventBridge Integration

AWS EventBridge enables **cross-service communication** via events.

### EventBridge Service

**File**: `apps/user-service/src/infrastructure/event-bridge/event-bridge.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';
import { BaseDomainEvent } from '../../domain/events/base-domain.event';

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

  async publishEvent(event: BaseDomainEvent): Promise<void> {
    const entry: PutEventsRequestEntry = {
      EventBusName: this.eventBusName,
      Source: 'user-service',
      DetailType: event.eventName,
      Detail: JSON.stringify({
        eventId: event.eventId,
        occurredAt: event.occurredAt.toISOString(),
        aggregateId: event.aggregateId,
        correlationId: event.correlationId,
        causationId: event.causationId,
        userId: event.userId,
        payload: event.payload,
      }),
      Time: event.occurredAt,
    };

    try {
      const command = new PutEventsCommand({
        Entries: [entry],
      });

      const result = await this.client.send(command);

      if (result.FailedEntryCount && result.FailedEntryCount > 0) {
        console.error('Failed to publish event to EventBridge:', result.Entries);
        throw new Error('Event publication failed');
      }

      console.log('Event published to EventBridge:', {
        eventId: event.eventId,
        eventName: event.eventName,
      });
    } catch (error) {
      console.error('Error publishing to EventBridge:', error);
      throw error;
    }
  }

  async publishBatch(events: BaseDomainEvent[]): Promise<void> {
    const entries: PutEventsRequestEntry[] = events.map(event => ({
      EventBusName: this.eventBusName,
      Source: 'user-service',
      DetailType: event.eventName,
      Detail: JSON.stringify({
        eventId: event.eventId,
        occurredAt: event.occurredAt.toISOString(),
        aggregateId: event.aggregateId,
        correlationId: event.correlationId,
        causationId: event.causationId,
        userId: event.userId,
        payload: event.payload,
      }),
      Time: event.occurredAt,
    }));

    try {
      const command = new PutEventsCommand({
        Entries: entries,
      });

      const result = await this.client.send(command);

      if (result.FailedEntryCount && result.FailedEntryCount > 0) {
        console.error('Some events failed to publish:', result.Entries);
        throw new Error(`${result.FailedEntryCount} events failed to publish`);
      }

      console.log(`Published ${events.length} events to EventBridge`);
    } catch (error) {
      console.error('Error publishing batch to EventBridge:', error);
      throw error;
    }
  }
}
```

### EventBridge Rule Configuration

**Terraform**: `infrastructure/modules/shared/event-bridge/main.tf`

```hcl
resource "aws_cloudwatch_event_bus" "edtech_bus" {
  name = "edtech-event-bus"

  tags = {
    Environment = var.environment
    Service     = "event-bridge"
  }
}

# Rule: Forward user.created events to Tutor Service
resource "aws_cloudwatch_event_rule" "user_created_to_tutor" {
  name           = "user-created-to-tutor-service"
  event_bus_name = aws_cloudwatch_event_bus.edtech_bus.name
  description    = "Forward user.created events to Tutor Service"

  event_pattern = jsonencode({
    source      = ["user-service"]
    detail-type = ["user.created"]
  })
}

resource "aws_cloudwatch_event_target" "tutor_service_target" {
  rule           = aws_cloudwatch_event_rule.user_created_to_tutor.name
  event_bus_name = aws_cloudwatch_event_bus.edtech_bus.name
  arn            = var.tutor_service_target_arn
  role_arn       = aws_iam_role.eventbridge_role.arn
}

# Rule: Forward user.role_changed events to Admin Service
resource "aws_cloudwatch_event_rule" "role_changed_to_admin" {
  name           = "role-changed-to-admin-service"
  event_bus_name = aws_cloudwatch_event_bus.edtech_bus.name
  description    = "Forward user.role_changed events to Admin Service"

  event_pattern = jsonencode({
    source      = ["user-service"]
    detail-type = ["user.role_changed"]
    detail = {
      payload = {
        newRole = ["tutor", "admin"]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "admin_service_target" {
  rule           = aws_cloudwatch_event_rule.role_changed_to_admin.name
  event_bus_name = aws_cloudwatch_event_bus.edtech_bus.name
  arn            = var.admin_service_target_arn
  role_arn       = aws_iam_role.eventbridge_role.arn
}
```

### Consuming Events from EventBridge

**File**: `apps/tutor-service/src/infrastructure/event-consumers/user-events.consumer.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';

/**
 * Consumes events from EventBridge
 * In production, this would be triggered by AWS Lambda or ECS task
 */
@Injectable()
export class UserEventsConsumer implements OnModuleInit {
  constructor(private readonly eventBus: EventBus) {}

  async onModuleInit() {
    // In production, this would listen to EventBridge via Lambda
    // For now, log that consumer is ready
    console.log('UserEventsConsumer ready to receive events from EventBridge');
  }

  /**
   * Handle user.created event from EventBridge
   * Triggered by Lambda function that receives EventBridge events
   */
  async handleUserCreated(eventData: any): Promise<void> {
    console.log('Received user.created event from EventBridge:', eventData);

    // Extract event details
    const { eventId, userId, payload } = eventData.detail;

    // Check if this user should have a tutor profile
    if (payload.role === 'tutor') {
      // Create tutor profile
      console.log(`Creating tutor profile for user ${userId}`);
    }
  }

  /**
   * Handle user.role_changed event from EventBridge
   */
  async handleUserRoleChanged(eventData: any): Promise<void> {
    console.log('Received user.role_changed event from EventBridge:', eventData);

    const { userId, payload } = eventData.detail;

    if (payload.newRole === 'tutor') {
      // Create tutor profile when user becomes tutor
      console.log(`User ${userId} became tutor, creating tutor profile`);
    }
  }
}
```

## Event Sourcing with DynamoDB

Event Sourcing stores **all changes as a sequence of events**.

### Event Store Schema (DynamoDB)

```typescript
// Event Store Table Structure
{
  PK: "USER#user-123",           // Partition Key: Aggregate type + ID
  SK: "EVENT#2025-11-13T10:00:00.000Z#evt-001", // Sort Key: Event timestamp + ID
  eventId: "evt-001",
  eventName: "user.created",
  aggregateId: "user-123",
  aggregateType: "User",
  version: 1,                    // Event version for optimistic locking
  occurredAt: "2025-11-13T10:00:00.000Z",
  payload: {
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
    role: "student"
  },
  metadata: {
    correlationId: "corr-123",
    causationId: "cause-456",
    userId: "user-123"
  },
  TTL: 1767225600               // Optional: Event expiration
}
```

### Event Store Service

**File**: `libs/shared-kernel/src/infrastructure/event-store/event-store.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { BaseDomainEvent } from '../../domain/base-domain.event';

export interface EventStoreRecord {
  PK: string;
  SK: string;
  eventId: string;
  eventName: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  occurredAt: string;
  payload: any;
  metadata: any;
}

@Injectable()
export class EventStoreService {
  private readonly client: DynamoDBClient;
  private readonly tableName: string;

  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.tableName = process.env.EVENT_STORE_TABLE || 'edtech-event-store';
  }

  /**
   * Append event to event store
   */
  async appendEvent(
    aggregateType: string,
    aggregateId: string,
    event: BaseDomainEvent,
    version: number,
  ): Promise<void> {
    const record: EventStoreRecord = {
      PK: `${aggregateType.toUpperCase()}#${aggregateId}`,
      SK: `EVENT#${event.occurredAt.toISOString()}#${event.eventId}`,
      eventId: event.eventId,
      eventName: event.eventName,
      aggregateId: aggregateId,
      aggregateType: aggregateType,
      version: version,
      occurredAt: event.occurredAt.toISOString(),
      payload: event.payload,
      metadata: {
        correlationId: event.correlationId,
        causationId: event.causationId,
        userId: event.userId,
      },
    };

    try {
      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(record),
        // Optimistic locking: fail if version exists
        ConditionExpression: 'attribute_not_exists(version) OR version < :newVersion',
        ExpressionAttributeValues: marshall({
          ':newVersion': version,
        }),
      });

      await this.client.send(command);

      console.log('Event appended to event store:', {
        aggregateType,
        aggregateId,
        eventId: event.eventId,
        version,
      });
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('Concurrency conflict: event version already exists');
      }
      console.error('Error appending event to store:', error);
      throw error;
    }
  }

  /**
   * Load all events for an aggregate
   */
  async loadEvents(
    aggregateType: string,
    aggregateId: string,
  ): Promise<EventStoreRecord[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': `${aggregateType.toUpperCase()}#${aggregateId}`,
        }),
        ScanIndexForward: true, // Sort ascending by SK (chronological order)
      });

      const result = await this.client.send(command);

      if (!result.Items || result.Items.length === 0) {
        return [];
      }

      return result.Items.map(item => unmarshall(item) as EventStoreRecord);
    } catch (error) {
      console.error('Error loading events from store:', error);
      throw error;
    }
  }

  /**
   * Load events after a specific version (for catch-up subscriptions)
   */
  async loadEventsAfterVersion(
    aggregateType: string,
    aggregateId: string,
    afterVersion: number,
  ): Promise<EventStoreRecord[]> {
    const allEvents = await this.loadEvents(aggregateType, aggregateId);
    return allEvents.filter(event => event.version > afterVersion);
  }

  /**
   * Get current version of aggregate
   */
  async getCurrentVersion(
    aggregateType: string,
    aggregateId: string,
  ): Promise<number> {
    const events = await this.loadEvents(aggregateType, aggregateId);
    return events.length > 0 ? events[events.length - 1].version : 0;
  }
}
```

### Rebuilding State from Events

**File**: `apps/payment-service/src/domain/aggregates/payment.aggregate.ts`

```typescript
import { AggregateRoot } from '@nestjs/cqrs';
import { EventStoreRecord } from '@edtech/shared-kernel';
import { PaymentCreatedEvent } from '../events/payment-created.event';
import { PaymentCompletedEvent } from '../events/payment-completed.event';
import { PaymentRefundedEvent } from '../events/payment-refunded.event';

export class Payment extends AggregateRoot {
  private _id: string;
  private _amount: number;
  private _status: string;
  private _studentId: string;
  private _tutorId: string;
  private _version: number = 0;

  // Rebuild state from event history
  static fromHistory(events: EventStoreRecord[]): Payment {
    const payment = new Payment();

    events.forEach(eventRecord => {
      payment.applyHistoricalEvent(eventRecord);
    });

    return payment;
  }

  private applyHistoricalEvent(eventRecord: EventStoreRecord): void {
    switch (eventRecord.eventName) {
      case 'payment.created':
        this.applyPaymentCreated(eventRecord.payload);
        break;
      case 'payment.completed':
        this.applyPaymentCompleted(eventRecord.payload);
        break;
      case 'payment.refunded':
        this.applyPaymentRefunded(eventRecord.payload);
        break;
      default:
        console.warn(`Unknown event type: ${eventRecord.eventName}`);
    }

    this._version = eventRecord.version;
  }

  private applyPaymentCreated(payload: any): void {
    this._id = payload.paymentId;
    this._amount = payload.amount;
    this._status = 'pending';
    this._studentId = payload.studentId;
    this._tutorId = payload.tutorId;
  }

  private applyPaymentCompleted(payload: any): void {
    this._status = 'completed';
  }

  private applyPaymentRefunded(payload: any): void {
    this._status = 'refunded';
  }

  // Getters
  get id(): string { return this._id; }
  get amount(): number { return this._amount; }
  get status(): string { return this._status; }
  get version(): number { return this._version; }
}
```

## Advanced CQRS with Read Models

For **high-read scenarios**, separate read models optimized for queries.

### Read Model Projection

**File**: `apps/matching-service/src/application/projections/tutor-search.projection.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TutorCreatedEvent } from '../../domain/events/tutor-created.event';
import { TutorSearchReadModel } from '../read-models/tutor-search.read-model';

/**
 * Projection: Sync write model events to read model
 */
@EventsHandler(TutorCreatedEvent)
@Injectable()
export class TutorSearchProjection implements IEventHandler<TutorCreatedEvent> {
  constructor(
    private readonly tutorSearchReadModel: TutorSearchReadModel,
  ) {}

  async handle(event: TutorCreatedEvent): Promise<void> {
    // Update optimized search index
    await this.tutorSearchReadModel.addTutor({
      id: event.aggregateId,
      userId: event.payload.userId,
      subjects: event.payload.subjects,
      hourlyRate: event.payload.hourlyRate,
      rating: 0,
      availability: event.payload.availability,
    });

    console.log('Tutor added to search read model');
  }
}
```

## Saga Patterns

Sagas coordinate **long-running business processes** across multiple services.

### Tutor Onboarding Saga

**File**: `apps/tutor-service/src/application/sagas/tutor-onboarding.saga.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { TutorProfileCreatedEvent } from '../../domain/events/tutor-profile-created.event';
import { SendWelcomeEmailCommand } from '../commands/send-welcome-email.command';
import { InitializeTutorDashboardCommand } from '../commands/initialize-tutor-dashboard.command';

/**
 * Saga: Coordinate tutor onboarding process
 *
 * Flow:
 * 1. TutorProfileCreated → Send welcome email
 * 2. After 1 hour → Initialize tutor dashboard
 * 3. After 24 hours → Send onboarding tips email
 */
@Injectable()
export class TutorOnboardingSaga {
  @Saga()
  onboardNewTutor = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(TutorProfileCreatedEvent),
      map((event: TutorProfileCreatedEvent) => {
        console.log('Starting tutor onboarding saga for:', event.aggregateId);

        // Step 1: Send welcome email immediately
        return new SendWelcomeEmailCommand(
          event.aggregateId,
          event.payload.email,
        );
      }),
    );
  };

  @Saga()
  initializeDashboard = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(TutorProfileCreatedEvent),
      delay(3600000), // 1 hour
      map((event: TutorProfileCreatedEvent) => {
        // Step 2: Initialize dashboard after 1 hour
        return new InitializeTutorDashboardCommand(event.aggregateId);
      }),
    );
  };
}
```

## Testing CQRS Components

### Testing Use Cases

```typescript
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockRepository: jest.Mocked<IUserRepository>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
    } as any;

    mockEventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    } as any;

    useCase = new CreateUserUseCase(mockRepository, mockEventBus);
  });

  it('should create user and publish event', async () => {
    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.save.mockImplementation(async (user) => user);

    const dto = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.student(),
    };

    const result = await useCase.execute(dto);

    expect(result).toBeDefined();
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
```

### Testing Event Handlers

```typescript
describe('UserCreatedEventHandler', () => {
  let handler: UserCreatedEventHandler;
  let mockEventBridge: jest.Mocked<EventBridgeService>;

  beforeEach(() => {
    mockEventBridge = {
      publishEvent: jest.fn(),
    } as any;

    handler = new UserCreatedEventHandler(mockEventBridge);
  });

  it('should publish event to EventBridge', async () => {
    const event = new UserCreatedEvent({
      userId: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'student',
      status: 'active',
    });

    await handler.handle(event);

    expect(mockEventBridge.publishEvent).toHaveBeenCalledWith(event);
  });
});
```

## Best Practices

### 1. Event Naming Conventions

```typescript
// Good: past tense, describes what happened
user.created
user.role_changed
payment.completed
tutor.verified

// Bad: present tense or commands
user.create
change_role
complete_payment
```

### 2. Idempotent Event Handlers

```typescript
async handle(event: UserCreatedEvent): Promise<void> {
  // Check if already processed
  const processed = await this.cache.get(`event:${event.eventId}`);
  if (processed) {
    console.log('Event already processed, skipping');
    return;
  }

  // Process event
  await this.doWork(event);

  // Mark as processed
  await this.cache.set(`event:${event.eventId}`, 'true', 3600);
}
```

### 3. Event Versioning

```typescript
// Version 1
export class UserCreatedEventV1 extends BaseDomainEvent {
  public static readonly EVENT_NAME = 'user.created.v1';
}

// Version 2 (with additional fields)
export class UserCreatedEventV2 extends BaseDomainEvent {
  public static readonly EVENT_NAME = 'user.created.v2';
}

// Handler supports both versions
@EventsHandler(UserCreatedEventV1, UserCreatedEventV2)
export class UserCreatedEventHandler implements IEventHandler {
  async handle(event: UserCreatedEventV1 | UserCreatedEventV2): Promise<void> {
    // Handle both versions
  }
}
```

### 4. Correlation and Causation IDs

```typescript
// Track event chains
const event1 = new UserCreatedEvent(payload, {
  correlationId: 'original-request-id',
});

const event2 = new UserRoleChangedEvent(payload, {
  correlationId: 'original-request-id',  // Same correlation
  causationId: event1.eventId,           // Caused by event1
});
```

### 5. Error Handling in Event Handlers

```typescript
async handle(event: UserCreatedEvent): Promise<void> {
  try {
    await this.doWork(event);
  } catch (error) {
    // Log error with context
    console.error('Error handling event:', {
      eventId: event.eventId,
      eventName: event.eventName,
      error: error.message,
    });

    // Publish compensation event if needed
    if (error.name === 'ValidationError') {
      await this.publishCompensationEvent(event);
    }

    // Re-throw for retry mechanism
    throw error;
  }
}
```

## Summary

This guide covers:

- **Basic CQRS** with Use Case Services (Level 1)
- **Domain Events** with NestJS CQRS
- **Event Handlers** for side effects
- **EventBridge Integration** for cross-service communication
- **Event Sourcing** with DynamoDB Event Store (Level 3)
- **Advanced CQRS** with separate read models (Level 2)
- **Saga Patterns** for complex workflows
- **Testing** strategies for CQRS components
- **Best practices** for event-driven architecture

Follow these patterns to build scalable, event-driven microservices with full auditability and temporal queries.
