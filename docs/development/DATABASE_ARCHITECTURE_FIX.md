# Database Architecture Fix: Service-Specific Databases

## Problem Identified

Our current implementation violates microservices principles by sharing Drizzle schemas across services. This creates:

- **Tight coupling** between services
- **Shared database anti-pattern** 
- **Data ownership conflicts**
- **Deployment dependencies**
- **Scaling limitations**

## Correct Microservices Database Architecture

### Principle: Database-per-Service
Each microservice must own its data completely, including:
- **Separate database instance** per service
- **Service-specific schemas** within each service
- **No direct database access** between services
- **API-only communication** for data exchange

## Updated Database Strategy

### 1. Identity Service Database
**Database**: `edtech_identity_db`
**Schema Location**: `apps/identity-service/src/infrastructure/database/schemas/`
**Tables**:
```sql
-- Users table (owned by Identity Service)
users (id, email, firstName, lastName, role, status, createdAt, updatedAt)
user_profiles (userId, bio, preferences, settings)
user_sessions (userId, sessionId, expiresAt)
auth_tokens (userId, token, type, expiresAt)
```

### 2. Learning Management Service Database  
**Database**: `edtech_learning_db`
**Schema Location**: `apps/learning-management-service/src/infrastructure/database/schemas/`
**Tables**:
```sql
-- Tutors (with basic user info duplicated for performance)
tutors (id, userId, email, name, hourlyRate, subjects, languages, isVerified)
students (id, userId, email, name, learningGoals, preferredLanguages)
courses (id, tutorId, title, description, price, duration)
lessons (id, courseId, tutorId, studentId, scheduledAt, status, meetingUrl)
matching_requests (id, studentId, subject, budget, requirements)
tutor_availability (id, tutorId, dayOfWeek, startTime, endTime)
```

### 3. Payment Service Database
**Database**: `edtech_payment_db` 
**Schema Location**: `apps/payment-service/src/infrastructure/database/schemas/`
**Tables**:
```sql
-- Payments (with user references by ID only)
payments (id, lessonId, studentUserId, tutorUserId, amount, platformFee, status)
transactions (id, paymentId, type, amount, stripeTransactionId)
payouts (id, tutorUserId, amount, period, status, stripePayoutId)
invoices (id, paymentId, studentUserId, tutorUserId, amount)
refunds (id, paymentId, amount, reason, status)
stripe_accounts (id, tutorUserId, stripeAccountId, onboardingComplete)
```

### 4. Communication Service Database
**Database**: `edtech_communication_db`
**Schema Location**: `apps/communication-service/src/infrastructure/database/schemas/`
**Tables**:
```sql
-- Messages and notifications
conversations (id, lessonId, participantIds, status, lastMessageAt)
messages (id, conversationId, senderUserId, content, messageType, timestamp)
notifications (id, userId, type, title, content, isRead, createdAt)
video_sessions (id, lessonId, meetingUrl, startedAt, endedAt, recordingUrl)
```

### 5. AI Service Database
**Database**: `edtech_ai_db`
**Schema Location**: `apps/ai-service/src/infrastructure/database/schemas/`
**Tables**:
```sql
-- Content and AI interactions
content (id, creatorUserId, title, description, contentType, subject)
ai_interactions (id, userId, sessionId, query, response, timestamp)
recommendations (id, userId, targetType, targetId, score, reason)
learning_paths (id, userId, subject, steps, progress, createdAt)
```

### 6. Analytics Service Database
**Database**: `edtech_analytics_db`
**Schema Location**: `apps/analytics-service/src/infrastructure/database/schemas/`
**Tables**:
```sql
-- Reviews and analytics
reviews (id, reviewerUserId, targetUserId, targetType, rating, comment)
analytics_events (id, userId, eventType, metadata, timestamp)
reports (id, type, data, generatedAt, generatedBy)
user_metrics (id, userId, lessonCount, totalSpent, avgRating)
```

## Implementation Plan

### Step 1: Move Schemas to Individual Services

#### Remove Shared Schemas
```bash
# Remove shared drizzle schemas
rm -rf libs/drizzle/src/schemas/
```

#### Create Service-Specific Schemas
```bash
# Identity Service
mkdir -p apps/identity-service/src/infrastructure/database/schemas
mkdir -p apps/identity-service/src/infrastructure/database/repositories

# Learning Management Service  
mkdir -p apps/learning-management-service/src/infrastructure/database/schemas
mkdir -p apps/learning-management-service/src/infrastructure/database/repositories

# Payment Service
mkdir -p apps/payment-service/src/infrastructure/database/schemas
mkdir -p apps/payment-service/src/infrastructure/database/repositories

# And so on for each service...
```

### Step 2: Service-Specific Drizzle Configuration

#### Each service gets its own drizzle config:
```typescript
// apps/identity-service/drizzle.config.ts
export default defineConfig({
  schema: './src/infrastructure/database/schemas/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.IDENTITY_DB_HOST || 'localhost',
    port: parseInt(process.env.IDENTITY_DB_PORT || '5432'),
    user: process.env.IDENTITY_DB_USER || 'postgres',
    password: process.env.IDENTITY_DB_PASSWORD || 'password',
    database: process.env.IDENTITY_DB_NAME || 'edtech_identity_db',
  },
});
```

### Step 3: Data Synchronization Strategy

#### Event-Driven Data Consistency
```typescript
// When user is created in Identity Service
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: string,
  ) {}
}

// Learning Service listens and creates local user record
@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler {
  async handle(event: UserCreatedEvent) {
    // Create local user reference in learning database
    await this.localUserRepository.createUserReference({
      userId: event.userId,
      email: event.email,
      name: `${event.firstName} ${event.lastName}`,
      role: event.role,
    });
  }
}
```

#### GraphQL Federation for Data Access
```typescript
// Identity Service - owns user data
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  id: string;
  
  @Field()
  email: string;
  
  @Field()
  firstName: string;
}

// Learning Service - extends user with learning data
@Directive('@extends')
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  @Directive('@external')
  id: string;
  
  // Learning-specific fields
  @Field(() => [Course])
  enrolledCourses: Course[];
  
  @Field(() => TutorProfile, { nullable: true })
  tutorProfile?: TutorProfile;
}
```

## Updated Drizzle Library

The shared Drizzle library should only contain:
- **Common configuration utilities**
- **Database connection helpers**  
- **Migration utilities**
- **NOT schemas** (those belong to individual services)

```typescript
// libs/drizzle/src/drizzle-config.factory.ts
export class DrizzleConfigFactory {
  static createConfig(serviceName: string): DrizzleConfig {
    return {
      host: process.env[`${serviceName.toUpperCase()}_DB_HOST`] || 'localhost',
      port: parseInt(process.env[`${serviceName.toUpperCase()}_DB_PORT`] || '5432'),
      user: process.env[`${serviceName.toUpperCase()}_DB_USER`] || 'postgres',
      password: process.env[`${serviceName.toUpperCase()}_DB_PASSWORD`] || 'password',
      database: process.env[`${serviceName.toUpperCase()}_DB_NAME`] || `edtech_${serviceName}_db`,
    };
  }
}
```

## Environment Variables per Service

```bash
# Identity Service
IDENTITY_DB_HOST=localhost
IDENTITY_DB_PORT=5432
IDENTITY_DB_NAME=edtech_identity_db
IDENTITY_DB_USER=postgres
IDENTITY_DB_PASSWORD=password

# Learning Management Service
LEARNING_DB_HOST=localhost  
LEARNING_DB_PORT=5433
LEARNING_DB_NAME=edtech_learning_db
LEARNING_DB_USER=postgres
LEARNING_DB_PASSWORD=password

# Payment Service
PAYMENT_DB_HOST=localhost
PAYMENT_DB_PORT=5434
PAYMENT_DB_NAME=edtech_payment_db
PAYMENT_DB_USER=postgres
PAYMENT_DB_PASSWORD=password

# ... and so on for each service
```

## Benefits of Correct Architecture

### Microservices Principles
- ✅ **Data ownership**: Each service owns its data
- ✅ **Independence**: Services can evolve separately
- ✅ **Scaling**: Services can scale independently
- ✅ **Technology choice**: Each service can use different databases if needed

### Development Benefits
- ✅ **Clear boundaries**: No confusion about data ownership
- ✅ **Parallel development**: Teams can work independently
- ✅ **Easier testing**: Each service has its own test database
- ✅ **Deployment independence**: Services deploy separately

### Operational Benefits
- ✅ **Fault isolation**: Database issues don't affect all services
- ✅ **Performance optimization**: Each database optimized for its use case
- ✅ **Backup strategies**: Service-specific backup policies
- ✅ **Security**: Service-specific access controls

## Implementation Timeline

### Day 1: Database Separation
- [ ] Create service-specific database schemas
- [ ] Move schemas from shared library to individual services
- [ ] Update Drizzle configurations per service

### Day 2: Data Synchronization
- [ ] Implement event-driven data synchronization
- [ ] Create user reference tables in dependent services
- [ ] Test cross-service data consistency

### Day 3: GraphQL Federation Updates
- [ ] Update federation to handle distributed data
- [ ] Implement entity resolvers for cross-service queries
- [ ] Test federated queries

This fix ensures our microservices architecture follows proper database-per-service principles while maintaining functionality through events and federation.