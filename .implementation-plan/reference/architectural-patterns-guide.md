# Architectural Patterns & Implementation Guide

## 📋 Overview

This document provides **simplified, practical** guidelines for implementing architectural patterns in our EdTech microservices platform. It focuses on using NestJS/CQRS effectively without unnecessary complexity or over-abstraction.

## 🎯 Key Architecture Principles

1. **NestJS/CQRS + Microservices**: Use built-in NestJS patterns with custom EventBridge transport
2. **Infrastructure Abstraction**: Use `infrastructure/<name>` folders with interface injection
3. **Predictable Event Flow**: Single event listener pattern using MessagePattern/EventPattern
4. **Request-Reply Communication**: Support both event-driven and synchronous inter-service calls
5. **AWS Lambda Integration**: TypeScript ESM modules with esbuild for serverless functions
6. **Targeted Caching**: Redis cache only for specific high-performance use cases
7. **Saga Orchestration**: Use NestJS/CQRS Saga classes for distributed transactions

## 🗄️ Database Naming & Infrastructure Conventions

### Infrastructure Naming Philosophy
We name infrastructure components **as they actually are**, not with generic abstractions:

- ✅ **postgres** (PostgreSQL databases)
- ✅ **dynamo** (DynamoDB tables)  
- ✅ **neo4j** (Neo4j graph databases)
- ✅ **redis** (Redis cache instances)
- ❌ ~~database~~ (too generic)
- ❌ ~~cache~~ (too generic)
- ❌ ~~nosql~~ (too generic)

### Service Database Allocation

| Service | Primary Storage | Secondary Storage | Use Case |
|---------|----------------|-------------------|----------|
| **user-service** | `postgres` | `redis` (sessions) | User profiles, authentication |
| **learning-service** | `postgres` | `redis` (cache) | Courses, lessons, progress |
| **tutor-matching-service** | `neo4j` | `postgres` (profiles) | Graph relationships, availability |
| **payment-service** | `postgres` | - | Transactions, billing |
| **communication-service** | `dynamo` | `redis` (real-time) | Messages, chat history |
| **content-service** | `dynamo` | `s3` (files) | File metadata, media |
| **analytics-service** | `dynamo` | `redshift` (warehouse) | Events, metrics, reports |
| **ai-service** | `vector-db` | `dynamo` (metadata) | Embeddings, recommendations |

### Folder Structure Examples

```typescript
// ✅ Correct - specific database types
apps/user-service/src/infrastructure/
├── postgres/           # PostgreSQL implementation
│   ├── entities/      # TypeORM entities
│   ├── repositories/ # Repository implementations
│   └── migrations/   # Database migrations
└── redis/             # Redis implementation
    ├── cache/        # Cache services
    └── sessions/     # Session management

apps/tutor-matching-service/src/infrastructure/
├── neo4j/             # Neo4j graph database
│   ├── schemas/      # Graph schemas
│   ├── repositories/ # Graph repositories
│   └── queries/      # Cypher queries
└── postgres/          # PostgreSQL for profiles
    ├── entities/
    └── repositories/

apps/communication-service/src/infrastructure/
├── dynamo/            # DynamoDB implementation
│   ├── entities/     # DynamoDB entities
│   ├── repositories/ # DynamoDB repositories
│   └── indexes/      # Secondary indexes
└── redis/             # Redis for real-time features
    └── pubsub/       # Pub/Sub messaging
```

### Configuration Patterns

```typescript
// ✅ Specific database configuration
// apps/user-service/src/config/postgres.config.ts
export const postgresConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
};

// apps/tutor-matching-service/src/config/neo4j.config.ts
export const neo4jConfig = {
  uri: process.env.NEO4J_URI,
  username: process.env.NEO4J_USER,
  password: process.env.NEO4J_PASSWORD,
};

// apps/communication-service/src/config/dynamo.config.ts
export const dynamoConfig = {
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMO_ENDPOINT,
  tableName: process.env.DYNAMO_TABLE_NAME,
};
```

## 🏗️ 1. Domain-Driven Design (DDD) + CQRS Pattern

### 1.1 Simplified Domain Model

#### Aggregate Root with NestJS/CQRS
```typescript
// Learning Service - Course Aggregate
import { AggregateRoot } from '@nestjs/cqrs';

export class Course extends AggregateRoot {
  constructor(
    public id: string,
    public title: string,
    public tutorId: string,
    public subject: string,
    public difficulty: string,
    public price: number,
    public status: string = 'DRAFT',
    public lessons: string[] = [],
    public enrollments: string[] = []
  ) {
    super();
  }

  static create(props: {
    title: string;
    tutorId: string;
    subject: string;
    difficulty: string;
    price: number;
  }): Course {
    const course = new Course(
      generateId(),
      props.title,
      props.tutorId,
      props.subject,
      props.difficulty,
      props.price
    );

    // Fire domain event using NestJS/CQRS
    course.apply(new CourseCreatedEvent({
      courseId: course.id,
      tutorId: props.tutorId,
      title: props.title,
      subject: props.subject,
    }));

    return course;
  }

  enrollStudent(studentId: string, paymentId: string): void {
    if (this.status !== 'PUBLISHED') {
      throw new Error('Cannot enroll in unpublished course');
    }

    if (this.enrollments.includes(studentId)) {
      throw new Error('Student already enrolled');
    }

    this.enrollments.push(studentId);

    // Fire domain event
    this.apply(new StudentEnrolledEvent({
      courseId: this.id,
      studentId,
      enrolledAt: new Date(),
      paymentId,
    }));
  }

  publish(): void {
    this.status = 'PUBLISHED';
    this.apply(new CoursePublishedEvent({
      courseId: this.id,
      publishedAt: new Date(),
    }));
  }
}
```

#### Simple Domain Events
```typescript
// Domain Events (no complex inheritance)
export class CourseCreatedEvent {
  constructor(public readonly data: {
    courseId: string;
    tutorId: string;
    title: string;
    subject: string;
  }) {}
}

export class StudentEnrolledEvent {
  constructor(public readonly data: {
    courseId: string;
    studentId: string;
    enrolledAt: Date;
    paymentId: string;
  }) {}
}

export class CoursePublishedEvent {
  constructor(public readonly data: {
    courseId: string;
    publishedAt: Date;
  }) {}
}
```

### 1.2 CQRS with NestJS

#### Commands and Command Handlers
```typescript
// Commands
export class CreateCourseCommand {
  constructor(
    public readonly title: string,
    public readonly tutorId: string,
    public readonly subject: string,
    public readonly difficulty: string,
    public readonly price: number
  ) {}
}

export class EnrollStudentCommand {
  constructor(
    public readonly courseId: string,
    public readonly studentId: string,
    public readonly paymentId: string
  ) {}
}

// Command Handlers with mergeObjectContext
@CommandHandler(CreateCourseCommand)
export class CreateCourseHandler implements ICommandHandler<CreateCourseCommand> {
  constructor(private readonly courseRepository: CourseRepository) {}

  async execute(command: CreateCourseCommand): Promise<void> {
    const course = Course.create({
      title: command.title,
      tutorId: command.tutorId,
      subject: command.subject,
      difficulty: command.difficulty,
      price: command.price,
    });

    await this.courseRepository.save(course);
    course.commit(); // Publishes events automatically
  }
}

@CommandHandler(EnrollStudentCommand)
export class EnrollStudentHandler implements ICommandHandler<EnrollStudentCommand> {
  constructor(private readonly courseRepository: CourseRepository) {}

  async execute(command: EnrollStudentCommand): Promise<void> {
    // Use mergeObjectContext to load aggregate
    const course = this.mergeObjectContext(
      await this.courseRepository.findById(command.courseId)
    );

    course.enrollStudent(command.studentId, command.paymentId);
    
    await this.courseRepository.save(course);
    course.commit(); // Publishes events automatically
  }
}
```

#### Queries (Simplified)
```typescript
// Query DTOs
export class GetCourseByIdQuery {
  constructor(public readonly courseId: string) {}
}

export class GetCoursesBySubjectQuery {
  constructor(
    public readonly subject: string,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

// Query Handlers
@QueryHandler(GetCourseByIdQuery)
export class GetCourseByIdHandler implements IQueryHandler<GetCourseByIdQuery> {
  constructor(private readonly courseRepository: CourseRepository) {}

  async execute(query: GetCourseByIdQuery): Promise<Course | null> {
    return this.courseRepository.findById(query.courseId);
  }
}

@QueryHandler(GetCoursesBySubjectQuery)
export class GetCoursesBySubjectHandler implements IQueryHandler<GetCoursesBySubjectQuery> {
  constructor(private readonly courseRepository: CourseRepository) {}

  async execute(query: GetCoursesBySubjectQuery): Promise<Course[]> {
    return this.courseRepository.findBySubject(
      query.subject,
      query.page,
      query.limit
    );
  }
}
```

#### Event Handlers (Application Layer)
```typescript
// Event handlers in application layer
@EventsHandler(CourseCreatedEvent)
export class CourseCreatedHandler implements IEventHandler<CourseCreatedEvent> {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly analyticsService: AnalyticsService
  ) {}

  async handle(event: CourseCreatedEvent): Promise<void> {
    // Send notification to tutor
    await this.notificationService.notifyCourseCreated(
      event.data.tutorId,
      event.data.courseId
    );

    // Track analytics
    await this.analyticsService.trackEvent('course.created', event.data);
  }
}

@EventsHandler(StudentEnrolledEvent)
export class StudentEnrolledHandler implements IEventHandler<StudentEnrolledEvent> {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly chatService: ChatService
  ) {}

  async handle(event: StudentEnrolledEvent): Promise<void> {
    // Create chat session between student and tutor
    await this.chatService.createCourseSession(
      event.data.courseId,
      event.data.studentId
    );

    // Send enrollment confirmation
    await this.notificationService.sendEnrollmentConfirmation(
      event.data.studentId,
      event.data.courseId
    );
  }
}
```

### 2.3 Shared Message & Event Patterns

```typescript
// libs/patterns/src/user.patterns.ts
export const USER_PATTERNS = {
  // Events (fire and forget)
  EVENTS: {
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    USER_VERIFIED: 'user.verified',
  },
  // Messages (request-reply)
  MESSAGES: {
    GET_USER_BY_ID: 'user.get_by_id',
    GET_USER_BY_EMAIL: 'user.get_by_email',
    VERIFY_CREDENTIALS: 'user.verify_credentials',
    CHECK_USER_EXISTS: 'user.check_exists',
  }
} as const;

// libs/patterns/src/course.patterns.ts
export const COURSE_PATTERNS = {
  EVENTS: {
    COURSE_CREATED: 'course.created',
    COURSE_PUBLISHED: 'course.published',
    STUDENT_ENROLLED: 'course.student_enrolled',
    LESSON_COMPLETED: 'course.lesson_completed',
  },
  MESSAGES: {
    GET_COURSE_BY_ID: 'course.get_by_id',
    GET_COURSES_BY_SUBJECT: 'course.get_by_subject',
    ENROLL_STUDENT: 'course.enroll_student',
    VERIFY_ENROLLMENT: 'course.verify_enrollment',
  }
} as const;

// libs/patterns/src/payment.patterns.ts
export const PAYMENT_PATTERNS = {
  EVENTS: {
    PAYMENT_INITIATED: 'payment.initiated',
    PAYMENT_COMPLETED: 'payment.completed',
    PAYMENT_FAILED: 'payment.failed',
    REFUND_PROCESSED: 'payment.refund_processed',
  },
  MESSAGES: {
    PROCESS_PAYMENT: 'payment.process',
    VERIFY_PAYMENT: 'payment.verify',
    INITIATE_REFUND: 'payment.refund',
    GET_PAYMENT_STATUS: 'payment.get_status',
  }
} as const;

// libs/patterns/src/index.ts
export * from './user.patterns';
export * from './course.patterns';
export * from './payment.patterns';
export * from './review.patterns';

// Type-safe pattern usage
export type UserEventPattern = typeof USER_PATTERNS.EVENTS[keyof typeof USER_PATTERNS.EVENTS];
export type UserMessagePattern = typeof USER_PATTERNS.MESSAGES[keyof typeof USER_PATTERNS.MESSAGES];
export type CourseEventPattern = typeof COURSE_PATTERNS.EVENTS[keyof typeof COURSE_PATTERNS.EVENTS];
export type CourseMessagePattern = typeof COURSE_PATTERNS.MESSAGES[keyof typeof COURSE_PATTERNS.MESSAGES];
```

### 2.4 Shared Saga Components

```typescript
// libs/saga/src/base/base.saga.ts
import { Injectable } from '@nestjs/common';
import { ICommand } from '@nestjs/cqrs';
import { Observable } from 'rxjs';

@Injectable()
export abstract class BaseSaga {
  protected generateSagaId(): string {
    return `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected createSagaTrackingCommand(sagaId: string, status: string, data?: any): ICommand {
    return new TrackSagaCommand(sagaId, status, data);
  }

  protected handleSagaError(sagaId: string, error: Error): Observable<ICommand> {
    console.error(`Saga ${sagaId} failed:`, error);
    return new Observable<ICommand>((observer) => {
      observer.next(new CancelSagaCommand(sagaId, error.message));
      observer.complete();
    });
  }
}

// libs/saga/src/base/saga-state.model.ts
export class SagaState {
  constructor(
    public sagaId: string,
    public sagaType: string,
    public status: string,
    public data: Record<string, any>,
    public steps: Record<string, boolean> = {},
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public timeoutAt?: Date,
    public errorMessage?: string
  ) {}

  updateStep(stepName: string, completed: boolean): void {
    this.steps[stepName] = completed;
    this.updatedAt = new Date();
  }

  updateStatus(status: string): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  markAsCompleted(): void {
    this.status = 'COMPLETED';
    this.updatedAt = new Date();
  }

  markAsFailed(errorMessage: string): void {
    this.status = 'FAILED';
    this.errorMessage = errorMessage;
    this.updatedAt = new Date();
  }

  isCompleted(): boolean {
    return Object.values(this.steps).every(step => step === true);
  }

  isTimedOut(): boolean {
    return this.timeoutAt ? new Date() > this.timeoutAt : false;
  }
}

// libs/saga/src/commands/track-saga.command.ts
export class TrackSagaCommand {
  constructor(
    public readonly sagaId: string,
    public readonly status: string,
    public readonly data?: Record<string, any>
  ) {}
}

export class CancelSagaCommand {
  constructor(
    public readonly sagaId: string,
    public readonly reason: string
  ) {}
}

// libs/saga/src/interfaces/saga-repository.interface.ts
export interface ISagaRepository {
  save(sagaState: SagaState): Promise<void>;
  findById(sagaId: string): Promise<SagaState | null>;
  findByStatus(status: string): Promise<SagaState[]>;
  findTimedOut(): Promise<SagaState[]>;
  delete(sagaId: string): Promise<void>;
}
```

## 📡 2. EventBridge Transport & Inter-Service Communication

### 2.1 Custom EventBridge Transport for NestJS

```typescript
// libs/shared/src/transports/event-bridge.transport.ts
import { CustomTransportStrategy } from '@nestjs/microservices';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

export class EventBridgeTransport extends CustomTransportStrategy {
  private eventBridgeClient: EventBridgeClient;

  constructor(private readonly options: {
    region: string;
    eventBusName: string;
    source: string;
  }) {
    super();
    this.eventBridgeClient = new EventBridgeClient({ region: options.region });
  }

  listen(callback: (err?: any, ...optionalParams: unknown[]) => void): void {
    callback();
  }

  close(): void {
    // Cleanup if needed
  }

  async sendMessage(message: any, pattern: string): Promise<void> {
    const eventEntry = {
      Source: this.options.source,
      DetailType: pattern,
      Detail: JSON.stringify(message),
      EventBusName: this.options.eventBusName,
    };

    await this.eventBridgeClient.send(
      new PutEventsCommand({ Entries: [eventEntry] })
    );
  }
}

// Usage in main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.connectMicroservice({
    strategy: new EventBridgeTransport({
      region: process.env.AWS_REGION,
      eventBusName: process.env.EVENT_BUS_NAME,
      source: 'user.service',
    }),
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}
```

### 2.2 Event Controllers with Shared Patterns

```typescript
// apps/user-service/src/controllers/user-events.controller.ts
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { USER_PATTERNS, PAYMENT_PATTERNS } from '@edtech/patterns';

@Controller()
export class UserEventsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  // Event Pattern - Fire and forget (using shared patterns)
  @EventPattern(USER_PATTERNS.EVENTS.USER_CREATED)
  async handleUserCreated(@Payload() data: any): Promise<void> {
    await this.commandBus.execute(
      new ProcessUserCreatedCommand(data.userId, data.email)
    );
  }

  @EventPattern(PAYMENT_PATTERNS.EVENTS.PAYMENT_COMPLETED)
  async handlePaymentCompleted(@Payload() data: any): Promise<void> {
    await this.commandBus.execute(
      new UpdateUserSubscriptionCommand(data.userId, data.subscriptionId)
    );
  }

  // Message Pattern - Request-Reply (using shared patterns)
  @MessagePattern(USER_PATTERNS.MESSAGES.GET_USER_BY_ID)
  async getUserById(@Payload() data: { userId: string }): Promise<any> {
    return this.queryBus.execute(new GetUserByIdQuery(data.userId));
  }

  @MessagePattern(USER_PATTERNS.MESSAGES.VERIFY_CREDENTIALS)
  async verifyCredentials(@Payload() data: { email: string; password: string }): Promise<boolean> {
    return this.queryBus.execute(new VerifyUserCredentialsQuery(data.email, data.password));
  }

  @MessagePattern(USER_PATTERNS.MESSAGES.CHECK_USER_EXISTS)
  async checkUserExists(@Payload() data: { email: string }): Promise<boolean> {
    return this.queryBus.execute(new CheckUserExistsQuery(data.email));
  }
}
```

### 2.3 Request-Reply Communication Service

```typescript
// libs/shared/src/communication/inter-service.client.ts
import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { EventBridgeTransport } from '../transports/event-bridge.transport';

@Injectable()
export class InterServiceClient {
  private clients: Map<string, ClientProxy> = new Map();

  constructor() {
    // Register service clients
    this.registerClient('user-service', 'user.service');
    this.registerClient('payment-service', 'payment.service');
    this.registerClient('learning-service', 'learning.service');
  }

  private registerClient(serviceName: string, source: string): void {
    const client = ClientProxyFactory.create({
      strategy: new EventBridgeTransport({
        region: process.env.AWS_REGION,
        eventBusName: process.env.EVENT_BUS_NAME,
        source,
      }),
    });

    this.clients.set(serviceName, client);
  }

  // Async event (fire and forget)
  async publishEvent(serviceName: string, pattern: string, data: any): Promise<void> {
    const client = this.clients.get(serviceName);
    if (!client) throw new Error(`Service ${serviceName} not found`);
    
    await client.emit(pattern, data).toPromise();
  }

  // Sync request-reply
  async sendRequest<T>(serviceName: string, pattern: string, data: any): Promise<T> {
    const client = this.clients.get(serviceName);
    if (!client) throw new Error(`Service ${serviceName} not found`);
    
    return client.send<T>(pattern, data).toPromise();
  }
}

// Usage in service
@Injectable()
export class PaymentService {
  constructor(private readonly interServiceClient: InterServiceClient) {}

  async processPayment(paymentData: any): Promise<void> {
    // Sync call to verify user
    const user = await this.interServiceClient.sendRequest(
      'user-service',
      'user.get_by_id',
      { userId: paymentData.userId }
    );

    // Process payment logic...

    // Async notification
    await this.interServiceClient.publishEvent(
      'user-service',
      'payment.completed',
      { userId: user.id, amount: paymentData.amount }
    );
  }
}
```

## 🗂️ 3. Microservices Codebase Organization

### 2.1 Optimized Service Structure (Direct TypeORM Usage)

```
apps/user-service/
├── src/
│   ├── commands/                       # Commands and Command Handlers
│   │   ├── create-user.command.ts
│   │   ├── create-user.handler.ts
│   │   ├── update-user.command.ts
│   │   ├── update-user.handler.ts
│   │   └── index.ts
│   ├── queries/                        # Queries and Query Handlers
│   │   ├── get-user.query.ts
│   │   ├── get-user.handler.ts
│   │   ├── get-users.query.ts
│   │   ├── get-users.handler.ts
│   │   └── index.ts
│   ├── events/                         # Event Handlers (Application Layer)
│   │   ├── user-created.handler.ts
│   │   ├── user-updated.handler.ts
│   │   └── index.ts
│   ├── sagas/                          # Service-specific Sagas
│   │   ├── user-onboarding.saga.ts
│   │   ├── user-verification.saga.ts
│   │   └── index.ts
│   ├── models/                         # Domain Models (Aggregates)
│   │   ├── user.model.ts
│   │   ├── user-profile.model.ts
│   │   └── index.ts
│   ├── infrastructure/                 # Infrastructure Implementations
│   │   ├── postgres/
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   └── user-profile.entity.ts
│   │   │   ├── migrations/
│   │   │   │   ├── 001-create-users.ts
│   │   │   │   └── 002-create-profiles.ts
│   │   │   └── postgres.module.ts
│   │   ├── redis/
│   │   │   ├── cache.service.ts
│   │   │   └── redis.module.ts
│   │   ├── cognito/
│   │   │   ├── auth.service.ts
│   │   │   └── cognito.module.ts
│   │   └── index.ts
│   ├── controllers/                    # API Controllers + Event Controllers
│   │   ├── user.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── user-events.controller.ts   # EventBridge listeners
│   │   └── index.ts
│   ├── config/                         # Configuration
│   │   ├── database.config.ts
│   │   ├── auth.config.ts
│   │   ├── cache.config.ts
│   │   └── index.ts
│   ├── main.ts
│   └── app.module.ts
├── lambda/                             # AWS Lambda Functions (ESM + esbuild)
│   ├── handlers/
│   │   ├── user-notification.handler.ts
│   │   └── user-cleanup.handler.ts
│   ├── build.ts                        # esbuild configuration
│   └── package.json
├── test/
├── Dockerfile
└── package.json
```

### 2.2 Optimized Shared Libraries

```
libs/
├── shared/                             # Core utilities and types
│   ├── src/
│   │   ├── types/                      # Common TypeScript types
│   │   ├── utils/                      # Helper functions
│   │   ├── decorators/                 # Custom decorators
│   │   ├── guards/                     # Auth guards and middleware
│   │   ├── transports/                 # EventBridge transport
│   │   │   └── event-bridge.transport.ts
│   │   ├── communication/              # Inter-service client
│   │   │   └── inter-service.client.ts
│   │   └── config/                     # Common configuration
│   └── package.json
├── patterns/                           # Message and Event patterns
│   ├── src/
│   │   ├── user.patterns.ts           # User service patterns
│   │   ├── course.patterns.ts         # Learning service patterns
│   │   ├── payment.patterns.ts        # Payment service patterns
│   │   ├── review.patterns.ts         # Review service patterns
│   │   └── index.ts                   # Export all patterns
│   └── package.json
├── events/                             # Cross-service event definitions
│   ├── src/
│   │   ├── user.events.ts
│   │   ├── course.events.ts
│   │   ├── payment.events.ts
│   │   └── index.ts
│   └── package.json
└── saga/                               # Reusable saga components
    ├── src/
    │   ├── base/                       # Base saga classes
    │   │   ├── base.saga.ts
    │   │   └── saga-state.model.ts
    │   ├── commands/                   # Common saga commands
    │   │   ├── track-saga.command.ts
    │   │   └── cancel-saga.command.ts
    │   ├── handlers/                   # Common saga handlers
    │   │   ├── track-saga.handler.ts
    │   │   └── cancel-saga.handler.ts
    │   └── interfaces/                 # Saga interfaces
    │       └── saga-repository.interface.ts
    └── package.json
```

## 🔄 4. Saga Pattern with NestJS/CQRS

### 4.1 NestJS/CQRS Saga with Shared Components

```typescript
// apps/learning-service/src/sagas/course-enrollment.saga.ts
import { Injectable } from '@nestjs/common';
import { Saga, ICommand, ofType } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { BaseSaga, TrackSagaCommand, CancelSagaCommand } from '@edtech/saga';
import { InterServiceClient } from '@edtech/shared';
import { PAYMENT_PATTERNS, COURSE_PATTERNS } from '@edtech/patterns';

@Injectable()
export class CourseEnrollmentSaga extends BaseSaga {
  constructor(private readonly interServiceClient: InterServiceClient) {
    super();
  }

  @Saga()
  courseEnrollment = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(CourseEnrollmentRequestedEvent),
      switchMap((event) => this.handleEnrollmentRequested(event)),
      catchError((error, caught) => {
        const sagaId = this.generateSagaId();
        return this.handleSagaError(sagaId, error);
      })
    );
  };

  @Saga()
  paymentProcessed = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PaymentProcessedEvent),
      map((event) => new CreateEnrollmentCommand(
        event.sagaId,
        event.courseId,
        event.studentId,
        event.paymentId
      ))
    );
  };

  @Saga()
  paymentFailed = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PaymentFailedEvent),
      map((event) => new CancelSagaCommand(event.sagaId, event.reason))
    );
  };

  @Saga()
  enrollmentCompleted = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(EnrollmentCompletedEvent),
      map((event) => new SendEnrollmentNotificationCommand(
        event.studentId,
        event.courseId
      ))
    );
  };

  private async handleEnrollmentRequested(
    event: CourseEnrollmentRequestedEvent
  ): Promise<Observable<ICommand>> {
    const sagaId = this.generateSagaId();
    
    // Start the payment process using shared patterns
    await this.interServiceClient.publishEvent(
      'payment-service',
      PAYMENT_PATTERNS.EVENTS.PAYMENT_INITIATED,
      {
        sagaId,
        studentId: event.studentId,
        amount: event.amount,
        courseId: event.courseId,
      }
    );

    return new Observable<ICommand>((observer) => {
      observer.next(this.createSagaTrackingCommand(sagaId, 'PAYMENT_PENDING', {
        courseId: event.courseId,
        studentId: event.studentId,
        amount: event.amount,
      }));
      observer.complete();
    });
  }
}
```

### 4.2 Saga State Management

```typescript
// apps/learning-service/src/models/saga-state.model.ts
export class SagaState {
  constructor(
    public sagaId: string,
    public sagaType: string,
    public status: string,
    public data: Record<string, any>,
    public steps: Record<string, boolean> = {},
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  updateStep(stepName: string, completed: boolean): void {
    this.steps[stepName] = completed;
    this.updatedAt = new Date();
  }

  updateStatus(status: string): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  isCompleted(): boolean {
    return Object.values(this.steps).every(step => step === true);
  }
}

// Saga commands
export class TrackSagaCommand {
  constructor(
    public readonly sagaId: string,
    public readonly status: string,
    public readonly data?: Record<string, any>
  ) {}
}

export class CreateEnrollmentCommand {
  constructor(
    public readonly sagaId: string,
    public readonly courseId: string,
    public readonly studentId: string,
    public readonly paymentId: string
  ) {}
}

export class CancelEnrollmentCommand {
  constructor(
    public readonly sagaId: string,
    public readonly reason: string
  ) {}
}
```

### 4.3 Saga Command Handlers

```typescript
// apps/learning-service/src/commands/track-saga.handler.ts
@CommandHandler(TrackSagaCommand)
export class TrackSagaHandler implements ICommandHandler<TrackSagaCommand> {
  constructor(
    @Inject('SAGA_REPOSITORY')
    private readonly sagaRepository: ISagaRepository
  ) {}

  async execute(command: TrackSagaCommand): Promise<void> {
    let sagaState = await this.sagaRepository.findById(command.sagaId);
    
    if (!sagaState) {
      sagaState = new SagaState(
        command.sagaId,
        'course-enrollment',
        command.status,
        command.data || {}
      );
    } else {
      sagaState.updateStatus(command.status);
    }

    await this.sagaRepository.save(sagaState);
  }
}

@CommandHandler(CreateEnrollmentCommand)
export class CreateEnrollmentHandler implements ICommandHandler<CreateEnrollmentCommand> {
  constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly sagaRepository: ISagaRepository
  ) {}

  async execute(command: CreateEnrollmentCommand): Promise<void> {
    try {
      const course = this.mergeObjectContext(
        await this.courseRepository.findById(command.courseId)
      );

      course.enrollStudent(command.studentId, command.paymentId);
      await this.courseRepository.save(course);

      // Update saga state
      const sagaState = await this.sagaRepository.findById(command.sagaId);
      sagaState.updateStep('enrollment_created', true);
      sagaState.updateStatus('ENROLLMENT_COMPLETED');
      await this.sagaRepository.save(sagaState);

      course.commit();

    } catch (error) {
      // Publish compensation event
      const sagaState = await this.sagaRepository.findById(command.sagaId);
      sagaState.updateStatus('FAILED');
      await this.sagaRepository.save(sagaState);

      throw error;
    }
  }
}
```

## 🔌 5. Direct TypeORM Usage (No Repository Wrappers)

### 5.1 Direct Domain Object Creation (No Mappers Needed)

```typescript
// apps/user-service/src/models/user.model.ts
import { AggregateRoot } from '@nestjs/cqrs';
import { UserEntity } from '../infrastructure/postgres/entities/user.entity';

export class User extends AggregateRoot {
  constructor(
    public id: string,
    public email: string,
    public name: string,
    public role: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {
    super();
  }

  // Factory method for creating new users
  static create(data: { email: string; name: string; role: string }): User {
    const user = new User(generateId(), data.email, data.name, data.role);
    user.apply(new UserCreatedEvent({ userId: user.id, ...data }));
    return user;
  }

  // Factory method for loading from database
  static fromEntity(entity: UserEntity): User {
    return new User(
      entity.id,
      entity.email,
      entity.name,
      entity.role,
      entity.createdAt,
      entity.updatedAt
    );
  }

  // Convert to entity for saving
  toEntity(): UserEntity {
    const entity = new UserEntity();
    entity.id = this.id;
    entity.email = this.email;
    entity.name = this.name;
    entity.role = this.role;
    entity.createdAt = this.createdAt;
    entity.updatedAt = this.updatedAt;
    return entity;
  }

  // Business methods
  updateProfile(name: string, email: string): void {
    this.name = name;
    this.email = email;
    this.updatedAt = new Date();
    this.apply(new UserUpdatedEvent({ userId: this.id, name, email }));
  }

  // Utility method for arrays
  static fromEntities(entities: UserEntity[]): User[] {
    return entities.map(entity => User.fromEntity(entity));
  }
}

// apps/user-service/src/models/user-profile.model.ts
export class UserProfile extends AggregateRoot {
  constructor(
    public id: string,
    public userId: string,
    public firstName: string,
    public lastName: string,
    public bio?: string,
    public avatarUrl?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {
    super();
  }

  static create(data: { userId: string; firstName: string; lastName: string }): UserProfile {
    const profile = new UserProfile(generateId(), data.userId, data.firstName, data.lastName);
    profile.apply(new UserProfileCreatedEvent({ profileId: profile.id, ...data }));
    return profile;
  }

  static fromEntity(entity: UserProfileEntity): UserProfile {
    return new UserProfile(
      entity.id,
      entity.userId,
      entity.firstName,
      entity.lastName,
      entity.bio,
      entity.avatarUrl,
      entity.createdAt,
      entity.updatedAt
    );
  }

  toEntity(): UserProfileEntity {
    const entity = new UserProfileEntity();
    entity.id = this.id;
    entity.userId = this.userId;
    entity.firstName = this.firstName;
    entity.lastName = this.lastName;
    entity.bio = this.bio;
    entity.avatarUrl = this.avatarUrl;
    entity.createdAt = this.createdAt;
    entity.updatedAt = this.updatedAt;
    return entity;
  }

  updateBio(bio: string): void {
    this.bio = bio;
    this.updatedAt = new Date();
    this.apply(new UserProfileUpdatedEvent({ profileId: this.id, bio }));
  }
}
```

### 5.2 Simplified Command Handlers (No Mappers)

```typescript
// apps/user-service/src/commands/create-user.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserCommand } from './create-user.command';
import { User } from '../models/user.model';
import { UserEntity } from '../infrastructure/postgres/entities/user.entity';
import { RedisCacheService } from '../infrastructure/redis/cache.service';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly cacheService: RedisCacheService
  ) {}

  async execute(command: CreateUserCommand): Promise<void> {
    // Create domain object
    const user = User.create({
      email: command.email,
      name: command.name,
      role: command.role,
    });

    // Convert to entity and save directly
    await this.userRepository.save(user.toEntity());
    
    // Cache the new user
    await this.cacheService.set(`user:${user.id}`, user, 3600);
    
    // Commit domain events
    user.commit();
  }
}

// apps/user-service/src/commands/update-user.handler.ts
@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  async execute(command: UpdateUserCommand): Promise<void> {
    // Fetch entity from database
    const userEntity = await this.userRepository.findOne({ 
      where: { id: command.userId } 
    });
    
    if (!userEntity) {
      throw new Error('User not found');
    }

    // Convert to domain object and merge with context
    const user = this.mergeObjectContext(User.fromEntity(userEntity));
    
    // Perform domain operations
    user.updateProfile(command.name, command.email);
    
    // Save back to database
    await this.userRepository.save(user.toEntity());
    
    // Commit events
    user.commit();
  }
}

// apps/user-service/src/commands/create-user-profile.handler.ts
@CommandHandler(CreateUserProfileCommand)
export class CreateUserProfileHandler implements ICommandHandler<CreateUserProfileCommand> {
  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>
  ) {}

  async execute(command: CreateUserProfileCommand): Promise<void> {
    const profile = UserProfile.create({
      userId: command.userId,
      firstName: command.firstName,
      lastName: command.lastName,
    });

    await this.userProfileRepository.save(profile.toEntity());
    profile.commit();
  }
}
```

### 5.3 Simplified Query Handlers (No Mappers)

```typescript
// apps/user-service/src/queries/get-user-by-id.handler.ts
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetUserByIdQuery } from './get-user-by-id.query';
import { User } from '../models/user.model';
import { UserEntity } from '../infrastructure/postgres/entities/user.entity';
import { RedisCacheService } from '../infrastructure/redis/cache.service';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly cacheService: RedisCacheService
  ) {}

  async execute(query: GetUserByIdQuery): Promise<User | null> {
    // Check cache first
    const cached = await this.cacheService.get<User>(`user:${query.userId}`);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const userEntity = await this.userRepository.findOne({ 
      where: { id: query.userId } 
    });
    
    if (!userEntity) {
      return null;
    }

    // Convert to domain object directly
    const user = User.fromEntity(userEntity);
    
    // Cache the result
    await this.cacheService.set(`user:${user.id}`, user, 3600);
    
    return user;
  }
}

// apps/user-service/src/queries/get-users-by-role.handler.ts
@QueryHandler(GetUsersByRoleQuery)
export class GetUsersByRoleHandler implements IQueryHandler<GetUsersByRoleQuery> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  async execute(query: GetUsersByRoleQuery): Promise<User[]> {
    const userEntities = await this.userRepository.find({
      where: { role: query.role },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    // Convert directly using static method
    return User.fromEntities(userEntities);
  }
}

// apps/user-service/src/queries/get-user-with-profile.handler.ts
@QueryHandler(GetUserWithProfileQuery)
export class GetUserWithProfileHandler implements IQueryHandler<GetUserWithProfileQuery> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly userProfileRepository: Repository<UserProfileEntity>
  ) {}

  async execute(query: GetUserWithProfileQuery): Promise<{ user: User; profile: UserProfile | null }> {
    const userEntity = await this.userRepository.findOne({ 
      where: { id: query.userId } 
    });
    
    if (!userEntity) {
      throw new Error('User not found');
    }

    const profileEntity = await this.userProfileRepository.findOne({
      where: { userId: query.userId }
    });

    return {
      user: User.fromEntity(userEntity),
      profile: profileEntity ? UserProfile.fromEntity(profileEntity) : null,
    };
  }
}
```

### 5.4 Simplified App Module

```typescript
// apps/user-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgresModule } from './infrastructure/postgres/postgres.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { CognitoModule } from './infrastructure/cognito/cognito.module';
import { UserEntity } from './infrastructure/postgres/entities/user.entity';
import { UserProfileEntity } from './infrastructure/postgres/entities/user-profile.entity';

@Module({
  imports: [
    CqrsModule,
    PostgresModule,
    RedisModule,
    CognitoModule,
    // Import entities directly
    TypeOrmModule.forFeature([UserEntity, UserProfileEntity]),
  ],
  controllers: [
    UserController,
    UserEventsController,
  ],
  providers: [
    // Command handlers
    CreateUserHandler,
    UpdateUserHandler,
    DeleteUserHandler,
    // Query handlers
    GetUserByIdHandler,
    GetUsersByRoleHandler,
    GetUserProfileHandler,
    // Event handlers
    UserCreatedHandler,
    UserUpdatedHandler,
    // Sagas
    UserOnboardingSaga,
    UserVerificationSaga,
    // Services
    InterServiceClient,
    RedisCacheService,
    CognitoAuthService,
  ],
})
export class AppModule {}
```

## ⚡ 6. AWS Lambda Integration Guidelines

### 6.1 Lambda Function Structure (ESM + esbuild)

```typescript
// apps/user-service/lambda/handlers/user-notification.handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { NestFactory } from '@nestjs/core';
import { UserNotificationModule } from '../modules/user-notification.module';
import { UserNotificationService } from '../services/user-notification.service';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const app = await NestFactory.createApplicationContext(UserNotificationModule);
  const notificationService = app.get(UserNotificationService);

  try {
    const eventData = JSON.parse(event.body || '{}');
    await notificationService.processNotification(eventData);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notification processed successfully' }),
    };
  } catch (error) {
    console.error('Error processing notification:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  } finally {
    await app.close();
  }
};

// apps/user-service/lambda/build.ts (esbuild configuration)
import { build } from 'esbuild';
import { glob } from 'glob';

const entryPoints = glob.sync('./handlers/*.handler.ts');

build({
  entryPoints,
  bundle: true,
  outdir: './dist',
  platform: 'node',
  target: 'node18',
  format: 'esm',
  sourcemap: true,
  external: ['aws-sdk'], // Exclude AWS SDK as it's provided by Lambda runtime
  banner: {
    js: `
      import { createRequire } from 'module';
      const require = createRequire(import.meta.url);
    `,
  },
}).catch(() => process.exit(1));
```

### 6.2 When to Use Lambda Functions

**✅ Good Use Cases for Lambda:**
1. **Event Processing**: Handle EventBridge events for notifications, cleanup tasks
2. **Scheduled Tasks**: Cron-like jobs for data cleanup, report generation
3. **File Processing**: Process uploaded files, generate thumbnails, convert formats
4. **Webhooks**: Handle external service webhooks (payment providers, etc.)
5. **Background Jobs**: Send emails, process analytics, generate reports

**❌ Avoid Lambda for:**
1. **Main API Endpoints**: Use ECS/Fargate services for consistent performance
2. **Real-time Communication**: WebSocket connections, live video calls
3. **Long-running Processes**: Anything over 15 minutes
4. **Database Connections**: Avoid connection pooling issues

```typescript
// Example: Good Lambda use case - File processing
export const processUploadedFile = async (event: S3Event): Promise<void> => {
  const app = await NestFactory.createApplicationContext(FileProcessingModule);
  const fileService = app.get(FileProcessingService);

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;

    try {
      await fileService.processFile(bucket, key);
    } catch (error) {
      console.error(`Failed to process file ${key}:`, error);
    }
  }

  await app.close();
};
```

## 🚀 7. Redis Caching Strategy

### 7.1 Targeted Caching Use Cases

**✅ Cache These:**
1. **User Sessions**: Authentication tokens, user preferences
2. **Frequent Queries**: Popular courses, tutor profiles
3. **Computed Data**: Aggregated ratings, course statistics
4. **Rate Limiting**: API request counters
5. **Search Results**: Course search results for popular queries

**❌ Don't Cache These:**
1. **Transactional Data**: Payments, enrollments, sensitive user data
2. **Frequently Changing Data**: Live chat messages, real-time notifications
3. **Large Objects**: Video files, large documents
4. **One-time Data**: Password reset tokens, verification codes

### 7.2 Cache Implementation Patterns

```typescript
// Cache-Aside Pattern
@QueryHandler(GetCoursesBySubjectQuery)
export class GetCoursesBySubjectHandler implements IQueryHandler<GetCoursesBySubjectQuery> {
  constructor(
    @Inject('COURSE_REPOSITORY')
    private readonly courseRepository: ICourseRepository,
    @Inject('CACHE_SERVICE')
    private readonly cacheService: ICacheService
  ) {}

  async execute(query: GetCoursesBySubjectQuery): Promise<Course[]> {
    const cacheKey = `courses:subject:${query.subject}:page:${query.page}`;
    
    // Try cache first
    const cached = await this.cacheService.get<Course[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const courses = await this.courseRepository.findBySubject(
      query.subject,
      query.page,
      query.limit
    );

    // Cache for 30 minutes
    await this.cacheService.set(cacheKey, courses, 1800);
    
    return courses;
  }
}

// Write-Through Pattern for frequently accessed data
@CommandHandler(UpdateCourseCommand)
export class UpdateCourseHandler implements ICommandHandler<UpdateCourseCommand> {
  constructor(
    @Inject('COURSE_REPOSITORY')
    private readonly courseRepository: ICourseRepository,
    @Inject('CACHE_SERVICE')
    private readonly cacheService: ICacheService
  ) {}

  async execute(command: UpdateCourseCommand): Promise<void> {
    const course = this.mergeObjectContext(
      await this.courseRepository.findById(command.courseId)
    );

    course.updateDetails(command.title, command.description, command.price);
    
    // Save to database
    await this.courseRepository.save(course);
    
    // Update cache immediately
    await this.cacheService.set(`course:${course.id}`, course, 3600);
    
    // Invalidate related caches
    await this.cacheService.delete(`courses:subject:${course.subject}:*`);
    
    course.commit();
  }
}

// Rate Limiting with Redis
@Injectable()
export class RateLimitService {
  constructor(
    @Inject('CACHE_SERVICE')
    private readonly cacheService: ICacheService
  ) {}

  async checkRateLimit(userId: string, endpoint: string, maxRequests: number = 100): Promise<boolean> {
    const key = `ratelimit:${userId}:${endpoint}`;
    const current = await this.cacheService.get<number>(key) || 0;
    
    if (current >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    await this.cacheService.set(key, current + 1, 3600); // 1 hour window
    return true;
  }
}
```

## 📡 8. Event Organization: Local vs Inter-Service Events

### 4.1 Simple Event Structure

```typescript
// Local Events (handled within service via NestJS/CQRS)
export class UserCreatedEvent {
  constructor(public readonly data: {
    userId: string;
    email: string;
    role: string;
    createdAt: Date;
  }) {}
}

export class UserUpdatedEvent {
  constructor(public readonly data: {
    userId: string;
    changes: Record<string, any>;
    updatedAt: Date;
  }) {}
}

// Integration Events (for EventBridge)
export class UserCreatedIntegrationEvent {
  constructor(public readonly data: {
    eventId: string;
    userId: string;
    email: string;
    role: string;
    source: string;
    timestamp: string;
  }) {}

  toEventBridge() {
    return {
      Source: this.data.source,
      DetailType: 'User Created',
      Detail: JSON.stringify(this.data),
    };
  }
}
```

### 4.2 Local Event Handling (NestJS/CQRS)

```typescript
// Event Handler in Application Layer
@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  constructor(
    private readonly emailService: EmailService,
    private readonly eventBridge: EventBridgeService
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    // 1. Local side effects
    await this.emailService.sendWelcomeEmail(event.data.email);

    // 2. Publish to EventBridge for other services
    const integrationEvent = new UserCreatedIntegrationEvent({
      eventId: generateId(),
      userId: event.data.userId,
      email: event.data.email,
      role: event.data.role,
      source: 'user.service',
      timestamp: new Date().toISOString(),
    });

    await this.eventBridge.publish(integrationEvent);
  }
}

@EventsHandler(UserUpdatedEvent)
export class UserUpdatedHandler implements IEventHandler<UserUpdatedEvent> {
  constructor(private readonly cacheService: CacheService) {}

  async handle(event: UserUpdatedEvent): Promise<void> {
    // Clear user cache
    await this.cacheService.delete(`user:${event.data.userId}`);
  }
}
```

### 4.3 Simple Event Publishing

```typescript
// Simple EventBridge Service
@Injectable()
export class EventBridgeService {
  constructor(private readonly eventBridgeClient: EventBridgeClient) {}

  async publish(event: { toEventBridge: () => any }): Promise<void> {
    const eventData = event.toEventBridge();

    await this.eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: eventData.Source,
            DetailType: eventData.DetailType,
            Detail: eventData.Detail,
            EventBusName: process.env.EVENT_BUS_NAME,
          },
        ],
      })
    );
  }
}

// EventBridge Event Listener (in receiving service)
@Injectable()
export class UserEventListener {
  constructor(private readonly notificationService: NotificationService) {}

  // This would be triggered by EventBridge in the receiving service
  async handleUserCreated(event: any): Promise<void> {
    const userData = JSON.parse(event.Detail);
    
    // Handle the integration event
    await this.notificationService.sendWelcomeNotification(userData.userId);
  }
}
```

## 🎯 Implementation Guidelines

### Enhanced Best Practices

1. **NestJS/CQRS + Microservices**:
   - Use custom EventBridge transport for inter-service communication
   - Implement predictable event flow with MessagePattern/EventPattern
   - Use Saga classes from NestJS/CQRS for distributed transactions
   - Support both event-driven and request-reply patterns

2. **Infrastructure Abstraction**:
   - Use `infrastructure/<name>` folders for specific technologies
   - Define interfaces for all external dependencies
   - Inject infrastructure services via dependency injection
   - Keep domain logic independent of infrastructure concerns

3. **AWS Lambda Strategy**:
   - Use TypeScript ESM modules with esbuild for optimal performance
   - Apply to event processing, file handling, and background tasks
   - Avoid for main API endpoints and real-time communication
   - Implement proper error handling and graceful shutdown

4. **Targeted Caching**:
   - Cache frequently accessed, slow-changing data
   - Implement cache-aside and write-through patterns
   - Use Redis for rate limiting and session storage
   - Avoid caching transactional or rapidly changing data

5. **Event Organization**:
   - Local events handled by NestJS/CQRS within service boundaries
   - Integration events for cross-service communication via EventBridge
   - Use command handlers with `mergeObjectContext` for aggregate loading
   - Implement proper saga orchestration for complex workflows

This enhanced approach ensures our EdTech platform is scalable, maintainable, and production-ready.

## 💡 Complete Optimized Service Example

Here's how all the optimized patterns work together in a production-ready service:

```typescript
// apps/learning-service/src/models/course.model.ts
import { AggregateRoot } from '@nestjs/cqrs';
import { CourseEntity } from '../infrastructure/postgres/entities/course.entity';

export class Course extends AggregateRoot {
  constructor(
    public id: string,
    public title: string,
    public tutorId: string,
    public price: number,
    public status: 'DRAFT' | 'PUBLISHED' = 'DRAFT',
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {
    super();
  }

  static create(data: { title: string; tutorId: string; price: number }): Course {
    const course = new Course(generateId(), data.title, data.tutorId, data.price);
    course.apply(new CourseCreatedEvent({ courseId: course.id, ...data }));
    return course;
  }

  // Factory method for loading from database
  static fromEntity(entity: CourseEntity): Course {
    return new Course(
      entity.id,
      entity.title,
      entity.tutorId,
      entity.price,
      entity.status,
      entity.createdAt,
      entity.updatedAt
    );
  }

  // Convert to entity for saving
  toEntity(): CourseEntity {
    const entity = new CourseEntity();
    entity.id = this.id;
    entity.title = this.title;
    entity.tutorId = this.tutorId;
    entity.price = this.price;
    entity.status = this.status;
    entity.createdAt = this.createdAt;
    entity.updatedAt = this.updatedAt;
    return entity;
  }

  publish(): void {
    this.status = 'PUBLISHED';
    this.updatedAt = new Date();
    this.apply(new CoursePublishedEvent({ courseId: this.id }));
  }

  enrollStudent(studentId: string, paymentId: string): void {
    this.apply(new StudentEnrolledEvent({
      courseId: this.id,
      studentId,
      paymentId,
      enrolledAt: new Date(),
    }));
  }

  updateDetails(title: string, description: string, price: number): void {
    this.title = title;
    this.price = price;
    this.updatedAt = new Date();
    this.apply(new CourseUpdatedEvent({
      courseId: this.id,
      title,
      price,
    }));
  }

  // Utility method for arrays
  static fromEntities(entities: CourseEntity[]): Course[] {
    return entities.map(entity => Course.fromEntity(entity));
  }
}

// Domain model includes its own conversion methods
// No separate mapper classes needed!

// apps/learning-service/src/commands/create-course.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisCacheService } from '../infrastructure/redis/cache.service';

@CommandHandler(CreateCourseCommand)
export class CreateCourseHandler implements ICommandHandler<CreateCourseCommand> {
  constructor(
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    private readonly cacheService: RedisCacheService
  ) {}

  async execute(command: CreateCourseCommand): Promise<void> {
    const course = Course.create(command);
    
    // Save directly using domain object's toEntity method
    await this.courseRepository.save(course.toEntity());
    
    // Cache the new course
    await this.cacheService.set(`course:${course.id}`, course, 3600);
    
    course.commit();
  }
}

// apps/learning-service/src/commands/enroll-student.handler.ts
@CommandHandler(EnrollStudentCommand)
export class EnrollStudentHandler implements ICommandHandler<EnrollStudentCommand> {
  constructor(
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    private readonly interServiceClient: InterServiceClient
  ) {}

  async execute(command: EnrollStudentCommand): Promise<void> {
    // Verify payment first using shared patterns
    const paymentValid = await this.interServiceClient.sendRequest(
      'payment-service',
      PAYMENT_PATTERNS.MESSAGES.VERIFY_PAYMENT,
      { paymentId: command.paymentId }
    );

    if (!paymentValid) {
      throw new Error('Payment verification failed');
    }

    // Fetch entity and convert to domain
    const courseEntity = await this.courseRepository.findOne({ 
      where: { id: command.courseId } 
    });
    
    if (!courseEntity) {
      throw new Error('Course not found');
    }

    // Use mergeObjectContext with domain object loaded from entity
    const course = this.mergeObjectContext(Course.fromEntity(courseEntity));

    course.enrollStudent(command.studentId, command.paymentId);
    
    // Save back to database using domain object's toEntity method
    await this.courseRepository.save(course.toEntity());
    
    course.commit();
  }
}

// apps/learning-service/src/events/course-created.handler.ts
@EventsHandler(CourseCreatedEvent)
export class CourseCreatedHandler implements IEventHandler<CourseCreatedEvent> {
  constructor(
    private readonly interServiceClient: InterServiceClient,
    private readonly cacheService: RedisCacheService
  ) {}

  async handle(event: CourseCreatedEvent): Promise<void> {
    // Publish integration event using shared patterns
    await this.interServiceClient.publishEvent(
      'notification-service',
      COURSE_PATTERNS.EVENTS.COURSE_CREATED,
      {
        courseId: event.data.courseId,
        tutorId: event.data.tutorId,
        title: event.data.title,
      }
    );

    // Invalidate tutor's course cache
    await this.cacheService.delete(`tutor:${event.data.tutorId}:courses`);
  }
}

// apps/learning-service/src/controllers/course-events.controller.ts
import { PAYMENT_PATTERNS, COURSE_PATTERNS } from '@edtech/patterns';

@Controller()
export class CourseEventsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  // Event Pattern using shared patterns
  @EventPattern(PAYMENT_PATTERNS.EVENTS.PAYMENT_COMPLETED)
  async handlePaymentCompleted(@Payload() data: any): Promise<void> {
    await this.commandBus.execute(
      new EnrollStudentCommand(data.courseId, data.studentId, data.paymentId)
    );
  }

  // Message Pattern using shared patterns
  @MessagePattern(COURSE_PATTERNS.MESSAGES.GET_COURSE_BY_ID)
  async getCourseById(@Payload() data: { courseId: string }): Promise<any> {
    return this.queryBus.execute(new GetCourseByIdQuery(data.courseId));
  }

  @MessagePattern(COURSE_PATTERNS.MESSAGES.VERIFY_ENROLLMENT)
  async verifyEnrollment(@Payload() data: { courseId: string; studentId: string }): Promise<boolean> {
    return this.queryBus.execute(new VerifyEnrollmentQuery(data.courseId, data.studentId));
  }
}

// apps/learning-service/src/sagas/course-enrollment.saga.ts
import { BaseSaga } from '@edtech/saga';
import { PAYMENT_PATTERNS } from '@edtech/patterns';

@Injectable()
export class CourseEnrollmentSaga extends BaseSaga {
  constructor(private readonly interServiceClient: InterServiceClient) {
    super();
  }

  @Saga()
  courseEnrollment = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(CourseEnrollmentRequestedEvent),
      map((event) => new ProcessPaymentCommand(
        event.studentId,
        event.amount,
        event.courseId
      ))
    );
  };

  @Saga()
  paymentProcessed = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PaymentProcessedEvent),
      map((event) => new CreateEnrollmentCommand(
        event.courseId,
        event.studentId,
        event.paymentId
      ))
    );
  };
}

// apps/learning-service/src/queries/get-course-by-id.handler.ts
@QueryHandler(GetCourseByIdQuery)
export class GetCourseByIdHandler implements IQueryHandler<GetCourseByIdQuery> {
  constructor(
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    private readonly cacheService: RedisCacheService
  ) {}

  async execute(query: GetCourseByIdQuery): Promise<Course | null> {
    // Check cache first
    const cached = await this.cacheService.get<Course>(`course:${query.courseId}`);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const courseEntity = await this.courseRepository.findOne({ 
      where: { id: query.courseId } 
    });
    
    if (!courseEntity) {
      return null;
    }

    // Convert to domain object directly
    const course = Course.fromEntity(courseEntity);
    
    // Cache the result
    await this.cacheService.set(`course:${course.id}`, course, 3600);
    
    return course;
  }
}

// apps/learning-service/src/app.module.ts
import { EventBridgeTransport } from '@edtech/shared';

@Module({
  imports: [
    CqrsModule,
    PostgresModule,
    RedisModule,
    // Import entities directly - no repository wrappers
    TypeOrmModule.forFeature([CourseEntity, LessonEntity, EnrollmentEntity]),
  ],
  controllers: [
    CourseController,
    CourseEventsController,
  ],
  providers: [
    // Command handlers
    CreateCourseHandler,
    EnrollStudentHandler,
    PublishCourseHandler,
    // Query handlers
    GetCourseByIdHandler,
    GetCoursesByTutorHandler,
    GetCoursesBySubjectHandler,
    // Event handlers
    CourseCreatedHandler,
    StudentEnrolledHandler,
    CoursePublishedHandler,
    // Sagas using shared base classes
    CourseEnrollmentSaga,
    LessonProgressSaga,
    // Services
    InterServiceClient,
    RedisCacheService,
    CognitoAuthService,
  ],
})
export class AppModule {}

// apps/learning-service/lambda/handlers/course-analytics.handler.ts
import { CourseAnalyticsService } from '../services/course-analytics.service';

export const handler = async (event: EventBridgeEvent): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AnalyticsModule);
  const analyticsService = app.get(CourseAnalyticsService);

  try {
    const courseData = JSON.parse(event.detail);
    await analyticsService.trackCourseEvent(courseData);
  } catch (error) {
    console.error('Failed to process course analytics:', error);
  } finally {
    await app.close();
  }
};

// apps/learning-service/main.ts
import { EventBridgeTransport } from '@edtech/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Connect EventBridge microservice using shared transport
  app.connectMicroservice({
    strategy: new EventBridgeTransport({
      region: process.env.AWS_REGION,
      eventBusName: process.env.EVENT_BUS_NAME,
      source: 'learning.service',
    }),
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}
```

This optimized example demonstrates:
- **Direct TypeORM usage** with domain objects containing their own conversion methods
- **No repository wrappers or mapper classes** - domain objects handle entity conversion
- **Shared patterns library** for consistent event/message naming across services
- **Shared saga components** with reusable base classes and utilities
- **mergeObjectContext usage** for proper aggregate loading with NestJS/CQRS
- **Simplified dependency injection** without unnecessary abstractions
- **Type-safe patterns** for inter-service communication
- **Optimized caching strategies** with targeted use cases
- **Lambda integration** for background processing with ESM modules 

## 🔧 GraphQL API TypeScript Strategy

### 📁 Hybrid JavaScript/TypeScript Approach

For the GraphQL API layer (`@/graphql-api`), we use a hybrid approach that balances development speed with type safety:

#### ✅ **Keep as JavaScript (Infrastructure/Utilities)**
```
graphql-api/
├── scripts/              # Build and development tools (JavaScript)
│   ├── compose-schemas.js
│   ├── enhanced-compose.js
│   └── validate-schemas.js
├── registry/             # Schema versioning utilities (JavaScript)  
│   └── schema-registry.js
├── error-handling/       # Base error classes (JavaScript)
│   └── graphql-errors.js
└── gateway/              # Apollo Gateway (JavaScript)
    └── index.js
```

#### 🔄 **Implement in TypeScript (Business Logic)**
```
graphql-api/
├── resolvers/            # Service-specific resolvers (TypeScript)
│   ├── user/
│   │   └── user.resolver.ts
│   ├── learning/
│   │   └── learning.resolver.ts
│   └── payment/
│       └── payment.resolver.ts
├── types/                # Generated GraphQL types (TypeScript)
│   ├── generated.ts      # Auto-generated from schema
│   ├── user.types.ts     # Service-specific types
│   └── common.types.ts   # Shared types
└── services/             # Service integration (TypeScript)
    ├── user.service.ts
    └── auth.service.ts
```

### 🏗️ **Development Workflow**

#### **For TypeScript Resolvers**
```bash
# Auto-generate types from GraphQL schema
npm run codegen

# Development with watch mode
npm run build:watch

# Type checking
npm run type-check

# Build for deployment
npm run build:resolvers
```

#### **For JavaScript Utilities**
```bash
# Schema composition (JavaScript)
npm run enhanced-compose

# Schema validation (JavaScript) 
npm run schema-validate

# Registry management (JavaScript)
npm run registry:list
```

### 📝 **TypeScript Resolver Implementation**
```typescript
// resolvers/user/user.resolver.ts
import { AppSyncEvent, User, CreateUserResponse } from '../../types/generated';

export class UserResolver {
  static async createUser(event: AppSyncEvent): Promise<CreateUserResponse> {
    // Type-safe business logic with auto-generated types
    const { input } = event.arguments;
    
    // Call to JavaScript error utilities
    const { ValidationError } = require('../../error-handling/graphql-errors');
    
    if (!input.email) {
      throw new ValidationError('Email is required', 'email');
    }
    
    // Strongly typed return using generated types
    return { user: newUser, errors: [] };
  }
}

// AWS Lambda handler with typed events
export const handler = async (event: AppSyncEvent): Promise<any> => {
  switch (event.fieldName) {
    case 'createUser':
      return await UserResolver.createUser(event);
    default:
      throw new Error(`Unknown field: ${event.fieldName}`);
  }
};
```

### 🎯 **Benefits of This Approach**

#### **Development Experience**
- ✅ **Fast Build Tools**: JavaScript utilities compile instantly
- ✅ **Type Safety**: Critical business logic gets TypeScript benefits
- ✅ **Auto-generated Types**: GraphQL schema changes automatically update types
- ✅ **Tool Compatibility**: Best compatibility with Apollo/GraphQL ecosystem

#### **Production Benefits**
- ✅ **Performance**: Compiled TypeScript for Lambda functions
- ✅ **Reliability**: Type checking for critical business operations
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Developer Experience**: Type hints and autocomplete for business logic

### 💡 **Implementation Guidelines**

**For Day 4 and Beyond:**
- ✅ **Keep utilities in JavaScript** (schema registry, composition, error classes)
- ✅ **Implement business logic in TypeScript** (resolvers, service integration)
- ✅ **Use GraphQL code generation** for automatic type creation
- ✅ **Gradual migration** as needed for specific components

This hybrid strategy provides optimal balance between development speed and type safety, perfect for the EdTech platform's microservices architecture. 