# GraphQL Federation Setup

This guide covers the GraphQL Federation implementation for the EdTech platform.

## 🏗️ Architecture Overview

```
Client Apps → Apollo Federation Gateway → NestJS Service Subgraphs
```

### Components
- **Federation Gateway**: Composes schemas from all services
- **Service Subgraphs**: Individual GraphQL schemas per service
- **Schema Registry**: Manages schema versions and composition

## 📁 Directory Structure

```
graphql-api/                   # Federation gateway
├── gateway/index.js          # Gateway server
├── schemas/                  # Composed schemas
└── scripts/compose-schemas.js # Schema composition

apps/[service]/src/presentation/graphql/
├── schemas/[entity].graphql  # GraphQL schema
├── types/[entity].types.ts   # TypeScript types
├── resolvers/[entity].resolver.ts # Resolvers
└── graphql.module.ts         # GraphQL module
```

## 🚀 Setting up Federation in a Service

### 1. Install Dependencies

```bash
pnpm add @nestjs/graphql @apollo/subgraph graphql apollo-server-express
```

### 2. Create GraphQL Schema

```graphql
# src/presentation/graphql/schemas/user.graphql
extend type Query {
  user(id: ID!): User
  users(limit: Int = 20, offset: Int = 0): [User!]!
}

extend type Mutation {
  createUser(input: CreateUserInput!): CreateUserResponse!
}

type User @key(fields: "id") {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  role: UserRole!
  status: UserStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateUserInput {
  email: String!
  firstName: String!
  lastName: String!
}

type CreateUserResponse {
  user: User
  errors: [FieldError!]
}

type FieldError {
  field: String!
  message: String!
}

enum UserRole {
  STUDENT
  TUTOR
  ADMIN
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

scalar DateTime
```

### 3. Create TypeScript Types

```typescript
// src/presentation/graphql/types/user.types.ts
import { ObjectType, Field, ID, InputType, registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  STUDENT = 'STUDENT',
  TUTOR = 'TUTOR',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE', 
  SUSPENDED = 'SUSPENDED',
}

registerEnumType(UserRole, { name: 'UserRole' });
registerEnumType(UserStatus, { name: 'UserStatus' });

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => UserRole)
  role: UserRole;

  @Field(() => UserStatus)
  status: UserStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@InputType()
export class CreateUserInput {
  @Field()
  email: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;
}

@ObjectType()
export class CreateUserResponse {
  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => [FieldError])
  errors: FieldError[];
}

@ObjectType()
export class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}
```

### 4. Implement Resolver

```typescript
// src/presentation/graphql/resolvers/user.resolver.ts
import { Resolver, Query, Mutation, Args, ResolveReference } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ServiceAuthGuard } from '@edtech/service-auth';
import { 
  User, 
  CreateUserInput, 
  CreateUserResponse 
} from '../types/user.types';

@Resolver(() => User)
@UseGuards(ServiceAuthGuard)
export class UserResolver {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
  ) {}

  @Query(() => User, { nullable: true })
  user(@Args('id') id: string): Promise<User | null> {
    return this.getUserUseCase.execute({ id });
  }

  @Query(() => [User])
  users(): Promise<User[]> {
    return this.getUsersUseCase.execute({});
  }

  @Mutation(() => CreateUserResponse)
  async createUser(@Args('input') input: CreateUserInput): Promise<CreateUserResponse> {
    try {
      const user = await this.createUserUseCase.execute(input);
      return { user, errors: [] };
    } catch (error) {
      return {
        user: null,
        errors: [{ 
          field: 'general', 
          message: error.message 
        }]
      };
    }
  }

  // Federation resolver
  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }): Promise<User | null> {
    return this.user(reference.id);
  }
}
```

### 5. Configure GraphQL Module

```typescript
// src/presentation/graphql/graphql.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { UserResolver } from './resolvers/user.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      typePaths: ['./**/*.graphql'],
      federation: {
        version: 2,
      },
    }),
  ],
  providers: [UserResolver],
  exports: [GraphQLModule],
})
export class UserGraphQLModule {}
```

### 6. Add to Service Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { PresentationModule } from './presentation/presentation.module';

@Module({
  imports: [
    // ... other modules
    PresentationModule,
  ],
})
export class AppModule {}
```

```typescript
// src/presentation/presentation.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from './http/http.module';
import { UserGraphQLModule } from './graphql/graphql.module';

@Module({
  imports: [HttpModule, UserGraphQLModule],
  exports: [HttpModule, UserGraphQLModule],
})
export class PresentationModule {}
```

## 🌐 Federation Gateway Setup

### 1. Gateway Server

```javascript
// graphql-api/gateway/index.js
const { ApolloServer } = require('apollo-server-express');
const { ApolloGateway, IntrospectAndCompose } = require('@apollo/gateway');
const express = require('express');

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'user-service', url: 'http://user-service:3001/graphql' },
      { name: 'tutor-matching-service', url: 'http://tutor-matching-service:3002/graphql' },
      // Add more services as they're implemented
    ],
  }),
});

const server = new ApolloServer({
  gateway,
  subscriptions: false,
});

const app = express();

server.applyMiddleware({ app, path: '/graphql' });

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Gateway ready at http://localhost:${PORT}${server.graphqlPath}`);
});
```

### 2. Schema Composition Script

```javascript
// graphql-api/scripts/compose-schemas.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const services = [
  { name: 'user-service', url: 'http://localhost:3001/graphql' },
  { name: 'tutor-matching-service', url: 'http://localhost:3002/graphql' },
];

async function composeSchemas() {
  console.log('🔄 Composing GraphQL schemas...');
  
  // Generate composed schema
  const subgraphs = services
    .map(s => `--name ${s.name} --url ${s.url}`)
    .join(' ');
  
  try {
    execSync(`rover supergraph compose --config supergraph.yaml > schemas/schema.graphql`, {
      stdio: 'inherit'
    });
    console.log('✅ Schema composition completed');
  } catch (error) {
    console.error('❌ Schema composition failed:', error.message);
    process.exit(1);
  }
}

composeSchemas();
```

### 3. Rover Configuration

```yaml
# graphql-api/supergraph.yaml
federation_version: 2
subgraphs:
  user-service:
    schema:
      subgraph_url: http://localhost:3001/graphql
  tutor-matching-service:
    schema:
      subgraph_url: http://localhost:3002/graphql
```

## 🧪 Testing Federation

### 1. Start Services

```bash
# Terminal 1: Start user service
cd apps/user-service
pnpm start:dev

# Terminal 2: Start gateway
cd graphql-api
npm run dev:gateway

# Terminal 3: Test queries
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ user(id: \"123\") { id email firstName } }"}'
```

### 2. GraphQL Playground

Visit `http://localhost:4000/graphql` to use GraphQL Playground.

```graphql
# Test query
query GetUser {
  user(id: "123") {
    id
    email
    firstName
    lastName
    role
    status
  }
}

# Test mutation
mutation CreateUser {
  createUser(input: {
    email: "test@example.com"
    firstName: "John"
    lastName: "Doe"
  }) {
    user {
      id
      email
      firstName
    }
    errors {
      field
      message
    }
  }
}
```

## 📦 Package.json Scripts

Add these scripts to your root `package.json`:

```json
{
  "scripts": {
    "compose-schemas": "cd graphql-api && node scripts/compose-schemas.js",
    "validate-schemas": "cd graphql-api && node scripts/validate-schemas.js", 
    "graphql:gateway": "cd graphql-api && npm run dev:gateway",
    "graphql:dev": "cd graphql-api && npm run dev"
  }
}
```

## 🚨 Common Issues

### Schema Composition Fails
- Ensure all services are running before composing
- Check that GraphQL endpoints are accessible
- Verify federation directives are correct

### Type Conflicts
- Use consistent scalar definitions across services
- Ensure entity keys are properly defined
- Check for duplicate type names

### Gateway Connection Issues
- Verify service URLs in gateway configuration
- Check network connectivity between services
- Ensure GraphQL endpoints return valid schemas

## 🔄 Development Workflow

1. **Add new service**: Follow service template
2. **Create GraphQL schema**: Define entities and operations
3. **Implement resolvers**: Connect to use cases
4. **Update gateway**: Add service to subgraphs list
5. **Compose schemas**: Run composition script
6. **Test integration**: Verify queries work through gateway

This federation setup provides a unified GraphQL API while maintaining service independence.