# Step 1: Security Hardening

**Objective**: To identify and mitigate security vulnerabilities across the platform.

This is a cross-cutting concern involving infrastructure, application code, and data management.

## 1. Authentication & Authorization

-   **[ ] Implement Multi-Factor Authentication (MFA)**:
    -   Integrate AWS Cognito's MFA capabilities for all user roles.
    -   Allow users to set up TOTP (e.g., Google Authenticator) or SMS-based MFA.
-   **[ ] Review Authorization Logic**:
    -   Audit all GraphQL resolvers and API endpoints to ensure proper role-based access control (`@authenticated`, `@Roles`) is consistently applied.
    -   Verify that a user can never access or modify data that does not belong to them (e.g., one student viewing another's session).

## 2. Data Protection

-   **[ ] Encrypt Everything at Rest**:
    -   Confirm that all RDS databases have encryption enabled.
    -   Confirm that all S3 buckets have server-side encryption (SSE-S3 or SSE-KMS) enabled by default.
-   **[ ] Enforce Encryption in Transit**:
    -   Configure the Application Load Balancer (ALB) to terminate TLS and only accept HTTPS traffic (redirecting HTTP to HTTPS).
    -   Ensure all internal service-to-service communication is within the VPC and does not traverse the public internet.
-   **[ ] PII Audit**:
    -   Identify all fields across all databases that contain Personally Identifiable Information (PII).
    -   Develop a data classification policy.
    -   Consider additional encryption at the application layer for highly sensitive data if required.

## 3. Infrastructure Security

-   **[ ] Harden VPC & Security Groups**:
    -   Review all security groups to ensure the principle of least privilege is followed. Only necessary ports should be open between services.
    -   Eliminate all `0.0.0.0/0` ingress rules except for the public-facing ALB on ports 80 and 443.
-   **[ ] Secret Management**:
    -   **Action**: Migrate all secrets (database passwords, API keys, JWT secrets) from environment variables or config files to **AWS Secrets Manager**.
    -   **Implementation**: Update application code to fetch secrets from Secrets Manager at startup. Grant IAM roles for ECS tasks the necessary permissions to read these secrets.
-   **[ ] Container Vulnerability Scanning**:
    -   Integrate **Amazon ECR scanning** or a third-party tool (like Snyk or Trivy) into the CI/CD pipeline.
    -   Configure the pipeline to fail if vulnerabilities above a certain threshold (e.g., `HIGH` or `CRITICAL`) are detected in container images.

## 4. Penetration Testing

-   **[ ] Engage Third-Party Auditor**:
    -   Contract a reputable security firm to perform a comprehensive penetration test on the production environment.
-   **[ ] Remediate Findings**:
    -   Create tickets for all identified vulnerabilities.
    -   Prioritize and fix all findings before launch.
