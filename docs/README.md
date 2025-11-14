# EdTech Platform Documentation

Complete documentation for the EdTech platform backend microservices.

---

## 📚 Documentation Index

### 🏗️ Architecture & Design

**[ARCHITECTURE.md](ARCHITECTURE.md)** - System Architecture
Complete system design with Mermaid diagrams covering microservices, bounded contexts, data architecture, security, and scalability strategies.

**[ADR-REVISED.md](ADR-REVISED.md)** - Architecture Decision Records
All 15 architectural decisions with detailed rationale including Terraform, NestJS monorepo, cost optimizations, DDD, and CQRS patterns.

**[SERVICE_STRUCTURE.md](SERVICE_STRUCTURE.md)** - Service Code Organization
Standard code structure for all microservices with layer responsibilities, naming conventions, and best practices.

---

### 🛠️ Development Guides

**[DEVELOPMENT.md](DEVELOPMENT.md)** - Development Workflow
Daily development practices including SSM + NestJS ConfigModule integration, local setup, environment management, and debugging.

**[TESTING.md](TESTING.md)** - Testing Strategies
Comprehensive testing guide covering unit tests, integration tests, E2E tests, and mocking strategies across all layers.

**[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - REST API Reference
Complete API contracts with dual-port pattern, authentication, endpoints, request/response examples, and cURL commands.

**[DRIZZLE_NESTJS_MODULE.md](DRIZZLE_NESTJS_MODULE.md)** - Drizzle ORM Integration
Zero-abstraction Drizzle module for NestJS with full type safety and DI support.

---

### 🚀 Infrastructure & Operations

**[INFRASTRUCTURE.md](INFRASTRUCTURE.md)** - Terraform Setup
Complete infrastructure as code setup with VPC, RDS, ECS, DynamoDB, security groups, and reusable Terraform modules.

**[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment Procedures
CI/CD pipelines, Docker builds, ECS deployment, rollback procedures, and emergency operations.

**[COST_MANAGEMENT.md](COST_MANAGEMENT.md)** - Free Tier Optimization
Detailed cost breakdown, free tier tracking, monitoring scripts, budget alerts, and $278/month savings strategies.

---

### 📖 Implementation Guides

**[MASTER_IMPLEMENTATION_GUIDE.md](MASTER_IMPLEMENTATION_GUIDE.md)** - Complete Implementation
Step-by-step guide to implement microservices from scratch with patterns, templates, and code examples.

**[implementation-plans/01-IDENTITY-SERVICE.md](implementation-plans/01-IDENTITY-SERVICE.md)** - Identity Service Guide
Detailed 7-phase implementation plan for Identity Service covering domain, infrastructure, application, presentation layers, testing, and deployment.

**[implementation-plans/04-INFRASTRUCTURE-TERRAFORM.md](implementation-plans/04-INFRASTRUCTURE-TERRAFORM.md)** - Terraform Guide
Complete infrastructure deployment guide with Terraform modules for AWS services, cost optimization, and troubleshooting.

**[implementation-plans/05-SHARED-LIBRARIES.md](implementation-plans/05-SHARED-LIBRARIES.md)** - Shared Libraries Guide
Step-by-step implementation for @edtech/auth, @edtech/s3, and @edtech/cache libraries with AWS integrations.

**[implementation-plans/06-SERVICE-TO-SERVICE-AUTH.md](implementation-plans/06-SERVICE-TO-SERVICE-AUTH.md)** - Service-to-Service Authentication
Security best practices and implementation guide for internal API authentication with API keys, JWT tokens, and AWS IAM roles.

**[implementation-plans/07-OBSERVABILITY-CLOUDWATCH.md](implementation-plans/07-OBSERVABILITY-CLOUDWATCH.md)** - CloudWatch Observability
Complete observability setup with CloudWatch Logs, Metrics, Alarms, Dashboards, and optional AWS X-Ray distributed tracing.

**[implementation-plans/08-OBSERVABILITY-LIBRARIES.md](implementation-plans/08-OBSERVABILITY-LIBRARIES.md)** - Observability Library
Unified @edtech/observability library with structured logging, CloudWatch Metrics, correlation IDs, and HTTP interceptors - all in one package.

---

### 🎓 Advanced Topics

**[CQRS_EVENT_SOURCING.md](CQRS_EVENT_SOURCING.md)** - CQRS & Event Sourcing
Command Query Responsibility Segregation patterns, event sourcing implementation with DynamoDB, and saga patterns.

---

## 🎯 Quick Navigation

### By Role

**For Developers:**
1. Start with [DEVELOPMENT.md](DEVELOPMENT.md) - Set up local environment
2. Read [SERVICE_STRUCTURE.md](SERVICE_STRUCTURE.md) - Understand code organization
3. Follow [implementation-plans/01-IDENTITY-SERVICE.md](implementation-plans/01-IDENTITY-SERVICE.md) - Build your first service

**For Architects:**
1. Review [ARCHITECTURE.md](ARCHITECTURE.md) - System design overview
2. Study [ADR-REVISED.md](ADR-REVISED.md) - Architecture decisions
3. Check [COST_MANAGEMENT.md](COST_MANAGEMENT.md) - Cost optimization

**For DevOps:**
1. Read [INFRASTRUCTURE.md](INFRASTRUCTURE.md) - Terraform setup
2. Follow [DEPLOYMENT.md](DEPLOYMENT.md) - CI/CD pipelines
3. Monitor [COST_MANAGEMENT.md](COST_MANAGEMENT.md) - Budget tracking

---

### By Task

**Setting Up Development Environment:**
- [DEVELOPMENT.md](DEVELOPMENT.md) - Local setup
- [DRIZZLE_NESTJS_MODULE.md](DRIZZLE_NESTJS_MODULE.md) - Database ORM

**Implementing a New Service:**
- [SERVICE_STRUCTURE.md](SERVICE_STRUCTURE.md) - Code structure
- [implementation-plans/01-IDENTITY-SERVICE.md](implementation-plans/01-IDENTITY-SERVICE.md) - Step-by-step guide
- [TESTING.md](TESTING.md) - Testing approach

**Deploying to AWS:**
- [INFRASTRUCTURE.md](INFRASTRUCTURE.md) - Terraform modules
- [implementation-plans/04-INFRASTRUCTURE-TERRAFORM.md](implementation-plans/04-INFRASTRUCTURE-TERRAFORM.md) - Detailed AWS setup
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment scripts

**Understanding Patterns:**
- [ARCHITECTURE.md](ARCHITECTURE.md) - Overall architecture
- [CQRS_EVENT_SOURCING.md](CQRS_EVENT_SOURCING.md) - CQRS patterns
- [ADR-REVISED.md](ADR-REVISED.md) - Why we chose these patterns

---

## 📋 Documentation Standards

All documentation follows these conventions:

### Structure
- **Table of Contents** at the top of each document
- **Clear sections** with descriptive headers
- **Code examples** with syntax highlighting
- **Mermaid diagrams** for visual representation
- **Links** to related documents

### Code Blocks
```typescript
// TypeScript examples use 'typescript' syntax
export class Example {}
```

```bash
# Bash commands use 'bash' syntax
pnpm install
```

```hcl
# Terraform uses 'hcl' syntax
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

### Conventions
- **Bold** for important concepts
- `Code` for file names, commands, and code references
- > Blockquotes for notes and warnings
- ✅ Checkmarks for completed items
- 🔜 Arrows for upcoming features

---

## 🔄 Keeping Documentation Updated

### When to Update Documentation

**Code Changes:**
- New service added → Update ARCHITECTURE.md
- API endpoint changed → Update API_DOCUMENTATION.md
- New deployment step → Update DEPLOYMENT.md

**Infrastructure Changes:**
- Terraform module added → Update INFRASTRUCTURE.md
- New AWS service → Update COST_MANAGEMENT.md
- Deployment process changed → Update DEPLOYMENT.md

**Architecture Decisions:**
- Pattern change → Update ADR-REVISED.md
- Technology switch → Update ARCHITECTURE.md
- New optimization → Update COST_MANAGEMENT.md

---

## 📞 Getting Help

### Finding Information

1. **Start with the index** - This README
2. **Check relevant section** - Architecture, Development, or Operations
3. **Search for keywords** - Use Ctrl+F in documents
4. **Follow links** - Documents reference each other

### Still Can't Find It?

- Check the [main README.md](../README.md) for project overview
- Look in [CLAUDE.md](../CLAUDE.md) for AI assistant guidance
- Review [GETTING_STARTED.md](../GETTING_STARTED.md) for initial setup

---

## 🎉 Documentation Highlights

### Most Useful Documents

**🥇 For New Developers:**
[implementation-plans/01-IDENTITY-SERVICE.md](implementation-plans/01-IDENTITY-SERVICE.md) - Complete step-by-step implementation guide

**🥈 For Understanding the System:**
[ARCHITECTURE.md](ARCHITECTURE.md) - System architecture with diagrams

**🥉 For Cost Management:**
[COST_MANAGEMENT.md](COST_MANAGEMENT.md) - $278/month savings strategies

---

## 📊 Documentation Stats

- **Total Documents:** 15+ files
- **Lines of Documentation:** ~20,000 lines
- **Code Examples:** 200+ snippets
- **Mermaid Diagrams:** 25+ diagrams
- **Last Updated:** November 2025

---

**Need to add new documentation?** Follow the structure and conventions outlined above.

**Found an error?** Update the relevant document and submit a PR.

**Want to contribute?** Read [DEVELOPMENT.md](DEVELOPMENT.md) first!
