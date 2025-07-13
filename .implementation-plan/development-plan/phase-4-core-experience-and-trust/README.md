# Development Plan: Phase 4 - Enhance Core Experience & Trust

**Objective**: To build user trust and improve engagement by implementing a robust review system and a reliable notification system for critical user actions.

This phase introduces the `reviews-service` and the `notification-service`.

## Development Steps

1.  **[Reviews Service: Domain & App](./01-reviews-service-domain-and-app.md)**: Define the `Review` aggregate and the business logic for submitting and retrieving reviews.
2.  **[Reviews Service: API](./02-reviews-service-api.md)**: Implement the GraphQL API for reviews and extend the `TutorProfile` type.
3.  **[Notification Service: Setup](./03-notification-service-setup.md)**: Design the event-driven architecture for the `notification-service`.
4.  **[Notification Service: Use Cases](./04-notification-service-use-cases.md)**: Implement the logic for sending notifications based on domain events.
5.  **[Notification Service: API](./05-notification-service-api.md)**: Create the minimal GraphQL API for user-facing notification management.
6.  **[Serverless Implementation Guide](./06-serverless-implementation-guide.md)**: A practical guide for developing event-driven, serverless Lambda functions, using the notification service as an example.