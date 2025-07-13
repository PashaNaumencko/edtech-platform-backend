# Step 3: Production Infrastructure (IaC)

**Objective**: Define and deploy a highly available, scalable, and cost-effective production environment using the AWS CDK.

This involves creating production-ready versions of the CDK stacks used for development and staging.

## 1. Networking (VPC)

-   **[ ] Production VPC Stack**:
    -   Configure a VPC with at least two Availability Zones (AZs) for high availability.
    -   Create public and private subnets in each AZ.
    -   Public subnets for the ALB and NAT Gateways.
    -   Private subnets for all ECS services and databases.
-   **[ ] NAT Gateways**:
    -   Provision NAT Gateways in the public subnets to allow services in private subnets to access the internet (e.g., for calling third-party APIs like Stripe).

## 2. Compute (ECS)

-   **[ ] Production ECS Cluster**:
    -   Create a new ECS cluster dedicated to the production environment.
-   **[ ] Service Stacks**:
    -   For each microservice, create a production-stage CDK stack.
    -   **Auto Scaling**: Configure ECS Service Auto Scaling for each service.
        -   **Trigger**: Based on average CPU utilization (e.g., scale up if CPU > 75%) or memory utilization.
        -   **Settings**: Define minimum, desired, and maximum task counts.
    -   **Container Insights**: Enable Container Insights for detailed performance monitoring.

## 3. Databases (RDS & Others)

-   **[ ] Production RDS Stack**:
    -   Provision RDS instances (PostgreSQL) as **Multi-AZ** deployments. This creates a standby replica in a different AZ for automatic failover.
    -   Choose appropriate instance sizes based on load testing results.
    -   Configure automated daily backups with a specific retention period.
-   **[ ] Production ElastiCache/OpenSearch**:
    -   If using ElastiCache for Redis, enable Multi-AZ with automatic failover.
    -   For OpenSearch, use a multi-node configuration spread across AZs.

## 4. Content Delivery (S3 & CloudFront)

-   **[ ] Production S3 Buckets**:
    -   Create separate S3 buckets for production data (e.g., `edtech-prod-media-assets`).
    -   Configure bucket policies and CORS for production access.
-   **[ ] CloudFront Distribution**:
    -   Set up a CloudFront distribution pointing to the production S3 buckets and the production ALB.
    -   Configure caching behaviors to optimize content delivery.
    -   Attach a custom domain name (e.g., `api.my-platform.com`) and a free AWS Certificate Manager (ACM) SSL certificate.
