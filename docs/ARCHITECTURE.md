# EdTech Platform - System Architecture

**Last Updated:** November 2025
**Platform Type:** 1-to-1 Tutor-Student Matching (Mathematics & Programming Education)
**Business Model:** 20% commission on completed lessons

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Bounded Contexts](#bounded-contexts)
3. [Service Architecture](#service-architecture)
4. [Data Architecture](#data-architecture)
5. [Event-Driven Communication](#event-driven-communication)
6. [Authentication & Authorization](#authentication--authorization)
7. [API Gateway Patterns](#api-gateway-patterns)
8. [Infrastructure Architecture](#infrastructure-architecture)
9. [Scalability Strategy](#scalability-strategy)
10. [Security Architecture](#security-architecture)

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WebApp[Web Application]
        MobileApp[Mobile App]
        AdminPanel[Admin Panel]
    end

    subgraph "API Gateway Layer"
        PublicALB[Public ALB<br/>Port 3000, 3002, 3004]
        InternalALB[Internal ALB<br/>Port 3001, 3003, 3005]
    end

    subgraph "AWS Cloud - Free Tier Optimized"
        subgraph "VPC - 10.0.0.0/16"
            subgraph "Public Subnets"
                Identity[Identity Service<br/>ECS Fargate]
                Tutor[Tutor Service<br/>ECS Fargate]
                Admin[Admin Service<br/>ECS Fargate]
                Matching[Matching Service<br/>Future]
                Communication[Communication Service<br/>Future]
                Booking[Booking Service<br/>Future]
                Payment[Payment Service<br/>Future]
            end
        end

        subgraph "Data Layer"
            RDS[(RDS PostgreSQL<br/>db.t3.micro<br/>identity_db, tutor_db, admin_db)]
            DynamoDB[(DynamoDB<br/>Event Store<br/>On-Demand)]
            Redis[(Redis<br/>Sessions & Cache)]
        end

        subgraph "AWS Managed Services"
            Cognito[AWS Cognito<br/>User Pool]
            EventBridge[AWS EventBridge<br/>Domain Events]
            S3[S3 Buckets<br/>Documents & Assets]
            SSM[SSM Parameter Store<br/>Secrets]
        end
    end

    WebApp --> PublicALB
    MobileApp --> PublicALB
    AdminPanel --> PublicALB

    PublicALB --> Identity
    PublicALB --> Tutor
    PublicALB --> Admin

    Identity --> InternalALB
    Tutor --> InternalALB
    Admin --> InternalALB

    Identity --> RDS
    Tutor --> RDS
    Admin --> RDS

    Identity --> Cognito
    Tutor --> S3
    Tutor --> DynamoDB

    Identity -.-> EventBridge
    Tutor -.-> EventBridge
    Admin -.-> EventBridge

    EventBridge -.-> Identity
    EventBridge -.-> Tutor
    EventBridge -.-> Admin
```

---

## Bounded Contexts

Based on Domain-Driven Design principles, we've identified the following bounded contexts (microservices):

### Implemented Services

| Service | Status | Domain Responsibility | Database | Key Entities |
|---------|--------|----------------------|----------|--------------|
| **Identity Service** | ✅ Implemented | User registration, authentication, email verification, COPPA compliance | PostgreSQL (identity_db) | UserAccount, StudentProfile, Session |
| **Tutor Service** | ✅ Implemented | Tutor onboarding, profile management, document verification, qualification tracking | PostgreSQL (tutor_db) | TutorProfile, VerificationDocument, Subject, Expertise |
| **Admin Service** | ✅ Implemented | Platform administration, tutor verification, user management, analytics | PostgreSQL (admin_db) | AdminUser, VerificationDecision, AuditLog |

### Future Services

| Service | Status | Domain Responsibility | Database | Technology |
|---------|--------|----------------------|----------|------------|
| **Matching Service** | 🔮 Planned | Smart tutor-student matching, search, connection requests | PostgreSQL + Algolia | Search algorithms |
| **Communication Service** | 🔮 Planned | Real-time chat, video lessons, file sharing | DynamoDB + Agora.io | WebSocket, Video SDK |
| **Booking Service** | 🔮 Planned | Lesson scheduling, availability management, calendar sync | PostgreSQL | Scheduling logic |
| **Payment Service** | 🔮 Planned | Payment processing, commission calculation, tutor payouts | PostgreSQL + Event Store | Stripe Connect |

---

## Service Architecture

Each microservice follows a **Clean Architecture** pattern with **Domain-Driven Design** principles:

```mermaid
graph TB
    subgraph "Service Architecture"
        subgraph "Presentation Layer"
            PublicAPI[Public API<br/>Port 3000]
            InternalAPI[Internal API<br/>Port 3001]
        end

        subgraph "Application Layer"
            Commands[Command Handlers]
            Queries[Query Handlers]
            EventHandlers[Event Handlers]
            DTOs[DTOs & Mappers]
        end

        subgraph "Domain Layer"
            Aggregates[Aggregate Roots]
            Entities[Entities]
            ValueObjects[Value Objects]
            DomainEvents[Domain Events]
            DomainServices[Domain Services]
        end

        subgraph "Infrastructure Layer"
            Repositories[Repositories<br/>Drizzle ORM]
            EventPublisher[Event Publisher<br/>EventBridge]
            ExternalServices[External Services<br/>Cognito, S3]
        end
    end

    PublicAPI --> Commands
    PublicAPI --> Queries
    InternalAPI --> Queries

    Commands --> Aggregates
    Queries --> Repositories

    Aggregates --> DomainEvents
    Aggregates --> ValueObjects
    Aggregates --> Entities

    DomainEvents --> EventHandlers
    EventHandlers --> EventPublisher

    Repositories --> RDS[(PostgreSQL)]
    EventPublisher --> EB[EventBridge]
    ExternalServices --> AWS[AWS Services]
```

### Layer Responsibilities

**Presentation Layer:**
- Public API: Client-facing REST endpoints (authenticated, rate-limited)
- Internal API: Service-to-service communication (VPC-only, no auth)

**Application Layer:**
- Orchestrates use cases via CQRS pattern
- Command handlers mutate state
- Query handlers read data
- Event handlers react to domain events

**Domain Layer:**
- Pure business logic (no infrastructure dependencies)
- Aggregates enforce consistency boundaries
- Value objects ensure data validity
- Domain events communicate state changes

**Infrastructure Layer:**
- Persistence via Drizzle ORM
- Event publishing via AWS EventBridge
- External integrations (Cognito, S3, SSM)

---

## Data Architecture

### Database Strategy

```mermaid
graph LR
    subgraph "RDS PostgreSQL Instance"
        DB1[identity_db]
        DB2[tutor_db]
        DB3[admin_db]
        DB4[matching_db]
        DB5[booking_db]
        DB6[payment_db]
    end

    IdentityService[Identity Service] --> DB1
    TutorService[Tutor Service] --> DB2
    AdminService[Admin Service] --> DB3
    MatchingService[Matching Service] --> DB4
    BookingService[Booking Service] --> DB5
    PaymentService[Payment Service] --> DB6

    TutorService -.->|S3| Documents[Document Storage]
    PaymentService -.->|DynamoDB| EventStore[Event Store]
```

**Key Principles:**
- **Database-per-service:** Each service has its own PostgreSQL database on shared RDS instance
- **No cross-database queries:** Services communicate via internal APIs or events
- **Single RDS instance:** Cost optimization for development/demo ($15/month after free tier vs $45/month for 3 instances)
- **DynamoDB for events:** Event sourcing for payment service and audit logs

### Data Flow Example: Tutor Verification

```mermaid
sequenceDiagram
    participant T as Tutor
    participant TS as Tutor Service
    participant EB as EventBridge
    participant AS as Admin Service
    participant IS as Identity Service

    T->>TS: POST /tutors/profile (submit documents)
    TS->>TS: Create TutorProfile aggregate
    TS->>S3: Upload documents
    TS->>DB: Save profile (status: pending_verification)
    TS->>EB: Publish TutorProfileSubmittedEvent

    EB->>AS: Route event to Admin Service
    AS->>AS: Create VerificationTask
    AS->>DB: Save verification task

    Note over AS: Admin reviews profile

    AS->>TS: POST /internal/tutors/:id/verify
    TS->>TS: Update TutorProfile (status: verified)
    TS->>DB: Update profile
    TS->>EB: Publish TutorVerifiedEvent

    EB->>IS: Route event to Identity Service
    IS->>IS: Grant tutor role permissions
    IS->>DB: Update user_account
```

---

## Event-Driven Communication

### Event Architecture

```mermaid
graph TB
    subgraph "Service A"
        A1[Aggregate Root]
        A2[Domain Event]
        A3[Event Publisher]
    end

    subgraph "AWS EventBridge"
        EB[Event Bus<br/>edtech-platform-events]
        Rules[Event Rules<br/>Pattern Matching]
    end

    subgraph "Service B"
        B1[Event Handler]
        B2[Command Handler]
        B3[Aggregate Root]
    end

    subgraph "Event Store"
        DDB[(DynamoDB<br/>Audit Trail)]
    end

    A1 -->|emits| A2
    A2 -->|publishes| A3
    A3 -->|sends| EB
    EB -->|matches| Rules
    Rules -->|routes| B1
    B1 -->|triggers| B2
    B2 -->|updates| B3

    EB -.->|archives| DDB
```

### Event Examples

**Domain Events Published:**

| Event | Source Service | Consumer Services | Purpose |
|-------|---------------|-------------------|---------|
| `UserCreatedEvent` | Identity | Tutor, Matching | Create user profiles in other contexts |
| `EmailVerifiedEvent` | Identity | Admin | Track user verification status |
| `TutorProfileSubmittedEvent` | Tutor | Admin | Trigger verification workflow |
| `TutorVerifiedEvent` | Tutor | Identity, Matching | Grant permissions, enable matching |
| `DocumentUploadedEvent` | Tutor | Admin | Notify admins of new documents |
| `VerificationDecisionMadeEvent` | Admin | Tutor, Identity | Update tutor status |

**Event Schema Example:**

```typescript
// TutorVerifiedEvent
{
  eventType: "TutorVerifiedEvent",
  version: "1.0",
  timestamp: "2025-11-13T10:30:00Z",
  aggregateId: "tutor_123",
  data: {
    tutorId: "tutor_123",
    userId: "user_456",
    verifiedBy: "admin_789",
    verificationDate: "2025-11-13",
    subjects: ["mathematics", "programming"]
  },
  metadata: {
    correlationId: "abc-123",
    causationId: "event-456",
    source: "tutor-service",
    environment: "dev"
  }
}
```

---

## Authentication & Authorization

### AWS Cognito Integration

```mermaid
graph TB
    Client[Client Application] -->|1. Login request| Cognito[AWS Cognito User Pool]
    Cognito -->|2. JWT tokens| Client
    Client -->|3. API request + JWT| ALB[Application Load Balancer]
    ALB -->|4. Forward| Service[Microservice]
    Service -->|5. Verify JWT| Cognito
    Service -->|6. Check permissions| Service
    Service -->|7. Response| Client
```

**Authentication Flow:**

1. **User Registration:** Identity Service → Cognito CreateUser
2. **Email Verification:** Cognito sends verification code
3. **Login:** Client → Cognito → JWT tokens (ID token, Access token, Refresh token)
4. **API Authorization:** Services validate JWT via Cognito public keys
5. **Role-Based Access:** JWT claims contain roles (student, tutor, admin)

**JWT Claims:**

```json
{
  "sub": "user_123",
  "email": "user@example.com",
  "email_verified": true,
  "cognito:username": "user_123",
  "custom:role": "tutor",
  "custom:userId": "user_123",
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/...",
  "exp": 1699900000
}
```

---

## API Gateway Patterns

### Dual-Port Pattern

Each service exposes two ports for separation of concerns:

```mermaid
graph LR
    subgraph "Internet"
        Client[Client Apps]
    end

    subgraph "VPC"
        subgraph "Public Port 3000"
            PA[Public API<br/>Auth Required<br/>Rate Limited<br/>CORS Enabled]
        end

        subgraph "Internal Port 3001"
            IA[Internal API<br/>No Auth<br/>VPC Only<br/>Service-to-Service]
        end

        ServiceA[Service A]
        ServiceB[Service B]
    end

    Client -->|HTTPS| PA
    PA --> Logic[Business Logic]
    IA --> Logic
    ServiceA -->|Internal Call| IA
    ServiceB -->|Internal Call| IA
```

**Port Allocation:**

| Service | Public Port | Internal Port | Purpose |
|---------|------------|---------------|---------|
| Identity | 3000 | 3001 | User authentication |
| Tutor | 3002 | 3003 | Tutor management |
| Admin | 3004 | 3005 | Administration |
| Matching | 3006 | 3007 | Search & matching |
| Communication | 3008 | 3009 | Chat & video |
| Booking | 3010 | 3011 | Lesson scheduling |
| Payment | 3012 | 3013 | Payments & payouts |

---

## Infrastructure Architecture

### AWS Free Tier Optimized Deployment

```mermaid
graph TB
    subgraph "Availability Zone 1"
        PublicSubnet1[Public Subnet<br/>10.0.1.0/24]
        ECS1[ECS Tasks<br/>Fargate]
    end

    subgraph "Availability Zone 2"
        PublicSubnet2[Public Subnet<br/>10.0.2.0/24]
        ECS2[ECS Tasks<br/>Fargate]
    end

    IGW[Internet Gateway] --> PublicSubnet1
    IGW --> PublicSubnet2

    PublicSubnet1 --> ECS1
    PublicSubnet2 --> ECS2

    ECS1 --> RDS[(RDS PostgreSQL<br/>Single-AZ<br/>db.t3.micro)]
    ECS2 --> RDS

    ECS1 --> DynamoDB[(DynamoDB<br/>On-Demand)]
    ECS2 --> DynamoDB

    ECS1 --> S3[S3 Buckets]
    ECS2 --> S3
```

**Key Decisions:**
- **No NAT Gateway:** Saves $32/month by using public subnets with security groups
- **Single RDS Instance:** Shared PostgreSQL instance with separate databases
- **On-Demand ECS:** Start/stop services to minimize costs ($0.01/hour per service)
- **DynamoDB On-Demand:** Pay-per-request pricing (free tier: 25 RCU/WCU)

---

## Scalability Strategy

### Current (MVP) Architecture
- Single RDS instance (db.t3.micro)
- ECS Fargate with manual scaling (desired_count = 0 or 1)
- DynamoDB on-demand (unlimited scale)

### Future Scaling Path

```mermaid
graph TB
    subgraph "Phase 1: MVP (Current)"
        RDS1[Single RDS<br/>db.t3.micro]
        ECS1[ECS Fargate<br/>Manual Scale]
    end

    subgraph "Phase 2: Production Ready"
        RDS2[RDS Multi-AZ<br/>db.t3.small]
        ECS2[ECS Auto-scaling<br/>2-10 tasks]
        Redis[ElastiCache Redis]
    end

    subgraph "Phase 3: High Scale"
        RDS3[Separate RDS<br/>per service]
        ReadReplica[Read Replicas]
        ECS3[ECS Auto-scaling<br/>10-50 tasks]
        CDN[CloudFront CDN]
    end

    Phase1 --> Phase2
    Phase2 --> Phase3
```

---

## Security Architecture

### Security Layers

1. **Network Security**
   - VPC with security groups
   - Public subnets with strict ingress rules
   - Internal APIs only accessible within VPC

2. **Application Security**
   - JWT authentication via AWS Cognito
   - Role-based access control (RBAC)
   - Rate limiting on public APIs
   - CORS restrictions

3. **Data Security**
   - Encryption at rest (RDS, DynamoDB, S3)
   - Encryption in transit (TLS 1.2+)
   - SSM Parameter Store for secrets (KMS encrypted)

4. **Compliance**
   - COPPA compliance for minors (<13 years)
   - Parent consent workflow
   - Data retention policies
   - GDPR-ready architecture

---

## Cost Summary

**Monthly Cost Breakdown (Free Tier Optimized):**

| Resource | Configuration | Free Tier | Cost (On-Demand) |
|----------|--------------|-----------|------------------|
| RDS PostgreSQL | db.t3.micro, 20GB | ✅ 750 hrs/month | $0 |
| ECS Fargate | 0.25 vCPU, 0.5 GB | ❌ Pay-per-second | $0.01/hour per service |
| DynamoDB | On-demand, <25 GB | ✅ 25 GB + 25 RCU/WCU | $0 |
| S3 | Standard storage | ✅ 5 GB + 20K GET + 2K PUT | $0 |
| Cognito | User Pool | ✅ <50,000 MAU | $0 |
| EventBridge | Event routing | ✅ Free tier | $0 |
| SSM Parameters | Standard tier | ✅ Unlimited | $0 |

**Total Monthly Cost:**
- **Development (on-demand):** ~$2/month (100 hours × 3 services × $0.01/hr)
- **Always-on (24/7):** $216/month (720 hours × 3 services × $0.01/hr)
- **Strategy:** Stop services after demos to minimize costs

---

## Next Steps

- **Service Implementation:** See [SERVICE_STRUCTURE.md](SERVICE_STRUCTURE.md)
- **Infrastructure Setup:** See [INFRASTRUCTURE.md](INFRASTRUCTURE.md)
- **Development Workflow:** See [DEVELOPMENT.md](DEVELOPMENT.md)
- **Cost Optimization:** See [COST_MANAGEMENT.md](COST_MANAGEMENT.md)
