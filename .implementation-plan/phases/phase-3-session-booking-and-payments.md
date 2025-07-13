# Phase 3: Session Booking & Payments

**Priority**: Critical (MVP)

## 🎯 Phase Objective

Enable a student to book a 1-on-1 lesson with a tutor and complete the payment. This phase implements the core transactional loop of the marketplace and will be orchestrated by a `BookAndPayForSessionSaga` to ensure data consistency across services.

## 📋 Dependencies

-   **Prerequisites**: Phase 2 (Tutor Matching Service) must be complete.
-   **Integrates with**: `user-service`, `tutor-matching-service`, `payment-service`, `communication-service`.

## 🔧 Saga Flow: `BookAndPayForSessionSaga`

This distributed transaction ensures a session is only booked if the payment succeeds.

1.  **Initiation**: A student executes the `bookSession` GraphQL mutation. This triggers an event that starts the saga.
2.  **Availability Check**: The saga commands the `tutor-matching-service` to verify that the tutor's requested time slot is still available. If not, the saga terminates.
3.  **Payment Intent Creation**: The saga commands the `payment-service` to create a Stripe Payment Intent. The `clientSecret` for this intent is returned to the frontend.
4.  **Frontend Payment**: The student uses the `clientSecret` to complete the payment via Stripe's UI elements on the frontend.
5.  **Payment Confirmation (Webhook)**: Stripe sends a `payment_intent.succeeded` webhook to a public endpoint on the `payment-service`.
6.  **Session Booking**: The `payment-service` validates the webhook and publishes a `PaymentCompleted` event. The saga listens for this event and then commands the `communication-service` to create the official `Session` record with a `CONFIRMED` status.
7.  **Notifications (Post-MVP)**: The saga would then trigger notifications to both users.

## 🔧 Microservice Implementation

### **1. Communication Service (`communication-service`)**

-   **Objective**: To manage the lifecycle of a tutoring session.
-   **Key Data Structures**:
    -   **`Session` Aggregate**:
        -   `sessionId`: Unique identifier.
        -   `tutorId`, `studentId`: Foreign keys to the `user-service`.
        -   `scheduledAt`, `duration`: The date, time, and length of the lesson.
        -   `status`: An enum (`PENDING_PAYMENT`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).
        -   `meetingLink`: For MVP, this can be a placeholder string.
-   **Key Use Cases**:
    -   `CreateConfirmedSession`: An internal use case triggered by the saga after successful payment to create the session record.
    -   `CancelSession`: Allows a user to cancel a session, which might trigger a refund process.
-   **GraphQL API**:
    -   **Queries**: `getMySessions`, `getSessionDetails(id: ID!)`.

### **2. Payment Service (`payment-service`)**

-   **Objective**: To handle all financial transactions securely.
-   **Key Data Structures**:
    -   **`Payment` Aggregate**:
        -   `paymentId`: Unique identifier.
        -   `userId`: The student making the payment.
        -   `sessionId`: The session this payment corresponds to.
        -   `amount`, `currency`: The price of the lesson.
        -   `status`: An enum (`PENDING`, `SUCCEEDED`, `FAILED`).
        -   `stripePaymentIntentId`: The ID from the Stripe transaction for reconciliation.
-   **Key Use Cases**:
    -   `CreatePaymentIntentForSession`: Creates a payment record in a `PENDING` state and generates a Stripe Payment Intent.
    -   `HandleStripeWebhook`: Processes incoming webhooks from Stripe to update payment statuses.
-   **GraphQL API**:
    -   **Mutation**: `bookSession(tutorId: ID!, time: AWSDateTime!)` - This is the entry point for the saga.
    -   **Query**: `getPaymentHistory`.

## ✅ Success Criteria

-   A student can select a tutor and a time slot to initiate a booking.
-   The system correctly generates a Stripe payment intent and returns a `clientSecret` to the frontend.
-   Upon successful payment on the frontend, a `Session` is created with a `CONFIRMED` status in the `communication-service`.
-   A `Payment` record is created and updated correctly in the `payment-service`.
-   The `bookSession` saga correctly handles the entire workflow, including potential failures (e.g., payment failed).
-   The respective GraphQL subgraphs for `communication-service` and `payment-service` are successfully federated.
-   All new code has at least 90% unit test coverage.
