# Cloud-Based Development Environment Strategy

This document outlines the strategy for moving away from a local AWS simulation (LocalStack) to using real, ephemeral AWS environments for development. This approach increases fidelity with production, simplifies the developer workflow, and eliminates "it works on my machine" issues.

## Guiding Principles

1.  **High Fidelity**: Developers should test against real AWS services, not local mocks.
2.  **Developer Isolation**: Each developer (or feature branch) should have their own isolated stack to prevent conflicts.
3.  **Cost Optimization**: The architecture must be designed to be extremely cost-effective, leveraging serverless and scale-to-zero resources wherever possible to stay within the AWS Free Tier.
4.  **Ephemeral by Default**: Development environments should be easy to create and destroy on demand.

## The Core Workflow

Instead of running `cdklocal`, developers will deploy a personal, temporary stack to a dedicated **development AWS account**.

1.  **Developer starts a new task**: `git checkout -b feature/new-thing`
2.  **Deploy an isolated environment**: `cdk deploy MyDevStack-feature-new-thing`
3.  **Develop & Test**: The developer receives unique API endpoints for their personal stack and tests against live AWS services.
4.  **Pull Request**: The developer creates a PR. The ephemeral stack can be linked to in the PR for reviewers to test.
5.  **Merge & Destroy**: Once the PR is merged, the stack is destroyed to stop all costs: `cdk destroy MyDevStack-feature-new-thing`

## Implementation Plan

### 1. AWS Account Structure

We will use a multi-account structure:
-   **`Dev Account`**: A single AWS account shared by all developers. This account is for deploying ephemeral development stacks. It will have strict budgeting and cost alerts.
-   **`Staging Account`**: For hosting the stable, pre-production environment.
-   **`Prod Account`**: For the live production environment.

### 2. CDK Environment Configuration

The CDK application will be made environment-aware. We will use context variables in `cdk.json` or a new `cdk.context.json` to manage environment-specific configurations.

**`bin/app.ts` Example:**

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();

// Determine the environment from a context variable or environment variable
const environment = app.node.tryGetContext('env') || 'dev'; // 'dev', 'staging', 'prod'
const stackName = app.node.tryGetContext('stackName') || `EdTechPlatform-${environment}`;

// Pass the environment name to the stacks
new EdTechPlatformStack(app, stackName, {
  envName: environment,
  /* ... other props ... */
});
```

A developer can now deploy a personal stack with:
`cdk deploy --context env=dev --context stackName=MyDevStack-pavlonaumenko`

### 3. Cost Optimization Strategy for the `Dev` Environment

This is the most critical part. The stacks deployed to the `dev` account **must** be configured differently from production to minimize costs.

**In the CDK stack definitions, we will use conditional logic:**

```typescript
// cdk/lib/stacks/main-stack.ts

// If it's a dev environment, use serverless and scale-to-zero resources.
const isDevEnvironment = props.envName.startsWith('dev');

// 1. Database: Use RDS Serverless v2 for PostgreSQL
const database = new rds.DatabaseCluster(this, 'Database', {
    engine: rds.DatabaseClusterEngine.auroraPostgres({ /* ... */ }),
    // In dev, the cluster will scale down to 0 ACUs when idle, costing almost nothing.
    // In prod, we would use provisioned instances for constant performance.
    serverlessV2MinCapacity: isDevEnvironment ? 0.5 : 4,
    serverlessV2MaxCapacity: isDevEnvironment ? 1 : 64,
});

// 2. Compute: Configure ECS services to scale down to zero
const ecsService = new ecs.FargateService(this, 'MyService', {
    // ...
});
const scalableTarget = ecsService.autoScaleTaskCount({ maxCapacity: isDevEnvironment ? 1 : 10 });
scalableTarget.scaleOnCpuUtilization('CpuScaling', {
    targetUtilizationPercent: 50,
    // In dev, allow scaling down to zero. In prod, we'd set this to 1 or higher.
    scaleInCooldown: cdk.Duration.seconds(60),
    scaleOutCooldown: cdk.Duration.seconds(60),
});
// Note: Scaling to zero requires an external trigger (like a scheduled Lambda) to scale back up.
// A simpler dev strategy is to set minCapacity to 1 and have developers manually destroy stacks.

// 3. Other Services: Use on-demand for everything
// DynamoDB: Use PAY_PER_REQUEST billing mode (default).
// Lambda: Inherently pay-per-use.
```

### 4. Removing LocalStack Dependencies

-   **Remove `cdklocal`**: All `cdklocal` commands will be replaced with standard `cdk` commands (e.g., `cdk deploy`, `cdk destroy`).
-   **Update `scripts/`**: Any scripts that reference `localstack` (like `init-localstack.sh`) will be removed or updated.
-   **Update `docker-compose.yml`**: The `localstack` service will be removed from the Docker Compose file. The file may still be useful for running databases locally for unit/integration testing if desired, but not for full environment simulation.
-   **Update Documentation**: All `README.md` and development guides will be updated to reflect the new cloud-based workflow.
