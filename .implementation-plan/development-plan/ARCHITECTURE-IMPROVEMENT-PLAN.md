# EdTech Platform - Architecture Improvement Plan

## Executive Summary

This document outlines the comprehensive architecture modernization plan based on the current analysis of the EdTech platform codebase. The plan addresses key technical priorities to create a more maintainable, scalable, and cost-effective platform.

## Current Architecture Assessment

### ✅ Strengths Identified
- **GraphQL Infrastructure**: Apollo Federation Gateway with schema composition pipeline
- **AWS AppSync**: Functional with Lambda resolvers for User service  
- **Authentication**: Comprehensive multi-layer authentication with AWS Cognito
- **Domain Structure**: Well-structured user service with DDD patterns
- **Database Setup**: Proper TypeORM entities, migrations, and health checks

### ❌ Critical Issues Found
- **Missing Federation Implementation**: Services lack NestJS GraphQL modules
- **TypeORM Complexity**: Heavy ORM with complex entity relationships
- **LocalStack Dependencies**: Extensive local emulation reducing development fidelity
- **Architecture Inconsistency**: Dual GraphQL approaches (Federation + AppSync)
- **Complex Domain Patterns**: Over-engineered CQRS with separate command/query handlers

## Architecture Improvement Plan

### Phase 1: Infrastructure Modernization (5-7 days)

#### 1.1 Database Migration Strategy (Days 1-2)
**Objective**: Replace TypeORM with Drizzle ORM for better TypeScript integration

**Current State**: TypeORM with complex entity relationships
**Target State**: Drizzle ORM with excellent TypeScript support

**Key Activities:**
1. **Install Drizzle Dependencies**
   ```bash
   pnpm add drizzle-orm postgres
   pnpm add -D drizzle-kit
   ```

2. **Create Drizzle Schemas**
   ```typescript
   // apps/user-service/src/infrastructure/persistence/schemas/user.schema.ts
   import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
   
   export const users = pgTable('users', {
     id: text('id').primaryKey(),
     email: text('email').notNull().unique(),
     firstName: text('first_name').notNull(),
     lastName: text('last_name').notNull(),
     role: text('role').notNull(),
     status: text('status').notNull(),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow()
   });
   ```

3. **Implement Repository Pattern with mergeObject**
   ```typescript
   // Repository implementation with domain mapping
   async findById(id: string): Promise<User | null> {
     const userData = await this.db.select().from(users).where(eq(users.id, id));
     
     if (!userData) return null;
     
     return User.fromPersistence(
       mergeObject(userData, {
         skills: JSON.parse(userData.skills || '[]'),
         preferences: this.mapPreferences(userData.preferences)
       })
     );
   }
   ```

4. **Migration Strategy**
   - Create Drizzle migration files
   - Run parallel testing with both ORMs
   - Gradual cutover service by service

**Success Criteria:**
- All PostgreSQL services using Drizzle ORM
- Improved TypeScript type safety
- Reduced boilerplate code
- Better performance with lighter ORM

#### 1.2 Cloud Development Environment (Days 2-3)
**Objective**: Remove LocalStack, use real AWS services for all environments

**Current State**: LocalStack-based development with fidelity issues
**Target State**: Real AWS services with developer-specific environments

**Key Activities:**
1. **Remove LocalStack Dependencies**
   ```bash
   # Remove from package.json, docker-compose.yml, scripts
   rm scripts/init-localstack.sh
   # Update all AWS SDK configurations
   ```

2. **Implement Developer Environments**
   ```typescript
   // CDK environment naming
   const envName = `dev-${process.env.DEVELOPER_NAME || 'default'}`;
   const stackName = `EdTech-${envName}-UserService`;
   ```

3. **AWS Secrets Manager Integration**
   ```typescript
   // Service configuration
   const dbCredentials = await secretsManager.getSecret({
     SecretId: `/edtech/${environment}/rds/credentials`
   }).promise();
   ```

4. **Cost Management**
   - Automated environment teardown scripts
   - Resource tagging for cost tracking
   - Development environment lifecycle management

**Success Criteria:**
- No LocalStack dependencies
- Developer-specific AWS environments
- Cost-effective development workflow
- High fidelity between dev and production

#### 1.3 Unified GraphQL Architecture (Days 3-4)
**Objective**: Create hybrid AppSync + Federation architecture

**Current State**: Dual GraphQL implementations serving different purposes
**Target State**: Unified approach with clear boundaries

**Architecture Design:**
```
Public API (Mobile/Web) → AppSync (Auth + Schema) → Lambda Resolvers → Federation Gateway → NestJS Services
Internal APIs → Direct Federation Gateway → NestJS Services
```

**Key Activities:**
1. **Define Clear Boundaries**
   - **AppSync**: Public-facing API with Cognito authentication
   - **Federation Gateway**: Internal service mesh for microservices
   - **Lambda Resolvers**: Bridge between AppSync and Federation

2. **Implement Hybrid Resolvers**
   ```typescript
   // AppSync Lambda Resolver
   export const getUserResolver: AppSyncResolverHandler = async (event) => {
     const userId = event.arguments.id;
     
     // Call Federation Gateway internally
     const user = await federationGateway.query(`
       query GetUser($id: ID!) {
         user(id: $id) { id email firstName lastName }
       }
     `, { id: userId });
     
     return user;
   };
   ```

3. **Service Federation Implementation**
   - Add `@nestjs/graphql` to all services
   - Implement federation directives (`@key`, `@extends`)
   - Connect to Apollo Federation Gateway

**Success Criteria:**
- Single GraphQL approach for all use cases
- Clear public vs internal API boundaries
- Seamless authentication flow
- Federation working across all services

### Phase 2: Service Implementation (8-10 days)

#### 2.1 Simplified Domain Layer Implementation (Days 1-3)
**Objective**: Implement simplified DDD patterns across all services

**Current State**: Complex CQRS with separate command/query handlers
**Target State**: Simplified domain patterns with use case services

**Domain Structure:**
```typescript
// domain/
├── entities/           # Simple domain entities
├── value-objects/      # Immutable value objects  
├── aggregates/         # Aggregate roots (extends NestJS CQRS AggregateRoot)
├── services/           # Domain services
└── events/             # Domain events (extends NestJS CQRS Event)
```

**Key Patterns:**
1. **Aggregate Roots with Events**
   ```typescript
   export class User extends AggregateRoot {
     static create(data: CreateUserData): User {
       const user = new User(data);
       user.apply(new UserCreatedEvent(user.id, user.email));
       return user;
     }
   }
   ```

2. **Domain Events**
   ```typescript
   export class UserCreatedEvent extends Event {
     constructor(
       public readonly userId: string,
       public readonly email: string
     ) {
       super();
     }
   }
   ```

**Success Criteria:**
- Simplified domain layer across all services
- Consistent use of NestJS CQRS patterns
- Proper event emission and handling
- Reduced complexity and cognitive load

#### 2.2 Application Layer with Use Case Services (Days 3-5)
**Objective**: Replace CQRS commands/queries with use case services

**Current State**: Separate command and query handlers
**Target State**: Use case services handling business operations

**Use Case Pattern:**
```typescript
@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryInterface,
    private readonly eventBus: EventBus
  ) {}

  async execute(dto: CreateUserDto): Promise<UserDto> {
    // 1. Create domain object
    const user = User.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName
    });

    // 2. Save to repository
    await this.userRepository.save(user);
    
    // 3. Publish events (automatic via NestJS CQRS)
    user.commit();
    
    // 4. Return DTO
    return UserDto.fromDomain(user);
  }
}
```

**Application Structure:**
```typescript
// application/
├── use-cases/          # Use case services
├── dtos/               # Data transfer objects
├── event-handlers/     # Domain event handlers
└── interfaces/         # Repository interfaces
```

**Success Criteria:**
- All services using use case pattern
- Simplified application layer
- Clear business operation boundaries
- Proper event handling

#### 2.3 NestJS GraphQL Federation (Days 5-7)
**Objective**: Implement GraphQL federation in all services

**Implementation Steps:**
1. **Add GraphQL Dependencies**
   ```bash
   pnpm add @nestjs/graphql @apollo/subgraph graphql
   ```

2. **Create Federation Schemas**
   ```graphql
   # user.subgraph.graphql
   extend type Query {
     user(id: ID!): User
     users: [User!]!
   }

   type User @key(fields: "id") {
     id: ID!
     email: String!
     firstName: String!
     lastName: String!
   }
   ```

3. **Implement Resolvers**
   ```typescript
   @Resolver(() => User)
   export class UserResolver {
     constructor(private readonly getUserUseCase: GetUserUseCase) {}

     @Query(() => User)
     async user(@Args('id') id: string): Promise<UserDto> {
       return this.getUserUseCase.execute({ id });
     }
   }
   ```

**Success Criteria:**
- All services have GraphQL federation
- Federation Gateway connecting all services
- Proper schema composition and validation
- Cross-service relationships working

#### 2.4 Serverless Lambda Strategy (Days 7-8)
**Objective**: Define clear serverless vs container boundaries

**Lambda Use Cases:**
- **Event Handlers**: Process domain events from EventBridge
- **AppSync Resolvers**: Bridge public API to internal services
- **Scheduled Tasks**: Cron jobs and periodic operations
- **Simple CRUD**: Lightweight data operations

**Fargate Use Cases:**
- **Complex Business Logic**: Multi-step business processes
- **Long-running Services**: Service mesh and federation gateway
- **Heavy Computations**: Data processing and analysis

**Implementation Pattern:**
```typescript
// Lambda Event Handler
export const userCreatedHandler: Handler = async (event: EventBridgeEvent) => {
  const userCreatedEvent = JSON.parse(event.detail);
  
  // Simple business logic
  await emailService.sendWelcomeEmail({
    email: userCreatedEvent.email,
    firstName: userCreatedEvent.firstName
  });
};
```

**Success Criteria:**
- Clear serverless strategy
- Cost-optimized service deployment
- Proper event-driven architecture
- Lambda functions handling appropriate workloads

### Phase 3: Event-Driven Architecture (5-6 days)

#### 3.1 Simplified Saga Pattern (Days 1-2)
**Objective**: Implement choreography-based sagas using EventBridge

**Saga Architecture:**
- **EventBridge Choreography**: Services react to events independently
- **DynamoDB State Management**: Track saga state and progress
- **Lambda Coordinators**: Simple coordination logic
- **Compensation Handlers**: Rollback operations as event handlers

**Implementation Pattern:**
```typescript
// Saga Coordinator Lambda
export const paymentSagaCoordinator: Handler = async (event: EventBridgeEvent) => {
  const sagaState = await sagaRepository.findById(event.detail.sagaId);
  
  switch (event['detail-type']) {
    case 'PaymentInitiated':
      await handlePaymentInitiated(sagaState, event.detail);
      break;
    case 'PaymentFailed':
      await handlePaymentCompensation(sagaState, event.detail);
      break;
  }
};
```

**Success Criteria:**
- Reliable saga orchestration
- Proper compensation handling
- Event-driven choreography
- DynamoDB state management

#### 3.2 Domain Events & Event Handlers (Days 2-4)
**Objective**: Implement reliable event-driven communication

**Event Pattern:**
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

// Event Handler
@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent) {
    // Publish to EventBridge for cross-service communication
    await this.eventBridge.putEvents({
      Entries: [{
        Source: 'user-service',
        DetailType: 'User Created',
        Detail: JSON.stringify(event)
      }]
    }).promise();
  }
}
```

**Success Criteria:**
- Reliable event publishing
- Cross-service event handling
- Proper event versioning
- Dead letter queue handling

#### 3.3 Infrastructure Mapping (Days 4-5)
**Objective**: Implement clean mapping between infrastructure and domain

**Mapping Pattern:**
```typescript
@Injectable()
export class UserRepository implements UserRepositoryInterface {
  constructor(private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<User | null> {
    const userData = await this.db
      .select()
      .from(users) 
      .where(eq(users.id, id))
      .limit(1);
    
    if (!userData[0]) return null;
    
    // Use mergeObject for complex mapping
    return User.fromPersistence(
      mergeObject(userData[0], {
        skills: JSON.parse(userData[0].skills || '[]'),
        preferences: this.mapUserPreferences(userData[0].preferences),
        profile: this.mapUserProfile(userData[0])
      })
    );
  }

  async save(user: User): Promise<void> {
    const persistenceData = user.toPersistence();
    
    await this.db
      .insert(users)
      .values(persistenceData)
      .onConflictDoUpdate({
        target: users.id,
        set: persistenceData
      });
    
    // Publish domain events
    user.commit();
  }
}
```

**Success Criteria:**
- Clean domain-infrastructure separation
- Proper data mapping utilities
- Type-safe database operations
- Event publishing integration

## Implementation Priority & Timeline

### Priority 1: Foundation (Week 1)
1. **Database Migration** (Days 1-2): TypeORM → Drizzle ORM
2. **Cloud Environment** (Days 2-3): Remove LocalStack
3. **GraphQL Unification** (Days 3-4): Hybrid AppSync + Federation

### Priority 2: Core Services (Week 2-3)
1. **Domain Simplification** (Days 5-7): Simplified DDD patterns
2. **Use Case Services** (Days 8-10): Replace CQRS handlers
3. **GraphQL Federation** (Days 11-13): Full federation implementation

### Priority 3: Architecture (Week 3-4)
1. **Serverless Strategy** (Days 14-15): Lambda boundaries
2. **Event-Driven Architecture** (Days 16-18): Saga pattern
3. **Infrastructure Mapping** (Days 19-20): Domain mapping

## Success Metrics

### Technical Metrics
- **Type Safety**: 100% TypeScript coverage with Drizzle
- **Development Speed**: 50% faster development cycles
- **Code Reduction**: 30% less boilerplate code
- **Test Coverage**: 90% coverage across all layers

### Business Metrics
- **Development Cost**: 40% reduction in AWS development costs
- **Time to Market**: 60% faster feature delivery
- **System Reliability**: 99.9% uptime with proper error handling
- **Developer Experience**: Improved onboarding and productivity

## Risk Mitigation

### Technical Risks
1. **Data Migration Risk**: Parallel running of old/new systems
2. **Service Downtime**: Blue-green deployment strategy
3. **Learning Curve**: Comprehensive documentation and examples
4. **Integration Issues**: Thorough testing at each phase

### Mitigation Strategies
- **Incremental Migration**: Service-by-service approach
- **Rollback Plans**: Ability to revert at each phase
- **Comprehensive Testing**: Unit, integration, and e2e tests
- **Documentation**: Clear patterns and examples

## Next Steps

1. **✅ Architecture Plan Approved**: Document and communicate plan
2. **🔄 Phase 1 Kickoff**: Start with User Service database migration
3. **📋 Team Alignment**: Ensure all stakeholders understand changes
4. **🚀 Implementation Begin**: Execute Phase 1 improvements

This plan provides a clear roadmap for modernizing the EdTech platform architecture while maintaining system stability and improving developer productivity.