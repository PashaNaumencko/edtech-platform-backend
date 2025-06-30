# EdTech Platform Implementation Plan - Updated for GraphQL Federation

## Overview

This implementation plan reflects our **GraphQL Federation** architecture with AWS AppSync as the supergraph and microservices providing subgraphs, using **DDD + Clean Architecture + Use Case Pattern**.

**📅 PHASE REVIEW COMPLETED**: All phases (0-13) have been comprehensively reviewed and updated to ensure consistency with our latest architectural decisions including:

- ✅ **Phase Numbering**: Clean numeric sequence from 0-13 with all duplicates removed
- ✅ **Presentation Layer**: Renamed from "interfaces" to "presentation"
- ✅ **Unified DTO Approach**: Clear separation between use case request/response and API DTOs
- ✅ **GraphQL Architecture**: Central Lambda resolvers + microservice subgraphs clarified
- ✅ **Expanded Infrastructure**: Complete infrastructure component mapping per service
- ✅ **Use Case Pattern**: Consistent implementation across all services
- ✅ **Domain Events**: Proper event handling and side effects management
- ✅ **Admin Security Model**: Superadmin-only admin creation (no promotion mechanism)
- ✅ **Service Boundaries**: Clear User Service vs Tutor Matching Service responsibilities

## Architecture Summary

### GraphQL Federation Pattern

- **Supergraph**: AWS AppSync (unified GraphQL API)
- **Subgraphs**: Each microservice defines its domain schema
- **Resolvers**: Lambda functions call internal microservice APIs
- **Internal APIs**: HTTP REST with `/internal` prefix

### Core Architectural Decisions

- ❌ **No CQRS Pattern** - Use Case pattern with `.usecase.ts` suffix
- ✅ **DDD + Clean Architecture** - Domain-driven with layered approach
- ✅ **NestJS CQRS Integration** - AggregateRoot, events, and sagas
- ✅ **Expanded Infrastructure** - Specific components per service type
- ✅ **Standardized Folder Structure** - Complete microservice organization
- ✅ **Superadmin Security Model** - Admin creation restricted to superadmin operations only
- ✅ **Hybrid Service Architecture** - Keep user logic in User Service initially, extract tutor-specific logic later

### Updated Admin Security Model

**Admin Creation Policy**:
- ✅ **Superadmin-Only**: Only platform superadmin can create admin accounts
- ❌ **No Promotions**: Admin role cannot be obtained through normal role transitions
- ✅ **System Operations**: Admin creation bypasses normal business rules
- ✅ **Audit Trail**: All admin operations fully logged and traceable

**Security Benefits**:
- **Centralized Control**: Single point of admin access management
- **Attack Prevention**: Eliminates promotion-based security vulnerabilities
- **Compliance**: Clear audit trail for all administrative appointments

### Service Boundary Strategy

**Phase 1 Approach** (Current):
- ✅ **User Service**: Handles ALL user-related logic (including tutor-specific business rules)
- ✅ **Simplified Development**: Single service reduces initial complexity
- ✅ **Solid Foundation**: Comprehensive domain layer with proper patterns

**Future Migration** (Phase 2+):
- 🔄 **Tutor Matching Service**: Extract tutor-specific domain logic
- 🎯 **Better Separation**: Specialized tutoring business operations
- 📈 **Independent Scaling**: Dedicated tutor service optimization

### Implementation Phases

## Phase 0: Foundation ✅ COMPLETED

**Duration: 10 days | Status: COMPLETE**

- ✅ Project setup and monorepo structure
- ✅ AWS CDK infrastructure (Network, SharedServices, UserService stacks)
- ✅ Development environment and tooling
- ✅ Clean microservices architecture established
- ✅ Shared libraries with `@edtech/*` imports
- ✅ IUseCase interface and architectural patterns

## Phase 1: GraphQL Federation Foundation & User Service

**Duration: 20 days | Status: IN PROGRESS (Days 1-7 ✅ COMPLETED)**

### 1.1 GraphQL Federation Setup (4 days) ✅ COMPLETED

- ✅ **GraphQL Composition Tooling**
  - Set up Apollo Federation composition
  - Create schema composition pipeline
  - Implement subgraph validation
  - Set up schema registry for schema evolution
- ✅ **AppSync Infrastructure (CDK)**
  - Create AppSync GraphQL API stack
  - Configure Cognito authentication
  - Set up basic resolvers infrastructure
  - Implement error handling patterns

### 1.2 User Service Complete Implementation (12 days) - **IN PROGRESS**

- ✅ **Basic Domain Layer Implementation** (2 days) **COMPLETED**
  - User entity (AggregateRoot) with NestJS CQRS integration
  - Core value objects: Email, UserId, UserName, UserRole
  - Basic domain events: Created, Updated, Activated, Deactivated
  - Repository interfaces and UserFactory

- ✅ **Enhanced Domain Layer Implementation** (4 days) **DAY 7 COMPLETED**
  - ✅ Domain Services: UserDomainService with complex business logic
  - ✅ Business Rules: Centralized UserBusinessRules (superadmin-only admin creation)
  - ✅ Domain Errors: SuperadminOnlyOperationError and comprehensive error hierarchy
  - ✅ Professional Logging: NestJS Logger integration throughout domain services
  - **NEXT**: Specifications Pattern, Enhanced Value Objects, Advanced Domain Events

- **Application Layer Implementation** (2 days) - **UPCOMING**
  - Use cases leveraging enhanced domain services and business rules
  - Event handlers for side effects with domain service integration
  - Enhanced DTOs utilizing rich value objects

- **Infrastructure Layer Implementation** (3 days) - **UPCOMING**
  - PostgreSQL: Enhanced entities supporting specifications pattern
  - Redis: Caching with enhanced domain models
  - Cognito: Authentication services and guards
  - S3: Profile image uploads with domain validation
  - Email: Enhanced email templates with business rules
  - EventBridge: Publishing enhanced domain events

- **Presentation Layer Implementation** (1 day) - **UPCOMING**
  - Internal HTTP controllers with enhanced validation
  - GraphQL subgraph schema reflecting enhanced domain
  - Health check endpoints with enhanced diagnostics

### 1.3 GraphQL Resolvers & Testing (4 days) - **UPCOMING**

- **Lambda Resolvers Implementation** (2 days)
  - Enhanced User query/mutation resolvers using domain services
  - Federation resolvers leveraging enhanced domain features
  - Service-to-service authentication with domain error handling
- **Testing & Integration** (2 days)
  - Unit tests for enhanced domain components (95%+ coverage)
  - Integration tests for enhanced APIs and workflows
  - End-to-end GraphQL federation testing with enhanced features

## Phase 2: Learning Service Subgraph

**Duration: 14 days**

### 2.1 Learning Service Complete Implementation (10 days)

- **Domain Layer** (2 days)
  - Course, Lesson, Enrollment, Progress entities
  - CourseId, LessonId value objects
  - Domain events and business rules
- **Application Layer** (3 days)
  - Use cases: CreateCourse, EnrollStudent, TrackProgress, SearchCourses
  - Event handlers for enrollment workflows
  - Progress tracking logic
- **Infrastructure Layer** (4 days)
  - PostgreSQL: course data, enrollments, progress
  - S3: course materials, videos, documents
  - Redis: course catalog caching
  - Analytics: learning event tracking
  - EventBridge: learning event publishing
- **Presentation Layer** (1 day)
  - Internal APIs: `/internal/courses/*`, `/internal/lessons/*`, `/internal/enrollments/*`
  - GraphQL subgraph with federation to User service

### 2.2 Content Management & Lambda Resolvers (4 days)

- **File Upload Pipeline** (2 days)
  - Video processing and transcoding
  - Image optimization and thumbnails
  - CDN distribution setup
- **GraphQL Integration** (2 days)
  - Lambda resolvers for course operations
  - Federation with User service (course.tutor)
  - Search and filtering resolvers

## Phase 3: Content Service (S3 & Media Management)

**Duration: 10 days**

### 3.1 Content Service Implementation (7 days)

- **Domain Layer** (1 day)
  - File, Media entities
  - FileType, MimeType value objects
- **Application Layer** (2 days)
  - Use cases: UploadFile, ProcessMedia, GenerateThumbnail
  - File validation and virus scanning
- **Infrastructure Layer** (3 days)
  - S3: file storage with versioning
  - Media processing: video transcoding, image optimization
  - CDN: CloudFront distribution
  - Database: file metadata storage
- **Presentation Layer** (1 day)
  - Internal APIs: `/internal/files/*`, `/internal/media/*`
  - GraphQL subgraph for file operations

### 3.2 Integration & CDN Setup (3 days)

- **CDN Configuration** (2 days)
  - CloudFront setup for global distribution
  - Cache optimization and invalidation
- **Service Integration** (1 day)
  - Integration with Learning service
  - Lambda resolvers for media queries

## Phase 4: Payment Service Subgraph

**Duration: 12 days**

### 4.1 Payment Service Implementation (8 days)

- **Domain Layer** (2 days)
  - Payment, Invoice, Subscription entities
  - Money, PaymentMethod value objects
  - Payment domain events and business rules
- **Application Layer** (2 days)
  - Use cases: ProcessPayment, CreateSubscription, GenerateInvoice
  - Payment workflow sagas
  - Refund and dispute handling
- **Infrastructure Layer** (3 days)
  - PostgreSQL: payment records, transactions
  - Stripe: payment processing, webhooks
  - Redis: payment session caching
  - Email: payment receipts and notifications
  - EventBridge: payment event publishing
- **Presentation Layer** (1 day)
  - Internal APIs: `/internal/payments/*`, `/internal/billing/*`
  - Stripe webhook handling

### 4.2 Financial Features & Integration (4 days)

- **Subscription Management** (2 days)
  - Recurring payment handling
  - Subscription lifecycle management
  - Proration and upgrades/downgrades
- **GraphQL Integration** (2 days)
  - Lambda resolvers for payment operations
  - Federation with Learning service (course purchases)
  - Financial reporting resolvers

## Phase 5: Tutor Matching Service Subgraph

**Duration: 14 days**

**⚠️ Service Boundary Note**: This service will initially receive tutor-specific domain logic extracted from User Service. See [Service Boundary Analysis](../docs/architecture-decisions/service-boundary-analysis.md) for detailed migration strategy.

### 5.1 Tutor Matching Service Implementation (10 days)

- **Domain Layer** (2 days)
  - TutorProfile, Availability, Skill entities _(extracted from User Service)_
  - Rating, Schedule value objects
  - Tutor-specific business rules _(migrated from UserBusinessRules)_
  - Matching algorithm domain logic
- **Application Layer** (3 days)
  - Use cases: FindTutors, CalculateCompatibility, UpdateAvailability
  - Recommendation engine use cases
  - Matching algorithm implementation
  - Integration with User Service for basic user operations
- **Infrastructure Layer** (4 days)
  - PostgreSQL: tutor profiles, availability
  - Neo4j: skill relationships and graph matching
  - Redis: matching result caching
  - Analytics: matching performance tracking
  - EventBridge: matching event publishing
- **Presentation Layer** (1 day)
  - Internal APIs: `/internal/tutors/*`, `/internal/matching/*`
  - GraphQL subgraph with federation to User Service

### 5.2 Recommendation Engine & ML Integration (4 days)

- **Machine Learning Pipeline** (3 days)
  - Collaborative filtering algorithms
  - Content-based recommendation engine
  - Real-time preference learning
- **Advanced Features** (1 day)
  - A/B testing framework for matching algorithms
  - Performance optimization and caching

## Phase 6: Communication Service Subgraph

**Duration: 12 days**

### 6.1 Communication Service Implementation (8 days)

- **Domain Layer** (2 days)
  - Conversation, Message entities
  - MessageStatus, AttachmentType value objects
  - Communication domain events
- **Application Layer** (2 days)
  - Use cases: SendMessage, CreateConversation, HandleNotification
  - Real-time message delivery
- **Infrastructure Layer** (3 days)
  - Redis: message queues and real-time data
  - PostgreSQL: message history and conversations
  - Push Notifications: FCM/SNS integration
  - Email: email notifications
  - SMS: SMS notifications via Twilio/SNS
  - EventBridge: communication event publishing
- **Presentation Layer** (1 day)
  - Internal APIs: `/internal/messages/*`, `/internal/conversations/*`
  - WebSocket endpoints for real-time messaging

### 6.2 Real-time Features & Video Calling (4 days)

- **WebSocket Integration** (2 days)
  - AWS IoT Core for real-time messaging
  - Message queuing with SQS
  - Offline message synchronization
- **Video Calling Setup** (2 days)
  - WebRTC integration
  - TURN/STUN server configuration
  - Session recording capabilities

## Phase 7: Reviews Service Subgraph

**Duration: 8 days**

### 7.1 Reviews Service Implementation (6 days)

- **Domain Layer** (1 day)
  - Review, Rating entities
  - ReviewScore value objects
- **Application Layer** (2 days)
  - Use cases: CreateReview, CalculateRatings, ModerateReviews
  - Review aggregation and analytics
- **Infrastructure Layer** (2 days)
  - PostgreSQL: reviews and ratings
  - Redis: rating caches
  - EventBridge: review event publishing
- **Presentation Layer** (1 day)
  - Internal APIs: `/internal/reviews/*`
  - GraphQL subgraph with federation

### 7.2 Rating Algorithms & Integration (2 days)

- **Rating Calculation** (1 day)
  - Weighted average algorithms
  - Spam and fraud detection
- **Service Integration** (1 day)
  - Federation with User, Learning, Tutor services
  - Lambda resolvers for review operations

## Phase 8: Notification Service

**Duration: 6 days**

### 8.1 Notification Service Implementation (4 days)

- **Domain Layer** (1 day)
  - Notification, Template entities
  - NotificationType, Channel value objects
- **Application Layer** (1 day)
  - Use cases: SendNotification, ManagePreferences
- **Infrastructure Layer** (2 days)
  - PostgreSQL: notification history and preferences
  - Push Notifications: multi-platform support
  - Email: templated notifications
  - SMS: SMS notification delivery
  - EventBridge: notification event handling

### 8.2 Cross-Service Integration (2 days)

- **Event Subscribers** (1 day)
  - Listen to events from all services
  - Notification triggering logic
- **Delivery Optimization** (1 day)
  - Batch processing and rate limiting
  - Delivery status tracking

## Phase 9: Analytics Service Subgraph

**Duration: 8 days**

### 9.1 Analytics Service Implementation (6 days)

- **Domain Layer** (1 day)
  - Event, Metric, Report entities
  - EventType, MetricValue value objects
- **Application Layer** (2 days)
  - Use cases: TrackEvent, GenerateReport, CalculateMetrics
  - Real-time analytics processing
- **Infrastructure Layer** (2 days)
  - DynamoDB: event storage and time-series data
  - Redshift: data warehousing for reports
  - Analytics: event processing pipelines
  - EventBridge: analytics event collection
- **Presentation Layer** (1 day)
  - Internal APIs: `/internal/events/*`, `/internal/metrics/*`
  - GraphQL subgraph for analytics data

### 9.2 Business Intelligence & Dashboards (2 days)

- **Report Generation** (1 day)
  - Automated business reports
  - Performance metrics calculation
- **Dashboard APIs** (1 day)
  - Real-time dashboard data
  - Administrative analytics

## Phase 10: AI Service Subgraph

**Duration: 10 days**

### 10.1 AI Service Implementation (7 days)

- **Domain Layer** (2 days)
  - Recommendation, Personalization entities
  - LearningPath, Preference value objects
  - AI algorithm domain logic
- **Application Layer** (2 days)
  - Use cases: GenerateRecommendations, PersonalizeLearning
  - Adaptive learning algorithms
- **Infrastructure Layer** (2 days)
  - Vector Database: embeddings and similarity search
  - DynamoDB: AI model data and user preferences
  - Analytics: AI performance tracking
- **Presentation Layer** (1 day)
  - Internal APIs: `/internal/recommendations/*`, `/internal/ai/*`
  - GraphQL subgraph for AI features

### 10.2 ML Pipeline & Advanced Features (3 days)

- **Machine Learning Pipeline** (2 days)
  - Learning path recommendation engine
  - Content personalization algorithms
  - Performance prediction models
- **AI Integration** (1 day)
  - Cross-service AI feature integration
  - Lambda resolvers for AI operations

## Phase 11: Security & Compliance

**Duration: 8 days**

### 11.1 Security Hardening (5 days)

- **API Security** (3 days)
  - Rate limiting and DDoS protection
  - Input validation and sanitization
  - SQL injection prevention
  - XSS protection across all services
- **Service-to-Service Security** (2 days)
  - JWT token validation hardening
  - Network security and VPC isolation
  - Secrets management with AWS Secrets Manager
- **Admin Security Audit** (included)
  - Verify superadmin-only admin creation
  - Audit admin operation logging
  - Test unauthorized access prevention

### 11.2 Compliance Implementation (3 days)

- **Data Protection** (2 days)
  - GDPR compliance across all services
  - Data encryption at rest and in transit
  - Privacy controls and data anonymization
- **Audit & Monitoring** (1 day)
  - Comprehensive audit logging (including admin operations)
  - Security monitoring and alerting

## Phase 12: Testing & Quality Assurance

**Duration: 12 days**

### 12.1 Comprehensive Testing Infrastructure (8 days)

- **Unit Testing** (3 days)
  - Domain layer tests for all services (including enhanced domain features)
  - Use case testing with mocked dependencies
  - Value object and entity validation tests
  - Admin security model testing
- **Integration Testing** (3 days)
  - Database integration tests
  - External service integration tests
  - GraphQL federation integration tests
  - Service boundary integration tests
- **End-to-End Testing** (2 days)
  - Full user journey testing
  - Cross-service workflow testing
  - Admin operation security testing

### 12.2 Performance & Load Testing (4 days)

- **Load Testing** (2 days)
  - Service-level load testing
  - GraphQL federation performance testing
  - Database performance under load
- **Quality Assurance** (2 days)
  - Code review processes
  - Static analysis and security scanning
  - Documentation completion

## Phase 13: Production Deployment & Launch

**Duration: 10 days**

### 13.1 Production Infrastructure (6 days)

- **Multi-AZ Deployment** (4 days)
  - High availability setup for all services
  - Auto-scaling configuration
  - Load balancer configuration
  - Database read replicas and failover
- **Monitoring & Alerting** (2 days)
  - CloudWatch dashboards for all services
  - Comprehensive alerting setup (including admin operation monitoring)
  - Log aggregation and analysis

### 13.2 Go-Live Preparation (4 days)

- **Performance Optimization** (2 days)
  - Final performance tuning
  - Cache optimization
  - Database query optimization
- **Launch Checklist** (2 days)
  - Security audit and penetration testing (including admin security)
  - Backup and recovery testing
  - Support procedures and runbooks
  - Final data migration and go-live
  - Superadmin account setup and verification

## Updated Timeline: ~144 days (29 weeks / 7 months)

**Timeline Changes:**

- **Phase 1 Extended:** +4 days (16 → 20 days) for enhanced domain layer integration
- **Total Project:** +4 days (140 → 144 days)
- **Rationale:** Enhanced domain foundation with secure admin model accelerates subsequent phases

**Latest Updates:**
- ✅ **Admin Security Model**: Superadmin-only admin creation implemented
- ✅ **Service Boundaries**: User Service keeps all logic initially for faster development
- ✅ **Enhanced Domain**: Day 7 completed with domain services, business rules, and comprehensive error handling
- ✅ **Documentation**: Business processes and architecture decisions documented

## Service Dependencies & Implementation Order

```mermaid
graph TD
    P0[Phase 0: Foundation] --> P1[Phase 1: User Service + Enhanced Domain + Admin Security - 20 days]
    P1 --> P2[Phase 2: Learning Service]
    P1 --> P3[Phase 3: Content Service]
    P2 --> P4[Phase 4: Payment Service]
    P2 --> P5[Phase 5: Tutor Matching with Service Migration]
    P1 --> P6[Phase 6: Communication]
    P5 --> P7[Phase 7: Reviews Service]
    P1 --> P8[Phase 8: Notification Service]
    P2 --> P9[Phase 9: Analytics Service]
    P9 --> P10[Phase 10: AI Service]
    P10 --> P11[Phase 11: Security & Compliance + Admin Audit]
    P11 --> P12[Phase 12: Testing & QA + Service Boundary Testing]
    P12 --> P13[Phase 13: Production Deployment + Superadmin Setup]
```

---

_Last Updated: Domain Layer Improvements - Days 5-7 Complete + Admin Security Model + Service Boundary Decisions_
