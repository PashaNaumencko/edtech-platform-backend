# Serverless Lambda Function Strategy

This document outlines the strategic approach for using AWS Lambda functions within the EdTech platform architecture. Our goal is to leverage serverless where it provides the most value, complementing our core container-based microservices running on ECS.

## Guiding Principle: "The Right Tool for the Job"

-   **ECS + NestJS (Containers)**: Used for the core, "always-on" microservices with complex domain logic that serve synchronous API requests (e.g., `user-service`, `tutor-matching-service`). This provides a rich framework for development and structured long-running applications.
-   **Lambda (Serverless)**: Used for short-lived, event-driven, or specialized tasks that can be executed in a stateless and ephemeral environment. This provides immense scalability, cost-efficiency (pay-per-invocation), and reduced operational overhead for specific workloads.

## Key Lambda Usage Patterns in Our Architecture

We have identified four primary patterns for using Lambda functions:

### 1. The "Glue" Pattern: API Gateway Resolvers

-   **Description**: A lightweight Lambda function that acts as a secure proxy between our public-facing API gateway (AWS AppSync) and our internal microservices (on ECS).
-   **How it Works**: AppSync triggers the Lambda for a specific GraphQL query/mutation. The Lambda's only job is to translate that request into a RESTful HTTP call to the appropriate internal service endpoint, passing along the user's authentication token.
-   **Where We Use It**:
    -   **Phase 1**: `user-service` Lambda resolvers.
    -   **All Subsequent Phases**: Every service with a GraphQL API will have its AppSync resolvers implemented using this pattern.

### 2. The "Event-Driven Worker" Pattern

-   **Description**: A Lambda function that is triggered by an event to perform a specific, decoupled, asynchronous task. This is the most common and powerful pattern in our architecture.
-   **How it Works**: A service publishes an event to AWS EventBridge (e.g., `TutorProfileUpdated`). An EventBridge rule, filtering on that event, invokes a target Lambda function with the event payload.
-   **Where We Use It**:
    -   **Phase 4 (Notification Service)**: A `SessionConfirmed` event triggers a Lambda to send a welcome email.
    -   **Phase 5 (Content Service)**: An S3 upload event triggers a Lambda to start a video transcoding job with MediaConvert. A MediaConvert completion event triggers another Lambda to finalize the process.
    -   **Phase 6 (AI Service)**: A `CoursePublished` event triggers a Python Lambda to generate vector embeddings for the course content.

### 3. The "Webhook Handler" Pattern

-   **Description**: A Lambda function exposed via a public AWS API Gateway endpoint, designed to securely receive and process webhooks from third-party services.
-   **How it Works**: A third party (like Stripe) sends an HTTP POST request to our API Gateway endpoint. The gateway triggers the Lambda, which verifies the webhook's signature, processes the payload, and translates it into a clean, internal domain event that it publishes to our EventBridge bus for other services to consume.
-   **Where We Use It**:
    -   **Phase 3 (Payment Service)**: A Lambda handles the `payment_intent.succeeded` webhook from Stripe.

### 4. The "Scheduled Job" (Cron) Pattern

-   **Description**: A Lambda function that is invoked on a recurring schedule, acting as a serverless cron job.
-   **How it Works**: An AWS EventBridge Schedule is configured with a cron expression (e.g., "run every hour"). At the specified time, it triggers the target Lambda function.
-   **Where We Use It**:
    -   **Phase 4 (Notification Service)**: A Lambda runs hourly to query for upcoming sessions and publish `SendSessionReminder` events.
    -   **Phase 6 (Analytics Service)**: A Lambda could run nightly to kick off a Glue ETL job for generating daily reports.
