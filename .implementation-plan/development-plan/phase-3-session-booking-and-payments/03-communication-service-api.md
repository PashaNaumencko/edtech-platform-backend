# Step 3: Communication Service - API

**Objective**: Expose session data via a federated GraphQL subgraph.

## 1. GraphQL Schema (`communication.subgraph.graphql`)

```graphql
# communication.subgraph.graphql

type Query {
  getMySessions: [Session!]! @authenticated
  getSessionDetails(id: ID!): Session @authenticated
}

type Session @key(fields: "sessionId") {
  sessionId: ID!
  tutor: User!
  student: User!
  scheduledAt: AWSDateTime!
  duration: Int! # in minutes
  status: SessionStatus!
  meetingLink: String
}

# Extend the User type
type User @key(fields: "id") @extends {
  id: ID! @external
  sessions: [Session!]!
}

enum SessionStatus {
  PENDING_PAYMENT
  CONFIRMED
  COMPLETED
  CANCELLED
}
```

## 2. Use Cases

### `CreateConfirmedSession`

-   **Description**: Internal use case triggered by the booking saga.
-   **Trigger**: `CREATE_CONFIRMED_SESSION` command from the saga.

```typescript
// apps/communication-service/src/application/use-cases/create-confirmed-session.use-case.ts
export class CreateConfirmedSessionUseCase {
    constructor(private readonly sessionRepo: ISessionRepository) {}

    async execute(command: { tutorId: string; studentId: string; scheduledAt: Date; duration: number }): Promise<Session> {
        const session = Session.create(command);
        await this.sessionRepo.save(session);
        // Publish SessionConfirmed event
        return session;
    }
}
```

### `CancelSession`

-   **Description**: Allows a user to cancel a session.
-   **Trigger**: A GraphQL mutation (not defined in this phase, but important for the domain).

## 3. Resolvers

Implement NestJS resolvers for the queries defined in the schema.

```typescript
// apps/communication-service/src/presentation/graphql/session.resolver.ts
@Resolver('Session')
export class SessionResolver {
    constructor(private readonly sessionRepo: ISessionRepository) {}

    @Query()
    @UseGuards(JwtAuthGuard)
    async getMySessions(@Context() context: any): Promise<Session[]> {
        const userId = context.req.user.id;
        return this.sessionRepo.findByUserId(userId);
    }

    // Resolver for User.sessions field extension
    @ResolveField('sessions')
    async getSessionsForUser(@Parent() user: User): Promise<Session[]> {
        return this.sessionRepo.findByUserId(user.id);
    }
}
```
