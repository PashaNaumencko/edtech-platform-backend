# Phase 1: GraphQL Federation Foundation & User Service - Step-by-Step Development Plan
**Duration: 16 days | Priority: Critical**

## Phase Overview
This phase establishes the GraphQL Federation foundation with AWS AppSync as the supergraph and implements the User Service as the first microservice following our standardized DDD + Clean Architecture + Use Case Pattern.

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

#### Days 5-6: Domain Layer Implementation
**Goal**: Implement complete domain layer for User Service
**Developer**: Backend Developer

**Day 5 Tasks**:
1. **Morning (3h)**: Create User entity (AggregateRoot)
   ```typescript
   // domain/entities/user.entity.ts
   export class User extends AggregateRoot {
     static create(data: CreateUserData): User
     becomeTutor(certifications: Certification[]): void
     updateProfile(profile: UserProfile): void
   }
   ```
2. **Afternoon (3h)**: Create value objects (Email, UserId, UserProfile)
3. **Late Afternoon (2h)**: Create domain events

**Day 6 Tasks**:
1. **Morning (3h)**: Create TutorProfile entity and SocialAccount entity
2. **Afternoon (3h)**: Define repository interfaces
3. **Late Afternoon (2h)**: Create domain exceptions and business rules

**Deliverables**:
- [ ] User entity with business logic
- [ ] TutorProfile and SocialAccount entities
- [ ] Value objects (Email, UserId, UserProfile)
- [ ] Domain events (UserCreated, UserBecameTutor)
- [ ] Repository interfaces
- [ ] Domain exceptions

**Acceptance Criteria**:
- ✅ All domain entities have unit tests
- ✅ Business rules are enforced in domain
- ✅ Domain events are properly emitted

---

#### Day 7: Application Layer Foundation
**Goal**: Set up application layer structure and base use cases
**Developer**: Backend Developer

**Tasks**:
1. **Morning (3h)**: Implement IUseCase interface and base classes
   ```typescript
   // application/use-cases/create-user/create-user.usecase.ts
   export class CreateUserUseCase implements IUseCase<CreateUserRequest, CreateUserResponse>
   ```
2. **Afternoon (3h)**: Create DTO classes and request/response objects
3. **Late Afternoon (2h)**: Set up event handlers structure

**Deliverables**:
- [ ] IUseCase interface implemented
- [ ] Base use case structure created
- [ ] DTO classes defined
- [ ] Event handlers structure ready

**Acceptance Criteria**:
- ✅ Use case pattern follows IUseCase interface
- ✅ DTOs properly map domain objects
- ✅ Event handler registration working

---

### Week 2: Core Implementation (Days 8-12)

#### Day 8: Critical Use Cases Implementation
**Goal**: Implement core user management use cases
**Developer**: Backend Developer

**Tasks**:
1. **Morning (3h)**: Implement CreateUserUseCase
   - User validation and creation
   - Domain event publishing
   - Response mapping
2. **Afternoon (3h)**: Implement UpdateUserProfileUseCase
3. **Late Afternoon (2h)**: Implement BecomeTutorUseCase

**Deliverables**:
- [ ] CreateUserUseCase with full implementation
- [ ] UpdateUserProfileUseCase
- [ ] BecomeTutorUseCase
- [ ] Unit tests for all use cases

**Acceptance Criteria**:
- ✅ All use cases pass unit tests
- ✅ Domain events are properly emitted
- ✅ Business validation working correctly

---

#### Day 9: Database Infrastructure
**Goal**: Implement PostgreSQL integration and data persistence
**Developer**: Backend Developer

**Tasks**:
1. **Morning (3h)**: Create TypeORM entities (UserOrmEntity, TutorProfileOrmEntity)
   ```typescript
   // infrastructure/postgres/entities/user.orm-entity.ts
   @Entity('users')
   export class UserOrmEntity {
     @PrimaryGeneratedColumn('uuid')
     id: string;
     @Column() email: string;
     // ... other fields
   }
   ```
2. **Afternoon (3h)**: Implement repository implementations
3. **Late Afternoon (2h)**: Create database migrations

**Deliverables**:
- [ ] TypeORM entities created
- [ ] Repository implementations
- [ ] Database migrations
- [ ] Database seeds for testing

**Acceptance Criteria**:
- ✅ Database schema created successfully
- ✅ CRUD operations working
- ✅ Migrations run without errors

---

#### Day 10: Redis Caching & Cognito Integration
**Goal**: Implement caching and authentication services
**Developer**: Backend Developer

**Tasks**:
1. **Morning (3h)**: Implement Redis caching service
   ```typescript
   // infrastructure/redis/cache/user.cache.ts
   export class UserCacheService {
     async getUser(id: string): Promise<UserDto | null>
     async setUser(user: UserDto): Promise<void>
   }
   ```
2. **Afternoon (3h)**: Implement Cognito authentication service
3. **Late Afternoon (2h)**: Create authentication guards and decorators

**Deliverables**:
- [ ] Redis caching service
- [ ] Cognito authentication service
- [ ] Authentication guards
- [ ] JWT token validation

**Acceptance Criteria**:
- ✅ User data cached and retrieved correctly
- ✅ Cognito authentication working
- ✅ Protected endpoints require valid tokens

---

#### Day 11: S3 & Email Services
**Goal**: Implement file upload and email notification services
**Developer**: Backend Developer

**Tasks**:
1. **Morning (3h)**: Implement S3 profile image upload service
   ```typescript
   // infrastructure/s3/services/profile-image.service.ts
   export class ProfileImageService {
     async uploadProfileImage(userId: string, file: Buffer): Promise<string>
   }
   ```
2. **Afternoon (3h)**: Implement email service with SES
3. **Late Afternoon (2h)**: Create email templates for user registration

**Deliverables**:
- [ ] S3 file upload service
- [ ] Email service with templates
- [ ] Profile image upload endpoint
- [ ] Welcome email functionality

**Acceptance Criteria**:
- ✅ Profile images upload to S3 successfully
- ✅ Welcome emails sent on user registration
- ✅ Email templates render correctly

---

#### Day 12: EventBridge & Event Handlers
**Goal**: Implement domain event publishing and handling
**Developer**: Backend Developer

**Tasks**:
1. **Morning (3h)**: Implement EventBridge publisher service
   ```typescript
   // infrastructure/event-bridge/publishers/user-event.publisher.ts
   export class UserEventPublisher {
     async publishUserCreated(user: User): Promise<void>
   }
   ```
2. **Afternoon (3h)**: Implement event handlers for side effects
3. **Late Afternoon (2h)**: Test event-driven workflows

**Deliverables**:
- [ ] EventBridge publisher service
- [ ] Event handlers for domain events
- [ ] Event-driven side effects working
- [ ] Event publishing tests

**Acceptance Criteria**:
- ✅ Domain events published to EventBridge
- ✅ Event handlers process events correctly
- ✅ Side effects execute as expected

---

### Week 3: API & Integration (Days 13-16)

#### Day 13: Internal HTTP Controllers
**Goal**: Implement internal API controllers for service-to-service communication
**Developer**: Backend Developer

**Tasks**:
1. **Morning (3h)**: Implement internal user controllers
   ```typescript
   // presentation/http/controllers/internal/users.internal.controller.ts
   @Controller('internal/users')
   export class InternalUsersController {
     @Get(':id') async getUser(@Param('id') id: string): Promise<UserDto>
     @Post() async createUser(@Body() dto: CreateUserDto): Promise<UserDto>
   }
   ```
2. **Afternoon (3h)**: Implement internal auth controllers
3. **Late Afternoon (2h)**: Add API documentation and validation

**Deliverables**:
- [ ] Internal users controller
- [ ] Internal auth controller
- [ ] API validation and error handling
- [ ] Swagger documentation

**Acceptance Criteria**:
- ✅ All internal APIs working correctly
- ✅ Service authentication required
- ✅ API documentation complete

---

#### Day 14: GraphQL Subgraph Schema
**Goal**: Create User service GraphQL subgraph schema
**Developer**: Backend Developer

**Tasks**:
1. **Morning (3h)**: Define User subgraph schema
   ```graphql
   # presentation/graphql/schemas/user.subgraph.graphql
   type User @key(fields: "id") {
     id: ID!
     email: String!
     firstName: String!
     lastName: String!
     isTutor: Boolean!
   }
   ```
2. **Afternoon (3h)**: Implement schema-first GraphQL resolvers
3. **Late Afternoon (2h)**: Add federation directives and entity resolvers

**Deliverables**:
- [ ] User subgraph schema
- [ ] GraphQL resolvers
- [ ] Federation directives
- [ ] Schema composition working

**Acceptance Criteria**:
- ✅ Subgraph schema validates
- ✅ Resolvers return correct data
- ✅ Federation directives working

---

#### Day 15: Lambda Resolvers Implementation
**Goal**: Create Lambda resolvers for AppSync integration
**Developer**: Backend Developer

**Tasks**:
1. **Morning (3h)**: Implement User query resolvers
   ```typescript
   // graphql-api/resolvers/user/user.resolvers.ts
   export const getUserResolver = async (event: AppSyncEvent): Promise<UserDto> => {
     // Call internal user service API
   }
   ```
2. **Afternoon (3h)**: Implement User mutation resolvers
3. **Late Afternoon (2h)**: Set up service-to-service authentication

**Deliverables**:
- [ ] Lambda query resolvers
- [ ] Lambda mutation resolvers
- [ ] Service authentication tokens
- [ ] Error handling in resolvers

**Acceptance Criteria**:
- ✅ AppSync can call Lambda resolvers
- ✅ Resolvers authenticate with User service
- ✅ GraphQL operations return correct data

---

#### Day 16: Testing & Integration Validation
**Goal**: Complete testing and validate end-to-end integration
**Developer**: Backend Developer + QA

**Tasks**:
1. **Morning (3h)**: Complete unit test coverage
   - Domain layer tests
   - Use case tests
   - Infrastructure tests
2. **Afternoon (3h)**: Integration testing
   - Database integration tests
   - External service integration tests
   - GraphQL federation tests
3. **Late Afternoon (2h)**: End-to-end workflow testing

**Deliverables**:
- [ ] 90%+ unit test coverage
- [ ] Integration tests passing
- [ ] End-to-end user registration flow working
- [ ] GraphQL federation functioning

**Acceptance Criteria**:
- ✅ All tests passing
- ✅ User can register via GraphQL API
- ✅ Internal APIs respond correctly
- ✅ Events published and handled properly

---

## Phase 1 Success Criteria

### Technical Acceptance Criteria
- ✅ GraphQL Federation setup with AppSync
- ✅ User Service fully implemented with DDD pattern
- ✅ All infrastructure components operational
- ✅ Internal APIs secured and documented
- ✅ Lambda resolvers integrated with AppSync
- ✅ 90%+ test coverage achieved

### Functional Acceptance Criteria
- ✅ Users can register and authenticate
- ✅ Profile management working
- ✅ Tutor registration process functional
- ✅ GraphQL API accessible and secure
- ✅ Service-to-service communication established

### Performance Criteria
- ✅ GraphQL queries respond < 200ms
- ✅ Database operations < 100ms
- ✅ Cache hit ratio > 80%
- ✅ Authentication validation < 50ms

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