# Step 7 (Day 20): Testing & Integration Validation

**Objective**: To ensure the `user-service` is robust, reliable, and fully integrated into the platform by completing all levels of testing.

## 1. Unit Test Coverage

-   **Goal**: Achieve >95% unit test coverage for all new code in the `user-service`.
-   **Strategy**:
    -   **Domain Layer**: Tests should already be near 100% for entities, VOs, rules, and services.
    -   **Application Layer**: Write unit tests for every use case. Mock the repository and event publisher interfaces to test the business logic in isolation.
    -   **Infrastructure Layer**: Unit tests are less critical here, but simple tests can be written for mappers or complex query builders.
    -   **Tooling**: Use `jest` and `ts-mockito` (or a similar mocking library). Run coverage reports with `jest --coverage`.

## 2. Integration Testing

-   **Goal**: Test the interaction between different layers of the service, especially with the database.
-   **Strategy**:
    -   **Repository Tests**: Write integration tests for the `UserRepository`. These tests will run against a real database (e.g., a test container running PostgreSQL) to verify that data is persisted and retrieved correctly, especially the mapping of value objects.
    -   **API Controller Tests**: Use `@nestjs/testing` to create a test module that spins up an in-memory version of the `user-service`. Send HTTP requests to the controllers and assert the responses. This tests the full flow from controller to use case to repository.

## 3. End-to-End (E2E) Workflow Testing

-   **Goal**: Test a complete user workflow from the perspective of a client.
-   **Strategy**:
    1.  Deploy the entire stack (AppSync, Lambda resolvers, `user-service`) to a dedicated test environment.
    2.  Use a GraphQL client (like Apollo Client in a test script) to execute a real GraphQL mutation against the public AppSync endpoint.
    3.  **Example Workflow: Update Profile**
        a.  **Login**: Authenticate to get a JWT.
        b.  **Mutate**: Send an `updateMyProfile` mutation with the JWT.
        c.  **Assert Mutation Response**: Verify the mutation returns the updated user data.
        d.  **Query**: Send a `me` query.
        e.  **Assert Query Response**: Verify the `me` query also returns the updated data, confirming the change was persisted correctly.

## 4. GraphQL Federation Validation

-   **Goal**: Ensure the `user-service` subgraph composes correctly into the supergraph without conflicts.
-   **Tool**: Use the Apollo Rover CLI.
-   **Command**:
    ```bash
    # This command attempts to compose the schemas from all subgraphs
    npx @apollo/rover supergraph compose --config ./rover.yaml
    ```
-   **CI/CD Integration**: This command should be run in the CI/CD pipeline whenever a subgraph schema changes. If composition fails, the build should fail, preventing breaking changes from being deployed.
