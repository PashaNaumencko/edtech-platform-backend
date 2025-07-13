# Phase 2: Tutor Enablement - Tutor Matching Service

**Priority**: Critical (MVP)

## 🎯 Phase Objective

Enable users with the `TUTOR` role to create detailed, public-facing profiles and manage their availability. This phase is critical for making tutors discoverable to students, forming the supply side of the marketplace.

## 📋 Dependencies

-   **Prerequisites**: Phase 1 (User Service & GraphQL API) must be complete.
-   **Integrates with**: `user-service` to link tutor profiles with user accounts.

## 🔧 Microservice Implementation: `tutor-matching-service`

### **1. Domain Layer**

-   **`TutorProfile` Aggregate**:
    -   **Description**: The core entity representing a tutor's professional profile. It will store all information a student needs to make a booking decision.
    -   **Attributes**:
        -   `tutorProfileId`: A unique UUID for the profile.
        -   `userId`: The ID from the `user-service`, linking the profile to a user account.
        -   `bio`: A rich text field for the tutor's biography, experience, and teaching philosophy.
        -   `hourlyRate`: A `Money` Value Object containing `amount` and `currency`.
        -   `subjects`: A list of `Subject` Value Objects, each with `name`, `category` (e.g., "Mathematics"), and `level` (e.g., "High School").
        -   `availability`: A collection of `Availability` Value Objects.
-   **`Availability` Value Object**:
    -   **Description**: Represents a recurring weekly time slot when a tutor is available.
    -   **Attributes**:
        -   `dayOfWeek`: An enum (e.g., `MONDAY`, `TUESDAY`).
        -   `startTime`: Time string (e.g., "14:00").
        -   `endTime`: Time string (e.g., "16:00").
        -   `timezone`: The IANA timezone string (e.g., "America/New_York").

### **2. Application Layer**

-   **Use Cases**:
    -   `CreateTutorProfile`: For a user with the `TUTOR` role to create their initial profile.
    -   `UpdateTutorProfile`: For a tutor to modify their bio, subjects, or hourly rate.
    -   `SetAvailability`: A dedicated use case for tutors to manage their weekly schedule.
    -   `FindTutors`: A query-like use case for students to search for tutors based on criteria like subject and availability.

### **3. Infrastructure Layer**

-   **Database**:
    -   **PostgreSQL**: Will be used to store the `TutorProfile` and its related data. The relational structure is suitable for managing profiles and their direct attributes.
    -   **Neo4j (Post-MVP)**: While planned, graph-based matching will be deferred to a post-MVP iteration to simplify the initial implementation. Basic search will be handled via PostgreSQL.
-   **Repositories**:
    -   `TutorProfileRepository`: An interface in the domain layer with a PostgreSQL implementation in the infrastructure layer. It will include methods like `findByUserId`, `save`, and a `search` method for basic filtering.

### **4. Presentation Layer**

-   **GraphQL Subgraph (`tutor-matching.subgraph.graphql`)**:
    -   **`TutorProfile` Type**: Exposes the fields from the `TutorProfile` aggregate.
    -   **Queries**:
        -   `findTutors(subject: String!, availability: [AvailabilityInput!]): [TutorProfile!]!`
        -   `getTutorProfile(id: ID!): TutorProfile`
    -   **Mutations**:
        -   `createMyTutorProfile(input: CreateTutorProfileInput!): TutorProfile!`
        -   `updateMyTutorProfile(input: UpdateTutorProfileInput!): TutorProfile!`
        -   `setMyAvailability(availability: [AvailabilityInput!]!): [Availability!]!`
-   **Internal HTTP Controllers**:
    -   Secure endpoints under `/internal/tutors` for the GraphQL resolvers to call.

## ✅ Success Criteria

-   A user with the `TUTOR` role can successfully create and update their profile.
-   A tutor can set and modify their weekly availability.
-   A student can successfully search for tutors by subject and see a list of matching profiles.
-   The `tutor-matching-service` GraphQL subgraph is successfully federated into the main AppSync supergraph.
-   All new code has at least 90% unit test coverage.
