# EdTech Platform - Complete Architecture & Implementation Guide

## Executive Summary

This document provides a comprehensive overview of our EdTech platform, a tutor-student matching service built with modern microservices architecture, Domain-Driven Design principles, and AWS cloud infrastructure. The platform facilitates personalized tutoring experiences while ensuring COPPA compliance and quality control through rigorous tutor verification.

**Tech Stack:** NestJS, CQRS, DDD, PostgreSQL, AWS (ECS, Lambda, EventBridge, Cognito, S3)
**Architecture:** Event-Driven Microservices with Hexagonal (Ports & Adapters) pattern
**Development Approach:** AI-Assisted with Claude Code, Startup-friendly with gradual complexity

---

## Table of Contents

1. [Business Model & Domain Analysis](#business-model--domain-analysis)
2. [Technical Architecture Decisions](#technical-architecture-decisions)
3. [Domain-Driven Design Implementation](#domain-driven-design-implementation)
4. [Identity Service - Complete Implementation](#identity-service---complete-implementation)
5. [Infrastructure & Deployment](#infrastructure--deployment)
6. [Development Patterns & Best Practices](#development-patterns--best-practices)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Business Model & Domain Analysis

### Core Business Model

**Revenue Model:** 20% commission on completed lessons
**Target Market:** K-12 students (ages 5-18) and qualified tutors
**Value Proposition:** Safe, verified, personalized tutoring platform

### Event Storming Results - Bounded Contexts

#### Context 1: Identity & Student Onboarding ✅ IMPLEMENTED

**Purpose:** User registration, email verification, and student profile creation with COPPA compliance

**Key Aggregates:**

- `UserAccount` - Core identity management with Cognito integration
- `StudentProfile` - Student-specific information with COPPA compliance
- `ParentConsent` - COPPA compliance for minors (automated workflow)

**Critical Domain Events:**

- `AccountCreated` → `EmailVerificationSent` → `AccountActivated`
- `StudentProfileCreated` → `MinorStatusDetected` → `ParentConsentRequired`
- `ParentConsentGranted` → `StudentReadyForPlatform`

**Business Policies:**

- Email Uniqueness Policy
- COPPA Compliance (Under 18) Policy
- Parent Consent Required Policy

#### Context 2: Tutor Onboarding and Verification ✅ IMPLEMENTED

**Purpose:** Tutor registration, profile creation, document verification, and admin approval

**Key Aggregates:**

- `TutorProfile` - Tutor qualifications, experience, and verification status
- `TutorVerification` - Document submission and admin review process
- `VerificationDecision` - Admin approval/rejection with reasoning

**Critical Domain Events:**

- `TutorProfileCreated` → `TutorDocumentsSubmitted` → `TutorReviewStarted`
- `TutorApproved` → `TutorReadyForPlatform` | `TutorRejected` | `AdditionalInfoRequested`

**Business Policies:**

- Tutor Age Eligibility (18+) Policy
- Document Verification Requirements Policy
- Hourly Rate Bounds Policy ($5-$500)
- Subject Qualification Verification Policy

#### Context 3: Matching and Communication 🔮 FUTURE

**Key Output:** "Match Established" + "Chat Channel Created"

#### Context 4: Lesson Booking and Payment 🔮 FUTURE

**Key Output:** "Lesson Completed" + "Tutor Payout Scheduled" (20% commission)

### Context Integration Flow

```
Identity → "Student Ready for Platform" → Matching Service
Tutor → "Tutor Ready for Platform" → Matching Service
Matching → "Match Established" → Lesson Service
Lesson → "Lesson Completed" → Analytics Service
```

---

## Technical Architecture Decisions

### Core Architecture Patterns

**Selected Pattern:** Direct API Gateway + Microservices (Dual Port Architecture)

Each microservice implements:

- **Port 3000:** Client-facing API (authenticated, rate-limited, CORS-enabled)
- **Port 3001:** Internal API (VPC-only, trusted, optimized for service-to-service)

**Benefits:**

- Simpler than BFF patterns
- Reduced latency (no extra network hops)
- Industry standard used by Netflix, Spotify
- Standard tooling compatibility

### Ports & Adapters (Hexagonal Architecture)

**Domain Layer:** Pure business logic, no infrastructure dependencies
**Application Layer:** CQRS commands/queries, orchestration
**Infrastructure Layer:** Database, external services, adapters

**Dependency Direction:** Infrastructure → Application → Domain

### Security & Service Communication

**Service-to-Service:** AWS IAM Authentication with Signature V4

- ECS task roles handle credentials automatically
- Built-in audit trail via CloudTrail
- Fine-grained permissions per service

**Client Authentication:** AWS Cognito User Pools with JWT tokens

- Custom attributes for onboarding state tracking
- Role-based access control (student, tutor, admin)
- Seamless integration with API Gateway

### Event-Driven Architecture Decisions

#### Current Implementation: Simple SQS Pattern ✅

- **Direct SQS** for non-critical notifications (emails, analytics)
- **No Outbox Pattern** (yet) - simple approach for startup phase
- **No Event Store** (yet) - regular PostgreSQL persistence sufficient

#### Future Patterns (When Business Justifies Complexity):

- **Outbox Pattern** when we have business-critical cross-service transactions (payments)
- **Event Store** when we need full audit trails (financial transactions, compliance)
- **Saga Pattern** when we have complex multi-service workflows (lesson booking)

**Decision Framework:**

- **Outbox**: When money involved OR critical cross-service coordination
- **Event Store**: When regulatory compliance OR dispute resolution needed
- **Saga**: When complex workflows span 3+ services with compensation logic

#### Lambda Integration Strategy

**Use Lambda for Utility Tasks Only:**

- ✅ **Email processing** (SES integration, template generation)
- ✅ **Image processing** (profile pictures, document processing)
- ✅ **Analytics processing** (metrics aggregation, reporting)
- ✅ **File processing** (document validation, OCR)

**Keep in ECS Microservices:**

- ❌ **Domain logic** and business rules
- ❌ **Real-time features** (WebSocket connections)
- ❌ **High-frequency operations** (API endpoints)

---

## Domain-Driven Design Implementation

### Base Abstract Classes for Consistency

```typescript
// shared/domain/value-object.base.ts
export abstract class ValueObject<T> {
  protected readonly value: T;
  protected constructor(value: T) {
    this.validate(value);
    this.value = value;
  }
  protected abstract validate(value: T): void;
  equals(other?: ValueObject<T>): boolean;
}

// shared/domain/identifier.base.ts
export abstract class Identifier extends ValueObject<string> {
  static generate<T extends Identifier>(this: new (value: string) => T): T;
  static from<T extends Identifier>(this: new (value: string) => T, value: string): T;
}

// shared/domain/domain-policy.base.ts
export abstract class DomainPolicy<T> {
  abstract enforce(input: T): Promise<void>;
}

// shared/domain/domain-service.base.ts
export abstract class DomainService {
  // Common infrastructure for all domain services
}
```

### Layered Validation Strategy

**DTO Layer:** Technical format validation and API contract enforcement

```typescript
export class CreateTutorProfileDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @Length(20, 2000, { message: "Experience must be 20-2000 characters" })
  experience: string;

  @Min(5, { message: "Minimum hourly rate is $5" })
  @Max(500, { message: "Maximum hourly rate is $500" })
  hourlyRate: number;
}
```

**Domain Layer:** Business rules and domain invariants only

```typescript
export class Email extends ValueObject<string> {
  protected validate(value: string): void {
    // Business rule: Email is required
    if (!value?.trim()) {
      throw new DomainError("Email is required", "EMAIL_REQUIRED");
    }

    // Business rule: No disposable email services
    if (this.isDisposableEmail(value)) {
      throw new DomainError("Disposable email addresses are not allowed", "EMAIL_DISPOSABLE");
    }

    // Business rule: Block specific domains
    if (this.isBlockedDomain(value)) {
      throw new DomainError("This email domain is not allowed", "EMAIL_DOMAIN_BLOCKED");
    }
  }

  // NO email format validation - that's DTO layer responsibility
}
```

### Aggregate Design Patterns

**Following DDD Best Practices:**

- Keep aggregates small (3-5 entities max)
- Single responsibility per aggregate
- Event-driven state changes
- Immutable value objects
- Factory methods for creation and reconstitution

```typescript
export class TutorProfile extends AggregateRoot {
  private constructor(
    private readonly _id: TutorId,
    private readonly _userId: UserId,
    private _personalName: PersonalName,
    private _qualifications: TutorQualifications,
    private _verificationStatus: TutorVerificationStatus,
    private _verifiedSubjects: Subject[],
    private _timestamps: AggregateTimestamps
  ) { super(); }

  // Factory for NEW entities
  static create(userId: UserId, personalName: PersonalName, ...): TutorProfile {
    const profile = new TutorProfile(/* ... */);
    profile.apply(new TutorProfileCreatedEvent(/* ... */));
    return profile;
  }

  // Factory for RECONSTITUTION from database
  static reconstitute(id: TutorId, userId: UserId, ...): TutorProfile {
    return new TutorProfile(id, userId, /* ... */);
  }

  // Business operations with domain events
  approve(adminId: UserId, verifiedSubjects: Subject[]): void {
    // Business validation
    this.validateApprovalEligibility();

    // State change
    this._verificationStatus = TutorVerificationStatus.APPROVED;
    this._verifiedSubjects = verifiedSubjects;

    // Domain event
    this.apply(new TutorApprovedEvent(this._id.value, adminId.value, verifiedSubjects));
  }
}
```

### Repository Pattern with Persistence Interfaces

```typescript
// Clean separation: Domain defines what it needs
export interface TutorProfilePersistence {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  subjects: Subject[];
  verificationStatus: TutorVerificationStatus;
  verifiedSubjects: Subject[];
  hourlyRate: number;
  createdAt: Date;
  updatedAt: Date;
}

// Repository handles mapping to database
export class DrizzleTutorProfileRepository extends TutorProfileRepository {
  async save(tutor: TutorProfile): Promise<void> {
    const persistence = tutor.toPersistence();

    // Map to database schema (different column names, types, etc.)
    await this.db.insert(schema.tutorProfiles).values({
      id: persistence.id,
      user_id: persistence.userId, // snake_case in DB
      first_name: persistence.firstName,
      verification_status: persistence.verificationStatus,
      hourly_rate_cents: persistence.hourlyRate * 100, // Different format
      // ... other mappings
    });
  }
}
```

---

## Identity Service - Complete Implementation

### Current Implementation Status: ✅ PRODUCTION READY

**Implemented Features:**

- ✅ User Account Management (email verification, Cognito integration)
- ✅ Student Profile Creation (COPPA compliance, parent consent)
- ✅ Tutor Profile Creation (qualifications, experience validation)
- ✅ Comprehensive Tutor Verification Flow (6-step process with admin review)
- ✅ Document Upload & Management (S3 integration, security)
- ✅ Admin Dashboard (verification management, approval/rejection)
- ✅ Event-Driven Notifications (SQS integration for emails)

### Student Onboarding Flow

```
1. Registration → Email Verification → Profile Creation →
2. (If Minor) Parent Consent → Student Ready for Platform
```

**Business Rules Enforced:**

- COPPA compliance for users under 18
- Parent email required for minors
- Grade-age compatibility validation
- Subject interest validation

### Tutor Onboarding Flow (6-Step Process)

```
1. Registration → 2. Email Verification → 3. Profile Creation →
4. Document Submission → 5. Admin Review → 6. Approval/Rejection
```

**Verification States:**

- `PENDING` → `DOCUMENTS_SUBMITTED` → `UNDER_REVIEW`
- `ADDITIONAL_INFO_REQUIRED` → `APPROVED` → `READY_FOR_PLATFORM`
- `REJECTED` → `SUSPENDED` (post-approval management)

**Business Rules Enforced:**

- Age eligibility (18+ for tutors)
- Hourly rate bounds ($5-$500)
- Required documents (ID, education, teaching certificates)
- Subject-qualification matching
- Advanced subjects require additional certifications

### API Endpoints Implemented

#### Student Onboarding

```typescript
POST /onboarding/students/register
POST /onboarding/students/verify-email
POST /onboarding/students/complete-profile
POST /onboarding/students/parent-consent/:id
```

#### Tutor Onboarding

```typescript
POST /onboarding/tutors/register
POST /onboarding/tutors/verify-email
POST /onboarding/tutors/complete-profile
POST /onboarding/tutors/submit-documents/:id
POST /onboarding/tutors/resubmit-documents/:id
GET  /onboarding/tutors/verification-status/:id
```

#### Admin Management

```typescript
GET  /admin/tutors/pending-verification
GET  /admin/tutors/:id/verification-details
POST /admin/tutors/:id/start-review
POST /admin/tutors/:id/approve
POST /admin/tutors/:id/reject
POST /admin/tutors/:id/request-additional-info
POST /admin/tutors/:id/suspend
```

### Database Schema (PostgreSQL with Drizzle ORM)

```sql
-- Core Tables
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_verification',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_profiles (
    id UUID PRIMARY KEY REFERENCES users(id),
    user_id UUID REFERENCES users(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    subjects_of_interest JSON NOT NULL,
    parent_consent_required BOOLEAN DEFAULT FALSE,
    parent_consent_granted BOOLEAN DEFAULT FALSE,
    parent_email VARCHAR(255)
);

CREATE TABLE tutor_profiles (
    id UUID PRIMARY KEY REFERENCES users(id),
    user_id UUID REFERENCES users(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    subjects JSON NOT NULL,
    experience TEXT NOT NULL,
    education TEXT NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    verification_status VARCHAR(50) DEFAULT 'pending',
    verified_subjects JSON DEFAULT '[]',
    submitted_documents JSON DEFAULT '{}',
    verification_notes JSON DEFAULT '[]'
);
```

### Event-Driven Integration

**Domain Events Published:**

```typescript
// Student Events
AccountCreated → EmailVerificationSent → AccountActivated
StudentProfileCreated → MinorStatusDetected → StudentReadyForPlatform

// Tutor Events
TutorProfileCreated → TutorDocumentsSubmitted → TutorReviewStarted
TutorApproved → TutorReadyForPlatform

// Admin Events
TutorRejected → AdditionalInfoRequested → TutorSuspended
```

**External Integrations:**

- **Email Service** (SQS → Lambda → SES): Verification emails, status notifications
- **Matching Service** (SQS): Student/Tutor ready notifications
- **Analytics Service** (SQS): Conversion tracking, funnel analysis

---

## Infrastructure & Deployment

### AWS Architecture

**Core Services:**

- **ECS Fargate** - Serverless containers for microservices
- **Application Load Balancer** - Dual port routing (3000 client, 3001 internal)
- **RDS PostgreSQL** - Primary database with read replicas
- **ElastiCache Redis** - Caching layer and session storage
- **S3 + CloudFront** - Document storage and CDN
- **EventBridge + SQS** - Event-driven communication
- **Lambda** - Utility functions (email, image processing)
- **Cognito User Pools** - Authentication and user management

**Security:**

- **VPC with private subnets** - Network isolation
- **ECS task roles** - Service-to-service authentication
- **AWS Signature V4** - Internal API security
- **CloudTrail** - Audit logging
- **WAF** - Web application firewall

### Deployment Strategy

**Infrastructure as Code:** AWS CDK with TypeScript

```typescript
// Infrastructure stack example
const cluster = new ecs.Cluster(this, "EdTechCluster", { vpc });

const identityService = new ecs.FargateService(this, "IdentityService", {
  cluster,
  taskDefinition: identityTaskDef,
  desiredCount: 2,
  assignPublicIp: false,
});

const loadBalancer = new elbv2.ApplicationLoadBalancer(this, "ALB", {
  vpc,
  internetFacing: true,
});

// Dual port setup
loadBalancer.addListener("ClientListener", {
  port: 80,
  defaultTargetGroups: [clientTargetGroup],
});

loadBalancer.addListener("InternalListener", {
  port: 3001,
  defaultTargetGroups: [internalTargetGroup],
});
```

**Container Strategy:**

- Multi-stage Docker builds for optimal image size
- Health checks for proper load balancer integration
- Graceful shutdown handling for zero-downtime deployments

**Monitoring & Observability:**

- **CloudWatch** - Metrics, logs, and alerting
- **X-Ray** - Distributed tracing
- **Custom metrics** - Business KPIs and performance tracking

---

## Development Patterns & Best Practices

### AI-Assisted Development with Claude Code

**Integration Strategy:**

- **Code generation** for boilerplate (aggregates, commands, DTOs)
- **Architecture reviews** with AI analysis
- **Domain modeling** assistance with business requirement analysis
- **Test generation** for comprehensive coverage

**CLI Workflow:**

```bash
claude-code generate --type=aggregate --domain=tutor-profile
claude-code review --file=src/domain/aggregates/tutor-profile.ts
claude-code test --type=unit --file=tutor-profile.aggregate.ts
```

### Code Quality Standards

**TypeScript Configuration:**

- Strict mode enabled
- Path mapping for clean imports
- Consistent formatting with Prettier
- ESLint with custom rules for DDD patterns

**Testing Strategy:**

- **Unit tests** for domain logic (aggregates, value objects, policies)
- **Integration tests** for command/query handlers
- **E2E tests** for critical user journeys
- **Contract tests** for service boundaries

**Error Handling:**

```typescript
// Structured domain errors
export class DomainError extends Error {
  constructor(message: string, public readonly code: string, public readonly field?: string) {
    super(message);
    this.name = "DomainError";
  }
}

// Global exception filter
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    response.status(400).json({
      error: "Domain Validation Error",
      message: exception.message,
      code: exception.code,
      field: exception.field,
    });
  }
}
```

### Performance Optimization

**Caching Strategy:**

- **Redis** for session storage and frequently accessed data
- **Application-level caching** for static data (subjects, grade levels)
- **Database query optimization** with proper indexing

**Monitoring:**

```typescript
// Performance metrics service
@Injectable()
export class PerformanceMetricsService {
  async recordCommandExecution(commandName: string, durationMs: number, status: "success" | "error"): Promise<void> {
    await this.cloudWatch.send(
      new PutMetricDataCommand({
        Namespace: "EdTech/Commands",
        MetricData: [
          {
            MetricName: `${commandName}.Duration`,
            Value: durationMs,
            Unit: "Milliseconds",
            Dimensions: [{ Name: "Status", Value: status }],
          },
        ],
      })
    );
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation ✅ COMPLETED

**Timeline:** 8 weeks
**Status:** Production Ready

**Delivered:**

- ✅ Identity Service with student and tutor onboarding
- ✅ Comprehensive tutor verification flow
- ✅ Admin dashboard for tutor management
- ✅ AWS infrastructure setup
- ✅ Cognito authentication integration
- ✅ Document upload and management
- ✅ Event-driven notifications

### Phase 2: Matching Service 🚧 IN PROGRESS

**Timeline:** 6 weeks
**Status:** Design Complete, Implementation Starting

**Scope:**

- Student-tutor matching algorithm
- Preference management (subjects, availability, location)
- Match quality scoring
- Communication channel setup
- Match management (accept/decline/reschedule)

**Technical Implementation:**

- Matching algorithm microservice
- Real-time notifications (WebSocket)
- Complex event flows with eventual consistency
- Geographic and schedule-based matching

### Phase 3: Lesson Management 🔮 FUTURE

**Timeline:** 8 weeks

**Scope:**

- Lesson booking and scheduling
- Calendar integration
- Video call integration (Agora.io)
- Lesson state management
- Recording and playback

**Technical Challenges:**

- Real-time communication
- Payment processing integration
- Complex saga workflows
- Video streaming infrastructure

### Phase 4: Payment & Financial 🔮 FUTURE

**Timeline:** 10 weeks

**Scope:**

- Payment processing (Stripe integration)
- Tutor payout system (20% commission)
- Invoice generation
- Financial reporting and analytics
- Refund processing

**Technical Requirements:**

- **Outbox pattern** for reliable financial transactions
- **Event store** for full audit trail
- **Saga pattern** for complex payment workflows
- PCI compliance and security

### Phase 5: Advanced Features 🔮 FUTURE

**Timeline:** 12 weeks

**Scope:**

- Advanced analytics and reporting
- Machine learning recommendations
- Mobile app (React Native)
- Advanced search and filtering
- Gamification and achievements

## Current Architecture Benefits

### ✅ **Startup-Friendly Approach**

- Start simple with proven patterns
- Add complexity only when business justifies it
- Rapid iteration and feature delivery
- Cost-effective infrastructure scaling

### ✅ **Production-Ready Foundation**

- Comprehensive error handling and validation
- Security best practices implemented
- Monitoring and observability built-in
- Scalable architecture patterns

### ✅ **Team Productivity**

- Consistent patterns across all services
- AI-assisted development workflow
- Clear separation of concerns
- Comprehensive documentation

### ✅ **Business Value Delivery**

- Complete student and tutor onboarding
- Quality control through verification
- COPPA compliance for legal requirements
- Admin tools for platform management

This architecture provides a solid foundation for scaling from startup to enterprise while maintaining code quality, security, and developer productivity. The modular design allows for independent service evolution and team scaling as the business grows.
