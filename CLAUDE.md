# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this EdTech platform repository.

## 🎯 Current Focus: MVP Implementation

**Primary Goal**: Build a working tutoring platform MVP in 4 weeks
**Status**: Phase 1 - Complete User Service GraphQL Integration

## 📋 Essential Commands

### Package Management
- Use `pnpm` as the package manager
- Install dependencies: `pnpm install`

### Development
- Start specific service: `pnpm run start:dev [service-name]`
- Start all services: `pnpm run start:dev`
- Build all projects: `pnpm run build`
- Type check: `pnpm run build:check`

### Code Quality (REQUIRED before commits)
- **Lint and fix**: `pnpm run lint` (fixes ESLint errors)
- **Lint check**: `pnpm run lint:check` (checks only)

### Database Operations
- Run all migrations: `pnpm run migrate:all`
- Service-specific: `pnpm run migrate:user`, `pnpm run migrate:payment`

### GraphQL (Core Integration)
- Start GraphQL gateway: `pnpm run graphql:gateway`
- Compose schemas: `pnpm run compose-schemas`
- Validate schemas: `pnpm run validate-schemas`

### Infrastructure
- Start services: `pnpm run docker:up`
- Stop services: `pnpm run docker:down`

## 🏗️ MVP Architecture (Simplified)

### Core Services (MVP Scope)
1. **user-service** (✅ 80% complete) - User management, auth, profiles
2. **tutor-matching-service** (⏳ Next) - Tutor search and profiles  
3. **booking-service** (📋 Planned) - Session booking and payments
4. **communication-service** (📋 Planned) - Video calling
5. **review-service** (📋 Planned) - Ratings and reviews
6. **notification-service** (📋 Planned) - Email notifications

### Shared Libraries
- `@edtech/auth` - AWS Cognito integration
- `@edtech/types` - Shared TypeScript types
- `@edtech/service-auth` - Inter-service authentication

### Technology Stack
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL (all services)
- **API**: GraphQL Federation
- **Authentication**: AWS Cognito
- **Events**: AWS EventBridge
- **Payments**: Stripe integration
- **Video**: Twilio Video API
- **Deployment**: AWS Fargate

## 📁 Service Structure (Standard Pattern)

```
apps/[service-name]/src/
├── domain/                 # Business entities and rules
│   ├── entities/          # Domain entities
│   ├── value-objects/     # Value objects
│   ├── events/            # Domain events
│   └── services/          # Domain services
├── application/           # Business use cases
│   ├── use-cases/         # Business operations
│   ├── dto/               # Data transfer objects
│   └── event-handlers/    # Event handlers
├── infrastructure/        # External integrations
│   ├── persistence/       # Database repositories
│   └── event-bridge/      # Event publishing
├── presentation/          # API layer
│   ├── http/              # REST controllers
│   └── graphql/           # GraphQL resolvers
├── config/                # Service configuration
└── main.ts                # Application entry
```

## 🔧 Development Workflow

### 1. Before Starting Work
- Read [MVP_IMPLEMENTATION_PLAN.md](MVP_IMPLEMENTATION_PLAN.md) for current priorities
- Check current phase in [docs/development/implementation-phases.md](docs/development/implementation-phases.md)
- Use existing services as templates (especially user-service)

### 2. When Implementing New Service
- Follow [docs/development/service-template.md](docs/development/service-template.md)
- Copy structure from user-service as starting point
- Focus on MVP features only - no advanced features

### 3. GraphQL Integration (Required)
- Every service must have GraphQL federation support
- Follow [docs/development/graphql-federation.md](docs/development/graphql-federation.md)
- Test integration with federation gateway

### 4. Before Committing
- **MUST run**: `pnpm run lint` to fix ESLint errors
- Ensure all TypeScript compilation passes
- Test core functionality manually

## 🎯 MVP Development Guidelines

### DO (MVP Focused)
- ✅ Copy patterns from user-service
- ✅ Keep domain logic simple and working
- ✅ Use PostgreSQL for all databases
- ✅ Focus on core user journeys
- ✅ Use existing AWS services integration patterns
- ✅ Test manually through GraphQL playground

### DON'T (Avoid Over-Engineering)
- ❌ Add complex domain patterns not in user-service
- ❌ Create new infrastructure patterns
- ❌ Add features not in MVP scope
- ❌ Optimize prematurely
- ❌ Add complex caching or performance features
- ❌ Create comprehensive test suites (manual testing OK for MVP)

## 📚 Key Documentation

### Implementation Guides
- **[MVP Implementation Plan](MVP_IMPLEMENTATION_PLAN.md)** - Complete roadmap
- **[Service Template](docs/development/service-template.md)** - How to create new services
- **[GraphQL Federation](docs/development/graphql-federation.md)** - GraphQL setup

### Current Status
- **[Implementation Phases](docs/development/implementation-phases.md)** - Track current progress
- **[User Service](docs/services/user-service.md)** - Reference implementation

## 🚨 Important Notes

### ESLint Errors Will Block Commits
- Husky pre-commit hook runs `lint-staged`
- Any ESLint errors will prevent commits
- **Always run** `pnpm run lint` before committing

### MVP Timeline is Critical
- We have 4 weeks to build working MVP
- Focus on getting core features working
- Polish and optimization come after MVP

### Use Existing Patterns
- Don't reinvent - copy what works from user-service
- GraphQL federation pattern is established
- Domain layer patterns are proven

## 🔄 Current Development Priority

**Phase 1: Complete User Service GraphQL Integration**
1. Connect User Service to Federation Gateway
2. Test end-to-end GraphQL queries  
3. Fix any integration issues
4. Begin Tutor Matching Service

**Next**: Follow [MVP_IMPLEMENTATION_PLAN.md](MVP_IMPLEMENTATION_PLAN.md) for detailed steps.

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