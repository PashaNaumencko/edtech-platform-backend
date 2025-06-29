# Microservices Folder Structure - Architecture Reference

## Overview
This document defines the standardized folder structure for all microservices in the EdTech Platform, following **Domain-Driven Design (DDD)** with **Clean Architecture** principles and **Use Case Pattern**.

## Core Architectural Decisions

### 1. **No CQRS Pattern** - Simplified Approach
- ❌ No Command/Query handlers
- ✅ Use Case pattern with `.usecase.ts` suffix
- ✅ Simple application services when needed

### 2. **DDD + Clean Architecture**
- **Domain Layer** (innermost) - Business logic, entities, value objects
- **Application Layer** - Use cases, event handlers, sagas
- **Infrastructure Layer** - External concerns (DB, APIs, messaging)
- **Interface Layer** - Controllers, GraphQL resolvers

### 3. **NestJS CQRS Integration**
- ✅ Use `AggregateRoot` from `@nestjs/cqrs` for domain entities
- ✅ Use local events and event handlers for side effects
- ✅ Use Sagas for complex multi-step workflows

## Complete Microservice Folder Structure

```typescript
{service-name}/
├── src/
│   ├── domain/                           # 🔵 DOMAIN LAYER (Business Logic)
│   │   ├── entities/                     # Domain entities (AggregateRoot)
│   │   │   ├── {entity}.entity.ts        # Main aggregate root
│   │   │   ├── {child-entity}.entity.ts  # Child entities
│   │   │   └── index.ts                  # Barrel exports
│   │   ├── value-objects/                # Value objects
│   │   │   ├── {vo-name}.vo.ts
│   │   │   └── index.ts
│   │   ├── events/                       # Domain events
│   │   │   ├── {event-name}.event.ts
│   │   │   └── index.ts
│   │   ├── repositories/                 # Repository interfaces
│   │   │   ├── {entity}.repository.ts
│   │   │   └── index.ts
│   │   ├── services/                     # Domain services (complex business logic)
│   │   │   ├── {domain-service}.domain-service.ts
│   │   │   └── index.ts
│   │   ├── specifications/               # Business rule specifications
│   │   │   ├── {spec-name}.specification.ts
│   │   │   └── index.ts
│   │   └── exceptions/                   # Domain exceptions
│   │       ├── {exception-name}.exception.ts
│   │       └── index.ts
│   │
   │   ├── application/                      # 🟡 APPLICATION LAYER (Use Cases & Orchestration)
   │   │   ├── use-cases/                    # 🎯 USE CASES (Main business flows)
   │   │   │   ├── {operation}/              # Grouped by operation
   │   │   │   │   ├── {operation}.usecase.ts
   │   │   │   │   ├── {operation}.request.ts    # Use case input
   │   │   │   │   ├── {operation}.response.ts   # Use case output
   │   │   │   │   └── {operation}.usecase.spec.ts
   │   │   │   └── index.ts
   │   │   ├── event-handlers/               # Local event handlers (side effects)
   │   │   │   ├── {event-name}.handler.ts
   │   │   │   └── index.ts
   │   │   ├── sagas/                        # Complex multi-step workflows
   │   │   │   ├── {workflow-name}.saga.ts
   │   │   │   └── index.ts
   │   │   ├── services/                     # Application services (when needed)
   │   │   │   ├── {service-name}.service.ts
   │   │   │   └── index.ts
   │   │   ├── dto/                          # Data Transfer Objects (API layer)
   │   │   │   ├── {entity}.dto.ts           # For API responses/transfers
   │   │   │   ├── {nested-object}.dto.ts    # For nested objects
   │   │   │   └── index.ts
   │   │   └── ports/                        # Interfaces for external services
   │   │       ├── {service-name}.port.ts
   │   │       └── index.ts
│   │
│   ├── infrastructure/                   # 🔴 INFRASTRUCTURE LAYER (External Concerns)
│   │   ├── database/                     # Database implementation
│   │   │   ├── entities/                 # TypeORM/Prisma entities
│   │   │   │   ├── {entity}.orm-entity.ts
│   │   │   │   └── index.ts
│   │   │   ├── repositories/             # Repository implementations
│   │   │   │   ├── {entity}.repository.impl.ts
│   │   │   │   └── index.ts
│   │   │   ├── migrations/               # Database migrations
│   │   │   │   ├── {timestamp}-{description}.ts
│   │   │   │   └── index.ts
│   │   │   ├── seeds/                    # Database seeds
│   │   │   │   ├── {entity}.seed.ts
│   │   │   │   └── index.ts
│   │   │   └── mappers/                  # Domain ↔ ORM mappers
│   │   │       ├── {entity}.mapper.ts
│   │   │       └── index.ts
│   │   ├── postgres/                     # 🐘 PostgreSQL specific
│   │   │   ├── connection/
│   │   │   │   ├── postgres.config.ts
│   │   │   │   └── postgres.module.ts
│   │   │   ├── repositories/
│   │   │   │   ├── postgres-{entity}.repository.ts
│   │   │   │   └── index.ts
│   │   │   └── queries/                  # Raw SQL queries
│   │   │       ├── {entity}.queries.ts
│   │   │       └── index.ts
│   │   ├── redis/                        # 🔴 Redis caching & sessions
│   │   │   ├── connection/
│   │   │   │   ├── redis.config.ts
│   │   │   │   └── redis.module.ts
│   │   │   ├── cache/
│   │   │   │   ├── {entity}.cache.ts
│   │   │   │   └── cache.service.ts
│   │   │   └── sessions/
│   │   │       └── session.service.ts
│   │   ├── s3/                           # 🪣 AWS S3 file storage
│   │   │   ├── connection/
│   │   │   │   ├── s3.config.ts
│   │   │   │   └── s3.module.ts
│   │   │   ├── services/
│   │   │   │   ├── file-upload.service.ts
│   │   │   │   ├── file-download.service.ts
│   │   │   │   └── file-manager.service.ts
│   │   │   └── types/
│   │   │       └── s3.types.ts
│   │   ├── event-bridge/                 # 📡 AWS EventBridge messaging
│   │   │   ├── connection/
│   │   │   │   ├── event-bridge.config.ts
│   │   │   │   └── event-bridge.module.ts
│   │   │   ├── publishers/
│   │   │   │   ├── {event-type}.publisher.ts
│   │   │   │   └── event.publisher.ts
│   │   │   ├── subscribers/
│   │   │   │   ├── {event-type}.subscriber.ts
│   │   │   │   └── event.subscriber.ts
│   │   │   └── mappers/
│   │   │       ├── event.mapper.ts
│   │   │       └── index.ts
│   │   ├── cognito-auth/                 # 🔐 AWS Cognito authentication
│   │   │   ├── connection/
│   │   │   │   ├── cognito.config.ts
│   │   │   │   └── cognito.module.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── user-pool.service.ts
│   │   │   │   └── jwt.service.ts
│   │   │   ├── guards/
│   │   │   │   ├── cognito-auth.guard.ts
│   │   │   │   └── service-auth.guard.ts
│   │   │   └── types/
│   │   │       └── cognito.types.ts
│   │   ├── stripe/                       # 💳 Stripe payment processing
│   │   │   ├── connection/
│   │   │   │   ├── stripe.config.ts
│   │   │   │   └── stripe.module.ts
│   │   │   ├── services/
│   │   │   │   ├── payment.service.ts
│   │   │   │   ├── subscription.service.ts
│   │   │   │   ├── invoice.service.ts
│   │   │   │   └── webhook.service.ts
│   │   │   ├── webhooks/
│   │   │   │   ├── payment-intent.webhook.ts
│   │   │   │   └── subscription.webhook.ts
│   │   │   └── types/
│   │   │       └── stripe.types.ts
│   │   ├── email/                        # 📧 Email service (SES/SendGrid)
│   │   │   ├── connection/
│   │   │   │   ├── email.config.ts
│   │   │   │   └── email.module.ts
│   │   │   ├── services/
│   │   │   │   ├── email.service.ts
│   │   │   │   └── template.service.ts
│   │   │   ├── templates/
│   │   │   │   ├── welcome.template.ts
│   │   │   │   └── notification.template.ts
│   │   │   └── types/
│   │   │       └── email.types.ts
│   │   ├── sms/                          # 📱 SMS service (SNS/Twilio)
│   │   │   ├── connection/
│   │   │   │   ├── sms.config.ts
│   │   │   │   └── sms.module.ts
│   │   │   ├── services/
│   │   │   │   └── sms.service.ts
│   │   │   └── types/
│   │   │       └── sms.types.ts
│   │   ├── push-notifications/           # 🔔 Push notifications (FCM/SNS)
│   │   │   ├── connection/
│   │   │   │   ├── push.config.ts
│   │   │   │   └── push.module.ts
│   │   │   ├── services/
│   │   │   │   └── push-notification.service.ts
│   │   │   └── types/
│   │   │       └── push.types.ts
│   │   ├── analytics/                    # 📊 Analytics services
│   │   │   ├── connection/
│   │   │   │   ├── analytics.config.ts
│   │   │   │   └── analytics.module.ts
│   │   │   ├── services/
│   │   │   │   ├── event-tracking.service.ts
│   │   │   │   └── metrics.service.ts
│   │   │   └── types/
│   │   │       └── analytics.types.ts
│   │   ├── logging/                      # 📝 Logging & monitoring
│   │   │   ├── connection/
│   │   │   │   ├── logger.config.ts
│   │   │   │   └── logger.module.ts
│   │   │   ├── services/
│   │   │   │   ├── application-logger.service.ts
│   │   │   │   └── audit-logger.service.ts
│   │   │   └── formatters/
│   │   │       └── log.formatter.ts
│   │   └── monitoring/                   # 📈 Health checks & metrics
│   │       ├── health/
│   │       │   ├── database.health.ts
│   │       │   ├── redis.health.ts
│   │       │   └── external-api.health.ts
│   │       ├── metrics/
│   │       │   ├── business.metrics.ts
│   │       │   └── technical.metrics.ts
│   │       └── alerts/
│   │           └── alert.service.ts
│   │
│   ├── presentation/                     # 🟢 PRESENTATION LAYER (Controllers, GraphQL)
│   │   ├── http/                         # HTTP Controllers
│   │   │   ├── controllers/
│   │   │   │   ├── internal/             # Internal APIs for GraphQL resolvers
│   │   │   │   │   ├── {resource}.internal.controller.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── public/               # Public APIs (health, webhooks)
│   │   │   │   │   ├── health.controller.ts
│   │   │   │   │   ├── webhook.controller.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── guards/                   # HTTP Guards
│   │   │   │   ├── service-auth.guard.ts
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── index.ts
│   │   │   ├── interceptors/             # HTTP Interceptors
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   ├── transform.interceptor.ts
│   │   │   │   ├── error.interceptor.ts
│   │   │   │   └── index.ts
│   │   │   ├── filters/                  # Exception filters
│   │   │   │   ├── http-exception.filter.ts
│   │   │   │   ├── domain-exception.filter.ts
│   │   │   │   └── index.ts
│   │   │   ├── pipes/                    # Validation pipes
│   │   │   │   ├── validation.pipe.ts
│   │   │   │   └── index.ts
│   │   │   └── decorators/               # Custom decorators
│   │   │       ├── current-user.decorator.ts
│   │   │       └── index.ts
│   │   ├── graphql/                      # GraphQL Schema & Resolvers
│   │   │   ├── schemas/                  # GraphQL schemas
│   │   │   │   ├── {service}.subgraph.graphql
│   │   │   │   ├── types.graphql
│   │   │   │   └── index.ts
│   │   │   ├── resolvers/                # Federation resolvers
│   │   │   │   ├── {type}.resolver.ts
│   │   │   │   └── index.ts
│   │   │   ├── scalars/                  # Custom scalars
│   │   │   │   ├── date-time.scalar.ts
│   │   │   │   └── index.ts
│   │   │   ├── directives/               # Custom directives
│   │   │   │   ├── auth.directive.ts
│   │   │   │   └── index.ts
│   │   │   └── types/                    # GraphQL TypeScript types
│   │   │       ├── generated.types.ts
│   │   │       └── index.ts
│   │   ├── events/                       # Event handlers (external events)
│   │   │   ├── handlers/
│   │   │   │   ├── {external-event}.handler.ts
│   │   │   │   └── index.ts
│   │   │   ├── listeners/
│   │   │   │   ├── {service}-event.listener.ts
│   │   │   │   └── index.ts
│   │   │   └── processors/
│   │   │       ├── {queue}.processor.ts
│   │   │       └── index.ts
│   │   └── cli/                          # CLI commands (if needed)
│   │       ├── commands/
│   │       │   ├── {command}.command.ts
│   │       │   └── index.ts
│   │       └── index.ts
│   │
│   ├── shared/                           # 🔵 SHARED (Service-specific shared code)
│   │   ├── constants/                    # Service constants
│   │   │   ├── {domain}.constants.ts
│   │   │   └── index.ts
│   │   ├── enums/                        # Service enums
│   │   │   ├── {enum-name}.enum.ts
│   │   │   └── index.ts
│   │   ├── types/                        # Service-specific types
│   │   │   ├── {type-name}.types.ts
│   │   │   └── index.ts
│   │   ├── utils/                        # Service utilities
│   │   │   ├── {utility-name}.util.ts
│   │   │   └── index.ts
│   │   ├── decorators/                   # Service decorators
│   │   │   ├── {decorator-name}.decorator.ts
│   │   │   └── index.ts
│   │   └── validators/                   # Custom validators
│   │       ├── {validator-name}.validator.ts
│   │       └── index.ts
│   │
│   ├── config/                           # 🔧 CONFIGURATION
│   │   ├── app.config.ts                 # Main app configuration
│   │   ├── database.config.ts            # Database configuration
│   │   ├── redis.config.ts               # Redis configuration
│   │   ├── aws.config.ts                 # AWS services configuration
│   │   ├── stripe.config.ts              # Stripe configuration
│   │   └── index.ts
│   │
│   ├── main.ts                           # Application entry point
│   └── app.module.ts                     # Root NestJS module
│
├── test/                                 # 🧪 TESTS
│   ├── unit/                             # Unit tests
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── integration/                      # Integration tests  
│   │   ├── database/
│   │   ├── external-services/
│   │   └── api/
│   ├── e2e/                              # End-to-end tests
│   │   ├── {feature}.e2e-spec.ts
│   │   └── test-app.e2e-spec.ts
│   ├── fixtures/                         # Test data
│   │   ├── {entity}.fixture.ts
│   │   └── index.ts
│   ├── mocks/                            # Test mocks
│   │   ├── {service}.mock.ts
│   │   └── index.ts
│   └── helpers/                          # Test helpers
│       ├── test.helper.ts
│       └── index.ts
│
├── docs/                                 # 📚 DOCUMENTATION
│   ├── README.md                         # Service documentation
│   ├── API.md                            # API documentation
│   ├── DEPLOYMENT.md                     # Deployment guide
│   └── ARCHITECTURE.md                   # Service architecture
│
├── scripts/                              # 📜 SCRIPTS
│   ├── build.sh                          # Build script
│   ├── test.sh                           # Test script
│   ├── migration.sh                      # Migration script
│   └── seed.sh                           # Seed script
│
├── .env.example                          # Environment variables example
├── .dockerignore                         # Docker ignore
├── Dockerfile                            # Docker configuration
├── docker-compose.yml                    # Local development
├── tsconfig.app.json                     # TypeScript configuration
├── jest.config.js                        # Jest testing configuration
└── package.json                          # Package dependencies
```

## Service-Specific Infrastructure Variations

### User Service
```typescript
user-service/src/infrastructure/
├── postgres/           # User data, profiles
├── redis/             # Sessions, cache
├── cognito-auth/      # Authentication
├── s3/               # Profile images
├── email/            # Welcome emails
└── event-bridge/     # User events
```

### Payment Service  
```typescript
payment-service/src/infrastructure/
├── postgres/          # Payment records
├── stripe/           # Payment processing
├── redis/            # Payment cache
├── event-bridge/     # Payment events
└── email/            # Payment receipts
```

### Learning Service
```typescript
learning-service/src/infrastructure/
├── postgres/          # Course data
├── s3/               # Course materials
├── redis/            # Course cache
├── analytics/        # Learning analytics
└── event-bridge/     # Learning events
```

### Communication Service
```typescript
communication-service/src/infrastructure/
├── redis/            # Message queues
├── postgres/         # Message history
├── push-notifications/ # Real-time notifications
├── email/            # Email notifications
├── sms/              # SMS notifications
└── event-bridge/     # Communication events
```

## Naming Conventions

### Files
- **Entities**: `{name}.entity.ts`
- **Value Objects**: `{name}.vo.ts` or `{name}.value-object.ts`
- **Use Cases**: `{operation}.usecase.ts`
- **Repositories**: `{entity}.repository.ts` (interface), `{entity}.repository.impl.ts` (implementation)
- **Services**: `{name}.service.ts` (application), `{name}.domain-service.ts` (domain)
- **Events**: `{event-name}.event.ts`
- **Handlers**: `{event-name}.handler.ts`
- **DTOs**: `{operation}.dto.ts` or `{operation}.request.ts`/`{operation}.response.ts`

### Classes
- **Entities**: `PascalCase` (e.g., `User`, `Course`)
- **Value Objects**: `PascalCase` + `VO` suffix (e.g., `EmailVO`, `UserIdVO`)
- **Use Cases**: `PascalCase` + `UseCase` suffix (e.g., `CreateUserUseCase`)
- **Services**: `PascalCase` + `Service` suffix (e.g., `UserService`)
- **Events**: `PascalCase` + `Event` suffix (e.g., `UserCreatedEvent`)

### Directories
- Use `kebab-case` for folder names
- Use descriptive names that indicate purpose
- Group related files in subdirectories

## Key Principles

1. **Layer Isolation**: Each layer only depends on layers beneath it
2. **Interface Segregation**: Small, focused interfaces
3. **Dependency Inversion**: Depend on abstractions, not concretions
4. **Single Responsibility**: Each class has one reason to change
5. **Domain-Centric**: Business logic is isolated in domain layer
6. **Testability**: Structure supports easy unit and integration testing

## Implementation Guidelines

1. **Start Simple**: Begin with basic structure, add complexity as needed
2. **Domain First**: Implement domain layer before other layers
3. **Test-Driven**: Write tests alongside implementation
4. **Incremental**: Build features incrementally
5. **Consistency**: Follow structure consistently across all services 

## GraphQL Resolver Architecture

### Central Lambda Resolvers (graphql-api/)
**Location**: `graphql-api/resolvers/`
**Purpose**: Handle GraphQL operations by calling internal microservice APIs

```typescript
graphql-api/
├── resolvers/                    # 🔴 LAMBDA RESOLVERS (Central)
│   ├── user-resolvers.ts         # User queries/mutations
│   ├── learning-resolvers.ts     # Learning queries/mutations
│   ├── payment-resolvers.ts      # Payment queries/mutations
│   └── federation-resolvers.ts   # Cross-service federation
├── clients/                      # Service HTTP clients
│   ├── user-service.client.ts
│   ├── learning-service.client.ts
│   └── base-service.client.ts
├── composition/                  # Schema composition
│   ├── compose-schema.ts
│   └── validate-schema.ts
└── schemas/
    ├── supergraph.graphql        # Composed schema
    └── subgraphs/               # Imported from services
        ├── user.graphql
        ├── learning.graphql
        └── payment.graphql
```

### Microservice Subgraphs (Per Service)
**Location**: `{service}/src/presentation/graphql/`
**Purpose**: Define domain-specific GraphQL schema and federation

```typescript
user-service/src/presentation/graphql/
├── schemas/
│   ├── user.subgraph.graphql     # 🔵 SUBGRAPH SCHEMA
│   └── types.graphql            # Supporting types
├── resolvers/                   # 🟡 TYPE RESOLVERS (Optional)
│   └── user-federation.resolver.ts  # For complex federation
├── federation/
│   ├── schema-export.ts         # Export schema for composition
│   └── directives.ts           # Federation directives
└── scalars/
    └── custom-scalars.ts       # Domain-specific scalars
```

### GraphQL Resolution Flow
```
1. Client Query → AWS AppSync (Supergraph)
2. AppSync → Lambda Resolver (Central)
3. Lambda → Internal HTTP API (Microservice)
4. Microservice → Use Case → Domain Logic
5. Response ← ← ← ← (Reverse flow)
```

## DTO & Request/Response Patterns

### Use Case Pattern (Application Layer)
**Purpose**: Input/Output for business operations

```typescript
// application/use-cases/create-user/
create-user.request.ts    # Input to use case
create-user.response.ts   # Output from use case
create-user.usecase.ts    # Business logic

// Example:
export class CreateUserRequest {
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    timezone?: string;
  };
}

export class CreateUserResponse {
  id: string;
  email: string;
  profile: UserProfileDto;
  createdAt: Date;
}
```

### DTO Pattern (API Layer)
**Purpose**: Data transfer between layers and external APIs

```typescript
// application/dto/
user.dto.ts              # For API responses/transfers
tutor-profile.dto.ts     # For nested objects
search-filters.dto.ts    # For query parameters

// Example:
export class UserDto {
  id: string;
  email: string;
  profile: UserProfileDto;
  isTutor: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(user: User): UserDto {
    return {
      id: user.id.value,
      email: user.email.value,
      profile: UserProfileDto.fromDomain(user.profile),
      isTutor: user.isTutor,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
```

### Clear Separation Rules

1. **Request/Response** (`*.request.ts`, `*.response.ts`)
   - Use case inputs and outputs
   - Application layer only
   - Business operation focused

2. **DTOs** (`*.dto.ts`)
   - API data transfer
   - Cross-layer communication
   - External API responses
   - GraphQL type mapping

3. **Domain Objects** (`*.entity.ts`, `*.vo.ts`)
   - Pure business logic
   - No external dependencies
   - Rich behavior and validation

### Example Integration
```typescript
// presentation/http/controllers/internal/users.controller.ts
@Controller('internal/users')
export class InternalUsersController {
  
  @Post()
  async createUser(@Body() dto: CreateUserDto): Promise<UserDto> {
    // 1. Convert DTO to Use Case Request
    const request = new CreateUserRequest();
    request.email = dto.email;
    request.profile = dto.profile;
    
    // 2. Execute Use Case
    const response = await this.createUserUseCase.execute(request);
    
    // 3. Return DTO (response already contains DTO)
    return response.user; // UserDto
  }
}

// graphql-api/resolvers/user-resolvers.ts
export const createUserResolver: AppSyncResolverHandler = async (event) => {
  const { input } = event.arguments;
  
  // Call internal API (returns UserDto)
  const user = await userServiceClient.createUser(input);
  
  // Return for GraphQL (UserDto maps to GraphQL User type)
  return user;
};
``` 