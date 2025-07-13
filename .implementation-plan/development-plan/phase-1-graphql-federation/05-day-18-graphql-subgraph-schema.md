# Step 5 (Day 18): GraphQL Subgraph Schema

**Objective**: Define the public-facing GraphQL API for the `user-service` as a federated subgraph, ensuring it accurately reflects the enhanced domain model.

## 1. User Subgraph Schema Definition

-   **File**: `apps/user-service/src/presentation/graphql/user.subgraph.graphql`
-   **Goal**: Create a schema that exposes user data, including the rich `UserProfile` and `UserPreferences` value objects, and provides mutations for key actions.

```graphql
# user.subgraph.graphql

# Define the User as a keyable entity for federation
type User @key(fields: "id") {
  id: ID!
  email: String!
  role: UserRole!
  status: UserStatus!
  profile: UserProfile!
  preferences: UserPreferences!
  createdAt: AWSDateTime!
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

type UserProfile {
  firstName: String
  lastName: String
  bio: String
  skills: [String!]
  age: Int
}

type UserPreferences {
  timezone: String!
  language: String!
  notifications: NotificationPreferences!
}

type NotificationPreferences {
  sessionReminders: Boolean!
  paymentReceipts: Boolean!
  # ... other notification flags
}

# Queries for fetching user data
type Query {
  # Get the currently authenticated user
  me: User @authenticated
  # Get a user by their ID (e.g., for an admin)
  user(id: ID!): User @authenticated(role: "ADMIN")
}

# Mutations for modifying user data
type Mutation {
  updateMyProfile(input: UpdateProfileInput!): User! @authenticated
  updateMyPreferences(input: UpdatePreferencesInput!): User! @authenticated
}

input UpdateProfileInput {
  firstName: String
  lastName: String
  bio: String
  skills: [String!]
}

input UpdatePreferencesInput {
  timezone: String
  language: String
}
```

## 2. Federation Directives

-   **`@key(fields: "id")`**: This is the most important directive. It declares that `User` is an "entity" and can be looked up by other services using its `id`.
-   **`@extends`**: This will be used in other services' schemas (e.g., `tutor-matching-service`) to add fields to the `User` type.
-   **`@external`**: Used in other services to mark fields that are defined here in the `user-service`.

## 3. Resolver Implementation (NestJS)

-   **Goal**: Implement the resolvers defined in the schema, connecting them to the application layer use cases.

```typescript
// apps/user-service/src/presentation/graphql/user.resolver.ts
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UpdateUserProfileUseCase } from 'src/application/use-cases/update-user-profile.usecase';

@Resolver('User')
export class UserResolver {
    constructor(private readonly updateUserProfileUseCase: UpdateUserProfileUseCase) {}

    @Query()
    @UseGuards(JwtAuthGuard) // Custom guard to handle auth
    me(@Context() context: any): Promise<UserDto> {
        const userId = context.req.user.id;
        // Delegate to a GetUserByIdUseCase
        return this.getUserUseCase.execute({ userId });
    }

    @Mutation()
    @UseGuards(JwtAuthGuard)
    updateMyProfile(
        @Args('input') input: UpdateProfileInput,
        @Context() context: any,
    ): Promise<UserDto> {
        const userId = context.req.user.id;
        return this.updateUserProfileUseCase.execute({ userId, ...input });
    }
}
```
These resolvers, running within the `user-service`, will be exposed via the internal HTTP API, ready to be called by the AppSync Lambda resolvers.
