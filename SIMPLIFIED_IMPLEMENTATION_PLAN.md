# Simplified Implementation Plan

This document provides a streamlined, feature-focused implementation plan. It is derived from the detailed phase documents and prioritizes delivering a functional MVP before iterating on advanced features.

The plan is split into two main sections:
1.  **MVP Plan**: Focuses on the critical user journey of finding a tutor, booking a 1-on-1 lesson, and completing a payment.
2.  **Post-MVP Plan**: Details subsequent iterations to enhance the platform with courses, reviews, and other advanced services.

---

## 🚀 Part 1: MVP Implementation Plan

**Goal**: Deliver the core 1-on-1 tutoring functionality. This enables the frontend team to build the primary user flow from discovery to payment.

### **Step 1: Foundational Services (User & GraphQL API)**

**Objective**: Establish the core platform infrastructure, allowing users to register, log in, and manage their profiles. This step combines the setup from **Phase 0** and the user-centric parts of **Phase 1**.

-   **[✅ COMPLETED]** **Setup Project Foundation**: Initialize the monorepo, shared libraries, and local development environment (Docker, LocalStack).
-   **[✅ COMPLETED]** **Implement User Service**:
    -   Build the full domain, application, and infrastructure layers for the `user-service`.
    -   Enable user registration, authentication (including social logins), and profile management.
    -   Implement the distinction between `STUDENT` and `TUTOR` roles.
-   **[✅ COMPLETED]** **Setup GraphQL Federation**:
    -   Configure the `graphql-api` with AWS AppSync and Lambda resolvers.
    -   Expose the `user-service` functionality through the federated GraphQL API.

### **Step 2: Tutor Discovery & Matching**

**Objective**: Allow students to find and view available tutors. This step implements the core of the **Phase 5 (Tutor Matching Service)**.

-   **Implement Tutor Matching Service**:
    -   **Domain**: Create `TutorProfile` entity to store tutor-specific details (subjects, availability, hourly rate, bio).
    -   **Application**: Develop a `CreateTutorProfile` use case for tutors to set up their offerings and an `UpdateAvailability` use case.
    -   **Infrastructure**: Set up the database (PostgreSQL for profiles, Neo4j for graph-based matching).
    -   **Presentation**:
        -   Create a `findTutors` GraphQL query that allows students to search for tutors based on basic criteria (e.g., subject).
        -   Expose mutations for tutors to manage their profiles and availability.

### **Step 3: Session Booking & Communication**

**Objective**: Enable a student to book a 1-on-1 lesson with a chosen tutor. This step implements the booking and scheduling aspects of **Phase 6 (Communication Service)**.

-   **Implement Communication Service**:
    -   **Domain**: Create a `Session` entity to represent a booked lesson (tutorId, studentId, scheduledTime, duration, status).
    -   **Application**:
        -   Develop a `CreateSession` use case that allows a student to book an available time slot with a tutor.
        -   Implement logic to handle session status changes (e.g., `SCHEDULED`, `COMPLETED`, `CANCELLED`).
    -   **Infrastructure**: Set up the database (DynamoDB or PostgreSQL) for storing session data.
    -   **Presentation**:
        -   Expose a `createSession` GraphQL mutation.
        -   Provide queries to view upcoming and past sessions for both students and tutors.
    -   **MVP Simplification**: Real-time chat and video call integration can be deferred. For MVP, the service can simply generate a placeholder meeting link.

### **Step 4: Payment for Sessions**

**Objective**: Securely process payments for booked lessons. This step implements the core of **Phase 4 (Payment Service)**.

-   **Implement Payment Service**:
    -   **Domain**: Create a `Payment` entity to track transactions (userId, amount, currency, related sessionId).
    -   **Application**:
        -   Develop a `ProcessPayment` use case that integrates with Stripe.
        -   Use a saga or event-driven flow to connect a successful payment to a session booking. When a student books a session, initiate a payment. Only confirm the session booking after the payment is successful.
    -   **Infrastructure**: Set up the PostgreSQL database for financial records and integrate the Stripe SDK.
    -   **Presentation**:
        -   Expose a `processPaymentForSession` GraphQL mutation.
        -   Provide a query for users to view their payment history.

---

## 📦 Part 2: Post-MVP Implementation Plan

**Goal**: Build upon the core MVP by adding structured courses, enhancing community trust, and introducing advanced features.

### **Iteration 1: Enhance Core Experience & Trust**

**Objective**: Improve user engagement and build trust in the platform.

-   **Implement Reviews Service (Phase 7)**:
    -   Allow students to leave ratings and comments for tutors after a completed session.
    -   Aggregate and display average ratings on tutor profiles.
-   **Implement Notification Service (Phase 8)**:
    -   Send critical notifications for the MVP flow (e.g., session confirmations, reminders, payment receipts).
    -   Integrate with email (SES) and push notification providers.
-   **Enhance Communication Service (Phase 6)**:
    -   Implement real-time chat between students and tutors.
    -   Integrate a video call provider (e.g., Agora.io) into the `Session` flow.

### **Iteration 2: Introduce Structured Learning (Courses)**

**Objective**: Expand the platform's offerings beyond 1-on-1 tutoring to include structured courses.

-   **Implement Learning Service (Phase 2)**:
    -   Allow tutors to create multi-lesson courses.
    -   Enable students to enroll in courses and track their progress.
-   **Implement Content Service (Phase 3)**:
    -   Provide robust file and video hosting (S3) to support course materials.
    -   Implement media processing for video transcoding and image optimization.
-   **Update Payment Service (Phase 4)**:
    -   Add functionality to handle payments for course enrollments, not just individual sessions.

### **Iteration 3: Intelligence, Analytics & Scaling**

**Objective**: Leverage data to improve the user experience and prepare the platform for growth.

-   **Implement Analytics Service (Phase 9)**:
    -   Track key user events and business metrics.
    -   Create dashboards for monitoring platform health and user engagement.
-   **Implement AI Service (Phase 10)**:
    -   Enhance the tutor matching algorithm with personalized recommendations.
    -   Introduce AI-powered features like study plan generation.
-   **Security, QA & Deployment (Phases 11, 12, 13)**:
    -   Harden all services with advanced security measures (MFA, etc.).
    -   Conduct comprehensive performance testing and quality assurance.
    -   Deploy the full platform to a production environment with high availability and monitoring.
