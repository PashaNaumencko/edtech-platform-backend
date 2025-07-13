# Step 1: Analytics Service - Event Capture

**Objective**: Implement a robust pipeline to capture all significant business and user events across the platform.

This service is almost entirely event-driven and leverages the **"Event-Driven Worker" Lambda Pattern** for real-time ingestion.

## 1. Architecture

-   **Event Bus**: Continue using the central AWS EventBridge bus.
-   **Event Standardization**: All services will publish events using a standard schema.
-   **Data Lake (via Firehose)**: All events from the bus will be streamed directly into an S3 bucket via **EventBridge Firehose**. This is a configuration, not custom code.
-   **Real-time Ingestion (via Lambda)**: For real-time dashboards, a dedicated Lambda function will subscribe to the event bus.

## 2. `TrackEvent` Lambda Function

-   **Pattern**: "Event-Driven Worker" Lambda.
-   **Trigger**: An EventBridge rule that matches all events from all services (`source: prefix: "edtech."`).
-   **Responsibility**: To write a subset of data from each event into a time-series database (e.g., Amazon Timestream) for fast dashboarding.

```typescript
// apps/analytics-service/src/infrastructure/lambda/track-event.handler.ts
import { TimestreamWriteClient, WriteRecordsCommand } from "@aws-sdk/client-timestream-write";

const client = new TimestreamWriteClient({});

export async function handler(event: any) {
    const record = {
        Dimensions: [
            { Name: 'service', Value: event.source },
            { Name: 'eventType', Value: event['detail-type'] },
            // Add other dimensions like userId if available
        ],
        MeasureName: 'event_count',
        MeasureValue: '1',
        MeasureValueType: 'BIGINT',
        Time: event.detail.metadata.timestamp,
    };

    const command = new WriteRecordsCommand({
        DatabaseName: 'AnalyticsDB',
        TableName: 'EventsTable',
        Records: [record],
    });

    await client.send(command);
}
```

## 3. Enabling Other Services to Publish Events

Each service will use a shared library to publish events, as defined previously. This ensures all services participate in the event-driven architecture that the Lambda consumers rely on.