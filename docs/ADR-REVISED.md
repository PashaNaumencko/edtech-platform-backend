# Architecture Decision Records (ADR) - EdTech Platform

**Revised for Terraform + NestJS Monorepo + Free-Tier Focus**

**Last Updated:** November 2025
**Platform:** 1-to-1 Tutor-Student Matching Service

---

## Table of Contents

- [ADR-001: Terraform over AWS CDK](#adr-001-terraform-over-aws-cdk)
- [ADR-002: NestJS CLI Monorepo Structure](#adr-002-nestjs-cli-monorepo-structure)
- [ADR-003: Public Subnets (No NAT Gateway)](#adr-003-public-subnets-no-nat-gateway)
- [ADR-004: Single RDS with Multiple Databases](#adr-004-single-rds-with-multiple-databases)
- [ADR-005: On-Demand ECS (Start/Stop Strategy)](#adr-005-on-demand-ecs-startstop-strategy)
- [ADR-006: SSM Parameter Store (Not Secrets Manager)](#adr-006-ssm-parameter-store-not-secrets-manager)
- [ADR-007: Dual-Port Pattern for Services](#adr-007-dual-port-pattern-for-services)
- [ADR-008: Database-per-Service via Schemas](#adr-008-database-per-service-via-schemas)
- [ADR-009: Domain-Driven Design as Foundation](#adr-009-domain-driven-design-as-foundation)
- [ADR-010: PostgreSQL as Primary Database](#adr-010-postgresql-as-primary-database)
- [ADR-011: DynamoDB for Event Store Only](#adr-011-dynamodb-for-event-store-only)
- [ADR-012: EventBridge for Inter-Service Communication](#adr-012-eventbridge-for-inter-service-communication)
- [ADR-013: Drizzle ORM over TypeORM/Prisma](#adr-013-drizzle-orm-over-typeormprisma)
- [ADR-014: CQRS Where It Makes Sense](#adr-014-cqrs-where-it-makes-sense)
- [ADR-015: Start as Microservices from Day 1](#adr-015-start-as-microservices-from-day-1)
- [Summary: Key Decisions](#summary-key-decisions)

---

## ADR-001: Terraform over AWS CDK

**Status:** ✅ Accepted

**Context:**

We initially considered AWS CDK (TypeScript) for Infrastructure as Code, but after evaluation, we found several limitations:

- CDK abstractions hide underlying CloudFormation details
- Harder to review infrastructure changes in pull requests
- Team has existing Terraform experience
- Terraform has better cross-cloud portability (future-proofing)
- Terraform state management is more transparent

**Decision:**

Use **Terraform 1.6+** for all infrastructure provisioning.

**Implementation:**

```hcl
# infrastructure/environments/dev/main.tf
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "edtech-terraform-state-${var.aws_account_id}"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "edtech-terraform-locks"
    encrypt        = true
  }
}

module "networking" {
  source = "../../modules/shared/networking"

  environment = "dev"
  vpc_cidr    = "10.0.0.0/16"
}

module "data" {
  source = "../../modules/shared/data"

  environment = "dev"
  vpc_id      = module.networking.vpc_id
  subnet_ids  = module.networking.private_subnet_ids
}
```

**Consequences:**

✅ **Pros:**
- Declarative, version-controlled infrastructure
- Clear diff in pull requests (terraform plan output)
- Reusable modules across environments
- Better state management with S3 + DynamoDB locking
- Industry-standard tool with large community

⚠️ **Cons:**
- Slightly more verbose than CDK TypeScript
- Team needs Terraform knowledge (but simpler than CDK constructs)
- No type safety (but validation via `terraform validate`)

**Cost Impact:** $0 (Terraform is free, S3 backend in free tier)

---

## ADR-002: NestJS CLI Monorepo Structure

**Status:** ✅ Accepted

**Context:**

We need to manage multiple microservices with shared code. Options considered:

1. Separate repositories per service (polyrepo)
2. Lerna/Nx monorepo (custom setup)
3. NestJS CLI monorepo (built-in) ✅

**Decision:**

Use **NestJS CLI monorepo** with `apps/` and `libs/` structure.

**Implementation:**

```json
// nest-cli.json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "apps/identity/src",
  "compilerOptions": {
    "webpack": true,
    "tsConfigPath": "apps/identity/tsconfig.app.json"
  },
  "monorepo": true,
  "root": "apps/identity",
  "projects": {
    "identity": {
      "type": "application",
      "root": "apps/identity",
      "entryFile": "main",
      "sourceRoot": "apps/identity/src",
      "compilerOptions": {
        "tsConfigPath": "apps/identity/tsconfig.app.json"
      }
    },
    "shared-kernel": {
      "type": "library",
      "root": "libs/shared-kernel",
      "entryFile": "index",
      "sourceRoot": "libs/shared-kernel/src",
      "compilerOptions": {
        "tsConfigPath": "libs/shared-kernel/tsconfig.lib.json"
      }
    }
  }
}
```

```json
// tsconfig.json (path aliases)
{
  "compilerOptions": {
    "paths": {
      "@app/shared-kernel": ["libs/shared-kernel/src"],
      "@app/shared-kernel/*": ["libs/shared-kernel/src/*"],
      "@app/common": ["libs/common/src"],
      "@app/common/*": ["libs/common/src/*"]
    }
  }
}
```

**Project Structure:**

```
edtech-platform/
├── apps/
│   ├── identity/
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── presentation/
│   │   │   └── main.ts
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── tsconfig.app.json
│   ├── tutor/
│   └── admin/
├── libs/
│   ├── shared-kernel/
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── infrastructure/
│   │   └── tsconfig.lib.json
│   ├── common/
│   └── config/
└── nest-cli.json
```

**Commands:**

```bash
# Generate new app
nest generate app matching

# Generate new library
nest generate library notifications

# Run specific app
npm run start:dev identity

# Build specific app
npm run build identity

# Run tests for specific app
npm run test identity
```

**Consequences:**

✅ **Pros:**
- Single `npm install` for all services
- Shared code in `libs/` (no publishing to npm)
- Type safety across service boundaries
- Easier refactoring (IDE knows all references)
- Consistent tooling (eslint, prettier, jest)
- Simplified CI/CD (one repository)

⚠️ **Cons:**
- Larger repository size
- Need clear boundaries between services (no direct imports between apps)
- Must enforce architectural rules (e.g., apps can't import other apps)

**Cost Impact:** $0 (organization only)

---

## ADR-003: Public Subnets (No NAT Gateway)

**Status:** ✅ Accepted

**Context:**

AWS VPC design typically recommends:
- Public subnets for internet-facing resources (ALB)
- Private subnets for application servers (ECS tasks)
- NAT Gateway for private subnet internet access

However, **NAT Gateway costs $32/month** ($0.045/hour × 720 hours).

**Decision:**

Place **ECS tasks in public subnets** with security groups for isolation. **No NAT Gateway**.

**Security Model:**

```
Internet
  ↓
[Internet Gateway] (free)
  ↓
[Public Subnet]
  ↓
[ECS Task] ← Security Group (strict ingress)
  ↓
AWS Services (S3, DynamoDB, RDS via VPC endpoints)
```

**Consequences:**

✅ **Pros:**
- Saves $32/month ($384/year)
- Simpler architecture (fewer hops)
- Lower latency (direct internet access)
- ECS tasks get public IPs (easier debugging)

⚠️ **Cons:**
- ECS tasks have public IPs (but secured by security groups)
- Must configure security groups carefully
- Not recommended for production (but fine for demo/dev)

**Migration Path to Production:**

When ready for production:
1. Create private subnets
2. Add NAT Gateway
3. Move ECS tasks to private subnets
4. Budget $32/month for NAT Gateway

**Cost Impact:** -$32/month (saved)

---

## ADR-004: Single RDS with Multiple Databases

**Status:** ✅ Accepted

**Context:**

Microservices best practice: Database per service. Options:

1. Separate RDS instances per service (3 instances = $45/month after free tier)
2. Single RDS instance with 3 databases (1 instance = $15/month after free tier) ✅
3. DynamoDB for all services (free tier, but not relational)

**Decision:**

Use **single RDS PostgreSQL instance** with separate databases per service.

**Database Structure:**

```
RDS PostgreSQL Instance (db.t3.micro)
├── identity_db (Identity Service)
│   ├── user_accounts
│   ├── student_profiles
│   └── sessions
├── tutor_db (Tutor Service)
│   ├── tutor_profiles
│   ├── verification_documents
│   └── availability_slots
└── admin_db (Admin Service)
    ├── admin_users
    ├── verification_decisions
    └── audit_logs
```

**Connection Strings:**

```typescript
// apps/identity/.env
DATABASE_URL=postgresql://edtech_admin:${password}@${rds_endpoint}:5432/identity_db

// apps/tutor/.env
DATABASE_URL=postgresql://edtech_admin:${password}@${rds_endpoint}:5432/tutor_db

// apps/admin/.env
DATABASE_URL=postgresql://edtech_admin:${password}@${rds_endpoint}:5432/admin_db
```

**Consequences:**

✅ **Pros:**
- Database-per-service isolation maintained (separate schemas)
- Saves $30/month (3 instances → 1 instance after free tier)
- Still eligible for 12-month free tier (750 hours/month)
- Single backup/maintenance window
- Easier to manage (one instance)

⚠️ **Cons:**
- Shared compute resources (CPU, memory)
- Single point of failure (mitigated by backups)
- Cannot scale services independently
- Must ensure no cross-database queries in application code

**Scaling Path:**

When needed:
1. Upgrade to db.t3.small ($30/month)
2. Enable Multi-AZ ($60/month)
3. Add read replicas per service
4. Eventually split into separate instances

**Cost Impact:**

| Approach | Free Tier (12 months) | After Free Tier |
|----------|----------------------|-----------------|
| 3 RDS instances | $0 (only 1 counts) | $45/month |
| 1 RDS instance | $0 (full coverage) | $15/month |
| **Savings** | N/A | **$30/month** |

---

## ADR-005: On-Demand ECS (Start/Stop Strategy)

**Status:** ✅ Accepted

**Context:**

ECS Fargate pricing: $0.04048/vCPU/hour + $0.004445/GB/hour

For our setup (0.25 vCPU, 0.5 GB):
- Cost per task: ~$0.01/hour
- 3 services × 24/7 = **$216/month**

But we only need services running during:
- Demos (2-3 hours)
- Integration testing (1-2 hours)
- Development testing (occasionally)

**Decision:**

Deploy ECS services with **desired_count = 0** by default. Use scripts to start/stop on-demand.

**Start/Stop Scripts:**

```bash
#!/bin/bash
# infrastructure/scripts/start-services.sh

set -e

echo "🚀 Starting ECS services..."

CLUSTER="edtech-dev"
SERVICES=("identity-service" "tutor-service" "admin-service")

for SERVICE in "${SERVICES[@]}"; do
  echo "Starting $SERVICE..."
  aws ecs update-service \
    --cluster $CLUSTER \
    --service $SERVICE \
    --desired-count 1 \
    --no-cli-pager
done

echo "⏳ Waiting for services to be healthy..."
aws ecs wait services-stable \
  --cluster $CLUSTER \
  --services "${SERVICES[@]}"

echo "✅ All services running!"
echo "Cost: \$0.03/hour (\$0.01 × 3 services)"
```

**Consequences:**

✅ **Pros:**
- Saves $210/month (from $216 to ~$6 for occasional usage)
- Services only cost money when actually used
- Can run 100 hours/month for <$3
- Still production-ready (just not always-on)

⚠️ **Cons:**
- ~2 minute cold start time
- Must remember to stop after demos
- Not suitable for production (but perfect for dev/demo)

**Cost Comparison:**

| Usage Pattern | Monthly Cost |
|--------------|-------------|
| Always-on (24/7) | $216 |
| 8 hours/day (business hours) | $72 |
| 2 hours/day (demos only) | $1.80 ✅ |
| On-demand (100 hrs/month) | $3 |

**Cost Impact:** -$210/month (saved)

---

## ADR-006: SSM Parameter Store (Not Secrets Manager)

**Status:** ✅ Accepted

**Context:**

Need to store secrets (database passwords, API keys). Options:

1. AWS Secrets Manager: $0.40/secret/month + $0.05/10,000 API calls
2. SSM Parameter Store (Standard): Free, unlimited parameters ✅
3. Environment variables in ECS task definitions: Insecure, not rotatable

For 15 secrets: Secrets Manager = $6/month, SSM = $0/month

**Decision:**

Use **SSM Parameter Store** with SecureString type (KMS encrypted).

**Implementation:**

See [DEVELOPMENT.md](DEVELOPMENT.md#ssm-nestjs-config-integration) for complete NestJS ConfigModule integration.

**Consequences:**

✅ **Pros:**
- Saves $6/month (15 secrets × $0.40)
- Encrypted at rest (AWS KMS)
- Version history (can rollback)
- Fine-grained IAM permissions
- Integrated with CloudFormation/Terraform
- Free API calls (unlimited)

⚠️ **Cons:**
- No automatic rotation (must implement manually)
- No cross-region replication (Secrets Manager has this)
- Manual caching needed (Secrets Manager caches automatically)

**When to Use Secrets Manager:**

Upgrade to Secrets Manager when:
- Need automatic secret rotation (e.g., RDS passwords)
- Need cross-region replication
- Need built-in rotation Lambda functions
- Cost is not a concern ($6/month is acceptable)

**Cost Impact:** -$6/month (saved)

---

## ADR-007: Dual-Port Pattern for Services

**Status:** ✅ Accepted

**Context:**

Microservices need two types of APIs:
1. **Public API**: For client applications (web, mobile)
2. **Internal API**: For service-to-service communication

**Decision:**

Each service exposes two ports:
- Port 3000, 3002, 3004... → **Public API** (authenticated, rate-limited)
- Port 3001, 3003, 3005... → **Internal API** (VPC-only, no auth)

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

**Consequences:**

✅ **Pros:**
- Clear separation of concerns
- Public API can have authentication, rate limiting, CORS
- Internal API optimized for speed (no auth overhead)
- Security groups enforce VPC-only for internal ports
- Single codebase, same business logic

⚠️ **Cons:**
- Slightly more complex setup (two modules)
- Must ensure internal ports not exposed to internet
- Duplicate some controller logic (different DTOs for public/internal)

**Cost Impact:** $0 (organization only)

---

## ADR-008: Database-per-Service via Schemas

**Status:** ✅ Accepted

**Context:**

Database-per-service is a microservices best practice, but we're using a single RDS instance (ADR-004). How do we maintain isolation?

**Decision:**

Use **separate PostgreSQL databases** on the same RDS instance.

**Enforcing Boundaries:**

```typescript
// ❌ BAD: Cross-database query (will fail)
SELECT u.email, t.hourly_rate
FROM identity_db.users u
JOIN tutor_db.tutors t ON u.id = t.user_id;
-- Error: cross-database queries not allowed

// ✅ GOOD: Service-to-service call
// In Tutor Service
const user = await this.identityServiceClient.getUserById(tutorId);
const tutor = await this.tutorRepository.findById(tutorId);
const combined = { ...user, ...tutor };
```

**Consequences:**

✅ **Pros:**
- True database isolation (cannot accidentally query across databases)
- Independent schema migrations (each service owns its migrations)
- Clear ownership (Identity team owns identity_db)
- TypeScript enforces boundaries (each service has its own schema.ts)

⚠️ **Cons:**
- Cannot use database-level foreign keys across services
- Must implement referential integrity in application code
- Slightly more complex connection management

**Cost Impact:** $0 (organization only)

---

## ADR-009: Domain-Driven Design as Foundation

**Status:** ✅ Accepted

**Context:**

Building a complex platform with multiple bounded contexts. Need architecture that:
- Keeps business logic isolated from infrastructure
- Enables independent evolution of services
- Facilitates team autonomy
- Supports changing requirements

**Decision:**

Use **Domain-Driven Design (DDD)** as the architectural foundation for all services.

**Core Concepts:**

1. **Bounded Contexts** → Microservices
2. **Aggregates** → Consistency boundaries
3. **Value Objects** → Immutable, validated data
4. **Domain Events** → Communication between contexts
5. **Repositories** → Persistence abstraction
6. **Domain Services** → Stateless business logic

**Consequences:**

✅ **Pros:**
- Business logic is testable (no dependencies on infrastructure)
- Clear boundaries (bounded contexts = microservices)
- Domain experts can read code (ubiquitous language)
- Invariants enforced (aggregates maintain consistency)
- Rich domain model (not anemic CRUD)

⚠️ **Cons:**
- Steeper learning curve for team
- More code than simple CRUD
- Requires understanding of DDD patterns

**Cost Impact:** $0 (organization only, improves maintainability)

---

## ADR-010: PostgreSQL as Primary Database

**Status:** ✅ Accepted

**Context:**

EdTech platform has highly relational data:
- Users → Enrollments → Progress
- Students → Tutors → Matches → Bookings

**Decision:**

Use **PostgreSQL** as the primary database for most services.

**Use Cases by Database:**

```typescript
// PostgreSQL (Relational data)
✅ User accounts, profiles
✅ Tutor profiles, verification
✅ Bookings, schedules
✅ Payment records, invoices

// DynamoDB (Event store, high-throughput)
✅ Domain events (event sourcing)
✅ Real-time chat messages
✅ Saga state tracking
✅ Activity logs

// Redis (Caching, sessions)
✅ Session storage
✅ Rate limiting counters
✅ Temporary data
```

**Consequences:**

✅ **Pros:**
- Natural fit for relational data
- ACID guarantees (payment integrity)
- Rich querying (analytics, reporting)
- Mature tooling (pgAdmin, DataGrip)
- Free tier covers development
- Drizzle provides type safety

⚠️ **Cons:**
- Vertical scaling limits (can add read replicas later)
- More expensive at extreme scale vs DynamoDB
- Need to design indexes carefully

**Cost Impact:** $0 (free tier for 12 months), then $15/month

---

## ADR-011: DynamoDB for Event Store Only

**Status:** ✅ Accepted

**Context:**

DynamoDB is excellent for:
- High-throughput writes
- Key-value access patterns
- Serverless scaling
- Event sourcing (append-only)

But not ideal for:
- Complex relational queries
- ACID transactions across entities
- Frequently updated data

**Decision:**

Use **DynamoDB exclusively for event store** (domain events, saga state).

**When to Use:**

| Use Case | Database | Reason |
|----------|----------|--------|
| User profiles | PostgreSQL | Relational, queries |
| Course catalog | PostgreSQL | Relational, filtering |
| **Domain events** | **DynamoDB** | ✅ Append-only, high throughput |
| **Chat messages** | **DynamoDB** | ✅ Key-value, real-time |
| **Saga state** | **DynamoDB** | ✅ Transient, TTL |

**Consequences:**

✅ **Pros:**
- Perfect for event sourcing (append-only)
- Free tier: 25 GB + 25 RCU/WCU (plenty for events)
- Serverless (auto-scales)
- DynamoDB Streams (propagate events to EventBridge)
- TTL (automatic cleanup of old events)

⚠️ **Cons:**
- Limited querying (no complex joins)
- Must design access patterns carefully
- Not suitable for frequently updated data

**Cost Impact:** $0 (free tier covers event store usage)

---

## ADR-012: EventBridge for Inter-Service Communication

**Status:** ✅ Accepted

**Context:**

Microservices need to communicate. Options:
1. Direct HTTP calls (synchronous, tight coupling)
2. Message queue (SQS) (async, but point-to-point)
3. **Event bus (EventBridge)** (async, pub/sub) ✅

**Decision:**

Use **AWS EventBridge** as the central event bus for all domain events.

**Consequences:**

✅ **Pros:**
- Loose coupling (services don't know about each other)
- Multiple consumers (pub/sub pattern)
- Free tier: 1M events/month (plenty for us)
- Built-in retry and dead-letter queues
- Schema registry (validate events)
- Easy to add new consumers (no code changes in producer)

⚠️ **Cons:**
- Eventual consistency (not suitable for synchronous flows)
- Debugging is harder (distributed tracing needed)
- Need correlation IDs for request tracking

**When to Use EventBridge vs Direct Calls:**

| Scenario | Use | Reason |
|----------|-----|--------|
| User created | EventBridge | Multiple consumers (email, analytics) |
| Get user by ID | Direct HTTP | Synchronous, single consumer |
| Tutor approved | EventBridge | Multiple actions (notify, index in Algolia) |
| Payment processed | EventBridge | Trigger multiple workflows |

**Cost Impact:** $0 (free tier: 1M events/month)

---

## ADR-013: Drizzle ORM over TypeORM/Prisma

**Status:** ✅ Accepted

**Context:**

Need type-safe database access for PostgreSQL. Options:

| Feature | Drizzle | TypeORM | Prisma |
|---------|---------|---------|--------|
| Bundle size | 7 KB | 580 KB | 30 MB (node_modules) |
| Type safety | ✅ Excellent | ⚠️ OK | ✅ Excellent |
| SQL-like API | ✅ Yes | ❌ No (QB complex) | ❌ No (custom syntax) |
| Raw SQL support | ✅ Easy | ⚠️ Harder | ❌ Limited |
| Migrations | ✅ Push & generate | ✅ Sync | ✅ Migrate |
| Performance | ✅ Fast | ⚠️ Overhead | ⚠️ Overhead |
| Learning curve | ✅ Low (SQL-like) | ⚠️ Medium | ⚠️ Medium |

**Decision:**

Use **Drizzle ORM** for all PostgreSQL interactions.

**Consequences:**

✅ **Pros:**
- Lightweight (7 KB vs 580 KB TypeORM)
- Type inference (no decorators needed)
- SQL-like syntax (easy to learn)
- Full SQL power (use raw SQL when needed)
- Fast (no overhead)
- Great for serverless (small bundle)

⚠️ **Cons:**
- Smaller community than TypeORM/Prisma
- Fewer integrations (but growing)
- Manual migrations (no automatic from decorators)

**Cost Impact:** $0 (library choice, improves performance)

---

## ADR-014: CQRS Where It Makes Sense

**Status:** ✅ Accepted

**Context:**

CQRS (Command Query Responsibility Segregation) is powerful but can be overkill. When to use it?

**Decision:**

Use CQRS **selectively** based on complexity and requirements.

**CQRS Levels:**

| Service | CQRS Level | Rationale |
|---------|-----------|-----------|
| Identity | ✅ Basic CQRS | Commands for writes, queries for reads (same DB) |
| Tutor | ✅ Basic CQRS | Clear separation of concerns |
| Admin | ✅ Basic CQRS | Different models for commands/queries |
| Matching | ✅ Advanced CQRS | Write to PostgreSQL, read from Algolia |
| Communication | ❌ No CQRS | Simple CRUD, real-time updates |
| Booking | ✅ Basic CQRS | Complex business rules in commands |
| Payment | ✅ Event Sourcing + CQRS | Full audit trail required |

**Consequences:**

✅ **Pros:**
- Separation of concerns (clear boundaries)
- Optimized queries (different models)
- Testable (commands and queries isolated)
- Scalable (read/write scaling independent)

⚠️ **Cons:**
- More code than simple CRUD
- Need to sync read models (eventual consistency)
- Complexity for simple features

**Cost Impact:** $0 (pattern choice, improves maintainability)

---

## ADR-015: Start as Microservices from Day 1

**Status:** ✅ Accepted

**Context:**

Common advice: "Start with monolith, split later." But we've already identified clear bounded contexts through event storming.

**Decision:**

Build as **microservices from day 1**, but keep them simple initially.

**Rationale:**

| Factor | Our Situation | Decision |
|--------|--------------|----------|
| Bounded contexts | Clear (Identity, Tutor, Admin, etc.) | ✅ Microservices |
| Team structure | 2-3 developers (can own multiple services) | ✅ Microservices OK |
| Data isolation | Different databases needed | ✅ Microservices |
| Scaling requirements | Different per service | ✅ Microservices |
| Deployment | Independent deploys valuable | ✅ Microservices |

**Service Boundaries:**

```
edtech-platform/
├── apps/
│   ├── identity/      # Port 3000/3001 - Authentication, user management
│   ├── tutor/         # Port 3002/3003 - Tutor profiles, verification
│   ├── admin/         # Port 3004/3005 - Platform administration
│   ├── matching/      # Port 3006/3007 - Tutor search, matching
│   ├── communication/ # Port 3008/3009 - Chat, video calls
│   ├── booking/       # Port 3010/3011 - Lesson scheduling
│   └── payment/       # Port 3012/3013 - Payment processing
```

**Consequences:**

✅ **Pros:**
- No painful decomposition later
- Clear ownership (team can own 2-3 services)
- Independent scaling (scale hot services)
- Technology choice per service (if needed)
- Easier to reason about (bounded contexts)

⚠️ **Cons:**
- More setup initially (but NestJS monorepo helps)
- Need service discovery (using ALB + internal DNS)
- Must handle distributed failures (EventBridge retries)

**Cost Impact:** $0 (same infrastructure cost, organizational complexity)

---

## Summary: Key Decisions

| ADR | Decision | Impact | Cost Savings |
|-----|----------|--------|-------------|
| 001 | Terraform over CDK | Declarative IaC | $0 |
| 002 | NestJS CLI Monorepo | Code organization | $0 |
| 003 | Public Subnets | No NAT Gateway | **-$32/month** |
| 004 | Single RDS | Multiple databases | **-$30/month** |
| 005 | On-Demand ECS | Start/stop scripts | **-$210/month** |
| 006 | SSM Parameter Store | No Secrets Manager | **-$6/month** |
| 007 | Dual-Port Pattern | Clear API separation | $0 |
| 008 | Database-per-Service | Isolation via schemas | $0 |
| 009 | Domain-Driven Design | Clean architecture | $0 |
| 010 | PostgreSQL Primary | Relational data | $0 (free tier) |
| 011 | DynamoDB for Events | Event store only | $0 (free tier) |
| 012 | EventBridge | Async communication | $0 (free tier) |
| 013 | Drizzle ORM | Type-safe queries | $0 |
| 014 | CQRS Selective | Where it makes sense | $0 |
| 015 | Microservices Day 1 | Clear boundaries | $0 |

**Total Monthly Savings:** **$278/month** (Public subnets + Single RDS + On-demand ECS + SSM)
**Monthly Cost:** **~$2/month** (with on-demand usage strategy)

---

## Next Steps

1. Review these ADRs with the team
2. Set up infrastructure using Terraform (ADR-001)
3. Initialize NestJS monorepo (ADR-002)
4. Implement first service (Identity) following DDD (ADR-009)
5. Deploy to AWS with cost monitoring (ADR-005)

For implementation details, see:
- [INFRASTRUCTURE.md](INFRASTRUCTURE.md) - Terraform setup
- [SERVICE_STRUCTURE.md](SERVICE_STRUCTURE.md) - Service code organization
- [DEVELOPMENT.md](DEVELOPMENT.md) - Daily development workflow
- [COST_MANAGEMENT.md](COST_MANAGEMENT.md) - Cost tracking and optimization
