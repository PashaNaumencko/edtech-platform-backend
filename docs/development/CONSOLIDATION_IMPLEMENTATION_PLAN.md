# Microservices Consolidation Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for consolidating our 10 microservices into 5 strategic business-aligned services.

## Phase 1: Foundation (Days 1-3)

### Step 1: Rename and Enhance Identity Service
**Goal**: Transform `user-service` into comprehensive `identity-service`

#### Actions:
1. **Rename service directory**
   ```bash
   mv apps/user-service apps/identity-service
   ```

2. **Update service configuration**
   - Update `nest-cli.json` project name
   - Update `package.json` scripts
   - Update GraphQL federation endpoint

3. **Enhance with auth capabilities**
   - Move auth logic from separate services
   - Consolidate user management
   - Add session management

#### Files to Update:
- `nest-cli.json`
- `package.json`
- `apps/identity-service/src/main-dev.ts`
- `graphql-api/gateway/index.js`

### Step 2: Create Learning Management Service
**Goal**: Merge tutor-matching logic with learning management

#### Actions:
1. **Create new service structure**
   ```bash
   mkdir -p apps/learning-management-service/src
   ```

2. **Migrate tutor-matching-service content**
   - Copy domain entities (Tutor, MatchingRequest)
   - Migrate use cases and repositories
   - Consolidate GraphQL schemas

3. **Add learning management domains**
   - Course entities
   - Lesson scheduling
   - Learning sessions

#### New Domain Structure:
```
apps/learning-management-service/src/
├── domain/
│   ├── tutors/              # From tutor-matching-service
│   ├── matching/            # From tutor-matching-service  
│   ├── courses/             # New learning domain
│   ├── lessons/             # New scheduling domain
│   └── sessions/            # New session management
├── application/
│   ├── tutors/              # Tutor use cases
│   ├── matching/            # Matching use cases
│   ├── courses/             # Course use cases
│   └── scheduling/          # Scheduling use cases
└── presentation/
    └── graphql/             # Unified GraphQL API
```

## Phase 2: Payment Service Implementation (Days 4-6)

### Step 3: Build Payment Service (Critical for MVP)
**Goal**: Implement comprehensive payment processing system

#### Core Payment Features:
1. **Stripe Connect Integration**
   - Platform account setup
   - Connected accounts for tutors
   - Payment processing with split payments

2. **Lesson Payment Flow**
   - Upfront payment from students
   - Automatic escrow holding
   - Release to tutors after lesson completion

3. **Platform Commission System**
   - 20% platform fee on all transactions
   - Automatic commission calculation
   - Revenue tracking and reporting

4. **Tutor Payout Management**
   - Scheduled payouts to tutors
   - Payout history and tracking
   - Tax document generation (1099)

#### Domain Entities:
```typescript
// Payment aggregate
export class Payment extends AggregateRoot {
  id: string;
  lessonId: string;
  studentId: string;
  tutorId: string;
  amount: number; // in cents
  platformFee: number; // 20% commission
  tutorEarnings: number; // 80% of payment
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId: string;
  createdAt: Date;
}

// Transaction aggregate
export class Transaction extends AggregateRoot {
  id: string;
  paymentId: string;
  type: TransactionType; // CHARGE, TRANSFER, REFUND
  amount: number;
  stripeTransactionId: string;
  status: TransactionStatus;
  metadata: Record<string, any>;
}

// Payout aggregate
export class Payout extends AggregateRoot {
  id: string;
  tutorId: string;
  amount: number;
  period: string; // e.g., "2024-01"
  stripePayoutId: string;
  status: PayoutStatus;
  scheduledAt: Date;
  completedAt?: Date;
}
```

#### Payment Use Cases:
```typescript
// Process lesson payment
export class ProcessLessonPaymentUseCase {
  async execute(dto: ProcessPaymentDto): Promise<Payment> {
    // 1. Create Stripe Payment Intent
    // 2. Hold payment in escrow
    // 3. Calculate platform commission (20%)
    // 4. Create payment record
    // 5. Emit payment events
  }
}

// Release payment to tutor
export class ReleaseTutorPaymentUseCase {
  async execute(lessonId: string): Promise<void> {
    // 1. Verify lesson completion
    // 2. Transfer 80% to tutor's connected account
    // 3. Keep 20% as platform commission
    // 4. Update payment status
    // 5. Emit payout events
  }
}

// Process tutor payout
export class ProcessTutorPayoutUseCase {
  async execute(tutorId: string, period: string): Promise<Payout> {
    // 1. Calculate total earnings for period
    // 2. Create Stripe payout to tutor's bank
    // 3. Generate tax documents
    // 4. Record payout transaction
  }
}
```

### Step 4: Build Communication Service
**Goal**: Create unified communication hub

#### Features to Implement:
1. **Real-time messaging**
   - WebSocket connections
   - Message persistence
   - Conversation management

2. **Notification system**
   - Push notifications
   - Email notifications
   - In-app notifications

3. **Video integration**
   - Twilio Video API integration
   - Session management
   - Recording capabilities

#### Domain Entities:
```typescript
// Message aggregate
export class Message extends AggregateRoot {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  timestamp: Date;
}

// Conversation aggregate
export class Conversation extends AggregateRoot {
  id: string;
  participants: string[];
  lessonId?: string;
  status: ConversationStatus;
  lastMessage?: Message;
}

// Notification aggregate
export class Notification extends AggregateRoot {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
}
```

## Phase 3: Communication and AI Services (Days 7-8)

### Step 5: Build AI Service
**Goal**: Consolidate AI and content management

#### Features to Implement:
1. **Content management**
   - Learning materials
   - Quizzes and assessments
   - Resource library

2. **AI learning assistant**
   - AWS Bedrock integration
   - Personalized recommendations
   - Learning path optimization

3. **Recommendation engine**
   - Tutor recommendations
   - Content suggestions
   - Learning analytics

#### Domain Entities:
```typescript
// Content aggregate
export class Content extends AggregateRoot {
  id: string;
  title: string;
  description: string;
  contentType: ContentType;
  subject: string;
  difficulty: DifficultyLevel;
  createdBy: string;
}

// AIInteraction aggregate
export class AIInteraction extends AggregateRoot {
  id: string;
  userId: string;
  sessionId: string;
  query: string;
  response: string;
  timestamp: Date;
}
```

## Phase 4: Analytics and Completion (Days 9-10)

### Step 6: Build Analytics Service
**Goal**: Comprehensive analytics and review system

#### Features to Implement:
1. **Review and rating system**
   - Tutor reviews
   - Course ratings
   - Feedback collection

2. **Learning analytics**
   - Progress tracking
   - Performance metrics
   - Learning insights

3. **Business intelligence**
   - Usage analytics
   - Revenue tracking
   - Growth metrics

#### Domain Entities:
```typescript
// Review aggregate
export class Review extends AggregateRoot {
  id: string;
  reviewerId: string;
  targetId: string;
  targetType: ReviewTargetType;
  rating: number;
  comment: string;
  isVerified: boolean;
}

// Analytics aggregate  
export class AnalyticsEvent extends AggregateRoot {
  id: string;
  userId: string;
  eventType: AnalyticsEventType;
  metadata: Record<string, any>;
  timestamp: Date;
}
```

## Technical Implementation Details

### Database Schema Updates

#### 1. Consolidated Drizzle Schemas
```typescript
// libs/drizzle/src/schemas/learning-management.schema.ts
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  tutorId: uuid('tutor_id').references(() => tutors.id),
  price: integer('price'), // in cents
  duration: integer('duration'), // in minutes
  maxStudents: integer('max_students'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').references(() => courses.id),
  studentId: uuid('student_id').references(() => users.id),
  tutorId: uuid('tutor_id').references(() => tutors.id),
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').notNull(),
  status: varchar('status', { length: 50 }).default('SCHEDULED'),
  meetingUrl: varchar('meeting_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### GraphQL Federation Updates

#### 1. Updated Gateway Configuration
```typescript
// graphql-api/gateway/index.js
const services = [
  { name: 'identity', url: 'http://localhost:3001/graphql' },
  { name: 'learning', url: 'http://localhost:3002/graphql' },
  { name: 'payment', url: 'http://localhost:3003/graphql' },
  { name: 'communication', url: 'http://localhost:3004/graphql' },
  { name: 'ai', url: 'http://localhost:3005/graphql' },
  { name: 'analytics', url: 'http://localhost:3006/graphql' },
];
```

#### 2. Cross-Service Entity References
```typescript
// Identity Service
@Directive('@key(fields: "id")')
export class User {
  @Field(() => ID)
  id: string;
  
  // Reference to learning service
  @Field(() => [Course])
  enrolledCourses: Course[];
}

// Learning Management Service  
@Directive('@key(fields: "id")')
export class Course {
  @Field(() => ID)
  id: string;
  
  // Reference to identity service
  @Field(() => User)
  @Directive('@external')
  instructor: User;
}
```

## Migration Commands

### Step-by-Step Migration Scripts

#### 1. Service Renaming
```bash
# Rename user-service to identity-service
cd /Users/pavlonaumenko/Documents/Projects/edtech-platform-backend
mv apps/user-service apps/identity-service

# Update nest-cli.json
# Update package.json scripts
# Update GraphQL gateway configuration
```

#### 2. Learning Management Service Creation
```bash
# Create new service
mkdir -p apps/learning-management-service/src

# Copy and enhance tutor-matching-service
cp -r apps/tutor-matching-service/src/* apps/learning-management-service/src/

# Add new domain modules
mkdir -p apps/learning-management-service/src/domain/courses
mkdir -p apps/learning-management-service/src/domain/lessons
mkdir -p apps/learning-management-service/src/domain/sessions
```

#### 3. Database Migration
```bash
# Generate new consolidated schemas
pnpm drizzle:generate

# Apply migrations
pnpm drizzle:migrate
```

## Validation and Testing

### 1. Service Health Checks
- [ ] Identity Service: User CRUD operations
- [ ] Learning Management: Tutor matching and course creation
- [ ] Communication: Message sending and notifications
- [ ] AI Service: Content management and recommendations
- [ ] Analytics: Review creation and analytics tracking

### 2. GraphQL Federation Testing
- [ ] Cross-service entity resolution
- [ ] Complex queries spanning multiple services
- [ ] Schema composition validation

### 3. Integration Testing
- [ ] End-to-end user journeys
- [ ] Service-to-service communication
- [ ] Event publishing and handling

## Success Metrics

### Development Metrics
- **Reduced complexity**: 50% fewer services (10 → 5)
- **Faster development**: Single domain contexts
- **Simplified deployment**: Fewer CI/CD pipelines

### Performance Metrics
- **Reduced latency**: Fewer network hops
- **Better resource utilization**: Optimized container usage
- **Improved reliability**: Fewer points of failure

### Business Metrics
- **Faster feature delivery**: Consolidated development
- **Easier maintenance**: Simplified architecture
- **Better developer experience**: Clear service boundaries

## Rollback Plan

If issues arise during consolidation:

1. **Keep original services**: Don't delete until migration is validated
2. **Feature flags**: Use flags to switch between old and new implementations
3. **Database rollback**: Maintain migration rollback scripts
4. **GraphQL gateway**: Can route to either old or new services

## Polyglot Database Architecture

### Database Technology Mapping

#### 1. **Identity Service → PostgreSQL**
- **Rationale**: Strong ACID properties, user authentication security
- **Data**: Users, sessions, auth tokens, profiles
- **Configuration**: Single PostgreSQL instance with encrypted connections

#### 2. **Learning Management Service → PostgreSQL**  
- **Rationale**: Complex relationships, transactional integrity for bookings
- **Data**: Tutors, students, courses, lessons, schedules, matching
- **Configuration**: Separate PostgreSQL instance, optimized for read-heavy workloads

#### 3. **Payment Service → PostgreSQL**
- **Rationale**: Financial compliance, audit trails, ACID transactions
- **Data**: Payments, transactions, invoices, payouts, Stripe data
- **Configuration**: High-security PostgreSQL with audit logging enabled

#### 4. **Communication Service → DynamoDB**
- **Rationale**: High-volume messages, real-time scaling, global distribution
- **Data**: Messages, conversations, notifications, video sessions
- **Configuration**: DynamoDB with streams enabled for real-time features

#### 5. **AI Service → Pinecone Vector DB + DynamoDB**
- **Rationale**: Vector similarity search + metadata storage
- **Data**: Content embeddings (Pinecone), AI interactions (DynamoDB)
- **Configuration**: Pinecone for vector search + DynamoDB for interaction history

#### 6. **Analytics Service → Amazon Timestream + PostgreSQL**
- **Rationale**: Time-series analytics + structured reporting
- **Data**: Learning metrics (Timestream), reviews and reports (PostgreSQL)
- **Configuration**: Timestream for real-time analytics + PostgreSQL for structured data

### Implementation Code Examples

#### DynamoDB Setup for Communication Service
```typescript
// apps/communication-service/src/infrastructure/database/dynamodb/setup.ts
export const createDynamoDBTables = async () => {
  // Messages table
  await dynamoClient.createTable({
    TableName: 'edtech-messages',
    KeySchema: [
      { AttributeName: 'conversationId', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'conversationId', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
  });
};
```

#### Vector Database Setup for AI Service
```typescript
// apps/ai-service/src/infrastructure/database/vector/pinecone.setup.ts
export const setupPineconeIndex = async () => {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  
  await pinecone.createIndex({
    name: 'edtech-content-embeddings',
    dimension: 1536, // OpenAI embedding dimension
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1',
      },
    },
  });
};
```

#### Timestream Setup for Analytics Service
```typescript
// apps/analytics-service/src/infrastructure/database/timestream/setup.ts
export const setupTimestreamDatabase = async () => {
  const timestreamClient = new TimestreamWriteClient({});
  
  // Create database
  await timestreamClient.createDatabase({
    DatabaseName: 'edtech_analytics',
  });
  
  // Create table for learning metrics
  await timestreamClient.createTable({
    DatabaseName: 'edtech_analytics',
    TableName: 'learning_metrics',
    RetentionProperties: {
      MemoryStoreRetentionPeriodInHours: 24, // 1 day in memory
      MagneticStoreRetentionPeriodInDays: 365, // 1 year in magnetic storage
    },
  });
};
```

### Benefits of Polyglot Architecture

#### Performance Optimization
- **PostgreSQL**: Sub-second queries for user authentication and financial transactions
- **DynamoDB**: Single-digit millisecond latency for real-time messaging
- **Vector DB**: Fast similarity search for AI-powered content recommendations
- **Timestream**: Optimized time-series queries for analytics dashboards

#### Scalability per Service
- **Identity**: Vertical scaling for secure user operations
- **Learning**: Read replicas for high-traffic tutor browsing
- **Payment**: ACID compliance with horizontal read scaling
- **Communication**: Auto-scaling for viral message traffic
- **AI**: Elastic vector search with cached embeddings
- **Analytics**: Serverless analytics queries with automatic scaling

#### Cost Optimization
- **Pay-per-request** for variable communication workloads
- **Reserved instances** for predictable user authentication loads
- **Serverless** for sporadic analytics queries
- **Vector DB** only for AI-specific workloads

## Conclusion

This consolidation plan reduces our microservices complexity by 40% while implementing optimal database technologies for each service. The polyglot approach ensures maximum performance, scalability, and cost-effectiveness while maintaining proper microservices boundaries and data ownership principles.