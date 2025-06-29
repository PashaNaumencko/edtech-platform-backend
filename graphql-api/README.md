# GraphQL API Layer

## Overview
This directory contains the **AWS AppSync GraphQL API** configuration and Lambda resolvers.

## Structure
```
graphql-api/
├── schemas/           # GraphQL schema definitions
├── resolvers/         # Lambda function resolvers
├── types/             # TypeScript type definitions
└── cdk-stacks/        # CDK infrastructure for AppSync
```

## AWS AppSync Configuration

### GraphQL Schema
- **Location**: `schemas/schema.graphql`
- **Purpose**: Single unified schema for all frontend clients
- **Features**: Queries, Mutations, Subscriptions

### Resolvers
- **Technology**: AWS Lambda functions
- **Language**: TypeScript/Node.js
- **Purpose**: Connect GraphQL operations to internal microservices
- **Authentication**: Cognito User Pools integration

### Data Sources
- **HTTP Data Sources**: Connect to internal microservices
- **Direct Lambda**: For complex business logic
- **DynamoDB Direct**: For simple CRUD operations

## Frontend Integration

### React Web App
```typescript
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { createAuthLink } from 'aws-appsync-auth-link';

const client = new ApolloClient({
  uri: process.env.REACT_APP_GRAPHQL_ENDPOINT,
  cache: new InMemoryCache(),
  link: createAuthLink({
    url: process.env.REACT_APP_GRAPHQL_ENDPOINT,
    region: 'us-east-1',
    auth: {
      type: 'AMAZON_COGNITO_USER_POOLS',
      jwtToken: () => getCurrentUserToken(),
    },
  }),
});
```

### React Native App
```typescript
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { createSubscriptionHandshakeLink } from 'aws-appsync-subscription-link';

const client = new ApolloClient({
  uri: process.env.EXPO_PUBLIC_GRAPHQL_ENDPOINT,
  cache: new InMemoryCache(),
  link: createSubscriptionHandshakeLink({
    url: process.env.EXPO_PUBLIC_GRAPHQL_ENDPOINT,
    region: 'us-east-1',
    auth: {
      type: 'AMAZON_COGNITO_USER_POOLS',
      jwtToken: () => getCurrentUserToken(),
    },
  }),
});
```

## Example Operations

### Query Example
```graphql
query GetUserProfile($userId: ID!) {
  user(id: $userId) {
    id
    email
    profile {
      firstName
      lastName
      timezone
    }
    isTutor
    tutorProfile {
      subjects
      hourlyRate
      rating
    }
  }
}
```

### Mutation Example
```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    user {
      id
      email
      profile {
        firstName
        lastName
      }
    }
    errors {
      field
      message
    }
  }
}
```

### Subscription Example
```graphql
subscription OnNewMessage($conversationId: ID!) {
  messageAdded(conversationId: $conversationId) {
    id
    content
    sender {
      id
      profile {
        firstName
        lastName
      }
    }
    createdAt
  }
}
```

## Security

### Authentication
- **Cognito User Pools**: Primary authentication
- **IAM**: For service-to-service communication
- **API Keys**: For public/anonymous access (limited)

### Authorization
- **Field-level security**: Control access to specific fields
- **Resolver-level security**: Validate permissions in Lambda
- **Rate limiting**: Built-in AppSync protection

## Development

### Local Development
```bash
# Deploy GraphQL API
pnpm cdk deploy GraphQLApiStack

# Test resolvers locally
pnpm test:resolvers

# Generate TypeScript types from schema
pnpm generate:types
```

### Testing
```bash
# Unit tests for resolvers
pnpm test:unit

# Integration tests with AppSync
pnpm test:integration

# End-to-end tests with frontend
pnpm test:e2e
``` 