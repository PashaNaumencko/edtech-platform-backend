# EdTech Platform: MVP-Focused Implementation Plan

This document provides a structured, step-by-step implementation plan for the EdTech platform. It is designed to prioritize the delivery of a functional Minimum Viable Product (MVP) centered around the core user journey: a student finding a tutor, booking a 1-on-1 lesson, and paying for it.

The plan is divided into two parts:
1.  **MVP Implementation**: The critical path to launching the core 1-on-1 tutoring marketplace.
2.  **Post-MVP Iterations**: A roadmap for enhancing the platform with features like structured courses, reviews, and AI-driven intelligence.

---

## 🚀 Part 1: MVP Implementation Plan

**Primary Goal**: To build and launch the essential functionality for a 1-on-1 tutoring marketplace. This will provide a solid foundation and allow the frontend team to build the core user experience.

### **Stage 1: Foundation - User Service & GraphQL API (✅ Already Completed)**

This stage establishes the bedrock of the platform: user identity and a unified API.

-   **Objective**: Allow users to register, authenticate, and manage their profiles. Expose this functionality through a secure, federated GraphQL API.
-   **Services Involved**: `user-service`, `graphql-api`.
-   **Key Data Structures (`user-service`)**:
    -   **`User` Aggregate**: The core entity representing a user with a unique `UserId`, `Email`, `Password`, and `UserRole`.
    -   **`UserProfile` Value Object**: Contains user details like `firstName`, `lastName`, and `timezone`.
    -   **`UserRole` Value Object**: An enum-based VO to distinguish between `STUDENT`, `TUTOR`, and `ADMIN` roles.
-   **Key Use Cases (`user-service`)**:
    -   `RegisterUser`: Handles new user sign-ups.
    -   `AuthenticateUser`: Manages login via email/password and social providers.
    -   `GetUserProfile`: Fetches a user's profile data.
    -   `UpdateUserProfile`: Allows users to modify their profile information.
-   **GraphQL API (`graphql-api`)**:
    -   **Queries**: `me`, `user(id: ID!)`
    -   **Mutations**: `register`, `login`, `updateProfile`
-   **Current Status**: ✅ **COMPLETED**.

### **Stage 2: Tutor Enablement - Tutor Matching Service**

**Objective**: Enable tutors to create public profiles and set their availability, making them discoverable to students.

-   **Services Involved**: `tutor-matching-service`, `user-service` (to link profiles to a user).
-   **Key Data Structures (`tutor-matching-service`)**:
    -   **`TutorProfile` Aggregate**: The central entity for a tutor's public-facing information.
        -   `tutorProfileId`: Unique identifier for the profile.
        -   `userId`: Foreign key linking to the `User` in the `user-service`.
        -   `bio`: A text description of the tutor's experience and teaching style.
        -   `hourlyRate`: A `Money` Value Object (`amount`, `currency`).
        -   `subjects`: A list of `Subject` Value Objects the tutor teaches.
    -   **`Availability` Value Object**: Represents a time slot a tutor is available.
        -   `dayOfWeek`: (e.g., 'MONDAY').
        -   `startTime`, `endTime`: (e.g., '14:00', '16:00').
        -   `timezone`: The tutor's timezone.
-   **Key Use Cases (`tutor-matching-service`)**:
    -   `CreateTutorProfile`: Allows a user with the `TUTOR` role to create their profile.
    -   `UpdateTutorProfile`: Allows a tutor to edit their details.
    -   `SetAvailability`: Enables a tutor to define their weekly schedule.
-   **GraphQL API (`graphql-api`)**:
    -   **Queries**: `findTutors(subject: String!)`, `getTutorProfile(id: ID!)`.
    -   **Mutations**: `createTutorProfile`, `updateMyProfile`, `setMyAvailability`.

### **Stage 3: Core User Journey - Session Booking & Payment**

**Objective**: Enable a student to select a tutor, book a specific time slot, and complete the payment for the lesson. This flow will be orchestrated by a **Saga** to ensure consistency across services.

-   **Services Involved**: `communication-service`, `payment-service`, `tutor-matching-service`.
-   **Saga Flow: `BookAndPayForSessionSaga`**
    1.  **Initiation**: A student triggers the `bookSession` mutation.
    2.  **Availability Check**: The saga first asks the `tutor-matching-service` to confirm the requested time slot is still available.
    3.  **Payment Processing**: If available, the saga commands the `payment-service` to create a payment intent with Stripe. The client secret is returned to the frontend.
    4.  **Frontend Payment**: The student completes the payment on the frontend using the client secret.
    5.  **Webhook Confirmation**: Stripe sends a webhook to the `payment-service` confirming payment success.
    6.  **Session Creation**: The `payment-service` publishes a `PaymentCompleted` event. The saga listens for this and commands the `communication-service` to create the `Session` record, officially confirming the booking.
    7.  **Notifications**: The saga then commands the `notification-service` (Post-MVP) to inform both parties.
-   **Key Data Structures**:
    -   **`Session` Aggregate (`communication-service`)**:
        -   `sessionId`: Unique identifier.
        -   `tutorId`, `studentId`: Links to the users involved.
        -   `scheduledAt`, `duration`: The date, time, and length of the lesson.
        -   `status`: `PENDING_PAYMENT`, `CONFIRMED`, `COMPLETED`, `CANCELLED`.
        -   `meetingLink`: A placeholder or actual video call link.
    -   **`Payment` Aggregate (`payment-service`)**:
        -   `paymentId`: Unique identifier.
        -   `userId`: The student who paid.
        -   `sessionId`: The session this payment is for.
        -   `amount`, `currency`: The cost of the lesson.
        -   `status`: `PENDING`, `SUCCEEDED`, `FAILED`.
        -   `stripePaymentIntentId`: The reference from Stripe.
-   **GraphQL API (`graphql-api`)**:
    -   **Mutation**: `bookSession(tutorId: ID!, time: AWSDateTime!)`. This mutation will start the saga and return the `clientSecret` from Stripe for the frontend to complete the payment.

---

## 📦 Part 2: Post-MVP Iterations

**Goal**: Incrementally build upon the core MVP to add more value, enhance user trust, and introduce new revenue streams.

### **Iteration 1: Enhance Core Experience & Trust**

-   **Objective**: Improve user engagement and build platform credibility.
-   **Features**:
    -   **Reviews Service**: Implement a 5-star rating and comment system for completed sessions. Display aggregated ratings on tutor profiles to build trust.
    -   **Notification Service**: Send automated email and push notifications for key events: session confirmations, reminders, and payment receipts.
    -   **Real-time Communication**: Enhance the `communication-service` with real-time chat and integrate a third-party video provider like Agora.io for the `Session`'s meeting link.

### **Iteration 2: Introduce Structured Learning (Courses)**

-   **Objective**: Diversify the platform's offerings and revenue streams by allowing tutors to sell pre-structured courses.
-   **Features**:
    -   **Learning Service**: Introduce `Course` and `Lesson` entities. Allow tutors to create courses and students to enroll and track their progress.
    -   **Content Service**: Add robust S3-backed storage for course materials, including video uploads with automated transcoding and image optimization.
    -   **Payment Service Enhancement**: Update the `payment-service` to handle payments for course enrollments in addition to 1-on-1 sessions.

### **Iteration 3: Intelligence, Analytics & Scale**

-   **Objective**: Use data to drive a smarter, more efficient platform and prepare for future growth.
-   **Features**:
    -   **Analytics Service**: Implement event tracking to gather data on user behavior, feature usage, and business KPIs. Create internal dashboards for monitoring.
    -   **AI Service**: Introduce ML-powered features, such as personalized tutor recommendations and dynamic study plan generation.
    -   **Platform Hardening**: Implement advanced security (MFA), conduct comprehensive QA and performance testing, and deploy the full platform to a scalable, production-grade environment.
