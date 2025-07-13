# Development Plan: Phase 2 - Tutor Matching Service

**Objective**: Enable users with the `TUTOR` role to create detailed, public-facing profiles and manage their availability. This phase is critical for making tutors discoverable to students.

This plan outlines the technical steps required to implement the `tutor-matching-service`.

## Development Steps

1.  **[Domain Layer Setup](./01-domain-layer-setup.md)**: Define the core aggregates and value objects that model the tutor profile domain.
2.  **[Application Layer Use Cases](./02-application-layer-use-cases.md)**: Implement the business logic for creating, updating, and finding tutor profiles.
3.  **[Infrastructure Layer & Persistence](./03-infrastructure-layer-persistence.md)**: Set up the PostgreSQL database and implement the repository for data persistence.
4.  **[Presentation Layer & GraphQL API](./04-presentation-layer-graphql.md)**: Expose the service's functionality through a federated GraphQL subgraph.
