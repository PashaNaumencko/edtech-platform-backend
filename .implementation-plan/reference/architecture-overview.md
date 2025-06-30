# EdTech Platform Architecture Overview

## Platform Overview
This platform follows a **microservices architecture** with **GraphQL Federation** for unified API composition.

## 🗄️ Infrastructure Naming Conventions

### Database Naming Philosophy
We name infrastructure components **as they actually are**, not with generic abstractions:

- ✅ **postgres** (PostgreSQL databases)
- ✅ **dynamo** (DynamoDB tables)  
- ✅ **neo4j** (Neo4j graph databases)
- ✅ **redis** (Redis cache instances)
- ✅ **s3** (S3 storage buckets)
- ✅ **redshift** (Redshift data warehouse)
- ✅ **vector-db** (Vector databases like Pinecone)
- ❌ ~~database~~ (too generic)
- ❌ ~~cache~~ (too generic)
- ❌ ~~nosql~~ (too generic)

This naming convention is used throughout our:
- **Infrastructure code** (CDK stacks, Terraform)
- **Environment variables** (POSTGRES_HOST, DYNAMO_TABLE)
- **Folder structures** (`infrastructure/postgres/`, `infrastructure/dynamo/`)
- **Service documentation** and configuration files

## Architecture Layers

### 1. External API Layer (Client-Facing)
**AWS AppSync GraphQL Supergraph**
- **Purpose**: Single unified GraphQL endpoint for frontend applications
- **Technology**: AWS AppSync (Managed GraphQL)
- **Schema Composition**: Federation of multiple subgraphs from microservices
- **Authentication**: Cognito User Pools
- **Authorization**: GraphQL field-level security
- **Resolvers**: Lambda functions calling internal microservices

```
Frontend Apps (React/React Native)
           ↓
AWS AppSync GraphQL Supergraph (Federated Schema)
           ↓
Lambda Resolvers (per subgraph)
           ↓
Internal HTTP Microservices (/internal APIs)
```

### 2. GraphQL Federation Pattern

#### Subgraph Definition (Per Microservice)
Each microservice defines its own GraphQL subgraph:

```
user-service/
├── src/
│   ├── graphql/
│   │   ├── schema.graphql      # User subgraph schema
│   │   ├── resolvers.ts        # Type resolvers (for federation)
│   │   └── directives.ts       # @key, @external directives
│   └── controllers/
│       └── internal/           # HTTP APIs for lambda resolvers
└── schema-export.js            # Export subgraph for composition
```

#### Supergraph Composition
All subgraphs are composed into one supergraph:

```
graphql-api/
├── subgraphs/
│   ├── user.graphql           # From user-service
│   ├── learning.graphql       # From learning-service
│   ├── payment.graphql        # From payment-service
│   └── ...
├── composition/
│   ├── compose-schema.ts      # Federation composition logic
│   └── supergraph.graphql     # Final composed schema
└── resolvers/
    ├── user-resolvers.ts      # Lambda resolvers for user operations
    ├── learning-resolvers.ts  # Lambda resolvers for learning operations
    └── ...
```

### 3. Internal Microservices Layer (Service-to-Service)
**HTTP REST APIs** for internal communication with `/internal` prefix
- **Purpose**: Core business logic and data management
- **Technology**: NestJS applications
- **Communication**: HTTP REST APIs (internal only, `/internal` prefix)
- **Authentication**: Service-to-service JWT tokens
- **Network**: Private subnets, no internet access

#### Core Services:
1. **User Service** (`user-service`)
   - **Subgraph**: User, UserProfile, SocialAccount types
   - **Port**: 3001
   - **Storage**: `postgres` (primary) + `redis` (sessions)
   - **Internal APIs**: `/internal/users/*`, `/internal/auth/*`

2. **Learning Service** (`learning-service`)
   - **Subgraph**: Course, Lesson, Enrollment types
   - **Port**: 3002
   - **Storage**: `postgres` (primary) + `redis` (cache)
   - **Internal APIs**: `/internal/courses/*`, `/internal/lessons/*`

3. **Tutor Matching Service** (`tutor-matching-service`)
   - **Subgraph**: TutorProfile, Availability, Matching types
   - **Port**: 3003
   - **Storage**: `neo4j` (graph) + `postgres` (profiles)
   - **Internal APIs**: `/internal/tutors/*`, `/internal/matching/*`

4. **Payment Service** (`payment-service`)
   - **Subgraph**: Payment, Subscription, Invoice types
   - **Port**: 3004
   - **Storage**: `postgres`
   - **Internal APIs**: `/internal/payments/*`, `/internal/billing/*`

5. **Communication Service** (`communication-service`)
   - **Subgraph**: Conversation, Message types
   - **Port**: 3005
   - **Storage**: `dynamo` (primary) + `redis` (real-time)
   - **Internal APIs**: `/internal/messages/*`, `/internal/chat/*`

6. **Content Service** (`content-service`)
   - **Subgraph**: File, Media, Upload types
   - **Port**: 3006
   - **Storage**: `dynamo` (metadata) + `s3` (files)
   - **Internal APIs**: `/internal/files/*`, `/internal/media/*`

7. **Analytics Service** (`analytics-service`)
   - **Subgraph**: Event, Metric, Report types
   - **Port**: 3007
   - **Storage**: `dynamo` (events) + `redshift` (warehouse)
   - **Internal APIs**: `/internal/events/*`, `/internal/metrics/*`

8. **AI Service** (`ai-service`)
   - **Subgraph**: Recommendation, Personalization types
   - **Port**: 3008
   - **Storage**: `vector-db` (embeddings) + `dynamo` (metadata)
   - **Internal APIs**: `/internal/recommendations/*`, `/internal/ai/*`

## GraphQL Federation Implementation Patterns

### 1. Subgraph Schema Definition (Example: User Service)
```graphql
# user-service/src/graphql/schema.graphql
extend type Query {
  me: User
  user(id: ID!): User
}

extend type Mutation {
  updateProfile(input: UpdateProfileInput!): User!
  becomeTutor(input: BecomeTutorInput!): User!
}

type User @key(fields: "id") {
  id: ID!
  email: String!
  profile: UserProfile!
  isTutor: Boolean!
  createdAt: AWSDateTime!
}

type UserProfile {
  firstName: String!
  lastName: String!
  fullName: String!
  timezone: String
  locale: String
}

# Reference to types from other services
extend type Course @key(fields: "id") {
  id: ID! @external
  tutor: User @requires(fields: "tutorId")
}
```

### 2. Lambda Resolver (Example: User Queries)
```typescript
// graphql-api/resolvers/user-resolvers.ts
import { AppSyncResolverHandler } from 'aws-lambda';
import axios from 'axios';

const USER_SERVICE_URL = 'http://user-service:3001';

export const getUserResolver: AppSyncResolverHandler<any, any> = async (event) => {
  const { id } = event.arguments;
  
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/internal/users/${id}`, {
      headers: {
        'Authorization': `Bearer ${generateServiceToken()}`,
        'Content-Type': 'application/json',
      },
    });
    
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
};
```

### 3. Internal API Controller (Example: User Service)
```typescript
// user-service/src/controllers/internal/users.controller.ts
@Controller('internal/users')
export class InternalUsersController {
  
  @Get(':id')
  async getUser(@Param('id') id: string) {
    // Internal API - no public access
    // Called only by GraphQL Lambda resolvers
    return await this.userService.findById(id);
  }
  
  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }
  
  @Put(':id/profile')
  async updateProfile(@Param('id') id: string, @Body() updateDto: UpdateProfileDto) {
    return await this.userService.updateProfile(id, updateDto);
  }
}
```

### 4. Schema Composition Process
```typescript
// graphql-api/composition/compose-schema.ts
import { composeServices } from '@apollo/composition';
import { readFileSync } from 'fs';

const userSubgraph = readFileSync('./subgraphs/user.graphql', 'utf8');
const learningSubgraph = readFileSync('./subgraphs/learning.graphql', 'utf8');
const paymentSubgraph = readFileSync('./subgraphs/payment.graphql', 'utf8');

const { schema, errors } = composeServices([
  { name: 'user', typeDefs: userSubgraph },
  { name: 'learning', typeDefs: learningSubgraph },
  { name: 'payment', typeDefs: paymentSubgraph },
  // ... other subgraphs
]);

if (errors) {
  throw new Error(`Schema composition failed: ${errors}`);
}

// Export composed supergraph for AppSync
export const supergraphSchema = schema;
```

## Communication Patterns

### Frontend ↔ Backend
```
React/React Native 
  → AppSync GraphQL Supergraph 
  → Lambda Resolvers (per subgraph)
  → Internal Microservices (/internal APIs)
```

### Service ↔ Service (Internal)
```
Service A → HTTP REST API (/internal) → Service B
```

### Event-Driven Communication
```
Service A → EventBridge → Service B (for async operations)
```

### Federation Resolution
```
GraphQL Query → AppSync → Multiple Lambda Resolvers → Multiple Internal Services → Composed Response
```

## Security Model

### External API (AppSync)
- **Authentication**: Cognito User Pools
- **Authorization**: GraphQL field-level permissions
- **Rate Limiting**: AppSync built-in
- **HTTPS**: TLS 1.2+

### Internal Services
- **Network**: Private subnets only
- **Authentication**: Service-to-service JWT
- **Authorization**: Role-based access control
- **Communication**: HTTP within VPC

## Deployment Architecture

### Development Environment
- **AppSync**: Development stage
- **Services**: ECS Fargate (1 instance each)
- **Storage**: Single instances (postgres, dynamo, neo4j, redis)
- **Network**: Single AZ

### Production Environment
- **AppSync**: Production stage with caching
- **Services**: ECS Fargate (2+ instances each)
- **Storage**: Multi-AZ with read replicas (postgres), auto-scaling (dynamo, redis)
- **Network**: Multi-AZ deployment
- **CDN**: CloudFront for static assets

## Architecture Benefits

1. **Domain Ownership**: Each service owns its GraphQL schema
2. **Schema Evolution**: Services can evolve schemas independently
3. **Type Safety**: Strong typing across federated schema
4. **Performance**: Efficient query execution with proper batching
5. **Security**: Internal APIs protected, GraphQL field-level auth
6. **Scalability**: Each subgraph can scale independently
7. **Developer Experience**: Single GraphQL endpoint for frontends
8. **Maintainability**: Clear separation of concerns per domain 