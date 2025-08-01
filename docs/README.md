# EdTech Platform Documentation

Welcome to the comprehensive documentation for the EdTech Platform backend. This documentation provides everything you need to understand, develop, deploy, and maintain the platform.

## 🚀 Quick Start

- **New to the project?** → [Getting Started Guide](development/getting-started.md)
- **Setting up development?** → [CLAUDE.md](../CLAUDE.md) for development commands
- **Understanding architecture?** → [Architecture Overview](#architecture)
- **Looking for API docs?** → [API Specifications](api-specifications/)

## 📚 Documentation by Role

### 👨‍💻 Developers

**Essential Reading:**
- [Getting Started Guide](development/getting-started.md) - Setup and development workflow
- [Implementation Phases](development/implementation-phases.md) - Complete project roadmap
- [Domain-Driven Design Guide](architecture/domain-driven-design.md) - DDD patterns and best practices
- [Authentication Guide](architecture/authentication-guide.md) - Security implementation

**Service-Specific:**
- [User Service](services/user-service.md) - User management and authentication
- [Learning Service](services/learning-service.md) - Course and lesson management
- [Payment Service](services/payment-service.md) - Payment processing
- [Other Services](services/) - Additional microservices

### 🏗️ Architects

**System Design:**
- [Microservices Architecture](architecture/microservices-architecture.md) - Overall system design
- [Domain-Driven Design Guide](architecture/domain-driven-design.md) - Service complexity strategy
- [Authentication Architecture](architecture/authentication-guide.md) - Security patterns
- [Business Rules](business-rules/) - Domain logic documentation

**Decision Records:**
- [Architecture Decisions](architecture-decisions/) - Design decisions and rationale
- [Service Boundary Analysis](architecture-decisions/service-boundary-analysis.md)

### 🚀 DevOps Engineers

**Infrastructure:**
- [Production Deployment](deployment/production-deployment.md) - AWS infrastructure setup
- [Infrastructure Setup](deployment/infrastructure-setup.md) - CDK and cloud resources
- [Monitoring Guide](deployment/monitoring-guide.md) - Observability setup

**Operations:**
- [Troubleshooting Guide](troubleshooting/) - Common issues and solutions
- [Deployment Guides](deployment-guides/) - Step-by-step deployment procedures

## 📖 Documentation Structure

### Architecture
High-level system design and patterns

- **[Authentication Guide](architecture/authentication-guide.md)** - Comprehensive auth/authz implementation
- **[Domain-Driven Design](architecture/domain-driven-design.md)** - DDD patterns and service complexity
- **[Microservices Architecture](architecture/microservices-architecture.md)** - System overview and design

### Development
Development workflow and implementation guidance

- **[Getting Started](development/getting-started.md)** - Development environment setup
- **[Implementation Phases](development/implementation-phases.md)** - Project roadmap and timelines
- **[Code Standards](development/code-standards.md)** - Coding conventions and quality

### Services
Service-specific documentation

- **[User Service](services/user-service.md)** - User management and profiles
- **[Learning Service](services/learning-service.md)** - Courses and lessons
- **[Payment Service](services/payment-service.md)** - Payment processing
- **[Tutor Matching Service](services/tutor-matching-service.md)** - Tutor discovery
- **[Other Services](services/)** - Additional microservices

### Deployment
Production deployment and operations

- **[Production Deployment](deployment/production-deployment.md)** - AWS infrastructure
- **[Infrastructure Setup](deployment/infrastructure-setup.md)** - CDK configuration
- **[Monitoring](deployment/monitoring-guide.md)** - Observability and alerting

## 🛠️ Common Development Tasks

### Getting Started
```bash
# Clone and setup
git clone <repository>
cd edtech-platform-backend
pnpm install

# Start development environment
pnpm run docker:up
pnpm run dev:setup
pnpm run start:dev
```

### Running Tests
```bash
# Unit tests
pnpm run test

# Integration tests
pnpm run test:integration

# E2E tests
pnpm run test:e2e

# With coverage
pnpm run test:cov
```

### Building and Deployment
```bash
# Build all services
pnpm run build

# Lint and fix
pnpm run lint

# Database operations
pnpm run migrate:all
pnpm run seed:all
```

### GraphQL Operations
```bash
# Compose schemas
pnpm run compose-schemas

# Validate schemas
pnpm run validate-schemas

# Start GraphQL gateway
pnpm run graphql:gateway
```

## 📋 Project Overview

### Technology Stack
- **Framework**: NestJS with TypeScript
- **Architecture**: Microservices with GraphQL Federation
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis
- **Authentication**: AWS Cognito
- **Events**: AWS EventBridge
- **File Storage**: AWS S3
- **Infrastructure**: AWS CDK

### Core Services
- **User Service**: User management, authentication, profiles
- **Learning Service**: Course content and learning paths
- **Payment Service**: Payment processing and billing
- **Tutor Matching Service**: Tutor-student matching
- **Content Service**: Media and file management
- **Reviews Service**: Reviews and ratings
- **Notification Service**: Messaging and alerts
- **Communication Service**: Real-time communication
- **Analytics Service**: Analytics and reporting
- **AI Service**: AI-powered features

### Shared Libraries
- **@edtech/auth**: Authentication and authorization
- **@edtech/types**: Shared TypeScript types
- **@edtech/config**: Configuration management
- **@edtech/security**: Security utilities
- **@edtech/service-auth**: Inter-service authentication
- **@edtech/cache**: Caching abstraction
- **@edtech/s3**: S3 file storage utilities

## 🎯 Implementation Status

### ✅ Completed (Phase 1)
- User Service with full domain implementation
- GraphQL Federation setup
- Service authentication
- Database infrastructure
- Event-driven architecture foundation

### 🟡 In Progress
- Tutor Matching Service (Phase 2)
- Session booking and payments (Phase 3)

### 🔴 Planned
- Reviews and notifications (Phase 4)
- Structured learning courses (Phase 5)
- AI and analytics (Phase 6)
- Production hardening (Phase 7)

See [Implementation Phases](development/implementation-phases.md) for detailed timeline.

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Run linting and type checking
4. Create pull request with description
5. Code review and approval
6. Merge to main

### Code Quality Standards
- **Test Coverage**: Minimum 80% for new code
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with TypeScript rules
- **Documentation**: Update docs for API changes

### Architecture Guidelines
- **Domain-Driven Design**: Follow established patterns
- **Event-Driven**: Use events for cross-service communication
- **Security**: Authentication required for all APIs
- **Performance**: Consider caching and optimization

## 📞 Support and Resources

### Documentation
- **API Documentation**: [api-specifications/](api-specifications/)
- **Business Rules**: [business-rules/](business-rules/)
- **Troubleshooting**: [troubleshooting/](troubleshooting/)

### Development Resources
- **NestJS Documentation**: https://docs.nestjs.com/
- **GraphQL Federation**: https://www.apollographql.com/docs/federation/
- **AWS CDK**: https://docs.aws.amazon.com/cdk/
- **TypeORM**: https://typeorm.io/

### Getting Help
- **Internal Documentation**: Check relevant service docs first
- **Architecture Questions**: Consult architecture decision records
- **Technical Issues**: Check troubleshooting guides
- **Development Setup**: See CLAUDE.md for development commands

---

This documentation is continuously updated as the platform evolves. For the most current information, always refer to the latest version in the repository.
