# Database Migration & Seeding Strategy

## Overview
Comprehensive migration and seeding approach for all database types in the EdTech platform's microservices architecture. Each service owns its data completely through dedicated databases.

## Architectural Decision: Cloud-Based Development

As per the **[Cloud-Based Development Environment Strategy](./cloud-development-environment-strategy.md)**, we will no longer use LocalStack. All development, migration, and seeding will be performed against real AWS services deployed in a dedicated **development AWS account**. This ensures high fidelity and simplifies the developer workflow.

## Database Architecture Summary
(Service-Database Mapping remains the same)

## PostgreSQL Services Migration Framework

### TypeORM Configuration (Updated)
The configuration will now always point to a real RDS instance. The connection details will be managed by the CDK and passed to the services (e.g., via AWS Secrets Manager).

```typescript
// shared/database/postgres-base.config.ts
// This configuration now assumes it's running in an ECS task
// with access to environment variables or secrets set by the CDK.
const config: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST, // Injected by CDK
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // From Secrets Manager
  database: process.env.DB_NAME,
  // ...
};
```

### Migration & Seeding Commands
The commands remain the same, but they will be executed against the developer's ephemeral cloud database, not a local instance.

## DynamoDB Services Migration Framework

### CDK-Based Schema Management (Updated)
The CDK script will now deploy real DynamoDB tables. For development environments, these tables will be configured with `RemovalPolicy.DESTROY` to ensure they are deleted when the developer runs `cdk destroy`.

```typescript
// cdk/lib/constructs/dynamodb-service-tables.construct.ts
const isDevEnvironment = props.environment.startsWith('dev');

const table = new Table(this, tableDefinition.tableName, {
    // ...
    billingMode: BillingMode.PAY_PER_REQUEST, // Ideal for dev and prod
    // Destroy dev tables, retain prod tables
    removalPolicy: isDevEnvironment ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
});
```

### Migration & Seeding Commands
-   `cdk deploy <stack-name>` will create/update the real DynamoDB tables.
-   Seed scripts will now target the deployed tables in the developer's AWS environment.

## Production Migration Strategy
This strategy remains unchanged and is even more robust now, as the staging environment will be a near-perfect replica of production, built from the same CDK code.

## CI/CD Integration
The CI/CD pipeline will be updated to deploy to the `staging` and `prod` environments in their respective AWS accounts, using the same CDK constructs that developers use for their `dev` environments.