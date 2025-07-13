# Step 6: Payment Service - API

**Objective**: Expose the GraphQL mutation that kicks off the entire booking and payment flow.

## 1. GraphQL Schema (`payment.subgraph.graphql`)

The `payment-service` subgraph is quite minimal from a query perspective. Its main job is to expose the entry point mutation.

```graphql
# payment.subgraph.graphql

type Query {
  # Maybe a query to get payment history
  myPaymentHistory: [Payment!]! @authenticated
}

type Mutation {
  # This is the main entry point for the saga
  bookSession(input: BookSessionInput!): BookSessionPayload! @authenticated
}

type Payment {
  paymentId: ID!
  amount: Money!
  status: PaymentStatus!
  createdAt: AWSDateTime!
}

type Money {
  amount: Float!
  currency: String!
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
}

input BookSessionInput {
  tutorId: ID!
  time: AWSDateTime! # The specific time slot the student is booking
  duration: Int! # in minutes
}

# The payload returns the saga ID and the client secret for the frontend
type BookSessionPayload {
  sagaId: ID!
  paymentClientSecret: String!
}
```

## 2. Resolver Implementation

The `bookSession` resolver's job is to start the saga.

```typescript
// apps/payment-service/src/presentation/graphql/payment.resolver.ts
import { EventBus } from '@nestjs/cqrs'; // Assuming CQRS module for events

@Resolver()
export class PaymentResolver {
    constructor(private readonly eventBus: EventBus) {}

    @Mutation()
    @UseGuards(JwtAuthGuard)
    async bookSession(
        @Args('input') input: BookSessionInput,
        @Context() context: any,
    ): Promise<BookSessionPayload> {
        const studentId = context.req.user.id;

        // 1. Initiate the Saga.
        // The actual logic of creating the payment intent is now handled
        // by the saga, not directly by the resolver. The saga will
        // return the client secret asynchronously.
        const sagaId = '...'; // Generate a new ID for the saga instance

        // 2. Publish the initiating event
        this.eventBus.publish(
            new BookSessionInitiatedEvent({
                sagaId,
                studentId,
                tutorId: input.tutorId,
                time: input.time,
            })
        );

        // 3. How to return the client secret?
        // This is a challenge in a sync request/response cycle.
        // The client will likely need to subscribe to a WebSocket channel
        // or poll a status endpoint using the returned sagaId to get the
        // paymentClientSecret once the saga has generated it.
        // For MVP, we might perform the first few saga steps synchronously
        // within the resolver, but this couples the resolver to the saga logic.

        // Let's assume an async process:
        // The payload might initially not have the secret.
        // A better return type might be just the sagaId.
        // For this plan, we'll stick to the original spec, which implies
        // the client secret is returned immediately. This means the first
        // few steps of the saga must run synchronously.

        const { clientSecret } = await this.sagaOrchestrator.startAndWaitForIntent(
            /* ... params ... */
        );

        return {
            sagaId,
            paymentClientSecret: clientSecret,
        };
    }
}
```
