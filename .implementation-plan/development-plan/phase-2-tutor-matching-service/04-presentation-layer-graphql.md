# Step 4: Presentation Layer & GraphQL API

**Objective**: Expose the service's functionality via a GraphQL subgraph that can be federated by the AppSync supergraph.

## 1. GraphQL Schema Definition

Create a `tutor-matching.subgraph.graphql` file. This schema will define the types, queries, and mutations for the service.

```graphql
# tutor-matching.subgraph.graphql

# Extend the User type from the user-service
type User @key(fields: "id") @extends {
  id: ID! @external
  tutorProfile: TutorProfile
}

type TutorProfile @key(fields: "tutorProfileId") {
  tutorProfileId: ID!
  user: User!
  bio: String
  hourlyRate: Money
  subjects: [Subject!]
  availability: [Availability!]
}

type Money {
  amount: Float!
  currency: String!
}

type Subject {
  name: String!
  category: String!
  level: String!
}

type Availability {
  dayOfWeek: DayOfWeek!
  startTime: String!
  endTime: String!
  timezone: String!
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

# --- Inputs ---

input CreateTutorProfileInput {
  # userId is implicit from the authenticated user context
  bio: String!
  hourlyRate: MoneyInput!
  subjects: [SubjectInput!]!
}

input UpdateTutorProfileInput {
  bio: String
  hourlyRate: MoneyInput
  subjects: [SubjectInput!]
}

input MoneyInput {
  amount: Float!
  currency: String!
}

input SubjectInput {
  name: String!
  category: String!
  level: String!
}

input AvailabilityInput {
    dayOfWeek: DayOfWeek!
    startTime: String!
    endTime: String!
    timezone: String!
}

# --- Queries & Mutations ---

type Query {
  findTutors(subject: String!): [TutorProfile!]!
  getTutorProfile(id: ID!): TutorProfile
  # `me` query to get the current tutor's own profile
  myTutorProfile: TutorProfile
}

type Mutation {
  # First time profile creation might be one-time
  createMyTutorProfile(input: CreateTutorProfileInput!): TutorProfile! @authenticated(role: "TUTOR")
  updateMyTutorProfile(input: UpdateTutorProfileInput!): TutorProfile! @authenticated(role: "TUTOR")
  setMyAvailability(availability: [AvailabilityInput!]!): [Availability!]! @authenticated(role: "TUTOR")
}
```

## 2. Resolvers Implementation

Resolvers will be implemented in NestJS. They will call the application layer use cases to execute business logic.

### Example: `updateMyTutorProfile` Mutation Resolver

```typescript
// apps/tutor-matching-service/src/presentation/graphql/tutor-profile.resolver.ts
import { Args, Mutation, Resolver, Context } from '@nestjs/graphql';
import { UpdateTutorProfileUseCase } from '../../application/use-cases/update-tutor-profile.use-case';
// ... other imports

@Resolver('TutorProfile')
export class TutorProfileResolver {
    constructor(
        private readonly updateProfileUseCase: UpdateTutorProfileUseCase,
        // ... inject other use cases
    ) {}

    @Mutation()
    @UseGuards(JwtAuthGuard, RolesGuard) // Assuming guards for auth
    @Roles('TUTOR')
    async updateMyTutorProfile(
        @Args('input') input: UpdateTutorProfileInput,
        @Context() context: any,
    ): Promise<TutorProfile> {
        const userId = context.req.user.id; // Extract user ID from JWT
        
        const command = {
            userId,
            ...input,
            // Map input DTOs to Domain VOs
        };

        return this.updateProfileUseCase.execute(command);
    }

    // ... other resolvers for queries and other mutations
}
```

## 3. Internal HTTP Controllers (Optional)

While GraphQL is the primary interface, you might expose simple internal HTTP endpoints for service-to-service communication if needed, though GraphQL federation often reduces this need. These would be simple NestJS controllers under a path like `/internal/tutors`.
