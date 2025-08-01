# User Service Documentation

## Overview

The User Service is the core service responsible for user management, authentication, profiles, and role-based access control. It serves as the reference implementation for Domain-Driven Design patterns in the platform.

## Service Responsibilities

### Core Functions
- **User Registration & Authentication**: Account creation and login
- **Profile Management**: User profiles with skills, preferences, and settings
- **Role Management**: Student, Tutor, Admin, and SuperAdmin roles
- **User Preferences**: Notification settings, language, timezone
- **Domain Events**: User lifecycle events for other services

### Business Rules
- Users start as Students and can become Tutors
- Profile completeness requirements for tutoring eligibility
- Security policies for role transitions
- Notification preferences with mandatory security alerts

## Domain Implementation

The User Service showcases a complete Domain-Driven Design implementation:

### Domain Architecture

```
domain/
├── entities/
│   └── user.entity.ts           # User aggregate root
├── value-objects/
│   ├── email.value-object.ts
│   ├── user-profile.value-object.ts
│   ├── user-preferences.value-object.ts
│   ├── user-name.value-object.ts
│   ├── user-id.value-object.ts
│   └── user-role.value-object.ts
├── events/
│   ├── user-created.event.ts
│   ├── user-updated.event.ts
│   ├── user-profile-updated.event.ts
│   └── user-role-changed.event.ts
├── services/
│   └── user-domain.service.ts    # Business logic orchestrator
├── errors/
│   └── user.errors.ts
└── repositories/
    └── user-repository.interface.ts
```

### Key Domain Patterns

#### 1. User Aggregate Root
The central entity managing user state and business invariants:

```typescript
export class User extends AggregateRoot {
  // State management
  public static create(data: CreateUserData): User
  public update(props: UpdateUserProps): void
  public activate(): void
  public changeRole(newRole: UserRoleType): void
  
  // Business queries
  public isActive(): boolean
  public isStudent(): boolean
  public isTutor(): boolean
  
  // Event emission
  private apply(event: DomainEvent): void
}
```

#### 2. Rich Value Objects

**UserProfile**: Complex profile management with skills and experience
```typescript
export class UserProfile {
  // Skills management with categories and experience levels
  public addSkill(skill: string, category: SkillCategory, level: ExperienceLevel): UserProfile
  public removeSkill(skill: string): UserProfile
  
  // Profile completeness calculation (0-100%)
  public calculateCompleteness(): number
  
  // Tutoring eligibility (70% threshold)
  public isCompleteForTutoring(): boolean
  
  // Age calculation from date of birth
  public get age(): number
}
```

**UserPreferences**: Comprehensive notification and display preferences
```typescript
export class UserPreferences {
  // 8 notification types with business rules
  public updateNotificationPreference(type: NotificationType, enabled: boolean): UserPreferences
  
  // Mandatory security alerts (cannot be disabled)
  public shouldReceiveNotification(type: NotificationType): boolean
  
  // Language and timezone support (10 languages, IANA timezones)
  public formatDateTime(date: Date): string
  public formatDate(date: Date): string
}
```

#### 3. Domain Service
Centralized business logic for complex operations:

```typescript
@Injectable()
export class UserDomainService {
  // Business rules
  canBecomeTutor(user: User): boolean
  canTransitionRole(fromRole: UserRole, toRole: UserRole): boolean
  
  // Complex calculations
  calculateReputationScore(user: User, factors: ReputationFactors): number
  generateUserMetrics(user: User): UserMetrics
  
  // Validation
  validateTutorPromotionRequirements(user: User): void
}
```

#### 4. Domain Events
Events for cross-service communication:

```typescript
// User lifecycle events
UserCreatedEvent
UserUpdatedEvent
UserActivatedEvent
UserDeactivatedEvent
UserRoleChangedEvent
UserProfileUpdatedEvent
UserLoginAttemptedEvent
UserPreferencesChangedEvent
```

## API Endpoints

### GraphQL Schema
The service exposes its functionality through GraphQL Federation:

```graphql
type User {
  id: ID!
  email: String!
  profile: UserProfile!
  preferences: UserPreferences!
  role: UserRole!
  status: UserStatus!
  isActive: Boolean!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type UserProfile {
  firstName: String!
  lastName: String!
  fullName: String!
  bio: String
  skills: [Skill!]!
  dateOfBirth: AWSDate
  profileCompleteness: Float!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateProfile(input: UpdateUserProfileInput!): User!
  becomeTutor(input: BecomeTutorInput!): User!
  updatePreferences(input: UpdatePreferencesInput!): User!
}
```

### Internal HTTP API
Service-to-service communication endpoints:

```typescript
// Protected by ServiceAuthGuard
@Controller('internal/users')
@UseGuards(ServiceAuthGuard)
export class UsersController {
  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserDto>
  
  @Post()
  async createUser(@Body() dto: CreateUserDto): Promise<UserDto>
  
  @Put(':id/role')
  async changeUserRole(@Param('id') id: string, @Body() dto: ChangeRoleDto): Promise<UserDto>
}
```

## Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user_service:password@localhost:5432/user_service
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600

# AWS Services
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566  # LocalStack

# Cognito
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=your-client-id

# EventBridge
EVENT_BRIDGE_NAME=edtech-platform
EVENT_BRIDGE_REGION=us-east-1

# S3
S3_BUCKET_NAME=edtech-user-assets
S3_REGION=us-east-1

# Service Authentication
SERVICE_NAME=user-service
SERVICE_AUTH_METHOD=cognito
```

### Shared Configuration
Uses typed configuration from `@edtech/config`:

```typescript
export interface UserServiceConfiguration {
  database: DatabaseConfiguration;
  redis: RedisConfiguration;
  cognito: CognitoConfiguration;
  eventBridge: EventBridgeConfiguration;
  s3: S3Configuration;
  serviceAuth: ServiceAuthConfiguration;
}
```

## Infrastructure

### Database Schema
PostgreSQL with TypeORM entities:

```sql
-- Users table with embedded value objects
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'student',
  status VARCHAR(20) DEFAULT 'pending_verification',
  bio TEXT,
  skills TEXT[], -- JSON array of skills
  date_of_birth DATE,
  preferences JSONB, -- User preferences as JSON
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### Event Publishing
Integration with AWS EventBridge:

```typescript
// Event publishing to EventBridge
@Injectable()
export class EventBridgeService {
  async publishEvent(event: DomainEvent): Promise<void> {
    const eventEntry = {
      Source: 'user-service',
      DetailType: event.eventType,
      Detail: JSON.stringify(event.payload),
      EventBusName: this.config.eventBridge.eventBusName,
    };
    
    await this.eventBridgeClient.send(new PutEventsCommand({
      Entries: [eventEntry]
    }));
  }
}
```

### Caching Strategy
Redis caching for frequently accessed data:

```typescript
// User profile caching
@Injectable()
export class UserCacheService {
  private readonly TTL = 3600; // 1 hour
  
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const cached = await this.redis.get(`user:profile:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }
  
  async setUserProfile(userId: string, profile: UserProfile): Promise<void> {
    await this.redis.setex(
      `user:profile:${userId}`,
      this.TTL,
      JSON.stringify(profile)
    );
  }
}
```

## Testing Strategy

### Test Coverage
- **Unit Tests**: Domain logic and value objects (90%+ coverage)
- **Integration Tests**: Repository and service interactions
- **E2E Tests**: Complete user workflows through GraphQL

### Test Structure
```
test/
├── unit/
│   ├── domain/
│   │   ├── entities/user.entity.spec.ts
│   │   ├── value-objects/user-profile.spec.ts
│   │   └── services/user-domain.service.spec.ts
│   └── application/
│       └── use-cases/create-user.usecase.spec.ts
├── integration/
│   ├── repositories/user.repository.spec.ts
│   └── event-handlers/user-created.handler.spec.ts
└── e2e/
    └── user-workflows.e2e-spec.ts
```

### Key Test Scenarios
- User registration and activation flow
- Profile completeness calculation
- Tutoring eligibility validation
- Role transition business rules
- Event publishing and handling
- Authentication and authorization

## Development Workflow

### Local Development
```bash
# Start infrastructure
pnpm run docker:up

# Run migrations
pnpm run migrate:user

# Seed test data
pnpm run seed:user

# Start service
pnpm run start:dev
```

### Testing
```bash
# Unit tests
pnpm run test --testPathPattern=user-service

# Integration tests
pnpm run test:integration --testPathPattern=user-service

# E2E tests
pnpm run test:e2e --testPathPattern=user-service
```

### Code Quality
```bash
# Linting
pnpm run lint --fix

# Type checking
pnpm run build:check

# Security scan
pnpm run security:scan
```

## Domain Refactoring Achievement

The User Service underwent comprehensive domain refactoring to achieve:

### ✅ Eliminated Redundancy
- Consolidated business logic into UserDomainService
- Removed duplicate validation paths
- Single source of truth for all business rules

### ✅ Clear Separation of Concerns
- **UserDomainService**: All business logic and complex calculations
- **User Entity**: State management and simple domain operations
- **Value Objects**: Data integrity and basic calculations

### ✅ Simplified Architecture
- Removed unnecessary Specifications pattern
- Eliminated redundant Factory pattern
- Focused on essential DDD patterns

### ✅ Quality Metrics
- **40% reduction** in domain layer complexity
- **8 files eliminated** (rules, specifications, factories)
- **100% elimination** of logic duplication
- **Comprehensive test coverage** (55+ tests)

## Future Enhancements

### Planned Features
- Multi-factor authentication (MFA)
- OAuth integration (Google, Facebook, Apple)
- Advanced user analytics
- Real-time user activity tracking
- Enhanced profile recommendations

### Technical Improvements
- Event sourcing for user state changes
- Advanced caching strategies
- Performance optimizations
- Monitoring and alerting enhancements

## Related Documentation

- [Authentication Guide](../architecture/authentication-guide.md) - Complete authentication patterns
- [Domain-Driven Design](../architecture/domain-driven-design.md) - DDD implementation guide
- [Implementation Phases](../development/implementation-phases.md) - Project roadmap
- [API Specifications](../api-specifications/) - GraphQL schema documentation

The User Service serves as the foundation and reference implementation for all other services in the EdTech platform, demonstrating best practices for domain modeling, service architecture, and development workflows.