# Step 3: Notification Service - Setup

**Objective**: Design the architecture for a decoupled, event-driven notification service.

The `notification-service` will not expose many direct APIs. Instead, it will listen for events published by other services on an **EventBridge** bus and take action.

## 1. Event-Driven Architecture

-   **Event Bus**: A central AWS EventBridge event bus will be used.
-   **Publishers**: Any microservice can publish domain events to the bus (e.g., `communication-service` publishes `SessionConfirmed`).
-   **Subscriber**: The `notification-service` will have a Lambda function that is configured with a rule to subscribe to specific events from the bus.

### Example Event Flow: Session Confirmed

1.  **`communication-service`**: After a session is successfully created, it publishes a `SessionConfirmed` event to EventBridge.
    ```json
    {
      "source": "edtech.communication-service",
      "detail-type": "SessionConfirmed",
      "detail": {
        "sessionId": "...",
        "studentId": "...",
        "tutorId": "...",
        "scheduledAt": "..."
      }
    }
    ```
2.  **EventBridge Rule**: A rule is configured to match events with `source: "edtech.communication-service"` and `detail-type: "SessionConfirmed"`.
3.  **`notification-service` Lambda**: The rule's target is a Lambda function in the `notification-service`. The Lambda receives the event payload.
4.  **Lambda Handler**: The handler parses the event and triggers the `SendNotification` use case.

## 2. `Notification` Entity

This entity will be stored in a database (e.g., DynamoDB for scalability) to log sent notifications.

```typescript
// apps/notification-service/src/domain/notification.entity.ts

export enum NotificationChannel {
    EMAIL = "EMAIL",
    PUSH = "PUSH",
    SMS = "SMS",
}

export enum NotificationType {
    SESSION_CONFIRMED = "SESSION_CONFIRMED",
    SESSION_REMINDER_24H = "SESSION_REMINDER_24H",
    PAYMENT_RECEIPT = "PAYMENT_RECEIPT",
}

export class Notification {
    // ... properties like notificationId, userId, type, channel, content, status
}
```
