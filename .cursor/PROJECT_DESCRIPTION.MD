EdTech Platform: Comprehensive Architectural & Development Guide for AI Assistants
This document provides a holistic view of the EdTech platform's architecture, technology stack, and development workflow. It is intended to serve as the primary context for AI assistants like Cursor, enabling them to provide accurate, consistent, and context-aware assistance throughout the project's lifecycle.

1. Project Overview & Core Principles
The goal is to build a scalable, maintainable, and feature-rich EdTech platform focused on **mathematics and programming education**. The platform enables student onboarding, personalized tutor matching, real-time communication (chat, video calls), and AI-powered learning assistance.

**Core Learning Models:**
1. **Private Lessons**: One-on-one tutoring sessions with per-lesson payment
2. **Course Enrollment**: Students enroll in tutor-created courses with full course payment

The platform specializes in math (algebra, calculus, statistics, etc.) and programming (Python, JavaScript, algorithms, data structures, etc.) subjects.

**Key Platform Features:**
- Comprehensive review and rating system for tutors and courses
- Knowledge verification through certifications and student feedback
- Separate discovery flows for tutor matching and course browsing

Core Architectural Principles:

Microservices: The application is decomposed into independent, loosely coupled services, each responsible for a specific business domain.

Domain-Driven Design (DDD): Each microservice is organized around a Bounded Context, with a rich Domain Model encapsulating business logic and rules.

Clean Architecture: Strict separation of Application, Domain, and Infrastructure layers, ensuring the core business logic remains independent of external frameworks, databases, and UI concerns.

Serverless First: Maximizing the use of AWS managed serverless compute (AWS Fargate, AWS Lambda) and services to reduce operational overhead, improve scalability, and optimize costs.

Event-Driven Architecture (EDA): Asynchronous communication between microservices primarily via Amazon EventBridge, promoting loose coupling and resilience. The Outbox Pattern is used within each microservice to reliably publish domain events, ensuring atomicity between local database transactions and event publishing.

Unified Client API: A single GraphQL API endpoint is exposed to clients via AWS AppSync, handling queries, mutations, and real-time subscriptions.

AI Integration: AI capabilities are both a core product feature (Intelligent Learning Assistant) and a key enabler in the development workflow (e.g., Cursor AI).

2. Overall Technology Stack
Backend Framework: NestJS (TypeScript)

Containerization: Docker

Infrastructure as Code (IaC): AWS Cloud Development Kit (CDK) - TypeScript

Cloud Provider: Amazon Web Services (AWS)

Local Development: LocalStack, Docker Compose, awslocal, cdklocal

Real-time Video: Agora.io SDK (integrated via backend token generation)

Real-time Chat: AWS AppSync (GraphQL Subscriptions) + Amazon DynamoDB (direct integration)

3. Microservices & Their AWS Tech Stack
The platform is composed of several microservices, each owning its specific domain data and exposing internal APIs. The platform provides a unified GraphQL API for frontend applications developed in a separate monorepo.

**Note**: Frontend applications (web and mobile) are developed and maintained in a separate repository. This backend monorepo focuses exclusively on API services, data management, and business logic.

3.1. User Service
Responsibility: Core user identity (registration, login, basic profile management for all user types: student, tutor, admin), authentication with social providers.

Compute: AWS Fargate (within an ECS Cluster) - For NestJS application.

Database: Amazon RDS PostgreSQL (dedicated instance) - Relational data with ACID transactions for user identity management, role-based access control, and user relationships.

Authentication Provider: Amazon Cognito User Pools - Managed user directory and identity provider with social authentication.

Social Authentication: Google OAuth 2.0, Facebook Login, Apple Sign-In integration via Cognito Identity Providers.

Key Data Owned: User ID (UID from Cognito), email, hashed password (managed by Cognito for email/password users), social provider IDs, first name, last name, role (STUDENT, TUTOR, ADMIN), account status, authentication method (email/password vs social provider).

3.2. Courses Service
Responsibility: Manages course content, lesson structure, course enrollment, and educational materials. Handles both structured courses and private lesson scheduling.

Compute: AWS Fargate (within an ECS Cluster) - For NestJS application.

Database: Amazon DynamoDB - For flexible course and lesson data structure, optimized for fast content delivery and enrollment tracking.

Content Storage: Amazon S3 - For course materials (videos, documents, code examples, mathematical formulas, programming exercises).

Key Data Owned: Course ID, course title, description, subject categories (math/programming subcategories), lesson structure, course materials, enrollment data, instructor assignments, course type (structured course vs. private lesson availability), pricing model (per-lesson vs. full-course), course completion statistics.

3.3. Tutor Matching Service
Responsibility: Manages tutor-specific professional profiles focused on math and programming expertise. Handles tutor matching for private lessons using sophisticated relationship-based algorithms.

Compute: AWS Fargate (within an ECS Cluster) - For NestJS application.

Profile Database: Amazon DynamoDB (dedicated tables) - Document-oriented storage for flexible tutor profile data, optimized for fast profile lookups and updates.

Graph Database: Neo4j (local development) / Amazon Neptune (production) - Dedicated graph database for complex matching relationships, skill networks, and recommendation algorithms. Essential for sophisticated tutor-student matching logic.

Key Data Owned: Tutor ID (linked to User Service's User ID), math specializations (algebra, calculus, statistics, etc.), programming languages (Python, JavaScript, Java, etc.), hourly rate for private lessons, availability for private sessions, bio, knowledge verification status (certifications, feedback-based verification), teaching style, matching preferences, skill relationships.

3.4. Payment Service
Responsibility: Handles dual payment models - per-lesson payments for private tutoring and full-course payments for course enrollments. Manages commission calculations, tutor payouts, and financial transaction management.

Compute: AWS Fargate (within an ECS Cluster) - For payment processing logic.

Database: Amazon RDS PostgreSQL (dedicated instance) - Critical for financial data requiring ACID compliance, complex financial reporting, transactional integrity, and regulatory compliance. Essential for audit trails and financial analytics.

Payment Provider: Stripe Connect - For payment processing and tutor payouts.

Webhook Processing: AWS Lambda - For handling Stripe webhooks and payment events.

Key Data Owned: Payment ID, transaction amounts, payment type (per-lesson vs. full-course), commission calculations (20% platform fee), tutor earnings, payment status, refund records, invoice data, lesson session records, course enrollment payments, subscription management for ongoing course access.

3.5. Reviews Service
Responsibility: Manages all reviews and ratings across the platform - both tutor reviews and course reviews. Centralized for consistent review policies, moderation, and analytics.

Compute: AWS Fargate (within an ECS Cluster) - For NestJS application.

Database: Amazon RDS PostgreSQL (dedicated instance) - Enables complex review analytics, aggregation calculations, review moderation workflows, and sophisticated reporting. Relational structure supports review relationships and integrity constraints.

Key Data Owned: Review ID, reviewer ID, subject ID (tutor or course), review type, rating, review text, review categories, timestamps, moderation status, helpfulness votes, review responses, aggregated ratings.

3.6. Chat Service
Responsibility: Manages chat session metadata (who is in a chat, chat type, last message preview). Actual message exchange and real-time synchronization are offloaded directly to AppSync/DynamoDB from clients.

Compute: AWS Fargate (within an ECS Cluster) - For managing chat session metadata.

Database: Amazon DynamoDB (dedicated tables) - Optimized for high-volume messaging with ChatSessions and ChatMessages tables. Document structure perfect for real-time messaging, message history, and session management.

Push Notifications: Amazon SNS / Amazon Pinpoint (triggered by Lambda processing DynamoDB Streams from ChatMessages table).

Key Data Owned: Chat Session ID, lessonId (if applicable), participantIds, chat type, lastMessageTimestamp, lastMessagePreview, message history, typing indicators.

3.7. Video Call Service
Responsibility: Generates secure meeting and attendee tokens for real-time video calls. Acts as a backend wrapper around the Agora.io SDK.

Compute: AWS Lambda - Highly efficient for stateless token generation.

Database: Amazon DynamoDB (dedicated table) - Lightweight storage for call session metadata, call history, and recording references. Document structure suitable for simple call tracking.

Video Call Provider: Agora.io SDK (via Node.js agora-access-token package).

Key Data Owned: Call session ID, meeting ID, participant tokens, call duration, call status, recording URLs (if applicable).

3.8. AI Learning Assistant Service (Future Enhancement)
Responsibility: Provides intelligent Q&A and learning assistance to students (Retrieval Augmented Generation - RAG). Also handles the content ingestion pipeline for the knowledge base.

Compute: AWS Lambda - For Q&A processing (request-response) and knowledge ingestion (event-driven).

Foundation Models (LLMs & Embeddings): Amazon Bedrock - Provides API access to various Large Language Models (e.g., Claude 3) and Embedding models (e.g., Titan Embeddings).

Vector Database (Knowledge Base): Amazon OpenSearch Service (with Vector Engine) - Stores vector embeddings of course content for semantic search.

AI Chat History DB: Amazon DynamoDB - Stores student-AI conversation history for context.

Key Data Owned: AI conversation turns, references to knowledge chunks (stored in OpenSearch).

Note: AI integration is planned as a secondary priority after core platform features are implemented.

4. Communication & API Layer
4.1. Inter-Service Communication (Asynchronous)
Technology: Amazon EventBridge.

Pattern: Event-Driven Architecture (Choreography-based Saga).

Mechanism: Microservices publish domain events (e.g., UserCreatedEvent, TutorProfileUpdatedEvent, ChatMessageSentEvent) to a central EventBridge Event Bus. Other interested microservices create EventBridge Rules to subscribe to specific events and trigger their own processing (e.g., via SQS queues triggering Lambdas, or directly invoking Lambdas).

Reliability: The Outbox Pattern is implemented within each microservice. This ensures atomicity between local database transactions (e.g., saving a new user) and the publication of an event to EventBridge. A dedicated Lambda polls the local outbox table and publishes events.

4.2. Client-Facing API (Unified GraphQL & Real-time)
Technology: AWS AppSync (GraphQL API Gateway).

Authentication: Amazon Cognito User Pools (configured directly in AppSync). Clients authenticate with Cognito, receive a JWT, which is then used to authorize GraphQL requests via AppSync.

Data Sources & Resolvers: AppSync acts as the central router for GraphQL operations, connecting to various backend data sources:

Lambda Resolvers: AppSync invokes AWS Lambda functions (Node.js/TypeScript). These Lambdas then make internal HTTP/REST calls to Fargate-based NestJS microservices (e.g., User Service, Tutor Matching Service, Chat Service for metadata management). This pattern ensures strong microservice boundaries.

Direct Lambda Resolvers: For services implemented entirely as Lambdas (e.g., Video Call Service, AI Learning Assistant Service), AppSync directly invokes these Lambdas.

Direct DynamoDB Resolvers: AppSync directly interacts with the ChatMessages DynamoDB table for highly performant, high-volume real-time chat operations (sending/listing messages) and subscriptions.

GraphQL Subscriptions: AppSync natively manages WebSocket connections and pushes real-time updates to clients.

For chat messages, AppSync handles subscriptions directly from DynamoDB Streams (configured on the ChatMessages table).

For general platform updates (e.g., tutor availability, lesson status changes), backend microservices publish relevant events to EventBridge. A dedicated EventBridge Subscriber Lambda then processes these events and calls AppSync's publish API to fan out updates to relevant GraphQL subscribers.

5. Simplified Microservice Folder Structure (NestJS Monorepo - apps/<service-name>/src/)
Each NestJS application follows a simplified DDD structure using NestJS CQRS as the foundation:

apps/<microservice-name>/src/
├── domain/                     # Core Business Logic - independent of frameworks/databases
│   ├── entities/               # Domain entities with identity
│   │   └── entity.ts
│   ├── value-objects/          # Immutable value objects
│   │   └── attribute.vo.ts
│   ├── aggregates/             # Aggregate roots extending NestJS CQRS AggregateRoot
│   │   └── entity.aggregate.ts
│   ├── services/               # Domain services for complex business logic
│   │   └── entity-domain.service.ts
│   └── events/                 # Domain events extending NestJS CQRS Event
│       └── entity-created.event.ts
│
├── application/                # Application Logic - orchestrates domain models
│   ├── use-cases/              # Use case services (replaces command/query handlers)
│   │   └── create-entity.use-case.ts
│   │   └── get-entity.use-case.ts
│   ├── dtos/                   # Data Transfer Objects
│   │   ├── create-entity.dto.ts
│   │   └── entity.dto.ts
│   ├── event-handlers/         # Domain event handlers
│   │   └── entity-created.handler.ts
│   └── interfaces/             # Repository and service interfaces
│       └── entity.repository.interface.ts
│
├── infrastructure/             # External concerns and implementations
│   ├── persistence/            # Database layer using Drizzle ORM
│   │   ├── schemas/            # Drizzle database schemas
│   │   │   └── entity.schema.ts
│   │   └── repositories/       # Repository implementations with mergeObject mapping
│   │       └── entity.repository.ts
│   ├── graphql/                # GraphQL federation layer
│   │   ├── models/             # GraphQL types derived from DTOs
│   │   │   └── entity.graphql-model.ts
│   │   └── resolvers/          # GraphQL resolvers using use case services
│   │       └── entity.resolver.ts
│   ├── http/                   # REST API controllers
│   │   └── entity.controller.ts
│   └── events/                 # EventBridge integration
│       ├── publishers/         # Event publishers
│       │   └── eventbridge.publisher.ts
│       └── handlers/           # External event handlers
│           └── external-event.handler.ts
└── main.ts                     # Application entry point, NestJS bootstrapping

6. Compliance & Security Requirements

The platform adheres to key educational and privacy regulations:

6.1. FERPA (Family Educational Rights and Privacy Act)
- Student educational record protection
- Parental consent mechanisms for minors
- Controlled access to directory information
- Secure third-party data sharing protocols

6.2. COPPA (Children's Online Privacy Protection Act)
- Age verification for users under 13
- Parental consent for data collection from minors
- Limited data collection and safe harbor provisions
- Child-friendly privacy notices and controls

6.3. GDPR (General Data Protection Regulation)
- Lawful basis for data processing
- User consent management systems
- Right to be forgotten implementation
- Data portability and privacy by design

6.4. Payment Security
- PCI DSS compliance for payment processing
- Secure handling of financial data
- Stripe Connect integration for tutor payouts
- 20% platform commission calculation and management

7. AWS CDK Infrastructure Deployment Strategy
Your AWS CDK project (cdk/) defines the entire cloud infrastructure across multiple stacks, enabling modularity, dependency management, and phased deployments.

NetworkStack: Defines VPC, subnets (Public, Private, Isolated), security groups (for services, databases), and VPC Endpoints (for private access to AWS services like S3, DynamoDB, Bedrock, EventBridge, CloudWatch Logs, Secrets Manager).

SharedServicesStack: Defines Cognito User Pool with social identity providers (Google, Facebook, Apple), EventBridge Event Bus, S3 Buckets (for course content), and OpenSearch Domain (for AI vector database - future enhancement).

UserServiceStack: Defines ECS Cluster, AWS Fargate Service for User Service, dedicated RDS PostgreSQL instance, associated IAM roles, and an internal Application Load Balancer (ALB) for internal API calls.

CoursesServiceStack: Defines ECS Cluster, AWS Fargate Service for Courses Service, dedicated DynamoDB tables for courses and lessons, S3 bucket for course materials, associated IAM roles, and an internal ALB.

TutorMatchingServiceStack: Defines ECS Cluster, AWS Fargate Service, dedicated DynamoDB tables for tutor profiles, dedicated Neo4j/Neptune cluster for matching algorithms, associated IAM roles, and an internal ALB.

PaymentServiceStack: Defines ECS Cluster, AWS Fargate Service for Payment Service, dedicated RDS PostgreSQL instance, Lambda functions for Stripe webhooks, associated IAM roles, and an internal ALB.

ReviewsServiceStack: Defines ECS Cluster, AWS Fargate Service for Reviews Service, dedicated RDS PostgreSQL instance, associated IAM roles, and an internal ALB.

ChatServiceStack: Defines ECS Cluster, AWS Fargate Service, dedicated DynamoDB tables (ChatSessions, ChatMessages), a Lambda function triggered by DynamoDB Streams (for message processing/notifications), associated IAM roles, and an internal ALB.

VideoCallServiceStack: Defines a Lambda function for token generation (Video Call Service), dedicated DynamoDB table for call metadata, associated IAM roles.

ChatServiceStack: Defines ECS Cluster, AWS Fargate Service, DynamoDB tables (ChatSessions, ChatMessages), a Lambda function triggered by DynamoDB Streams (for message processing/notifications), associated IAM roles, and an internal ALB.

VideoCallServiceStack: Defines a Lambda function for token generation (Video Call Service), associated IAM roles.

AILearningAssistantStack: (Future Enhancement) Defines Lambda functions (one for AI Q&A processing, another for Knowledge Ingestion from S3), DynamoDB table (AI chat history), associated IAM roles.

ApiGatewayStack: Defines AWS AppSync GraphQL API, all necessary Data Sources (pointing to internal service ALBs, Lambdas, or directly to DynamoDB tables), and Resolvers (VTL or JavaScript).

8. Cloud-First Development Workflow
This strategy uses real AWS services for all environments, ensuring high fidelity between development and production.

8.1. Development Environment Strategy
All development work is performed against real AWS services deployed in dedicated developer environments:

Developer-Specific AWS Environments: Each developer has their own AWS environment (dev-[developer-name]) to prevent conflicts and enable independent development.

Real AWS Services: Use actual RDS, DynamoDB, EventBridge, Cognito, S3, and AppSync services for development, ensuring 100% compatibility with production.

CDK-Based Infrastructure: All infrastructure is defined in CDK and can be deployed/destroyed easily for cost management.

Environment Lifecycle: Developer environments can be created and destroyed as needed, with automated scripts for setup and teardown.
8.2. Development Workflow
Setup Developer Environment:

Navigate to cdk/ directory.

Bootstrap AWS Environment: npx cdk bootstrap aws://<account-id>/<region>.

Deploy Developer Stack: npx cdk deploy EdTech-Dev-<developer-name>-* --all.

Configure Services: Services automatically receive AWS resource IDs from CDK outputs via environment variables or AWS Systems Manager Parameter Store.

Development Cycle:

Make code changes locally.

Test against real AWS services in your developer environment.

Deploy updated services: pnpm run deploy:dev.

Integration testing with real AWS services ensures high confidence.

Environment Management:

Create Environment: ./scripts/create-dev-env.sh <developer-name>.

Destroy Environment: ./scripts/destroy-dev-env.sh <developer-name> (for cost savings).

Monitor Costs: Each environment is tagged for cost tracking and has automated cost alerts.

9. Solo Developer Strategy

Given the solo developer constraint, the project adopts a sequential development approach:

9.1. Cloud-First Development Strategy
- Use real AWS services for high-fidelity development
- Implement cost-effective developer environments with automated teardown
- Use Drizzle ORM for excellent TypeScript integration
- Maintain separate dedicated databases per service
- Use RDS PostgreSQL for cost optimization over Aurora
- Each microservice owns its data completely
- Simplified domain patterns reduce complexity

9.2. Phased Implementation
- Sequential development of microservices
- Each phase builds upon previous functionality
- Comprehensive testing at each milestone
- Minimal viable product (MVP) approach

9.3. Simplified Technology Choices
- NestJS with TypeScript and simplified DDD patterns
- Drizzle ORM for excellent PostgreSQL TypeScript integration
- Hybrid GraphQL architecture (AppSync + Apollo Federation)
- Use case services instead of separate command/query handlers
- NestJS CQRS for domain events and aggregate roots
- Real AWS services with cost-effective developer environments
- Social authentication via Google, Facebook, Apple ID through AWS Cognito
- Stripe Connect for payment processing with 20% commission model

10. AI Tool Integration Philosophy (Cursor AI)
Cursor AI, along with other generative AI tools, should be treated as an intelligent pair-programmer, query tool, and expert consultant throughout your development process.

Code Generation: Use Cursor's in-editor capabilities (Ctrl+K) to generate boilerplate (modules, controllers, services, DTOs, interfaces), database models, repository methods, and basic CRUD logic.

Refactoring & Optimization: Highlight code and prompt Cursor to refactor for readability, performance, or adherence to design patterns.

Debugging & Troubleshooting: Paste error messages, logs, or problematic code snippets into Cursor's chat for analysis, explanations, and suggested fixes.

Architectural Guidance: Use chat prompts to brainstorm solutions, clarify complex AWS services, understand design patterns (e.g., "Explain the Outbox Pattern in detail with a NestJS example").

Boilerplate (CDK/Docker): Generate initial CDK constructs, IAM policies, docker-compose.yml configurations, and Dockerfiles.

Testing: Ask Cursor to generate unit tests, suggest test cases (including edge cases).

Learning: Treat it as a vast knowledge base for any technical question related to NestJS, TypeScript, AWS, Docker, GraphQL, etc.