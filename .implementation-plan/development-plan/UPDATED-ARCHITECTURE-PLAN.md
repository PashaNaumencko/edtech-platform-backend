# EdTech Platform - Updated Architecture & Implementation Plan

## Simplified Domain-Driven Design Architecture

### Core Domain Layer Components
Based on NestJS CQRS and simplified patterns:

1. **Entities**: Core domain objects with identity
2. **Value Objects**: Immutable objects defined by their values
3. **Aggregate Roots**: Entities that enforce consistency boundaries (extends NestJS CQRS AggregateRoot)
4. **Domain Services**: Complex business logic that doesn't belong to entities
5. **Domain Events**: Events emitted by aggregate roots (using NestJS CQRS events)

### Application Layer Simplified
- **Use Cases as Services**: Replace command/query handlers with use case services
- **DTOs**: Input/output data transfer objects
- **Event Handlers**: Handle domain events from aggregate roots

### Infrastructure Mapping
- **mergeObject Context**: Map infrastructure objects to domain models
- **Repository Pattern**: Abstract data access with proper domain mapping

## Phase 1: Infrastructure Modernization (5-7 days)

### 1.1 Database Migration Strategy (Days 1-2)
**Objective**: Replace TypeORM with Drizzle ORM for better TypeScript integration

#### Key Changes:
- **Remove TypeORM** dependencies from all services
- **Implement Drizzle schemas** with proper PostgreSQL types
- **Create migration system** using Drizzle's built-in migration tools
- **Update repository implementations** to use Drizzle queries
- **Use mergeObject context** for mapping DB results to domain models

#### Implementation Steps:
1. Install Drizzle ORM and PostgreSQL driver
2. Define Drizzle schemas for each service
3. Create migration files and seeding scripts
4. Update repository implementations
5. Add domain model mapping utilities

### 1.2 Cloud Development Environment (Days 2-3)
**Objective**: Remove LocalStack, use real AWS services for all environments

#### Key Changes:
- **Remove all LocalStack** configurations and dependencies
- **Update CDK stacks** for dev/stage/prod environment separation
- **Implement AWS Secrets Manager** for database credentials
- **Setup developer-specific environments** (dev-developer-name pattern)

#### Implementation Steps:
1. Remove LocalStack from docker-compose.yml and scripts
2. Update CDK stacks with environment-specific configurations
3. Implement AWS Secrets Manager integration
4. Create developer environment provisioning scripts
5. Update service configurations for real AWS endpoints

### 1.3 Unified GraphQL Architecture (Days 3-4)
**Objective**: Create hybrid AppSync + Federation architecture

#### Architecture Pattern:
```
Public API (Mobile/Web) → AppSync (Auth + Schema) → Lambda Resolvers → Federation Gateway → NestJS Services
Internal APIs → Direct Federation Gateway → NestJS Services
```

#### Key Components:
- **AppSync**: Public-facing GraphQL API with Cognito authentication
- **Apollo Federation Gateway**: Internal service mesh for microservices
- **Lambda Resolvers**: Bridge between AppSync and Federation Gateway
- **NestJS GraphQL Modules**: Federation subgraphs in each service

## Phase 2: Service Implementation (8-10 days)

### 2.1 Simplified Domain Layer Implementation (Days 1-3)
**Objective**: Implement simplified DDD patterns across all services

#### Domain Structure:
```typescript
// domain/
├── entities/           # Core domain entities
├── value-objects/      # Immutable value objects
├── aggregates/         # Aggregate roots (extends NestJS CQRS AggregateRoot)
├── services/           # Domain services for complex business logic
└── events/             # Domain events (extends NestJS CQRS events)
```

#### Key Patterns:
- **Aggregate Roots**: Use NestJS CQRS AggregateRoot for event emission
- **Domain Events**: Simple event classes extending NestJS CQRS Event
- **Value Objects**: Immutable objects with validation
- **mergeObject Mapping**: Infrastructure to domain model mapping

### 2.2 Application Layer with Use Case Services (Days 3-5)
**Objective**: Replace CQRS commands/queries with use case services

#### Application Structure:
```typescript
// application/
├── use-cases/          # Use case services (business operations)
├── dtos/               # Input/output data transfer objects
├── event-handlers/     # Domain event handlers
└── interfaces/         # Repository and service interfaces
```

#### Use Case Pattern:
```typescript
@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryInterface,
    private readonly eventBus: EventBus
  ) {}

  async execute(dto: CreateUserDto): Promise<UserDto> {
    // Business logic
    const user = User.create(dto);
    await this.userRepository.save(user);
    
    // Events are automatically published by aggregate root
    user.commit(); // Publishes events via NestJS CQRS
    
    return this.mapToDto(user);
  }
}
```

### 2.3 NestJS GraphQL Federation (Days 5-7)
**Objective**: Implement GraphQL federation in all services

#### Implementation Steps:
1. Add `@nestjs/graphql` and federation dependencies
2. Create GraphQL modules in each service
3. Define federation schemas with directives (`@key`, `@extends`)
4. Implement GraphQL resolvers using use case services
5. Connect services to Apollo Federation Gateway

### 2.4 Serverless Lambda Strategy (Days 7-8)
**Objective**: Define clear serverless vs container boundaries

#### Lambda Use Cases:
- **Event Handlers**: Process domain events from EventBridge
- **AppSync Resolvers**: Bridge public API to internal services
- **Scheduled Tasks**: Cron jobs and periodic operations
- **Simple CRUD**: Lightweight data operations

#### Fargate Use Cases:
- **Complex Business Logic**: Multi-step business processes
- **Long-running Services**: Service mesh and federation gateway
- **Heavy Computations**: Data processing and analysis

## Phase 3: Event-Driven Architecture (5-6 days)

### 3.1 Simplified Saga Pattern (Days 1-2)
**Objective**: Implement choreography-based sagas using EventBridge

#### Saga Implementation:
- **EventBridge Choreography**: Services react to events independently
- **Saga State Management**: Use DynamoDB for saga tracking
- **Compensation Handlers**: Rollback operations as event handlers
- **Lambda Coordinators**: Simple coordination logic

### 3.2 Domain Events & Event Handlers (Days 2-4)
**Objective**: Implement reliable event-driven communication

#### Event Pattern:
```typescript
// Domain Event
export class UserCreatedEvent extends Event {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly role: UserRole
  ) {
    super();
  }
}

// Aggregate Root
export class User extends AggregateRoot {
  static create(data: CreateUserData): User {
    const user = new User(data);
    user.apply(new UserCreatedEvent(user.id, user.email, user.role));
    return user;
  }
}

// Event Handler
@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent) {
    // Cross-service operations
    await this.eventBridge.publish(event);
  }
}
```

### 3.3 Infrastructure Mapping (Days 4-5)
**Objective**: Implement clean mapping between infrastructure and domain

#### Mapping Pattern:
```typescript
// Repository Implementation
@Injectable()
export class UserRepository implements UserRepositoryInterface {
  async findById(id: string): Promise<User | null> {
    const userData = await this.db.select().from(users).where(eq(users.id, id));
    
    if (!userData) return null;
    
    // Use mergeObject context for mapping
    return User.fromPersistence(
      mergeObject(userData, {
        // Additional mapping context
        skills: JSON.parse(userData.skills || '[]'),
        preferences: this.mapPreferences(userData.preferences)
      })
    );
  }

  async save(user: User): Promise<void> {
    const persistenceData = user.toPersistence();
    await this.db.insert(users).values(persistenceData);
    
    // Publish events
    user.commit();
  }
}
```

## Updated Service Structure

### Simplified Folder Structure:
```
apps/[service-name]/src/
├── domain/                 # Core business logic
│   ├── entities/          # Domain entities
│   ├── value-objects/     # Immutable value objects
│   ├── aggregates/        # Aggregate roots (NestJS CQRS)
│   ├── services/          # Domain services
│   └── events/            # Domain events
├── application/           # Application logic
│   ├── use-cases/         # Use case services
│   ├── dtos/              # Data transfer objects
│   ├── event-handlers/    # Event handlers
│   └── interfaces/        # Interfaces
├── infrastructure/        # External concerns
│   ├── persistence/       # Database (Drizzle ORM)
│   ├── graphql/          # GraphQL federation
│   ├── http/             # REST controllers
│   └── events/           # EventBridge integration
└── main.ts               # Application entry point
```

## Key Benefits of Simplified Architecture

1. **Reduced Complexity**: Fewer patterns to learn and maintain
2. **Better TypeScript Integration**: Drizzle ORM provides excellent type safety
3. **Cleaner Domain Logic**: Simplified patterns focus on business value
4. **Real AWS Services**: Higher fidelity development environment
5. **Unified GraphQL**: Single approach for all GraphQL needs
6. **Event-Driven Simplicity**: Clear event patterns with NestJS CQRS

## Migration Strategy

### Phase 1 Priority: User Service
1. Migrate User Service to new patterns
2. Test all integrations
3. Document learnings and patterns
4. Apply to remaining services

### Gradual Rollout:
1. User Service (Core foundation)
2. Payment Service (Critical business logic)
3. Learning Service (Content management)
4. Remaining services in parallel

This updated plan provides a cleaner, more maintainable architecture while preserving the benefits of DDD and event-driven design.