# Presentation Layer Architecture

## Overview

The presentation layer in our microservices follows a **GraphQL Federation** pattern where:

1. **Microservices expose internal HTTP APIs only** (within private VPC)
2. **External access goes through GraphQL Federation** (AWS AppSync)
3. **Service-to-service communication** uses internal HTTP endpoints

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   External      │    │   GraphQL       │    │   Microservice  │
│   Clients       │───▶│   Federation    │───▶│   (User Service)│
│   (Web/Mobile)  │    │   (AppSync)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Lambda        │    │   Internal      │
                       │   Resolvers     │    │   HTTP API      │
                       │                 │    │   (Private VPC) │
                       └─────────────────┘    └─────────────────┘
```

## Internal HTTP Controllers

### Purpose

- **Service-to-service communication** within the private VPC
- **Internal operations** that don't need external exposure
- **Backend orchestration** and data aggregation

### Security

- Protected by `ServiceAuthGuard`
- Only accessible within private VPC
- Service-to-service authentication required

### Example Endpoints

```
POST   /internal/users                    # Create user
PUT    /internal/users/:id/profile        # Update profile
POST   /internal/users/:id/become-tutor   # Promote to tutor
GET    /internal/users/:id                # Get user
GET    /internal/users                    # List users
```

## GraphQL Federation

### Purpose

- **External API** for web/mobile clients
- **Unified data access** across all services
- **Type-safe queries** with GraphQL schema

### Implementation

- Lambda resolvers call internal HTTP APIs
- Schema composition from all microservices
- Federation directives for service boundaries

### Example Query

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    email
    profile {
      firstName
      lastName
    }
    # Data from other services via federation
    enrollments {
      course {
        title
      }
    }
  }
}
```

## Why This Architecture?

### 1. **Security**

- Internal APIs are not exposed to the internet
- Service-to-service communication is authenticated
- External access is controlled through AppSync

### 2. **Scalability**

- Each service can scale independently
- GraphQL Federation handles data aggregation
- Lambda resolvers provide serverless scaling

### 3. **Maintainability**

- Clear separation of concerns
- Service boundaries are well-defined
- GraphQL schema provides type safety

### 4. **Performance**

- Internal APIs are fast (same VPC)
- GraphQL allows clients to request only needed data
- Caching can be implemented at multiple levels

## Implementation Notes

### ServiceAuthGuard

- Validates internal service requests
- Supports multiple authentication strategies:
  - JWT tokens with service claims
  - AWS IAM roles
  - Service mesh certificates
  - IP whitelist (private VPC)

### Error Handling

- Internal APIs return standardized error responses
- GraphQL resolvers handle service errors gracefully
- Federation handles partial failures

### Monitoring

- All internal API calls are logged
- GraphQL queries are traced through services
- Performance metrics collected at each layer

## Migration from Public APIs

If you have existing public REST APIs:

1. **Move endpoints to internal controllers**
2. **Add ServiceAuthGuard protection**
3. **Create GraphQL resolvers** for external access
4. **Update client applications** to use GraphQL
5. **Remove public API exposure**

## Best Practices

1. **Never expose microservice APIs publicly**
2. **Use GraphQL Federation for external access**
3. **Implement proper service authentication**
4. **Design internal APIs for service consumption**
5. **Use standardized response formats**
6. **Implement comprehensive error handling**
7. **Add proper logging and monitoring**
