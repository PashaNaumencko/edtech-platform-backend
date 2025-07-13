# Phase 4: Enhance Core Experience & Trust

**Priority**: High (Post-MVP Iteration 1)

## 🎯 Phase Objective

To build user trust and improve engagement by implementing a robust review system and a reliable notification system for critical user actions.

## 📋 Dependencies

-   **Prerequisites**: Phase 3 (Session Booking & Payments) must be complete.
-   **Integrates with**: `user-service`, `communication-service`, `payment-service`.

## 🔧 Microservice Implementation

### **1. Reviews Service (`reviews-service`)**

-   **Objective**: To allow students to rate and review tutors after a completed session, providing social proof and a quality feedback loop.
-   **Key Data Structures**:
    -   **`Review` Aggregate**:
        -   `reviewId`: Unique identifier.
        -   `sessionId`: The completed session being reviewed.
        -   `reviewerId`: The `userId` of the student who is writing the review.
        -   `revieweeId`: The `userId` of the tutor being reviewed.
        -   `rating`: A numeric value (e.g., 1-5).
        -   `comment`: A text field for the review content.
-   **Key Use Cases**:
    -   `CreateReview`: Allows a student to submit a review for a session they have completed. This use case will first verify with the `communication-service` that the session status is `COMPLETED`.
    -   `GetTutorReviews`: Fetches all reviews for a specific tutor.
    -   `GetTutorAverageRating`: Calculates and returns the average rating for a tutor.
-   **GraphQL API**:
    -   **Mutation**: `submitReview(sessionId: ID!, rating: Int!, comment: String): Review!`.
    -   **Query**: `getTutorReviews(tutorId: ID!): [Review!]!`.
    -   The `TutorProfile` type in the `tutor-matching-service` subgraph will be extended to include `averageRating` and `reviewCount`.

### **2. Notification Service (`notification-service`)**

-   **Objective**: To keep users informed about important events related to their activity on the platform.
-   **Key Data Structures**:
    -   **`Notification` Entity**:
        -   `notificationId`: Unique identifier.
        -   `userId`: The recipient of the notification.
        -   `type`: An enum for the notification type (e.g., `SESSION_CONFIRMED`, `SESSION_REMINDER`, `PAYMENT_RECEIPT`).
        -   `channels`: An array indicating the delivery method (e.g., `EMAIL`, `PUSH`).
        -   `content`: The notification message body.
        -   `status`: `SENT`, `FAILED`.
-   **Key Use Cases**:
    -   `SendNotification`: An internal use case triggered by events from other services (e.g., `SessionConfirmed`, `PaymentSucceeded`). It will fetch user contact details and preferences from the `user-service`.
-   **Event-Driven Architecture**:
    -   This service will primarily be driven by events from other microservices via **EventBridge**.
    -   **Example Flow**:
        1.  `communication-service` publishes a `SessionConfirmed` event.
        2.  `notification-service` subscribes to this event.
        3.  Upon receiving the event, it triggers the `SendNotification` use case to send a confirmation email to the student and tutor.
-   **GraphQL API**:
    -   This service may not have a significant GraphQL presence initially, as it is mostly backend-oriented. It might expose a query like `getMyNotifications` and a mutation `markNotificationsAsRead`.

## ✅ Success Criteria

-   Students can submit a review for a tutor after a session is marked as `COMPLETED`.
-   Tutor profiles display the correct average rating and review count.
-   Users receive email notifications for key events: session booking confirmation, a 24-hour session reminder, and a payment receipt.
-   The notification system is decoupled and reacts to events from other services.
-   All new code has at least 90% unit test coverage.
