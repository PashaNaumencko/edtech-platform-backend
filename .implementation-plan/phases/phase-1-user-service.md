# Phase 1: Core Infrastructure & User Service (Updated with Preply Insights)
**Sprint 2-4 | Duration: 3 weeks**

## Phase Objectives
Establish the core AWS infrastructure and implement the User Service with **Preply-inspired onboarding patterns** including social authentication, browse-before-register flow, and progressive data collection, forming the foundation for all other microservices.

### Key Preply Adoptions in This Phase
1. **Social Authentication Priority**: Google, Facebook, Apple as primary signup methods
2. **Browse-Before-Register Flow**: Anonymous exploration before account creation
3. **Progressive Data Collection**: Minimal signup data, detailed info during booking
4. **Auto-Timezone Detection**: Seamless scheduling setup
5. **Tutor Video Introduction Infrastructure**: Upload and storage foundation

## Phase Dependencies
- **Prerequisites**: Phase 0 (Project Setup & Foundation) completed
- **Requires**: Docker environment, LocalStack, PostgreSQL, development scripts operational
- **Outputs**: Functional User Service, AWS infrastructure, social authentication system

## Detailed Subphases

### 1.1 AWS CDK Infrastructure Setup
**Duration: 3 days | Priority: Critical**

#### Network Infrastructure (NetworkStack)
- VPC Configuration with public/private subnets
- Security Groups for User Service and PostgreSQL
- VPC Endpoints for AWS services (cost optimization)

#### Shared Services Infrastructure
- **Enhanced Amazon Cognito setup** with Google, Facebook, Apple as priority providers
- **S3 buckets**: Static content + **tutor video introduction storage**
- **CloudFront CDN**: Global video content delivery
- EventBridge Event Bus for microservices communication
- **Parameter Store/Secrets Manager**: Social auth credentials and API keys

#### User Service Infrastructure
- RDS PostgreSQL dedicated instance
- ECS Cluster and Fargate service
- Internal Application Load Balancer

### 1.2 User Service Domain Implementation
**Duration: 4 days | Priority: Critical**

#### DDD + CQRS Structure Setup
- Follow [Architectural Patterns Guide](../reference/architectural-patterns-guide.md) for folder structure
- Implement clean architecture layers: Domain → Application → Infrastructure
- Set up proper dependency inversion with interfaces

#### Domain Layer Architecture
- User Aggregate with proper business logic
- Value Objects (UserId, Email, Password)
- Domain Events (UserCreated, SocialAccountLinked, ProfileUpdated)
- Business rules and invariants
- Repository interfaces (no implementations in domain)

#### Domain Services
- User creation and validation logic
- Social account linking rules
- Profile update constraints
- Password policy enforcement

### 1.3 User Service Application Layer
**Duration: 3 days | Priority: Critical**

#### CQRS Implementation
- Commands: CreateUser, UpdateUser, LinkSocialAccount
- Queries: GetUserById, GetUserByEmail
- Command/Query Handlers with validation

#### DTOs and Response Models
- Request/Response DTOs with validation
- Data mapping between layers
- API contract definitions

### 1.4 User Service Infrastructure Layer
**Duration: 4 days | Priority: Critical**

#### Database Integration
- TypeORM Entity mapping
- Repository implementation
- Database connection configuration

#### Social Authentication Integration
- Cognito service integration
- Google/Facebook/Apple OAuth handlers
- Token validation and user creation

#### REST API Controllers
- User CRUD endpoints
- Social authentication endpoints
- Health check and monitoring

### 1.5 Preply-Inspired UX Features
**Duration: 3 days | Priority: High**

#### Browse-Before-Register Implementation
- **Anonymous session handling**: Temporary user state for browsing
- **Guest cart/favorites**: Store tutor preferences before signup
- **Just-in-time registration**: Trigger signup only when booking/messaging

#### Progressive Data Collection
- **Minimal signup form**: Name, email, password only
- **Onboarding wizard**: Collect additional details post-registration
- **Contextual data gathering**: Learning goals during first booking

#### Auto-Timezone & Localization
- **IP-based timezone detection**: Automatic timezone setting
- **Browser timezone fallback**: Client-side detection
- **Locale preferences**: Currency, language, date format

#### Video Introduction Infrastructure
- **Secure upload endpoints**: Pre-signed S3 URLs for tutor videos
- **Video processing pipeline**: Format validation, compression
- **CDN integration**: Global video delivery optimization

### 1.6 Database Migration & Seeding
**Duration: 2 days | Priority: Medium**

#### Migration Setup
- Initial users table creation with **progressive profile fields**
- **Timezone and locale columns**
- **Video introduction metadata** storage
- Indexes and constraints
- Database triggers

#### Seed Data
- Admin user creation
- Test users with **various timezone and social auth** combinations
- Role and permission setup

## Success Criteria

### Technical Acceptance Criteria
- User Service deploys successfully to ECS Fargate
- PostgreSQL database migrations run successfully
- Social authentication works for all providers
- JWT token validation is functional
- Domain events published to EventBridge
- All unit tests pass (>80% coverage)

### Functional Acceptance Criteria
- **Anonymous users can browse** tutors/courses without creating account
- Users can register with **social auth as priority** (Google/Facebook/Apple)
- **Auto-timezone detection** works on signup
- **Progressive data collection** flows correctly (minimal → detailed)
- **Video introduction upload** works for tutor accounts
- Users can sign in with social providers
- Social accounts can be linked to existing users
- User profiles can be updated
- Role-based access control works

### Security Acceptance Criteria
- Passwords properly hashed via Cognito
- JWT tokens validated on protected endpoints
- Social provider tokens validated
- Database connections use SSL

## Risk Mitigation

### Technical Risks
- **Cognito Social Provider Setup**: Test with actual provider credentials
- **Database Connection Issues**: Implement connection pooling and retry logic
- **Event Delivery Failures**: Implement outbox pattern

### Security Risks
- **Social Token Validation**: Implement rate limiting
- **User Enumeration**: Generic error messages
- **Data Exposure**: Audit API responses

## Key Performance Indicators

### Performance Metrics
- API Response Time: < 200ms for 95% of requests
- Database Query Time: < 50ms for simple queries
- Social Auth Flow: < 3 seconds end-to-end

### Scalability Metrics
- Support 1000+ concurrent users
- Memory Usage: < 256MB per container
- CPU Usage: < 50% under normal load

## Phase Timeline

| Subphase | Duration | Dependencies | Critical Path |
|----------|----------|--------------|---------------|
| 1.1 AWS Infrastructure | 3 days | Phase 0 | Yes |
| 1.2 Domain Implementation | 4 days | 1.1 | Yes |
| 1.3 Application Layer | 3 days | 1.2 | Yes |
| 1.4 Infrastructure Layer | 4 days | 1.3 | Yes |
| 1.5 Preply-Inspired UX Features | 3 days | 1.4 | Yes |
| 1.6 Database & Seeding | 2 days | 1.5 | No |

**Total Duration**: 19 days (3.8 weeks)  
**Buffer**: +2 days for integration testing  
**Updated Timeline**: Sprint 2-4 (4 weeks total with buffer)

---

**Previous Phase**: [Phase 0: Project Setup & Foundation](phase-0-project-setup.md)  
**Next Phase**: [Phase 2: Learning Service & Educational Content](phase-2-learning-service.md) 