# EdTech Platform - Complete Architecture & Domain Report

## Executive Summary

This document provides a comprehensive overview of the edtech platform architecture, derived from extensive event storming sessions and technical architecture discussions. The platform follows a microservices architecture with event-driven communication, hosted on AWS infrastructure.

**Platform Type:** Student-Tutor Marketplace with Live Learning Capabilities
**Architecture Pattern:** Domain-Driven Design with Microservices
**Infrastructure:** AWS Cloud with Serverless Containers
**Revenue Model:** 20% Commission on Successful Lessons

---

## Table of Contents

1. [Domain Architecture](#domain-architecture)
2. [Technical Architecture](#technical-architecture)
3. [Infrastructure Decisions](#infrastructure-decisions)
4. [Microservices Design](#microservices-design)
5. [Real-Time Features](#real-time-features)
6. [Security & Authentication](#security--authentication)
7. [Event-Driven Communication](#event-driven-communication)
8. [Database Strategy](#database-strategy)
9. [External Integrations](#external-integrations)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Domain Architecture

### Event Storming Results

Through comprehensive event storming sessions, we identified four core bounded contexts that represent the complete user journey:

### Context 1: Identity and Student Onboarding

**Purpose:** User registration, email verification, and student profile creation with COPPA compliance

**Key Aggregates:**

- `User Account` - Core identity management
- `Student Profile` - Student-specific information
- `Parent Consent` - COPPA compliance for minors

**Critical Domain Events:**

- `AccountCreated` - User successfully registered
- `EmailVerificationSent` - Verification email dispatched
- `AccountActivated` - Email verification completed
- `StudentProfileCreated` - Profile information collected
- `MinorStatusDetected` - Student under 18 identified
- `ParentConsentRequired` - COPPA compliance triggered
- `ParentConsentGranted` - Legal guardian approval received
- `StudentReadyForPlatform` - Complete onboarding finished

**Business Policies:**

- Email Uniqueness Policy
- COPPA Compliance (Under 18) Policy
- Parent Consent Required Policy

**External Dependencies:**

- AWS Cognito (Authentication)
- AWS SES (Email Service)

### Context 2: Tutor Onboarding and Verification

**Purpose:** Tutor qualification verification and approval process with quality control

**Key Aggregates:**

- `Tutor Profile` - Tutor personal and professional information
- `Qualification Portfolio` - Credentials and experience
- `Admin Review Session` - Verification workflow

**Critical Domain Events:**

- `TutorProfileCreated` - Basic profile established
- `QualificationsAdded` - Credentials submitted
- `ReviewRequested` - Submitted for admin approval
- `AddedToAdminReviewQueue` - Queued for review
- `AdminReviewStarted` - Review process initiated
- `QualificationsAssessed` - Credentials evaluated
- `TutorApproved` - Verification successful
- `TutorRejected` - Verification failed
- `TutorAvailableForMatching` - Ready for student connections

**Business Policies:**

- Complete Profile Required Policy
- Admin Review Required Policy
- 24-hour Review SLA Policy
- Qualification Assessment Criteria Policy

**External Dependencies:**

- Admin Review Dashboard
- Tutor Notification Service

### Context 3: Matching and Communication

**Purpose:** Smart search algorithms, connection requests, and initial communication setup

**Key Aggregates:**

- `Search Session` - Search execution and results
- `Connection Request` - Student-tutor connection attempts
- `Student-Tutor Match` - Established relationships
- `Chat Channel` - Communication infrastructure

**Critical Domain Events:**

- `SmartSearchExecuted` - Search algorithm triggered
- `TutorsRankedByAlgorithm` - ML-powered ranking applied
- `SearchResultsGenerated` - Results prepared for display
- `ConnectionRequestSent` - Student initiates contact
- `TutorNotified` - Push notification dispatched
- `ConnectionRequestViewed` - Tutor reviews request
- `ConnectionAccepted` - Tutor accepts connection
- `MatchEstablished` - Relationship confirmed
- `ChatChannelCreated` - Communication enabled

**Business Policies:**

- Smart Ranking Algorithm Policy
- Subject Matching Policy
- 24-hour Request Expiry Policy
- Auto Chat Creation on Match Policy

**External Dependencies:**

- Search Engine with Ranking (Elasticsearch)
- Push Notification Service
- Chat Infrastructure Service

### Context 4: Booking Lesson and Payment

**Purpose:** End-to-end lesson delivery with payment processing and commission handling

**Key Aggregates:**

- `Lesson Booking` - Scheduling and reservation
- `Video Session` - Live lesson infrastructure
- `Lesson Chat` - Real-time communication during lessons
- `Payment Transaction` - Financial processing

**Critical Domain Events:**

- `BookingInitiated` - Student starts booking process
- `TimeSlotReserved` - Schedule slot allocated
- `PaymentProcessed` - Transaction completed
- `LessonConfirmed` - Booking finalized
- `VideoRoomCreated` - Technical infrastructure prepared
- `BothParticipantsJoined` - Lesson participants connected
- `LessonStarted` - Active learning session begun
- `RealtimeMessageSent` - Chat during lesson
- `LessonFileShared` - Resource sharing during session
- `LessonCompleted` - Session ended
- `PaymentReleased` - Funds released to tutor
- `TutorPayoutScheduled` - Commission calculated and payout initiated

**Business Policies:**

- Payment Required Before Confirmation Policy
- Auto Video Room Creation Policy
- Auto-start When Both Join Policy
- Real-time Message Delivery Policy
- Pay Tutor After Completion Policy
- 20% Platform Commission Policy

**External Dependencies:**

- Stripe Payment Processing
- Agora.io Video Platform
- WebSocket Real-time Messaging
- AWS S3 File Storage

### Cross-Context Event Flow

```
Context 1 (Identity) → Context 3 (Matching)
"StudentReadyForPlatform" → Enables search functionality

Context 2 (Tutor) → Context 3 (Matching)
"TutorAvailableForMatching" → Appears in search results

Context 3 (Matching) → Context 4 (Lessons)
"MatchEstablished" → Enables lesson booking

Context 4 (Lessons) → Future Analytics
"LessonCompleted" → Learning insights and platform metrics
```

---

## Technical Architecture

### Core Architecture Pattern

**Selected Pattern:** Direct API Gateway + Microservices (Not BFF)

**Rationale:**

- Simpler than Backend-for-Frontend patterns
- Reduced latency (no extra network hops)
- Industry standard used by Netflix, Spotify, Airbnb
- Easier to maintain and debug
- Standard tooling compatibility

### Dual Port Architecture

Each microservice implements two distinct APIs:

**Port 3000 - Client-Facing API:**

- Public internet access
- Authentication required
- Rate limiting applied
- CORS policies enforced
- Input validation and sanitization
- Sanitized responses (no internal data)

**Port 3001 - Internal API:**

- VPC-only access
- No authentication (trusted network)
- No rate limiting
- Full data access including sensitive information
- Batch operations support
- Performance optimized for service-to-service calls

### Network Architecture

```
Internet → Public ALB (Port 80) → Service:3000 (Client API)
                                      ↓
Internal ALB (VPC only) → Service:3001 (Internal API) ← Other Services
```

---

## Infrastructure Decisions

### AWS Core Services

**Compute:**

- **ECS Fargate** - Serverless containers for microservices
  - Rationale: No infrastructure management, auto-scaling, pay-per-use
  - Cost-effective for startup growth trajectory

**Networking:**

- **Application Load Balancer (ALB)** - Routes traffic to microservices
- **VPC with Private Subnets** - Network isolation for internal APIs
- **Security Groups** - Network-level access control

**Storage:**

- **ElastiCache Redis** - Simple caching layer
- **S3** - File storage for lesson materials and recordings
- **CloudFront** - Global content delivery network

**Messaging:**

- **EventBridge** - Async messaging between services
- **API Gateway** - REST + WebSocket endpoints

**Monitoring & Deployment:**

- **CloudWatch** - Logging and monitoring
- **CDK** - Infrastructure as Code
- **AWS Systems Manager** - Configuration management

### Caching Strategy

**Three-Tier Caching Approach:**

- Course catalog: 30 minutes (infrequent changes)
- User progress: 10 minutes (regular updates)
- Live session data: 5 minutes (highly dynamic)

**Cache Invalidation:**

- Event-driven for critical updates
- TTL-based for most data
- Pattern-based for bulk invalidation

---

## Microservices Design

### Service 1: Identity Service (Context 1)

**Responsibilities:**

- User registration and email verification
- Student profile management
- COPPA compliance workflow
- Parent consent management

**Client API (Port 3000):**

```
POST /auth/register
POST /auth/verify-email
GET /users/profile
POST /students/profile
PUT /students/profile
GET /students/consent-status
```

**Internal API (Port 3001):**

```
GET /internal/users/{id}
POST /internal/users/{id}/activate
GET /internal/students/{id}/consent-status
POST /internal/students/{id}/consent-granted
GET /internal/users/search?email={email}
```

**Events Published:**

- AccountCreated
- StudentReadyForPlatform
- ParentConsentGranted

**Database:** PostgreSQL for ACID compliance (user data integrity)

### Service 2: Tutor Service (Context 2)

**Responsibilities:**

- Tutor profile and qualification management
- Admin review workflow coordination
- Verification status tracking

**Client API (Port 3000):**

```
POST /tutors/profile
PUT /tutors/profile
POST /tutors/qualifications
POST /tutors/submit-review
GET /tutors/status
GET /tutors/profile
```

**Internal API (Port 3001):**

```
GET /internal/tutors/{id}/verification-status
POST /internal/tutors/{id}/approve
POST /internal/tutors/{id}/reject
GET /internal/tutors/available-for-matching
GET /internal/tutors/search
```

**Events Published:**

- TutorAvailableForMatching
- TutorApproved
- ReviewRequested

**Events Consumed:**

- AccountCreated (from Identity Service)

**Database:** PostgreSQL for structured tutor data and qualifications

### Service 3: Matching Service (Context 3)

**Responsibilities:**

- Smart search with ML-powered ranking
- Connection request management
- Match establishment
- Initial chat channel creation

**Client API (Port 3000):**

```
GET /search/tutors?subject={subject}&level={level}
POST /connections/request
GET /connections/incoming
POST /connections/{id}/accept
POST /connections/{id}/reject
GET /matches
```

**Internal API (Port 3001):**

```
POST /internal/search/reindex-tutor
GET /internal/matches/{studentId}/{tutorId}
POST /internal/matches/establish
GET /internal/connections/analytics
```

**Events Published:**

- MatchEstablished
- ChatChannelCreated
- ConnectionRequestSent

**Events Consumed:**

- StudentReadyForPlatform
- TutorAvailableForMatching

**Database:**

- Elasticsearch for search functionality
- PostgreSQL for connection requests and matches

### Service 4: Lesson Service (Context 4)

**Responsibilities:**

- Lesson booking and scheduling
- Video session coordination
- Real-time chat during lessons
- File sharing capabilities

**Client API (Port 3000):**

```
POST /lessons/book
GET /lessons/{id}/status
POST /lessons/{id}/join
GET /lessons/{id}/chat-token
POST /lessons/{id}/files/upload
GET /lessons/upcoming
POST /lessons/{id}/end
```

**Internal API (Port 3001):**

```
POST /internal/lessons/confirm-payment
GET /internal/lessons/{id}/participants
GET /internal/lessons/analytics-data
POST /internal/lessons/complete
```

**Events Published:**

- LessonConfirmed
- LessonStarted
- LessonCompleted
- LessonFileShared

**Events Consumed:**

- MatchEstablished
- PaymentProcessed

**Database:** PostgreSQL for lesson data, MongoDB for chat messages

### Service 5: Payment Service (Context 4)

**Responsibilities:**

- Payment processing via Stripe
- Commission calculation (20%)
- Tutor payout scheduling
- Transaction audit trail

**Client API (Port 3000):**

```
POST /payments/process
GET /payments/{id}/status
GET /payments/history
GET /payments/methods
```

**Internal API (Port 3001):**

```
POST /internal/payments/release
POST /internal/payouts/schedule
GET /internal/payments/commission-report
POST /internal/payments/refund
```

**Events Published:**

- PaymentProcessed
- PaymentReleased
- TutorPayoutScheduled

**Events Consumed:**

- LessonCompleted

**Database:** PostgreSQL for transaction integrity and audit compliance

---

## Real-Time Features

### WebSocket Implementation

**Technology:** Socket.io with Redis adapter for horizontal scaling

**Real-Time Events:**

```javascript
// Lesson Context
'lesson:booking-confirmed' - Booking successful
'lesson:participant-joined' - User joined video session
'lesson:started' - Lesson began
'lesson:message-sent' - Chat message during lesson
'lesson:file-shared' - Resource shared
'lesson:ended' - Session completed

// Matching Context
'connection:request-received' - New connection request
'connection:accepted' - Connection approved
'match:established' - Successful match

// General
'notification:new' - Push notification received
```

### Video Integration (Agora.io)

**Implementation:**

- Token-based authentication
- Automatic room creation on lesson confirmation
- Built-in recording for later review
- Screen sharing capabilities
- Global CDN for low latency

**Video Session Flow:**

1. Lesson confirmed → Generate Agora token
2. Both participants join → Start recording
3. Session active → Real-time chat + file sharing
4. Lesson ends → Stop recording, save to S3

---

## Security & Authentication

### Service-to-Service Authentication

**Method:** AWS IAM Authentication with Signature V4

**Benefits:**

- No manual credential management
- ECS task roles handle authentication automatically
- Built-in audit trail via CloudTrail
- Fine-grained permissions per service
- Zero credential rotation overhead

**Implementation:**

```javascript
// Example service-to-service call
const response = await AWS.config.credentials.signRequest({
  method: "POST",
  url: "http://tutor-service:3001/internal/tutors/search",
  body: JSON.stringify(searchParams),
  headers: {
    "Content-Type": "application/json",
    "X-Correlation-ID": correlationId,
  },
});
```

### Client Authentication

**Primary:** AWS Cognito User Pools

- JWT token-based authentication
- Multi-factor authentication support
- Social login integration ready
- Password policies and security

**API Security:**

- Rate limiting on public APIs
- Input validation and sanitization
- CORS policies for web clients
- Request/response logging for audit

---

## Event-Driven Communication

### Event Schema Design

**Standard Event Structure:**

```json
{
  "eventId": "uuid",
  "eventType": "StudentReadyForPlatform",
  "aggregateId": "student-123",
  "aggregateType": "Student",
  "eventVersion": "1.0",
  "timestamp": "2025-09-20T10:30:00Z",
  "correlationId": "uuid",
  "causationId": "uuid",
  "metadata": {
    "source": "identity-service",
    "userId": "user-456"
  },
  "data": {
    "studentId": "student-123",
    "profileComplete": true,
    "parentConsentReceived": true,
    "subjectsOfInterest": ["mathematics", "science"]
  }
}
```

### Event Bus Configuration

**AWS EventBridge Custom Bus:**

- Separate bus for domain events
- Event replay capability
- Dead letter queues for failed processing
- Event archiving for audit compliance

**Event Routing Rules:**

```json
{
  "Rules": [
    {
      "Name": "StudentReadyForMatching",
      "EventPattern": {
        "source": ["identity-service"],
        "detail-type": ["StudentReadyForPlatform"]
      },
      "Targets": [
        {
          "Id": "MatchingService",
          "Arn": "arn:aws:ecs:region:account:service/matching-service"
        }
      ]
    }
  ]
}
```

---

## Database Strategy

### Database per Service Pattern

Each microservice owns its data with appropriate database technology:

**Identity Service:** PostgreSQL

- ACID compliance for user data
- Strong consistency for authentication
- Referential integrity for parent-child relationships

**Tutor Service:** PostgreSQL

- Complex relational data (qualifications, experience)
- Admin workflow state management
- Audit trail requirements

**Matching Service:**

- Elasticsearch: Search and ranking algorithms
- PostgreSQL: Connection requests and established matches

**Lesson Service:**

- PostgreSQL: Lesson bookings and scheduling
- MongoDB: Chat messages (document-based, high write volume)

**Payment Service:** PostgreSQL

- Financial data requiring ACID properties
- Compliance and audit requirements
- Transaction integrity critical

### Data Consistency Strategy

**Pattern:** Eventual Consistency with Compensating Actions

**Example:** Lesson Booking Flow

1. Payment Service processes payment
2. Publishes `PaymentProcessed` event
3. Lesson Service receives event and confirms booking
4. If lesson confirmation fails, Payment Service receives `BookingFailed` event and processes refund

---

## External Integrations

### Payment Processing (Stripe)

**Integration Points:**

- Customer creation and management
- Payment method storage
- One-time payments for lessons
- Subscription management (future feature)
- Webhook handling for payment status updates
- Payout management for tutors

**Security:**

- Stripe Connect for marketplace payments
- PCI compliance through Stripe
- Webhook signature verification

### Video Platform (Agora.io)

**Features Utilized:**

- Video calling with recording
- Screen sharing for lessons
- Real-time messaging (backup to WebSocket)
- Global CDN for low latency
- Token-based security

**Integration Flow:**

1. Lesson confirmed → Generate Agora token
2. Store token securely with lesson data
3. Clients retrieve token via authenticated API
4. Video session managed by Agora infrastructure

### Email Service (AWS SES)

**Use Cases:**

- Email verification during registration
- Parent consent requests
- Lesson confirmations and reminders
- Payment receipts
- Platform notifications

### File Storage (AWS S3)

**Organization:**

```
bucket-name/
├── lesson-files/
│   ├── {lesson-id}/
│   │   ├── shared-documents/
│   │   └── recordings/
├── user-avatars/
└── tutor-qualifications/
```

**Security:**

- Presigned URLs for secure uploads
- CloudFront for fast global delivery
- Lifecycle policies for cost optimization

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-8)

**Milestone:** Basic platform functionality

**Sprint 1-2: Infrastructure Setup**

- AWS account setup and VPC configuration
- ECS cluster and service definitions
- RDS instances for each service
- EventBridge custom bus setup
- Basic CI/CD pipeline with CDK

**Sprint 3-4: Identity Service**

- User registration and email verification
- Student profile management
- COPPA compliance workflow
- AWS Cognito integration
- Basic authentication middleware

**Sprint 5-6: Tutor Service**

- Tutor profile creation and management
- Qualification submission
- Admin review dashboard (basic)
- Integration with Identity Service events

**Sprint 7-8: Basic Matching**

- Simple tutor search (no ML ranking yet)
- Connection request workflow
- Basic chat channel creation
- Integration testing across services

### Phase 2: Core Product (Weeks 9-16)

**Milestone:** End-to-end lesson delivery

**Sprint 9-10: Lesson Booking**

- Lesson scheduling interface
- Time slot management
- Basic payment integration with Stripe
- Lesson confirmation workflow

**Sprint 11-12: Video Integration**

- Agora.io integration
- Video room creation and management
- Recording functionality
- File sharing during lessons

**Sprint 13-14: Real-time Features**

- WebSocket implementation for chat
- Real-time notifications
- Live lesson status updates
- Connection management

**Sprint 15-16: Payment Processing**

- Complete Stripe integration
- Commission calculation and handling
- Tutor payout system
- Payment reconciliation

### Phase 3: Platform Optimization (Weeks 17-24)

**Milestone:** Production-ready platform

**Sprint 17-18: Search Enhancement**

- Elasticsearch integration
- ML-powered ranking algorithms
- Advanced filtering capabilities
- Search analytics

**Sprint 19-20: Mobile Optimization**

- API optimizations for mobile
- Offline capability preparation
- Push notification system
- Mobile-specific video optimizations

**Sprint 21-22: Analytics & Monitoring**

- Comprehensive logging and monitoring
- Business analytics dashboard
- Performance optimization
- Error tracking and alerting

**Sprint 23-24: Security & Compliance**

- Security audit and penetration testing
- Data privacy compliance (GDPR/COPPA)
- Performance testing and optimization
- Production deployment preparation

### Phase 4: Advanced Features (Post-Launch)

**Roadmap for future development:**

- AI-powered tutor recommendations
- Advanced learning analytics
- Mobile applications (iOS/Android)
- Multi-language support
- Advanced payment features (subscriptions, packages)
- Parent/admin dashboards
- Learning path recommendations

---

## Technology Stack Summary

### Backend Services

- **Framework:** NestJS with TypeScript
- **Runtime:** Node.js 18 LTS
- **Package Manager:** npm/yarn
- **API Documentation:** Swagger/OpenAPI

### Databases

- **Primary:** PostgreSQL 14+ (AWS RDS)
- **Search:** Elasticsearch 7.x (AWS OpenSearch)
- **Cache:** Redis 6+ (AWS ElastiCache)
- **Document Store:** MongoDB 5+ (for chat messages)

### Infrastructure

- **Cloud Provider:** AWS
- **Container Orchestration:** ECS Fargate
- **Load Balancing:** Application Load Balancer
- **CDN:** CloudFront
- **File Storage:** S3
- **Monitoring:** CloudWatch + X-Ray

### External Services

- **Payment Processing:** Stripe
- **Video Platform:** Agora.io
- **Email Service:** AWS SES
- **Authentication:** AWS Cognito

### Development Tools

- **Infrastructure as Code:** AWS CDK
- **API Testing:** Postman/Jest
- **Code Quality:** ESLint, Prettier
- **Version Control:** Git with conventional commits

---

## Conclusion

This architecture provides a solid foundation for a scalable edtech marketplace platform. The event-driven microservices architecture allows for:

- **Independent development and deployment** of each bounded context
- **Horizontal scaling** based on demand
- **Technology diversity** where appropriate for each service
- **Clear separation of concerns** following domain-driven design principles
- **Battle-tested patterns** used by successful companies at scale

The domain model, derived from comprehensive event storming sessions, ensures that the technical implementation aligns closely with business requirements and user needs. The architecture is designed to support rapid iteration during the startup phase while providing a solid foundation for future growth and feature expansion.

**Next Steps:**

1. Begin implementation with Phase 1 foundation work
2. Set up development environment and CI/CD pipeline
3. Implement Identity Service as the first microservice
4. Establish event-driven communication patterns
5. Build and iterate based on user feedback

This comprehensive architecture balances simplicity for rapid development with the scalability requirements of a growing edtech platform.
