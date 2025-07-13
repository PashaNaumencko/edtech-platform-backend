# Step 4: Notification Service - Use Cases

**Objective**: Implement the logic for handling events and sending notifications.

## 1. `SendNotification` Use Case

This is the primary use case of the service, implemented within a serverless function. It determines the message, fetches user contact info, and uses a provider to send the notification. This is an example of the **"Event-Driven Worker" Lambda Pattern**.

```typescript
// apps/notification-service/src/application/use-cases/send-notification.use-case.ts
// ... (implementation as before)
```

## 2. Event Handler (Lambda)

The Lambda function is the entry point that triggers the use case. See the [Serverless Implementation Guide](./06-serverless-implementation-guide.md) for the full code.

```typescript
// apps/notification-service/src/infrastructure/lambda/event.handler.ts

// This is the function configured as the EventBridge target
export async function handler(event: any, context: any) {
    // 1. Bootstrap the application (DI container, etc.)
    const sendNotificationUseCase = // ... get from container

    // 2. Execute the use case
    await sendNotificationUseCase.execute(event);
}
```

## 3. Scheduled Reminders (Lambda Pattern)

For session reminders, a scheduled process is needed. This is a perfect example of the **"Scheduled Job (Cron)" Lambda Pattern**.

-   **Architecture**: An **EventBridge Schedule** is configured with a cron expression (e.g., `cron(0 * * * ? *)` to run every hour). Its target is a dedicated Lambda function.
-   **Lambda's Responsibility**:
    1.  The Lambda is invoked by the schedule.
    2.  It calls the `communication-service`'s internal API to get a list of all sessions starting in the next 24 hours.
    3.  For each upcoming session, it publishes a `SendSessionReminder` event to EventBridge.
    4.  The main notification handler Lambda (from step 1) subscribes to this `SendSessionReminder` event and sends the actual emails.

### Implementation Sketch (Scheduled Lambda)

```typescript
// apps/notification-service/src/infrastructure/lambda/session-reminder.handler.ts
import axios from 'axios';
import { IEventPublisher } from 'src/application/interfaces/event-publisher.interface';

const COMMUNICATION_SERVICE_URL = process.env.COMMUNICATION_SERVICE_URL;

export async function handler(event: any) {
    // 1. Fetch upcoming sessions from the communication-service
    const response = await axios.get(`${COMMUNICATION_SERVICE_URL}/internal/sessions/upcoming`);
    const upcomingSessions = response.data.data;

    // 2. For each session, publish a reminder event
    for (const session of upcomingSessions) {
        await eventPublisher.publish('edtech.notification-service', 'SendSessionReminder', {
            payload: { sessionId: session.id, /* ... */ }
        });
    }
}
```