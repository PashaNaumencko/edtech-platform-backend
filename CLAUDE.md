# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this EdTech platform repository.

## 🎯 Current Focus: Service Implementation from Scratch

**Primary Goal**: Build three core microservices (Identity, Tutor, Admin) following step-by-step implementation guides
**Status**: Codebase cleaned and prepared - Ready for implementation

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

### Database Operations (After Implementation)
- Run all migrations: `pnpm run migrate:all`
- Service-specific migrations:
  - `pnpm run drizzle:identity:generate` - Generate migration
  - `pnpm run drizzle:identity:migrate` - Apply migration
  - `pnpm run drizzle:identity:studio` - Open Drizzle Studio GUI
- Replace `identity` with `tutor` or `admin` for other services

### API Development
- Start services with dual ports (3000/3001) for client and internal APIs

### Infrastructure
- Start services: `pnpm run docker:up`
- Stop services: `pnpm run docker:down`

## 🏗️ Microservices Architecture

### Core Services (To Be Implemented)
1. **identity-service** (Ports 3000/3001) - User registration, authentication, email verification, COPPA compliance
2. **tutor-service** (Ports 3002/3003) - Tutor profiles, document verification, qualification management
3. **admin-service** (Ports 3004/3005) - Platform administration, tutor approval, user management

### Future Services (Planned)
4. **matching-service** - Smart search, connection requests, match establishment
5. **communication-service** - Real-time chat, video sessions
6. **booking-service** - Lesson scheduling
7. **payment-service** - Payment processing, commission calculation, payouts

### Shared Libraries (Already Available)
- `@edtech/nestjs-drizzle` - Zero-abstraction Drizzle ORM integration
- `@edtech/shared-kernel` - Domain primitives (ValueObject, Entity, AggregateRoot, DomainError)
- `@edtech/config` - SSM Parameter Store integration
- `@edtech/auth` - AWS Cognito authentication
- `@edtech/s3` - S3 file upload/download
- `@edtech/service-auth` - Inter-service authentication
- `@edtech/types` - Shared TypeScript types

### Technology Stack
- **Framework**: NestJS 11 with TypeScript 5.7
- **Database**: PostgreSQL (one database per service)
- **ORM**: Drizzle ORM (type-safe SQL)
- **API**: REST (dual-port pattern: public + internal)
- **Authentication**: AWS Cognito
- **Events**: AWS EventBridge + NestJS CQRS
- **Payments**: Stripe integration (planned)
- **Video**: Agora.io or Twilio (planned)
- **Deployment**: AWS ECS Fargate + Terraform

## 📁 Service Structure (Standard Pattern)

**Clean Architecture + Domain-Driven Design**

```
apps/[service-name]/src/
├── domain/                    # Pure business logic (no dependencies)
│   ├── aggregates/           # Aggregate roots (consistency boundaries)
│   ├── entities/             # Entities within aggregates
│   ├── value-objects/        # Immutable, validated data
│   ├── events/               # Domain events
│   ├── repositories/         # Repository interfaces (no implementation)
│   ├── services/             # Domain services (stateless logic)
│   └── exceptions/           # Domain-specific exceptions
│
├── application/              # Use cases (orchestration)
│   ├── commands/             # Write operations (CQRS)
│   ├── queries/              # Read operations (CQRS)
│   ├── event-handlers/       # React to domain/integration events
│   ├── dtos/                 # Data transfer objects
│   └── interfaces/           # Application interfaces
│
├── infrastructure/           # External concerns
│   ├── persistence/drizzle/  # Database schemas, repositories, mappers
│   ├── messaging/            # EventBridge publisher
│   ├── external-services/    # Cognito, S3 adapters
│   └── config/               # Configuration services
│
├── presentation/             # API layer
│   └── http/                 # REST controllers
│       ├── controllers/
│       │   ├── public/       # Port 3000, 3002, 3004 (external clients)
│       │   └── internal/     # Port 3001, 3003, 3005 (service-to-service)
│       ├── dtos/             # Request/response DTOs
│       ├── guards/           # Authentication/authorization
│       ├── interceptors/     # Request/response transformation
│       └── filters/          # Exception handling
│
├── [service-name].module.ts  # Root module
└── main.ts                    # Dual-port application entry
```

## 🔧 Development Workflow

### 1. Before Starting Work
- **Read implementation guide**: [docs/implementation-plans/01-IDENTITY-SERVICE.md](docs/implementation-plans/01-IDENTITY-SERVICE.md)
- **Review architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Understand structure**: [docs/SERVICE_STRUCTURE.md](docs/SERVICE_STRUCTURE.md)
- **Check patterns**: [docs/CQRS_EVENT_SOURCING.md](docs/CQRS_EVENT_SOURCING.md)

### 2. When Implementing New Service
- **Start with domain layer** - Pure business logic, no framework dependencies
- **Follow the guide** - Step-by-step implementation in `docs/implementation-plans/`
- **Use shared libraries** - `@edtech/shared-kernel`, `@edtech/nestjs-drizzle`, etc.
- **Focus on core features** - Build incrementally, test as you go

### 3. Implementation Order (Per Service)
1. **Domain Layer** - Value objects, aggregates, events, repository interfaces
2. **Infrastructure Layer** - Database schemas, repositories, AWS adapters
3. **Application Layer** - Commands, queries, event handlers
4. **Presentation Layer** - REST controllers (public + internal)
5. **Testing** - Unit, integration, E2E tests
6. **Deployment** - Docker, Terraform, AWS

### 4. Before Committing
- **MUST run**: `pnpm run lint` to fix ESLint errors
- **Type check**: `pnpm run build:check` - Ensure TypeScript compiles
- **Run tests**: `pnpm test` - All tests must pass
- **Manual test**: Test API endpoints with curl/Postman

## 🎯 Development Guidelines

### DO (Best Practices)
- ✅ **Start with domain layer** - Pure business logic first
- ✅ **Follow implementation guides** - Step-by-step in `docs/implementation-plans/`
- ✅ **Use shared libraries** - Don't reinvent (`@edtech/shared-kernel`, `@edtech/nestjs-drizzle`)
- ✅ **Write tests as you go** - Unit tests for domain, integration for repos
- ✅ **Use Drizzle ORM** - Type-safe SQL queries
- ✅ **Follow CQRS** - Separate commands (write) from queries (read)
- ✅ **Dual-port pattern** - Public API (3000+) and Internal API (3001+)

### DON'T (Avoid These)
- ❌ **Don't skip domain layer** - It's the foundation
- ❌ **Don't mix layers** - Keep domain pure (no DB, no HTTP)
- ❌ **Don't create files unnecessarily** - Only what's needed for the task
- ❌ **Don't proactively create docs** - Unless explicitly requested
- ❌ **Don't optimize prematurely** - Make it work first
- ❌ **Don't skip tests** - 80%+ coverage for domain logic

## 📚 Key Documentation

### 📖 Implementation Guides (START HERE)
- **[Identity Service Guide](docs/implementation-plans/01-IDENTITY-SERVICE.md)** - Complete step-by-step implementation
- **[Infrastructure/Terraform Guide](docs/implementation-plans/04-INFRASTRUCTURE-TERRAFORM.md)** - AWS deployment with Terraform
- **[Getting Started](GETTING_STARTED.md)** - Project overview and quick start

### 🏗️ Architecture Documentation
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design with diagrams
- **[Service Structure](docs/SERVICE_STRUCTURE.md)** - Code organization patterns
- **[ADR - Revised](docs/ADR-REVISED.md)** - All architecture decisions

### 🛠️ Technical Guides
- **[Development Workflow](docs/DEVELOPMENT.md)** - Daily development practices
- **[CQRS & Event Sourcing](docs/CQRS_EVENT_SOURCING.md)** - CQRS patterns
- **[Drizzle NestJS Module](docs/DRIZZLE_NESTJS_MODULE.md)** - ORM integration
- **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API reference
- **[Testing Guide](docs/TESTING.md)** - Testing strategies

### 🚀 Operations
- **[Deployment](docs/DEPLOYMENT.md)** - CI/CD and deployment procedures
- **[Infrastructure](docs/INFRASTRUCTURE.md)** - Terraform modules
- **[Cost Management](docs/COST_MANAGEMENT.md)** - AWS free tier optimization

### 📑 Complete Index
- **[Documentation Index](docs/README.md)** - Navigate all documentation

## 🚨 Important Notes

### Code Quality Requirements
- **ESLint**: Run `pnpm run lint` before every commit (fixes errors automatically)
- **TypeScript**: Run `pnpm run build:check` - Must compile with no errors
- **Tests**: Aim for 80%+ coverage on domain logic
- **Pre-commit hooks**: Configured via Husky (runs lint-staged)

### Implementation Priority

**Current Phase: Service Implementation**
1. ✅ **Codebase cleaned** - All pre-created logic removed
2. ✅ **Documentation complete** - Step-by-step guides ready
3. 🔜 **Identity Service** - Implement following the guide
4. 🔜 **Tutor Service** - Implement after Identity
5. 🔜 **Admin Service** - Implement after Tutor
6. 🔜 **Infrastructure** - Deploy to AWS with Terraform

**Recommended Starting Point:**
Read [docs/implementation-plans/01-IDENTITY-SERVICE.md](docs/implementation-plans/01-IDENTITY-SERVICE.md) and start implementing from Phase 1.

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

### Domain-Driven Design (DDD) Principles

**Domain Layer Components:**
- **Aggregates**: Consistency boundaries (e.g., `UserAccount`, `TutorProfile`)
- **Entities**: Objects with identity
- **Value Objects**: Immutable, self-validating (e.g., `Email`, `PersonalName`)
- **Domain Events**: State changes (e.g., `UserCreatedEvent`)
- **Repository Interfaces**: Persistence contracts (no implementation)
- **Domain Services**: Complex logic that doesn't belong to a single entity

**Key Rules:**
- Domain layer has NO external dependencies (no NestJS, no Drizzle, no HTTP)
- All business rules live in the domain layer
- Domain objects are pure TypeScript classes
- Testable without mocks

### CQRS Pattern (Command Query Responsibility Segregation)

**Commands (Write Operations):**
- Change state
- Return minimal data (usually just ID)
- Example: `CreateUserCommand`, `VerifyEmailCommand`

**Queries (Read Operations):**
- Read-only, no side effects
- Return DTOs
- Example: `GetUserQuery`, `GetUserByEmailQuery`

**Event Handlers:**
- React to domain events
- Asynchronous
- Side effects (send email, publish to EventBridge)
- Example: `UserCreatedHandler`

### Code Examples

See implementation guides for complete examples:
- [Identity Service Guide](docs/implementation-plans/01-IDENTITY-SERVICE.md) - Full implementation with examples
- [Service Structure Guide](docs/SERVICE_STRUCTURE.md) - Code organization patterns
- [CQRS Guide](docs/CQRS_EVENT_SOURCING.md) - CQRS implementation details

### Technology Stack Details

**Core:**
- **Framework**: NestJS 11 (TypeScript framework)
- **Language**: TypeScript 5.7 (strict mode)
- **Package Manager**: pnpm (fast, disk-efficient)

**Database:**
- **Primary**: PostgreSQL 14+ (one database per service)
- **ORM**: Drizzle ORM (type-safe, 7KB, zero runtime overhead)
- **Migrations**: Drizzle Kit (SQL migrations)

**AWS Services:**
- **Auth**: AWS Cognito (social providers: Google, Facebook, Apple)
- **Storage**: S3 (documents, images)
- **Events**: EventBridge (cross-service communication)
- **Secrets**: SSM Parameter Store (free tier)
- **Compute**: ECS Fargate (container orchestration)
- **Database**: RDS PostgreSQL (managed database)

**Planned Integrations:**
- **Payments**: Stripe Connect (20% commission)
- **Video**: Agora.io or Twilio
- **Search**: Algolia (tutor search)
- **AI**: AWS Bedrock (future enhancement)