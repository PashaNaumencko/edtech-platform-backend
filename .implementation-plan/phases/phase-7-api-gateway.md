# Phase 7: API Gateway & GraphQL Layer
**Sprint 15-16 | Duration: 2 weeks**

## Phase Objectives
Implement a unified GraphQL API using AWS AppSync that provides a single entry point for all frontend applications, consolidating access to all microservices with type-safe schemas, real-time subscriptions, and optimized query resolution.

## Phase Dependencies
- **Prerequisites**: Phase 1-5 completed (all core microservices operational)
- **Requires**: All microservices APIs functional, authentication system, database schemas
- **Outputs**: Unified GraphQL API, AppSync configuration, optimized resolvers, frontend-ready endpoints

## Detailed Subphases

### 6.1 AWS AppSync Infrastructure Setup
**Duration: 2 days | Priority: Critical**

#### AppSync GraphQL API Configuration
```typescript
// GraphQL API via CDK
const graphqlApi = new GraphqlApi(this, 'EdTechGraphQLAPI', {
  name: 'edtech-platform-api',
  schema: SchemaFile.fromAsset('schema/schema.graphql'),
  authorizationConfig: {
    defaultAuthorization: {
      authorizationType: AuthorizationType.USER_POOL,
      userPoolConfig: {
        userPool: userPool,
      },
    },
    additionalAuthorizationModes: [
      {
        authorizationType: AuthorizationType.API_KEY,
      },
    ],
  },
  xrayEnabled: true,
  logConfig: {
    fieldLogLevel: FieldLogLevel.ALL,
  },
});
```

#### Data Source Configuration
- Lambda data sources for each microservice
- DynamoDB direct data sources (for chat/real-time features)
- HTTP data sources for external APIs
- Cognito authentication integration
- Caching configuration for performance

### 6.2 Comprehensive GraphQL Schema Design
**Duration: 4 days | Priority: Critical**

#### Core Type Definitions
```graphql
# User Types
type User {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  role: UserRole!
  profilePicture: String
  socialProviders: [SocialProvider!]!
  createdAt: AWSDateTime!
}

# Course Types
type Course {
  id: ID!
  title: String!
  description: String!
  subject: Subject!
  difficulty: DifficultyLevel!
  price: Money!
  instructor: User!
  lessons: [Lesson!]!
  enrollments: Int!
  rating: Rating
  reviews(limit: Int = 10, offset: Int = 0): ReviewConnection!
  createdAt: AWSDateTime!
}

# Tutor Types
type TutorProfile {
  id: ID!
  user: User!
  expertise: [Expertise!]!
  hourlyRate: Money!
  availability: [TimeSlot!]!
  rating: Rating
  certifications: [Certification!]!
  teachingStyle: [TeachingStyle!]!
  languages: [Language!]!
}

# Payment Types
type Payment {
  id: ID!
  amount: Money!
  currency: Currency!
  paymentType: PaymentType!
  status: PaymentStatus!
  commission: Money!
  tutorEarnings: Money!
  createdAt: AWSDateTime!
}

# Review Types
type Review {
  id: ID!
  reviewer: User!
  subject: ReviewSubject!
  overallRating: Int!
  categoryRatings: [CategoryRating!]!
  text: String!
  title: String
  helpfulnessScore: Int!
  createdAt: AWSDateTime!
}
```

#### Mutation Definitions
```graphql
type Mutation {
  # User Mutations
  createUser(input: CreateUserInput!): User!
  updateUser(input: UpdateUserInput!): User!
  linkSocialAccount(input: LinkSocialAccountInput!): User!
  
  # Course Mutations
  createCourse(input: CreateCourseInput!): Course!
  enrollInCourse(courseId: ID!): Enrollment!
  createLesson(input: CreateLessonInput!): Lesson!
  
  # Tutor Mutations
  createTutorProfile(input: CreateTutorProfileInput!): TutorProfile!
  updateAvailability(input: UpdateAvailabilityInput!): TutorProfile!
  
  # Payment Mutations
  processPayment(input: ProcessPaymentInput!): Payment!
  refundPayment(paymentId: ID!, reason: String): Payment!
  
  # Review Mutations
  createReview(input: CreateReviewInput!): Review!
  markReviewHelpful(reviewId: ID!): Review!
  
  # Chat Mutations
  sendMessage(input: SendMessageInput!): Message!
  createChatSession(input: CreateChatSessionInput!): ChatSession!
}
```

#### Query Definitions
```graphql
type Query {
  # User Queries
  me: User
  user(id: ID!): User
  
  # Course Queries
  course(id: ID!): Course
  courses(
    subject: Subject
    difficulty: DifficultyLevel
    limit: Int = 20
    offset: Int = 0
  ): CourseConnection!
  searchCourses(query: String!, filters: CourseFilters): CourseConnection!
  
  # Tutor Queries
  tutor(id: ID!): TutorProfile
  findTutors(criteria: TutorMatchingCriteria!): [TutorMatch!]!
  topRatedTutors(subject: Subject, limit: Int = 10): [TutorProfile!]!
  
  # Payment Queries
  paymentHistory(limit: Int = 20, offset: Int = 0): PaymentConnection!
  tutorEarnings(period: TimePeriod): EarningsReport!
  
  # Review Queries
  reviews(
    subjectId: ID!
    subjectType: ReviewSubjectType!
    limit: Int = 10
  ): ReviewConnection!
  
  # Analytics Queries
  userAnalytics: UserAnalytics!
  courseAnalytics(courseId: ID!): CourseAnalytics!
}
```

#### Subscription Definitions
```graphql
type Subscription {
  # Real-time Chat
  onMessageSent(sessionId: ID!): Message
    @aws_subscribe(mutations: ["sendMessage"])
    
  # Payment Updates
  onPaymentStatusChanged(userId: ID!): Payment
    @aws_subscribe(mutations: ["processPayment"])
    
  # Notification Updates
  onNotificationReceived(userId: ID!): Notification
    @aws_subscribe(mutations: ["sendNotification"])
    
  # Live Lesson Updates
  onLessonStatusChanged(lessonId: ID!): Lesson
    @aws_subscribe(mutations: ["updateLessonStatus"])
}
```

### 6.3 Lambda Resolver Implementation
**Duration: 4 days | Priority: Critical**

#### User Service Resolvers
```typescript
// User resolver Lambda function
export const userResolvers = {
  Query: {
    me: async (context: AppSyncResolverContext) => {
      const userId = context.identity.sub;
      return await userService.getUserById(userId);
    },
    
    user: async (context: AppSyncResolverContext) => {
      const { id } = context.arguments;
      return await userService.getUserById(id);
    },
  },
  
  Mutation: {
    createUser: async (context: AppSyncResolverContext) => {
      const { input } = context.arguments;
      return await userService.createUser(input);
    },
    
    updateUser: async (context: AppSyncResolverContext) => {
      const { input } = context.arguments;
      const userId = context.identity.sub;
      return await userService.updateUser(userId, input);
    },
  },
};
```

#### Course Service Resolvers
```typescript
export const courseResolvers = {
  Query: {
    course: async (context: AppSyncResolverContext) => {
      const { id } = context.arguments;
      return await courseService.getCourseById(id);
    },
    
    courses: async (context: AppSyncResolverContext) => {
      const { subject, difficulty, limit, offset } = context.arguments;
      return await courseService.searchCourses({
        subject,
        difficulty,
        limit,
        offset,
      });
    },
  },
  
  Course: {
    instructor: async (parent: Course) => {
      return await userService.getUserById(parent.instructorId);
    },
    
    rating: async (parent: Course) => {
      return await reviewService.getCourseRating(parent.id);
    },
    
    reviews: async (parent: Course, args: any) => {
      return await reviewService.getCourseReviews(parent.id, args);
    },
  },
};
```

#### Cross-Service Resolvers
```typescript
// Complex resolvers requiring multiple service calls
export const crossServiceResolvers = {
  Query: {
    recommendedCourses: async (context: AppSyncResolverContext) => {
      const userId = context.identity.sub;
      
      // Get user preferences
      const user = await userService.getUserById(userId);
      
      // Get user's learning history
      const enrollments = await courseService.getUserEnrollments(userId);
      
      // Get matching algorithm results
      const recommendations = await tutorMatchingService.getRecommendations({
        userId,
        preferences: user.learningPreferences,
        history: enrollments,
      });
      
      return recommendations;
    },
    
    tutorDashboard: async (context: AppSyncResolverContext) => {
      const tutorId = context.identity.sub;
      
      // Parallel service calls for dashboard data
      const [profile, earnings, reviews, upcomingLessons] = await Promise.all([
        tutorMatchingService.getTutorProfile(tutorId),
        paymentService.getTutorEarnings(tutorId),
        reviewService.getTutorReviews(tutorId),
        chatService.getUpcomingLessons(tutorId),
      ]);
      
      return {
        profile,
        earnings,
        reviews,
        upcomingLessons,
      };
    },
  },
};
```

### 6.4 Performance Optimization
**Duration: 2 days | Priority: High**

#### Caching Strategy
```typescript
// AppSync caching configuration
const cachingBehavior = {
  // User data - cache for 5 minutes
  userQueries: {
    ttl: 300,
    cachingKeys: ['$context.identity.sub'],
  },
  
  // Course data - cache for 1 hour
  courseQueries: {
    ttl: 3600,
    cachingKeys: ['$context.arguments.id'],
  },
  
  // Search results - cache for 15 minutes
  searchQueries: {
    ttl: 900,
    cachingKeys: ['$util.toJson($context.arguments)'],
  },
};
```

#### Query Optimization
- DataLoader pattern for N+1 query prevention
- Batch processing for multiple entity requests
- Connection-based pagination
- Field-level caching strategies
- Query complexity analysis and limits

#### Real-time Optimization
- Subscription filtering at the resolver level
- Connection pooling for database access
- Message batching for high-frequency updates
- Client-side subscription management

### 6.5 Security & Authorization
**Duration: 2 days | Priority: Critical**

#### Field-Level Authorization
```graphql
type User {
  id: ID!
  email: String! @aws_auth(cognito_groups: ["admin", "self"])
  firstName: String!
  lastName: String!
  # Private fields only accessible by user or admin
  phoneNumber: String @aws_auth(cognito_groups: ["admin"]) @aws_auth(cognito_user_pools: ["owner"])
}

type TutorProfile {
  id: ID!
  # Public fields
  expertise: [Expertise!]!
  rating: Rating
  # Private fields
  earnings: Money @aws_auth(cognito_groups: ["admin"]) @aws_auth(cognito_user_pools: ["owner"])
}
```

#### Rate Limiting
```typescript
const rateLimitingConfig = {
  // Per-user rate limits
  userLimits: {
    queries: 1000, // per hour
    mutations: 100, // per hour
    subscriptions: 10, // concurrent
  },
  
  // Per-IP rate limits
  ipLimits: {
    queries: 10000, // per hour
    mutations: 1000, // per hour
  },
  
  // Operation-specific limits
  operationLimits: {
    sendMessage: 60, // per minute
    createReview: 5, // per hour
    processPayment: 10, // per hour
  },
};
```

### 6.6 API Documentation & Testing
**Duration: 1 day | Priority: Medium**

#### GraphQL Introspection & Documentation
- Comprehensive schema documentation
- Example queries and mutations
- Testing playground configuration
- API versioning strategy
- Migration guides for schema changes

#### Testing Infrastructure
- Unit tests for all resolvers
- Integration tests for cross-service operations
- Performance testing for query optimization
- Security testing for authorization rules
- Load testing for subscription handling

## Success Criteria

### Technical Acceptance Criteria
- AppSync GraphQL API deploys successfully
- All resolvers function correctly and return expected data
- Authentication and authorization work across all operations
- Real-time subscriptions deliver messages reliably
- Performance meets response time requirements (< 500ms)
- Caching reduces backend service load significantly

### Integration Acceptance Criteria
- All microservices accessible through unified API
- Cross-service queries work without data inconsistencies
- Error handling provides meaningful feedback
- Rate limiting prevents abuse while allowing normal usage
- Monitoring and logging capture all necessary metrics

### Developer Experience Criteria
- Schema is intuitive and follows GraphQL best practices
- API documentation is comprehensive and up-to-date
- Testing playground enables easy API exploration
- Type safety is maintained across all operations
- Error messages are helpful for debugging

## Risk Mitigation

### Technical Risks
- **Query Complexity**: Implement query depth and complexity limits
- **N+1 Problems**: Use DataLoader pattern and batch processing
- **Cache Invalidation**: Implement smart cache invalidation strategies
- **Schema Evolution**: Plan for backward compatibility and versioning

### Performance Risks
- **Resolver Performance**: Optimize database queries and service calls
- **Subscription Scalability**: Implement connection limits and filtering
- **Memory Usage**: Monitor and optimize resolver memory consumption
- **Cold Start Latency**: Use provisioned concurrency for critical resolvers

### Security Risks
- **Authorization Bypass**: Thorough testing of field-level security
- **Data Exposure**: Audit all resolver responses for sensitive data
- **Rate Limiting**: Monitor and adjust limits based on usage patterns

## Key Performance Indicators

### Performance Metrics
- Query response time: < 500ms for 95% of requests
- Resolver execution time: < 200ms average
- Cache hit ratio: > 70%
- Subscription delivery latency: < 100ms

### Scalability Metrics
- Concurrent connections: Support 10,000+ active connections
- Queries per second: Handle 1,000+ QPS
- Memory usage per resolver: < 128MB
- CPU utilization: < 70% under normal load

### Developer Metrics
- API adoption rate by frontend teams
- Query success rate: > 99%
- Error resolution time: < 24 hours
- Documentation completeness: 100% coverage

## Phase Timeline

| Subphase | Duration | Dependencies | Critical Path |
|----------|----------|--------------|---------------|
| 6.1 AppSync Setup | 2 days | Phase 1-5 | Yes |
| 6.2 Schema Design | 4 days | 6.1 | Yes |
| 6.3 Resolver Implementation | 4 days | 6.2 | Yes |
| 6.4 Performance Optimization | 2 days | 6.3 | Yes |
| 6.5 Security & Authorization | 2 days | 6.4 | Yes |
| 6.6 Documentation & Testing | 1 day | 6.5 | No |

**Total Duration**: 15 days (3 weeks)  
**Buffer**: +3 days for optimization and testing

---

**Previous Phase**: [Phase 6: Admin Panel & Moderation System](phase-6-admin-panel.md)  
**Next Phase**: [Phase 8: Event-Driven Architecture](phase-8-event-driven.md) 