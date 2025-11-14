# EdTech Platform - Backend

**1-to-1 Tutor-Student Matching Platform**

A production-ready microservices backend built with NestJS, Domain-Driven Design, and AWS free-tier optimization.

---

## 🎯 Overview

**Platform Type:** 1-to-1 Tutor-Student Matching (Mathematics & Programming Education)
**Business Model:** 20% commission on completed lessons
**Architecture:** Microservices with DDD, CQRS, Event-Driven
**Infrastructure:** Terraform + AWS (Free Tier Optimized)
**Monorepo:** NestJS CLI with Apps and Libs

**Monthly Cost:** ~$2/month with on-demand strategy (savings: $278/month from optimizations)

---

## 🚀 Quick Start

### Prerequisites

```bash
node --version    # v20+
pnpm --version    # v8+
docker --version  # Latest
terraform --version # v1.6+
aws --version     # v2.x
```

### Local Development (No AWS Costs)

```bash
# 1. Clone and install
git clone <your-repo-url>
cd edtech-platform-backend
pnpm install

# 2. Start local infrastructure (PostgreSQL, Redis)
cd docker
docker compose up -d

# 3. Run migrations
pnpm run migrate:all

# 4. Start services
pnpm run start:dev identity  # Port 3000/3001
pnpm run start:dev tutor     # Port 3002/3003
pnpm run start:dev admin     # Port 3004/3005

# All services connect to:
# - Local PostgreSQL (Docker)
# - Local Redis (Docker)
# - Real AWS services (Cognito, DynamoDB, S3) via free tier
```

### Deploy to AWS (For Demos Only)

```bash
# 1. Deploy infrastructure (one-time setup)
cd infrastructure/environments/dev
terraform init
terraform apply  # Creates VPC, RDS, Cognito, etc.

# 2. Build and push Docker images
pnpm run docker:build:all
pnpm run docker:push:all

# 3. Start ECS services (on-demand)
./infrastructure/scripts/start-services.sh

# 4. After demo, STOP services to save costs
./infrastructure/scripts/stop-services.sh

# Cost: $0.03/hour (3 services × $0.01/hr)
```

---

## 📁 Project Structure

```
edtech-platform-backend/
├── apps/                      # Microservices
│   ├── identity/              # Port 3000/3001 - Authentication, users
│   ├── tutor/                 # Port 3002/3003 - Tutor profiles, verification
│   ├── admin/                 # Port 3004/3005 - Platform administration
│   ├── matching/              # Port 3006/3007 - Search, matching (planned)
│   ├── communication/         # Port 3008/3009 - Chat, video (planned)
│   ├── booking/               # Port 3010/3011 - Scheduling (planned)
│   └── payment/               # Port 3012/3013 - Payments (planned)
│
├── libs/                      # Shared Libraries
│   ├── shared-kernel/         # DDD base classes, SSM config
│   ├── common/                # Common utilities
│   └── config/                # Configuration modules
│
├── infrastructure/            # Terraform Infrastructure
│   ├── modules/               # Reusable Terraform modules
│   ├── environments/          # Environment configs (dev/staging/prod)
│   └── scripts/               # Deployment automation
│
├── docker/                    # Local development
│   ├── docker-compose.yml     # PostgreSQL, Redis
│   └── .env.example           # Environment template
│
└── docs/                      # 📚 Complete Documentation
    ├── ARCHITECTURE.md        # System architecture + diagrams
    ├── ADR-REVISED.md         # All architecture decisions
    ├── SERVICE_STRUCTURE.md   # Code organization patterns
    ├── DEVELOPMENT.md         # Daily workflow + SSM integration
    ├── INFRASTRUCTURE.md      # Terraform setup
    ├── DEPLOYMENT.md          # Deployment procedures
    ├── COST_MANAGEMENT.md     # Free-tier optimization
    ├── TESTING.md             # Testing strategies
    ├── API_DOCUMENTATION.md   # API contracts
    ├── CQRS_EVENT_SOURCING.md # Event-driven patterns
    └── MASTER_IMPLEMENTATION_GUIDE.md # Step-by-step guide
```

---

## 📚 Complete Documentation

### Core Documentation

| Document | Purpose | Key Topics |
|----------|---------|------------|
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | System architecture with Mermaid diagrams | Microservices, Bounded contexts, Data architecture, Security, Scalability |
| **[ADR-REVISED.md](docs/ADR-REVISED.md)** | All 15 architecture decisions with rationale | Terraform, NestJS monorepo, Cost optimizations, DDD, CQRS |
| **[SERVICE_STRUCTURE.md](docs/SERVICE_STRUCTURE.md)** | Code organization patterns for each service | Domain layer, Application layer, Infrastructure, Presentation |
| **[MASTER_IMPLEMENTATION_GUIDE.md](docs/MASTER_IMPLEMENTATION_GUIDE.md)** | Step-by-step implementation from scratch | Complete service implementation, Patterns, Templates |

### Development Guides

| Document | Purpose | Key Topics |
|----------|---------|------------|
| **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** | Daily development workflow | SSM + NestJS ConfigModule, Local setup, Environment management, Debugging |
| **[TESTING.md](docs/TESTING.md)** | Testing strategies across all layers | Unit tests, Integration tests, E2E tests, Mocking strategies |
| **[API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)** | REST API contracts and examples | Dual-port pattern, Endpoints, Authentication, cURL examples |

### Infrastructure & Operations

| Document | Purpose | Key Topics |
|----------|---------|------------|
| **[INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)** | Terraform modules and AWS setup | VPC, RDS, ECS, DynamoDB, Security groups, Terraform modules |
| **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** | Deployment procedures and scripts | CI/CD, Docker, ECS deployment, Rollback, Emergency procedures |
| **[COST_MANAGEMENT.md](docs/COST_MANAGEMENT.md)** | Free-tier tracking and optimization | Cost breakdown, Monitoring, Budget alerts, Savings strategies |

### Advanced Topics

| Document | Purpose | Key Topics |
|----------|---------|------------|
| **[CQRS_EVENT_SOURCING.md](docs/CQRS_EVENT_SOURCING.md)** | CQRS patterns and event sourcing | Basic CQRS, Advanced CQRS, Event Store (DynamoDB), Sagas |

---

## 🏗️ Architecture Highlights

### Key Architectural Decisions

1. **Terraform over AWS CDK** - Declarative, version-controlled IaC
2. **NestJS CLI Monorepo** - Single codebase, shared libraries
3. **Public Subnets (No NAT Gateway)** - Saves $32/month
4. **Single RDS, Multiple Databases** - Saves $30/month
5. **On-Demand ECS (Start/Stop)** - Saves $210/month
6. **SSM Parameter Store** - Saves $6/month vs Secrets Manager
7. **Dual-Port Pattern** - Public (3000) + Internal (3001) APIs
8. **Database-per-Service** - Logical isolation via separate databases
9. **Domain-Driven Design** - Clean architecture with DDD patterns
10. **PostgreSQL Primary** - Relational data with Drizzle ORM
11. **DynamoDB for Events** - Event store only
12. **EventBridge for Communication** - Async, pub/sub messaging
13. **Drizzle ORM** - Type-safe, lightweight (7 KB)
14. **CQRS Where It Makes Sense** - Selective use based on complexity
15. **Microservices from Day 1** - Clear bounded contexts

**Total Savings:** $278/month from architecture optimizations

---

## 🛠️ Technology Stack

### Backend Framework
- **NestJS 10** - TypeScript framework
- **Node.js 20** - JavaScript runtime

### Architecture Patterns
- **Domain-Driven Design (DDD)** - Bounded contexts, aggregates, value objects
- **CQRS** - Command Query Responsibility Segregation
- **Event-Driven** - Async communication via EventBridge

### Database & ORM
- **PostgreSQL** - Primary database (RDS db.t3.micro)
- **Drizzle ORM** - Type-safe SQL query builder
- **DynamoDB** - Event store (on-demand)
- **Redis** - Caching and sessions

### AWS Services
- **ECS Fargate** - Container orchestration
- **RDS PostgreSQL** - Managed database
- **DynamoDB** - NoSQL for events
- **Cognito** - User authentication
- **EventBridge** - Event bus
- **S3** - File storage
- **SSM Parameter Store** - Secrets management
- **CloudWatch** - Logging and monitoring

### Infrastructure
- **Terraform 1.6+** - Infrastructure as Code
- **Docker** - Containerization
- **GitHub Actions** - CI/CD

---

## 🎯 Key Features

### Implemented Services

#### Identity Service (Port 3000/3001)
- ✅ User registration (students & tutors)
- ✅ Login with JWT tokens (AWS Cognito)
- ✅ Email verification
- ✅ Password reset
- ✅ COPPA compliance (parent consent for minors)
- ✅ Role-based access control

#### Tutor Service (Port 3002/3003)
- ✅ Tutor profile creation
- ✅ Document upload to S3
- ✅ Verification workflow
- ✅ Subject & expertise management
- ✅ Hourly rate setting
- ✅ Availability scheduling

#### Admin Service (Port 3004/3005)
- ✅ Tutor verification review
- ✅ Approve/reject tutors
- ✅ User management
- ✅ Platform monitoring
- ✅ Analytics dashboard

### Planned Services

- **Matching Service** - Smart tutor search (Algolia), student-tutor matching
- **Communication Service** - Real-time chat, video lessons (Agora.io)
- **Booking Service** - Lesson scheduling, calendar sync
- **Payment Service** - Stripe payments, commission calculation, tutor payouts

---

## 🧪 Testing

```bash
# Unit tests (domain logic)
pnpm test

# Integration tests (with Docker)
docker compose up -d
pnpm test:integration

# E2E tests (full flow)
pnpm test:e2e

# Test coverage
pnpm test:cov

# Test specific service
pnpm test identity
```

**Coverage Requirements:** >80% overall, >90% for domain layer

---

## 🚢 Deployment

### Infrastructure Management

```bash
# Deploy infrastructure
cd infrastructure/environments/dev
terraform init
terraform plan
terraform apply

# Start services (desired_count = 1)
./infrastructure/scripts/start-services.sh

# Stop services (desired_count = 0)
./infrastructure/scripts/stop-services.sh
```

### Cost Control

```bash
# Check current month's costs
./infrastructure/scripts/check-costs.sh

# Check if services are running
aws ecs list-tasks --cluster edtech-dev --desired-status RUNNING

# Emergency stop (saves money immediately)
aws ecs update-service --cluster edtech-dev --service identity-service --desired-count 0
```

---

## 💰 Cost Breakdown

### Current Setup (Free Tier Optimized)

| Resource | Configuration | Free Tier | Monthly Cost |
|----------|--------------|-----------|-------------|
| RDS PostgreSQL | db.t3.micro, 20GB | ✅ 750 hrs/month | $0 |
| ECS Fargate | 0.25 vCPU, 0.5 GB | ❌ Pay per second | $0.01/hour |
| DynamoDB | On-demand, <25 GB | ✅ 25 GB + 25 RCU/WCU | $0 |
| S3 | Standard storage | ✅ 5 GB + 20K GET | $0 |
| Cognito | User Pool | ✅ <50,000 MAU | $0 |
| EventBridge | Event routing | ✅ 1M events/month | $0 |
| SSM Parameters | Standard tier | ✅ Unlimited | $0 |

**Total Monthly Cost:**
- **On-demand (2 hrs/day for demos):** ~$2/month ✅
- **Always-on (24/7):** $216/month
- **Savings from optimizations:** $278/month

See [COST_MANAGEMENT.md](docs/COST_MANAGEMENT.md) for detailed cost tracking.

---

## 🤝 Contributing

### Code Standards

- **Language:** TypeScript (strict mode)
- **Framework:** NestJS 10
- **Architecture:** DDD + CQRS + Event-Driven
- **ORM:** Drizzle (type-safe)
- **Testing:** Jest (>80% coverage)
- **Linting:** ESLint (required before commit)

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-email-verification

# 2. Lint code (REQUIRED before commit)
pnpm run lint

# 3. Run tests
pnpm test identity

# 4. Commit changes
git commit -m "feat(identity): add email verification"
```

### Commit Convention

```bash
feat(identity): add COPPA compliance for minors
fix(tutor): resolve document upload S3 permissions
docs(readme): update cost tracking section
refactor(admin): improve verification decision logic
test(identity): add unit tests for Email value object
```

---

## 📞 Support & Resources

### Documentation

- **Main Docs:** [docs/](docs/)
- **Architecture:** [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Development:** [DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **API Reference:** [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

### External Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [AWS Free Tier](https://aws.amazon.com/free/)

---

## 🗺️ Roadmap

### ✅ Phase 1: Core Platform (Current)
- Identity, Tutor, Admin Services
- Infrastructure (Terraform)
- Local development setup

### 🔜 Phase 2: Matching & Discovery (Next)
- Matching Service
- Algolia integration
- Match algorithm

### 📅 Phase 3: Communication
- Real-time chat
- Video lessons (Agora.io)

### 📅 Phase 4: Booking & Payments
- Lesson booking
- Stripe payments
- Commission handling

---

## ⚠️ Important Notes

### Free Tier Expiration

After 12 months, AWS Free Tier expires for:
- **RDS:** ~$15/month (db.t3.micro)
- **ECS:** Pay per second (no free tier)

### Best Practices

- ✅ Always stop ECS services after demos
- ✅ Monitor costs weekly
- ✅ Use local development for daily work
- ✅ Never commit `.env` files
- ✅ Review security groups monthly

---

## 📈 Current Metrics

- **Services:** 3 microservices deployed
- **Lines of Code:** ~15,000 (TypeScript)
- **Test Coverage:** >80%
- **Monthly Cost (Demo):** ~$2
- **Deployment Time:** ~5 minutes

---

**Built with ❤️ using NestJS, Terraform, and AWS Free Tier**

🚀 Ready to start? Follow the [Quick Start](#-quick-start) guide or dive into the complete [documentation](docs/)!
