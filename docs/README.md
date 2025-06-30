# EdTech Platform Documentation

This directory contains comprehensive documentation for the EdTech platform backend system.

## 📋 Business Documentation

### [User Domain Business Processes & Rules](./business-rules/user-domain-business-processes.md)
**For**: Product Managers, Business Analysts, QA Team, Stakeholders
**Purpose**: Business-focused documentation of user lifecycle, role management, security policies, and reputation systems

**Key Topics**:
- 👥 User roles and progression paths (Student → Tutor → Admin)
- 🔄 Account lifecycle and security policies
- ⭐ Reputation scoring and tutor tier classification
- 🛡️ Security rules and access control
- 📊 Business metrics and operational workflows

## 🏗️ Architecture Documentation

### [Service Boundary Analysis](./architecture-decisions/service-boundary-analysis.md)
**For**: Backend Developers, System Architects, Technical Leads
**Purpose**: Architectural decision record on domain separation between User Service and Tutor Matching Service

**Key Topics**:
- 🎯 Domain-driven design analysis
- 📊 Current vs recommended service responsibilities
- 🔧 Integration patterns and migration strategy
- ✅ Short-term and long-term architectural decisions

## 📁 Directory Structure

```
docs/
├── README.md                          # This index file
├── business-rules/                    # Business process documentation
│   └── user-domain-business-processes.md
├── architecture-decisions/            # Technical architecture decisions
│   └── service-boundary-analysis.md
├── api-specifications/               # API documentation
├── deployment-guides/                # Deployment instructions
└── troubleshooting/                  # Common issues and solutions
```

## 🔗 Related Documentation

- **Implementation Plans**: See `.implementation-plan/` for detailed development phases
- **Domain Model**: See `apps/user-service/src/domain/` for technical implementation
- **API Specs**: See `docs/api-specifications/` (to be created in later phases)

## 📝 Documentation Standards

- **Business Docs**: Focus on processes, rules, and workflows (non-technical)
- **Architecture Docs**: Technical decisions, patterns, and system design
- **API Docs**: Interface specifications and usage examples
- **Operations Docs**: Deployment, monitoring, and troubleshooting guides

---

**Last Updated**: Phase 1, Day 7 - Enhanced Domain Implementation
