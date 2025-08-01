# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Package Management
- Use `pnpm` as the package manager
- Install dependencies: `pnpm install`

### Build Commands
- Build all projects: `pnpm run build`
- Build libraries only: `pnpm run build:libs`
- Type check without emit: `pnpm run build:check`

### Development
- Start in development mode: `pnpm run start:dev`
- Start with debugging: `pnpm run start:debug`
- Production start: `pnpm run start:prod`

### Testing
- Run unit tests: `pnpm run test`
- Run e2e tests: `pnpm run test:e2e`
- Run with coverage: `pnpm run test:cov`
- Run integration tests: `pnpm run test:integration`
- Run performance tests: `pnpm run test:performance`

### Linting & Code Quality
- Lint and fix: `pnpm run lint`
- Lint check only: `pnpm run lint:check`

### Database Operations
- Run all migrations: `pnpm run migrate:all`
- Seed all databases: `pnpm run seed:all`
- Service-specific migrations: `pnpm run migrate:user`, `pnpm run migrate:payment`, etc.

### Docker & Infrastructure
- Start services: `pnpm run docker:up`
- Stop services: `pnpm run docker:down`
- View logs: `pnpm run docker:logs`
- Clean containers: `pnpm run docker:clean`

### GraphQL
- Compose schemas: `pnpm run compose-schemas`
- Validate schemas: `pnpm run validate-schemas`
- Start GraphQL gateway: `pnpm run graphql:gateway`

## Architecture Overview

### Monorepo Structure
This is a NestJS monorepo using a microservices architecture with the following services:

**Core Services:**
- `user-service` - User management, authentication, profiles
- `payment-service` - Payment processing and billing
- `learning-service` - Course content and learning paths
- `content-service` - Content management and delivery
- `tutor-matching-service` - Tutor-student matching algorithms
- `reviews-service` - Reviews and ratings system
- `notification-service` - Messaging and notifications
- `communication-service` - Real-time communication
- `analytics-service` - Analytics and reporting
- `ai-service` - AI-powered features

**Shared Libraries (`libs/`):**
- `@edtech/auth` - Authentication and authorization
- `@edtech/types` - Shared TypeScript types and DTOs
- `@edtech/config` - Configuration management
- `@edtech/security` - Security utilities
- `@edtech/service-auth` - Inter-service authentication
- `@edtech/cache` - Caching abstraction
- `@edtech/s3` - S3 file storage utilities

### Domain-Driven Design (DDD)
Services follow DDD patterns with clear separation:
- **Domain Layer**: Entities, value objects, domain services, events
- **Application Layer**: Use cases, DTOs, event handlers
- **Infrastructure Layer**: Database, external services, event publishing
- **Presentation Layer**: Controllers, GraphQL resolvers

### Event-Driven Architecture
- Uses NestJS CQRS for command/query separation
- AWS EventBridge for inter-service communication
- Domain events for business logic decoupling

### Database Architecture
- **PostgreSQL**: Primary databases for user, payment, reviews, learning services
- **Redis**: Caching and session storage
- **Neo4j**: Graph database for tutor matching
- **LocalStack**: Local AWS services emulation

### Authentication & Authorization
- **AWS Cognito**: User authentication
- **Service-to-Service**: JWT-based authentication between microservices
- **Multi-tenant**: Role-based access control (Student, Tutor, Admin, SuperAdmin)

### GraphQL Federation
- Apollo Federation for unified GraphQL API
- Service-specific schemas in `graphql-api/schemas/`
- Gateway composition and validation

## Development Patterns

### Service Structure
Each service follows this structure:
```
apps/[service-name]/src/
├── domain/           # Domain entities, events, value objects
├── application/      # Use cases, DTOs, event handlers
├── infrastructure/   # Database, external services
└── presentation/     # Controllers, resolvers
```

### Shared Library Usage
Import shared libraries using barrel exports:
```typescript
import { AuthModule } from '@edtech/auth';
import { BaseResponseDto } from '@edtech/types';
```

### Configuration Management
- Environment-specific configuration using Zod schemas
- Configuration creators for type-safe config injection
- Service-specific environment files

### Error Handling
- Domain-specific error classes
- Standardized error response DTOs
- Global exception filters

## Local Development Setup

1. Install dependencies: `pnpm install`
2. Start infrastructure: `pnpm run docker:up`
3. Run setup script: `pnpm run dev:setup`
4. Validate setup: `pnpm run validate:setup`
5. Start services: `pnpm run start:dev`

## Testing Strategy

- **Unit Tests**: Domain logic and use cases
- **Integration Tests**: Service interactions and database operations
- **E2E Tests**: Full service workflows
- **Performance Tests**: Load and stress testing

## Infrastructure as Code

- **AWS CDK**: Infrastructure definitions in `cdk/`
- **LocalStack**: Local AWS services for development
- **Docker Compose**: Local database and service orchestration

## Important Development Guidelines

### Code Creation & Modification
- Only create files when absolutely necessary for the task
- Always prefer editing existing files over creating new ones
- Never proactively create documentation files (*.md) or README files unless explicitly requested
- Follow existing code patterns and conventions in the service you're working on

### Service-Specific Testing
- Run service-specific tests: `pnpm test --testPathPattern=apps/[service-name]`
- Run individual test files: `pnpm test apps/[service-name]/src/path/to/test.spec.ts`
- Each service may have additional test commands in their individual package.json files

### Business Context
- **Platform Focus**: Mathematics and programming education
- **Core Learning Models**: 
  - Private Lessons (per-lesson payment)
  - Course Enrollment (full course payment)
- **User Roles**: Student, Tutor, Admin, SuperAdmin
- **Key Features**: Review/rating system, knowledge verification, tutor-student matching

### Architecture Patterns
- All services follow **Simplified Domain-Driven Design (DDD)** patterns
- **Event-Driven Architecture** using AWS EventBridge and NestJS CQRS
- **Clean Architecture** with strict layer separation
- Each service owns its domain data completely
- **Drizzle ORM** for PostgreSQL with excellent TypeScript integration
- **Use Case Services** instead of separate command/query handlers

### Simplified Domain Layer Components
Using NestJS CQRS as the foundation:
- **Entities**: Core domain objects with identity
- **Value Objects**: Immutable objects defined by their values  
- **Aggregate Roots**: Entities that enforce consistency (extends NestJS CQRS AggregateRoot)
- **Domain Services**: Complex business logic that doesn't belong to entities
- **Domain Events**: Events emitted by aggregates (using NestJS CQRS events)

### Service Development Structure
Follow this simplified structure for all services:
```
apps/[service-name]/src/
├── domain/              # Core business logic
│   ├── entities/        # Domain entities
│   ├── value-objects/   # Immutable value objects
│   ├── aggregates/      # Aggregate roots (NestJS CQRS)
│   ├── services/        # Domain services
│   └── events/          # Domain events
├── application/         # Application logic
│   ├── use-cases/       # Use case services (replaces commands/queries)
│   ├── dtos/            # Data transfer objects
│   ├── event-handlers/  # Domain event handlers
│   └── interfaces/      # Repository interfaces
├── infrastructure/      # External concerns
│   ├── persistence/     # Database (Drizzle ORM)
│   ├── graphql/        # GraphQL federation
│   ├── http/           # REST controllers
│   └── events/         # EventBridge integration
└── main.ts             # Application entry point
```

### Development Patterns & Examples

#### Use Case Service Pattern:
```typescript
@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryInterface,
    private readonly eventBus: EventBus
  ) {}

  async execute(dto: CreateUserDto): Promise<UserDto> {
    const user = User.create(dto);
    await this.userRepository.save(user);
    user.commit(); // Publishes events via NestJS CQRS
    return this.mapToDto(user);
  }
}
```

#### Aggregate Root with Events:
```typescript
export class User extends AggregateRoot {
  static create(data: CreateUserData): User {
    const user = new User(data);
    user.apply(new UserCreatedEvent(user.id, user.email));
    return user;
  }
}
```

#### Infrastructure Mapping with mergeObject:
```typescript
async findById(id: string): Promise<User | null> {
  const userData = await this.db.select().from(users).where(eq(users.id, id));
  return userData ? User.fromPersistence(
    mergeObject(userData, { skills: JSON.parse(userData.skills || '[]') })
  ) : null;
}
```

### Key Technologies
- **ORM**: Drizzle ORM for PostgreSQL with excellent TypeScript support
- **Authentication**: AWS Cognito with social providers (Google, Facebook, Apple)
- **Databases**: PostgreSQL (User, Payment, Reviews), DynamoDB (Content, Chat), Neo4j/Neptune (Tutor Matching)
- **GraphQL**: Hybrid AppSync (public) + Apollo Federation (internal)
- **Real-time**: AWS AppSync GraphQL subscriptions
- **Payments**: Stripe Connect with 20% platform commission
- **Events**: AWS EventBridge + NestJS CQRS for domain events
- **Development**: Real AWS services (no LocalStack)
- **AI Integration**: AWS Bedrock (planned future enhancement)