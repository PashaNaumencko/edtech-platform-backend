# Development Plan: Phase 5 - Structured Learning (Courses)

**Objective**: To introduce structured, multi-lesson courses that tutors can create and sell, expanding the platform's offerings beyond 1-on-1 tutoring.

This phase introduces two major new services: the `learning-service` for managing course content and enrollments, and the `content-service` for handling media uploads and processing.

## Development Steps

1.  **[Learning Service: Domain](./01-learning-service-domain.md)**: Define the `Course`, `Lesson`, and `Enrollment` aggregates.
2.  **[Learning Service: Use Cases](./02-learning-service-use-cases.md)**: Implement the business logic for course creation, publishing, and enrollment.
3.  **[Learning Service: API](./03-learning-service-api.md)**: Expose course and enrollment functionality via a GraphQL subgraph.
4.  **[Content Service: Domain](./04-content-service-domain.md)**: Define the `MediaAsset` aggregate for managing file uploads.
5.  **[Content Service: Asset Upload](./05-content-service-asset-upload.md)**: Implement the secure file upload flow using S3 pre-signed URLs.
6.  **[Content Service: Video Processing](./06-content-service-video-processing.md)**: Set up an asynchronous video transcoding pipeline.
7.  **[Content Service: API](./07-content-service-api.md)**: Create the GraphQL API for the content service.
8.  **[Payment Service: Enhancement](./08-payment-service-enhancement.md)**: Update the `payment-service` to handle course enrollment payments.
