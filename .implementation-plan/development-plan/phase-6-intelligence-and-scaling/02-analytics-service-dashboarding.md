# Step 2: Analytics Service - Dashboarding

**Objective**: Aggregate raw event data into meaningful business metrics for an admin dashboard.

## 1. Aggregation Strategy

-   **Scheduled Batch Jobs**: This is a perfect use case for the **"Scheduled Job (Cron)" Lambda Pattern** acting as an orchestrator.
    -   **Trigger**: An EventBridge Schedule runs nightly.
    -   **Lambda's Job**: The Lambda's only task is to start an **AWS Glue ETL job**. This is more robust than running the ETL logic inside the Lambda itself, as Glue is designed for heavy data processing.
    -   **Glue Job's Job**: The Glue script reads raw data from the S3 data lake, performs Spark aggregations, and writes the results to a reporting database.
-   **Real-time Queries**: The dashboard queries the Timestream database (populated by our real-time ingestion Lambda) directly.

## 2. `StartDailyEtlJob` Lambda

```typescript
// apps/analytics-service/src/infrastructure/lambda/start-daily-etl.handler.ts
import { GlueClient, StartJobRunCommand } from '@aws-sdk/client-glue';

const glueClient = new GlueClient({});

export async function handler(event: any) {
    const command = new StartJobRunCommand({
        JobName: process.env.GLUE_JOB_NAME,
        // We can pass arguments, like the date partition to process
        Arguments: {
            '--DATE_PARTITION': new Date().toISOString().split('T')[0],
        }
    });

    await glueClient.send(command);
    console.log(`Started Glue job: ${process.env.GLUE_JOB_NAME}`);
}
```

## 3. GraphQL API for Dashboards

The GraphQL API remains the same, but its resolvers now know to query two different places:
-   For historical, aggregated data (e.g., "Monthly Revenue"), it queries the PostgreSQL reporting database populated by the Glue job.
-   For real-time data (e.g., "Sign-ups in the last hour"), it queries the Amazon Timestream table populated by the real-time ingestion Lambda.