# Phase 6: Intelligence, Analytics & Scaling

**Priority**: Medium (Post-MVP Iteration 3)

## 🎯 Phase Objective

To leverage data for improving the user experience and business intelligence, and to introduce AI-powered features that create a competitive advantage. This phase focuses on making the platform smarter and more data-driven.

## 📋 Dependencies

-   **Prerequisites**: Phase 5 (Structured Learning) must be complete.
-   **Integrates with**: All existing services to consume their events and provide insights.

## 🔧 Microservice Implementation

### **1. Analytics Service (`analytics-service`)**

-   **Objective**: To capture, process, and visualize user behavior and key business metrics.
-   **Key Data Structures**:
    -   **`AnalyticsEvent` Entity**:
        -   Stored in a time-series database like DynamoDB or TimescaleDB.
        -   **Attributes**: `eventId`, `userId`, `eventType` (e.g., `session_booked`, `course_completed`), `timestamp`, `properties` (a JSONB field for event-specific data).
    -   **`DashboardMetric` Entity**:
        -   Pre-aggregated metrics stored in a relational DB or cache (Redis) for fast dashboard loading.
        -   **Attributes**: `metricName`, `value`, `timestamp`, `dimensions`.
-   **Key Use Cases**:
    -   `TrackEvent`: An internal-facing use case that receives events from all other microservices via EventBridge and stores them.
    -   `GenerateDashboardMetrics`: A scheduled use case that runs periodically to aggregate raw event data into key metrics (e.g., daily active users, monthly revenue).
-   **Event-Driven Architecture**:
    -   This service is almost entirely event-driven. It subscribes to events published by all other services (e.g., `UserRegistered`, `PaymentSucceeded`, `CourseEnrolled`).
-   **GraphQL API**:
    -   **Queries**: `getDashboardMetrics(dashboard: DashboardType!)`. This will be a protected endpoint for admin users to view platform analytics.

### **2. AI Service (`ai-service`)**

-   **Objective**: To provide intelligent features that enhance tutor discovery and personalize the learning experience.
-   **Key Data Structures**:
    -   **Vector Embeddings**: For recommendation models. User profiles, tutor profiles, and course descriptions will be converted into vector embeddings and stored in a specialized vector database (e.g., Pinecone, or OpenSearch with a k-NN plugin).
    -   **`Recommendation` Entity**:
        -   `recommendationId`, `userId`, `recommendedTutorIds`, `recommendedCourseIds`, `confidenceScore`.
-   **Key Use Cases**:
    -   `GenerateTutorRecommendations`: Takes a student's profile and learning goals as input, queries the vector database for similar tutor profiles, and returns a ranked list.
    -   `GenerateCourseRecommendations`: Similar to tutor recommendations, but for courses.
    -   `CreatePersonalizedStudyPlan`: An advanced use case that takes a student's goal (e.g., "Learn Python for data science") and generates a suggested sequence of courses and tutors.
-   **GraphQL API**:
    -   **Queries**: `getRecommendedTutors`, `getRecommendedCourses`. These queries will trigger the AI use cases in the background.

## ✅ Success Criteria

-   Key user and business events are being successfully captured by the `analytics-service`.
-   Admin users can view a dashboard with accurate, up-to-date metrics.
-   The `ai-service` can generate relevant tutor and course recommendations based on user data.
-   Vector embeddings are successfully created for users, tutors, and courses.
-   The new services are successfully federated into the GraphQL supergraph.
-   All new code has at least 90% unit test coverage.
