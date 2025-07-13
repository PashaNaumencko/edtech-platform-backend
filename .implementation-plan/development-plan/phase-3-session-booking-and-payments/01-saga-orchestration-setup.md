# Step 1: Saga Orchestration Setup

**Objective**: Implement the `BookAndPayForSessionSaga` to ensure a consistent and reliable booking process.

We will use a state machine-based saga orchestrator. A library like `nestjs-saga` could be used, or we can implement a simple version using event listeners. The saga will live within the `payment-service`, as it's initiated by a payment action.

## Saga Flow

1.  **`BOOK_SESSION_INITIATED` (Event)**: The `bookSession` GraphQL mutation publishes this event. The saga starts listening.
2.  **`CHECK_TUTOR_AVAILABILITY` (Command)**: The saga sends a command to the `tutor-matching-service`. This can be a synchronous API call or an event-based command.
3.  **`AVAILABILITY_CONFIRMED` / `AVAILABILITY_REJECTED` (Events)**: `tutor-matching-service` responds. If rejected, the saga ends and notifies the user.
4.  **`CREATE_PAYMENT_INTENT` (Command)**: On confirmation, the saga commands its own `payment-service`'s application layer to create a Stripe Payment Intent.
5.  **`PAYMENT_INTENT_CREATED` (Event)**: The `clientSecret` is returned to the frontend. The saga waits.
6.  **`PAYMENT_COMPLETED` (Event from Stripe Webhook)**: When the user pays, Stripe's webhook handler in the `payment-service` publishes this event.
7.  **`CREATE_CONFIRMED_SESSION` (Command)**: The saga receives the `PAYMENT_COMPLETED` event and sends a command to the `communication-service` to create the session record.
8.  **`SESSION_CONFIRMED` (Event)**: The `communication-service` confirms creation. The saga is now complete.

## Saga State Machine

The saga can be modeled as a state machine with a corresponding record in the database.

**SagaInstance Table Schema:**

```prisma
model BookAndPayForSessionSaga {
  id            String   @id @default(uuid())
  currentState  String   // e.g., "AWAITING_AVAILABILITY", "AWAITING_PAYMENT", "COMPLETED"
  studentId     String
  tutorId       String
  timeSlot      DateTime
  paymentIntentId String?
  sessionId     String?
  isComplete    Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Implementation Sketch

```typescript
// apps/payment-service/src/application/sagas/booking.saga.ts

// This is a conceptual sketch. A real implementation would use a framework.
export class BookingSaga {
    
    // Listens for BOOK_SESSION_INITIATED
    async handleBookingInitiated(event: BookingInitiatedEvent) {
        // 1. Create Saga record in DB with "AWAITING_AVAILABILITY" state
        // 2. Send CHECK_TUTOR_AVAILABILITY command
    }

    // Listens for AVAILABILITY_CONFIRMED
    async handleAvailabilityConfirmed(event: AvailabilityConfirmedEvent) {
        // 1. Update saga state to "AWAITING_PAYMENT"
        // 2. Send CREATE_PAYMENT_INTENT command
        // 3. Return clientSecret to user (e.g., via WebSocket or polling)
    }

    // Listens for PAYMENT_COMPLETED
    async handlePaymentCompleted(event: PaymentCompletedEvent) {
        // 1. Update saga state to "BOOKING_SESSION"
        // 2. Send CREATE_CONFIRMED_SESSION command
    }

    // Listens for SESSION_CONFIRMED
    async handleSessionConfirmed(event: SessionConfirmedEvent) {
        // 1. Update saga state to "COMPLETED"
        // 2. Mark saga as complete
        // 3. (Optional) Send notifications
    }
}
```
