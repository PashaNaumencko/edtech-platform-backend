# Development Plan: Phase 3 - Session Booking & Payments

**Objective**: Enable a student to book a 1-on-1 lesson with a tutor and complete the payment using a Saga pattern for orchestration.

This phase involves two new services, `communication-service` and `payment-service`, and a distributed transaction flow.

## Development Steps

1.  **[Saga Orchestration Setup](./01-saga-orchestration-setup.md)**: Design and set up the `BookAndPayForSessionSaga` to manage the booking transaction.
2.  **[Communication Service: Domain](./02-communication-service-domain.md)**: Define the `Session` aggregate within the `communication-service`.
3.  **[Communication Service: API](./03-communication-service-api.md)**: Implement the GraphQL API for managing sessions.
4.  **[Payment Service: Domain](./04-payment-service-domain.md)**: Define the `Payment` aggregate within the `payment-service`.
5.  **[Payment Service: Stripe Integration](./05-payment-service-stripe-integration.md)**: Implement the logic for creating Stripe Payment Intents and handling webhooks.
6.  **[Payment Service: API](./06-payment-service-api.md)**: Implement the GraphQL API that initiates the booking saga.
