# Phase 1: GraphQL Federation Foundation & User Service - UPDATED Plan

**Duration: 20 days | Priority: Critical**

## Phase Overview

This phase establishes the GraphQL Federation foundation with AWS AppSync as the supergraph and implements the User Service as the first microservice following our standardized DDD + Clean Architecture + Use Case Pattern. **UPDATED** to include enhanced domain layer before moving to application layer.

## Step-by-Step Development Plan

### Week 1: GraphQL Federation Foundation (Days 1-7)

#### Day 1: Project Foundation Setup

**Goal**: Establish development environment and federation tooling
**Developer**: DevOps/Backend Lead

**Tasks**:

1. **Morning (2h)**: Install Apollo Federation dependencies
   ```bash
   npm install @apollo/federation @apollo/gateway @apollo/subgraph
   npm install -D @apollo/rover
   ```
2. **Mid-Morning (2h)**: Create federation workspace structure
   ```
   graphql-api/
   ├── gateway/
   ├── schemas/
   ├── resolvers/
   └── types/
   ```
3. **Afternoon (3h)**: Set up schema composition pipeline
   - Create `rover.yaml` configuration
   - Set up schema validation scripts
   - Configure composition commands
4. **Late Afternoon (1h)**: Create development scripts and documentation

**Deliverables**:

- [ ] Apollo Federation workspace configured
- [ ] Schema composition pipeline working
- [ ] Development scripts created
- [ ] Basic federation documentation

**Acceptance Criteria**:

- ✅ `npm run compose-schemas` command works
- ✅ Schema validation pipeline runs successfully
- ✅ Development environment documented

---

#### Day 2: AWS AppSync Infrastructure (CDK)

**Goal**: Create AppSync GraphQL API infrastructure
**Developer**: DevOps/Backend Lead

**Tasks**:

1. **Morning (3h)**: Create AppSync CDK stack
   ```typescript
   // cdk/lib/stacks/appsync-stack.ts
   export class AppSyncStack extends Stack {
     // AppSync API configuration
     // Cognito authentication setup
     // Basic resolver infrastructure
   }
   ```
2. **Afternoon (3h)**: Configure Cognito authentication
   - User pool configuration
   - Identity pool setup
   - AppSync authentication configuration
3. **Late Afternoon (2h)**: Deploy and test basic AppSync setup

**Deliverables**:

- [ ] AppSync CDK stack created
- [ ] Cognito authentication configured
- [ ] Basic AppSync API deployed
- [ ] Authentication flow tested

**Acceptance Criteria**:

- ✅ AppSync API accessible via AWS Console
- ✅ Cognito authentication working
- ✅ Basic GraphQL introspection query succeeds

---

#### Day 3: Schema Registry & Error Handling

**Goal**: Implement schema registry and error handling patterns
**Developer**: Backend Lead

**Tasks**:

1. **Morning (3h)**: Set up schema registry
   - Apollo Studio schema registry configuration
   - Schema versioning strategy
   - Schema evolution procedures
2. **Afternoon (3h)**: Implement error handling patterns
   - Custom error types for GraphQL
   - Error formatting and logging
   - Client-friendly error responses
3. **Evening (2h)**: Create schema composition automation

**Deliverables**:

- [ ] Schema registry configured
- [ ] Error handling patterns implemented
- [ ] Schema composition automated
- [ ] Error handling documentation

**Acceptance Criteria**:

- ✅ Schema registry receives and stores schemas
- ✅ Error responses follow consistent format
- ✅ Schema composition runs automatically

---

#### Day 4: User Service Project Setup

**Goal**: Initialize User Service with standardized folder structure
**Developer**: Backend Developer

**Tasks**:

1. **Morning (2h)**: Create User Service folder structure
   ```
   apps/user-service/src/
   ├── domain/
   │   ├── entities/
   │   ├── value-objects/
   │   ├── events/
   │   ├── services/
   │   ├── specifications/
   │   ├── rules/
   │   └── repositories/
   ├── application/
   │   ├── use-cases/
   │   ├── dto/
   │   └── event-handlers/
   ├── infrastructure/
   │   ├── postgres/
   │   ├── redis/
   │   ├── cognito-auth/
   │   ├── s3/
   │   ├── email/
   │   └── event-bridge/
   └── presentation/
       ├── http/
       └── graphql/
   ```
2. **Mid-Morning (2h)**: Set up NestJS modules and dependency injection
3. **Afternoon (2h)**: Configure TypeORM for PostgreSQL
4. **Late Afternoon (2h)**: Create base interfaces and types

**Deliverables**:

- [ ] User Service project structure created
- [ ] NestJS modules configured
- [ ] TypeORM database connection working
- [ ] Base interfaces and types defined

**Acceptance Criteria**:

- ✅ User Service starts without errors
- ✅ Database connection established
- ✅ Health check endpoint returns 200

---

#### Days 5-6: Basic Domain Layer Implementation ✅ COMPLETED

**Goal**: Implement core domain layer for User Service
**Developer**: Backend Developer

**Day 5 Tasks**: ✅ COMPLETED

1. **Morning (3h)**: Create User entity (AggregateRoot)
2. **Afternoon (3h)**: Create value objects (Email, UserId, UserName, UserRole)
3. **Late Afternoon (2h)**: Create basic domain events

**Day 6 Tasks**: ✅ COMPLETED

1. **Morning (3h)**: Create repository interfaces
2. **Afternoon (3h)**: Create UserFactory for object creation
3. **Late Afternoon (2h)**: Clean up and organize domain structure

**Deliverables**: ✅ COMPLETED

- ✅ User entity with AggregateRoot extension
- ✅ Core value objects (Email, UserId, UserName, UserRole)
- ✅ Basic domain events (Created, Updated, Activated, Deactivated)
- ✅ Repository interfaces (IUserRepository)
- ✅ UserFactory for creation patterns
- ✅ NestJS CQRS integration

**Status**: ✅ **COMPLETED - Ready for Enhanced Domain Layer**

---

#### Day 7: Enhanced Domain Services Foundation ✅ COMPLETED ✅ COMPLETED

**Goal**: Implement domain services and business rules foundation
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: ✅ Implement UserDomainService
   ```typescript
   // domain/services/user-domain.service.ts
   @Injectable()
   export class UserDomainService {
     canUserBePromotedToTutor(user: User, requirements: TutorRequirements): boolean;
     calculateUserReputationScore(user: User, reviews: Review[]): number;
     validateUserTransition(from: UserRole, to: UserRole, requestedBy: User): void;
   }
   ```
2. **Afternoon (3h)**: ✅ Create business rules classes
   ```typescript
   // domain/rules/user-business-rules.ts
   export class UserBusinessRules {
     static readonly MIN_AGE_FOR_TUTOR = 18;
     static readonly MIN_REGISTRATION_DAYS_FOR_TUTOR = 7;
     static canBecomeTutor(user: User): boolean;
     static shouldLockAccount(user: User, failedAttempts: number): boolean;
     // NOTE: Admin creation is superadmin-only system operation
   }
   ```
3. **Late Afternoon (2h)**: ✅ Create domain-specific errors

**Deliverables**:

- ✅ UserDomainService with complex business logic
- ✅ UserBusinessRules with centralized policies (superadmin-only admin model)
- ✅ Domain-specific error types (including SuperadminOnlyOperationError)
- ✅ Unit tests for domain services

**Acceptance Criteria**:

- ✅ Business logic moved from entities to services
- ✅ Clear separation of domain concerns
- ✅ Domain services registered in module
- ✅ Superadmin-only admin creation properly implemented

**Status**: ✅ **COMPLETED - Ready for Day 8**

**Key Accomplishments**:
- ✅ **Professional Domain Services**: Complex business logic with NestJS Logger integration
- ✅ **Secure Admin Model**: Superadmin-only admin creation with `createAdminUser()` method
- ✅ **Comprehensive Business Rules**: Centralized policies without promotion vulnerabilities
- ✅ **Rich Error Handling**: 11 domain-specific error types with meaningful context
- ✅ **Build Success**: TypeScript compilation and tests passing

---

### Week 2: Enhanced Domain Layer (Days 8-11)

#### Day 8: Domain Services Completion & Error Handling

**Goal**: Complete domain services and implement comprehensive error handling
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Complete UserDomainService implementation
2. **Afternoon (3h)**: Implement domain-specific errors
   ```typescript
   // domain/errors/user.errors.ts
   export class UserNotFoundError extends UserDomainError
   export class InvalidUserRoleError extends UserDomainError
   export class UserAlreadyExistsError extends UserDomainError
   ```
3. **Late Afternoon (2h)**: Create comprehensive unit tests

**Deliverables**:

- [ ] Complete UserDomainService
- [ ] Full error hierarchy
- [ ] 95%+ test coverage for domain services
- [ ] Integration with existing domain layer

**Acceptance Criteria**:

- ✅ All domain services fully tested
- ✅ Error handling comprehensive
- ✅ Domain logic centralized properly

---

#### Day 9: Specifications Pattern Foundation

**Goal**: Implement specifications pattern for query logic
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Create core specification interfaces
   ```typescript
   // domain/specifications/specification.interface.ts
   export interface Specification<T> {
     isSatisfiedBy(item: T): boolean;
   }
   ```
2. **Afternoon (3h)**: Implement user specifications
   ```typescript
   // domain/specifications/user.specifications.ts
   export class ActiveUserSpecification implements Specification<User>
   export class EligibleTutorSpecification implements Specification<User>
   ```
3. **Late Afternoon (2h)**: Create composite specifications

**Deliverables**:

- [ ] Core specification interfaces
- [ ] User-specific specifications
- [ ] Composite specification support
- [ ] Specification unit tests

**Acceptance Criteria**:

- ✅ Specifications are composable
- ✅ Complex queries expressed cleanly
- ✅ Repository integration ready

---

#### Day 10: Enhanced Value Objects

**Goal**: Implement enhanced value objects for user domain
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Create UserPreferences value object
   ```typescript
   // domain/value-objects/user-preferences.value-object.ts
   export class UserPreferences {
     constructor(timezone, language, notificationSettings);
     shouldReceiveNotification(type: NotificationType): boolean;
   }
   ```
2. **Afternoon (3h)**: Create UserProfile value object
   ```typescript
   // domain/value-objects/user-profile.value-object.ts
   export class UserProfile {
     constructor(bio, skills, experienceLevel, dateOfBirth);
     get age(): number;
     hasSkill(skillName: string): boolean;
   }
   ```
3. **Late Afternoon (2h)**: Integrate with User entity

**Deliverables**:

- [ ] UserPreferences value object
- [ ] UserProfile value object
- [ ] Enhanced User entity integration
- [ ] Value object validation

**Acceptance Criteria**:

- ✅ Rich value objects with behavior
- ✅ Immutable and self-validating
- ✅ Clear encapsulation of data

---

#### Day 11: Advanced Domain Events

**Goal**: Implement advanced domain events and event enrichment
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Create enhanced domain events
   ```typescript
   // domain/events/user-role-changed.event.ts
   export class UserRoleChangedEvent extends DomainEvent
   export class UserProfileUpdatedEvent extends DomainEvent
   ```
2. **Afternoon (3h)**: Implement event enrichment capabilities
3. **Late Afternoon (2h)**: Test event workflows

**Deliverables**:

- [ ] Enhanced domain events
- [ ] Event enrichment service
- [ ] Complete event coverage
- [ ] Event workflow tests

**Acceptance Criteria**:

- ✅ Rich event data for downstream processing
- ✅ Event versioning support
- ✅ Clear event naming structure

---

### Week 3: Application Layer Implementation (Days 12-15)

#### Day 12: Application Layer Foundation

**Goal**: Set up application layer structure leveraging enhanced domain
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Implement IUseCase interface and base classes
   ```typescript
   // application/use-cases/create-user/create-user.usecase.ts
   export class CreateUserUseCase implements IUseCase<CreateUserRequest, CreateUserResponse> {
     constructor(
       private readonly userDomainService: UserDomainService,
       private readonly userRepository: IUserRepository
     ) {}
   }
   ```
2. **Afternoon (3h)**: Create DTO classes leveraging enhanced value objects
3. **Late Afternoon (2h)**: Set up event handlers structure

**Deliverables**:

- [ ] IUseCase interface implemented
- [ ] Use cases leveraging domain services
- [ ] Enhanced DTOs with value objects
- [ ] Event handlers ready

**Acceptance Criteria**:

- ✅ Use cases integrate with domain services
- ✅ DTOs use enhanced value objects
- ✅ Clear separation of concerns

---

#### Day 13: Critical Use Cases Implementation

**Goal**: Implement core use cases using enhanced domain layer
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Implement CreateUserUseCase with domain services
2. **Afternoon (3h)**: Implement UpdateUserProfileUseCase with specifications
3. **Late Afternoon (2h)**: Implement BecomeTutorUseCase with business rules

**Deliverables**:

- [ ] CreateUserUseCase with domain service integration
- [ ] UpdateUserProfileUseCase with validation
- [ ] BecomeTutorUseCase with business rules
- [ ] Comprehensive use case tests

**Acceptance Criteria**:

- ✅ Use cases leverage domain services
- ✅ Business rules properly enforced
- ✅ Domain events published correctly

---

#### Day 14: Database Infrastructure

**Goal**: Implement PostgreSQL integration with enhanced domain mapping
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Create TypeORM entities supporting enhanced value objects
2. **Afternoon (3h)**: Implement repository with specifications support
3. **Late Afternoon (2h)**: Create database migrations for enhanced schema

**Deliverables**:

- [ ] Enhanced TypeORM entities
- [ ] Repository with specification support
- [ ] Database migrations
- [ ] Enhanced database seeds

**Acceptance Criteria**:

- ✅ Value objects properly persisted
- ✅ Specifications work with database
- ✅ Enhanced schema supports all features

---

#### Day 15: Redis, Cognito & S3 Integration

**Goal**: Implement remaining infrastructure services
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Implement Redis caching with enhanced models
2. **Afternoon (2h)**: Implement Cognito authentication service
3. **Late Afternoon (3h)**: Implement S3 service and email templates

**Deliverables**:

- [ ] Enhanced Redis caching service
- [ ] Cognito authentication integration
- [ ] S3 file upload service
- [ ] Email service with templates

**Acceptance Criteria**:

- ✅ Enhanced models cached properly
- ✅ Authentication working with domain
- ✅ File uploads and emails functional

---

### Week 4: Infrastructure & API (Days 16-20)

#### Day 16: EventBridge & Event Handlers

**Goal**: Implement domain event publishing with enhanced events
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Implement EventBridge publisher for enhanced events
2. **Afternoon (3h)**: Implement event handlers with domain service integration
3. **Late Afternoon (2h)**: Test enhanced event workflows

**Deliverables**:

- [ ] Enhanced EventBridge publisher
- [ ] Event handlers using domain services
- [ ] Complete event-driven workflows
- [ ] Event integration tests

**Acceptance Criteria**:

- ✅ Enhanced events published properly
- ✅ Event handlers use domain services
- ✅ Side effects execute correctly

---

#### Day 17: Internal HTTP Controllers

**Goal**: Implement internal APIs leveraging enhanced domain
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Implement internal user controllers with enhanced DTOs
2. **Afternoon (3h)**: Implement internal auth controllers
3. **Late Afternoon (2h)**: Add API documentation and enhanced validation

**Deliverables**:

- [ ] Enhanced internal users controller
- [ ] Internal auth controller
- [ ] API validation with domain rules
- [ ] Comprehensive API documentation

**Acceptance Criteria**:

- ✅ APIs use enhanced domain models
- ✅ Validation leverages business rules
- ✅ Documentation complete and accurate

---

#### Day 18: GraphQL Subgraph Schema

**Goal**: Create User service GraphQL subgraph with enhanced types
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Define enhanced User subgraph schema
2. **Afternoon (3h)**: Implement resolvers using domain services
3. **Late Afternoon (2h)**: Add federation directives and enhanced resolvers

**Deliverables**:

- [ ] Enhanced User subgraph schema
- [ ] Resolvers using domain services
- [ ] Federation directives
- [ ] Schema composition working

**Acceptance Criteria**:

- ✅ Schema reflects enhanced domain model
- ✅ Resolvers leverage domain services
- ✅ Federation working properly

---

#### Day 19: Lambda Resolvers Implementation

**Goal**: Create Lambda resolvers for AppSync with enhanced integration
**Developer**: Backend Developer

**Tasks**:

1. **Morning (3h)**: Implement enhanced User query resolvers
2. **Afternoon (3h)**: Implement enhanced User mutation resolvers
3. **Late Afternoon (2h)**: Set up service authentication and error handling

**Deliverables**:

- [ ] Enhanced Lambda query resolvers
- [ ] Enhanced Lambda mutation resolvers
- [ ] Service authentication
- [ ] Domain error handling in resolvers

**Acceptance Criteria**:

- ✅ Resolvers use enhanced domain features
- ✅ Authentication working properly
- ✅ Error handling comprehensive

---

#### Day 20: Testing & Integration Validation

**Goal**: Complete testing and validate enhanced end-to-end integration
**Developer**: Backend Developer + QA

**Tasks**:

1. **Morning (3h)**: Complete unit test coverage for enhanced features
2. **Afternoon (3h)**: Integration testing with enhanced domain
3. **Late Afternoon (2h)**: End-to-end workflow testing with all enhancements

**Deliverables**:

- [ ] 95%+ unit test coverage including enhancements
- [ ] Integration tests passing
- [ ] Enhanced end-to-end workflows working
- [ ] GraphQL federation with enhanced features

**Acceptance Criteria**:

- ✅ All tests passing including enhanced features
- ✅ Enhanced user workflows functional
- ✅ Domain services integrated end-to-end
- ✅ GraphQL API showcases enhanced capabilities

---

## Updated Phase 1 Success Criteria

### Technical Acceptance Criteria

- ✅ GraphQL Federation setup with AppSync
- ✅ User Service with **enhanced domain layer** fully implemented
- ✅ **Domain services and business rules** operational
- ✅ **Specifications pattern** working for queries
- ✅ **Enhanced value objects** integrated throughout
- ✅ All infrastructure components operational
- ✅ Internal APIs secured and documented
- ✅ Lambda resolvers integrated with AppSync
- ✅ 95%+ test coverage achieved

### Enhanced Functional Acceptance Criteria

- ✅ Users can register with **enhanced validation**
- ✅ Profile management with **rich value objects**
- ✅ Tutor registration with **business rules enforcement**
- ✅ **Domain services** powering business logic
- ✅ **Specifications** enabling complex queries
- ✅ GraphQL API with **enhanced domain features**
- ✅ Service-to-service communication established

### Performance Criteria (Unchanged)

- ✅ GraphQL queries respond < 200ms
- ✅ Database operations < 100ms
- ✅ Cache hit ratio > 80%
- ✅ Authentication validation < 50ms

---

## Updated Timeline: 20 days (was 16 days)

**Rationale for Extension:**

- **+4 days** for enhanced domain layer (Phase 0.5 integration)
- **Better foundation** for application layer implementation
- **More robust** business logic and validation
- **Enterprise-grade** domain patterns from the start

This enhanced Phase 1 now provides a **complete, enterprise-grade foundation** that will accelerate all subsequent phases by having proper domain services, business rules, and specifications in place from the beginning.

## Risk Mitigation

### Technical Risks

- **Schema Composition Issues**: Daily schema validation prevents breaking changes
- **Authentication Complexity**: Step-by-step Cognito integration with testing
- **Database Performance**: Early optimization and indexing strategy

### Delivery Risks

- **Scope Creep**: Strict daily deliverables and acceptance criteria
- **Dependencies**: Parallel development where possible
- **Integration Issues**: Daily integration testing and validation

## Daily Standup Template

**Yesterday**: What was completed from the plan
**Today**: Current day's specific tasks and deliverables
**Blockers**: Any impediments to completing today's acceptance criteria
**Integration**: Any cross-service dependencies or issues

This step-by-step plan provides clear daily objectives, specific deliverables, and measurable acceptance criteria for successful Phase 1 completion.
