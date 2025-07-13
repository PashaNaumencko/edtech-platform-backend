# Step 3 (Day 16): EventBridge & Event Handlers

**Objective**: Fully implement the event-driven architecture by publishing the advanced domain events to AWS EventBridge and handling them to orchestrate side effects.

## 1. EventBridge Publisher Implementation

-   **Goal**: Create a concrete implementation of the `IEventPublisher` interface defined in the application layer.
-   **Implementation**: This service will use the AWS SDK v3 for EventBridge to send events.

```typescript
// apps/user-service/src/infrastructure/event-bridge/event-bridge.publisher.ts
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { IEventPublisher } from 'src/application/interfaces/event-publisher.interface';
import { BaseDomainEvent } from 'src/domain/events/base.event';

export class EventBridgePublisher implements IEventPublisher {
    private client = new EventBridgeClient({});

    async publish(event: BaseDomainEvent): Promise<void> {
        const command = new PutEventsCommand({
            Entries: [{
                Source: 'edtech.user-service',
                DetailType: event.constructor.name, // e.g., "UserCreatedEvent"
                Detail: JSON.stringify({
                    metadata: event.metadata,
                    payload: event.payload,
                }),
                EventBusName: process.env.EVENT_BUS_NAME,
            }],
        });
        await this.client.send(command);
    }
}
```
This publisher will be injected into use cases that need to publish events after successfully modifying the domain state.

## 2. Event Handler Implementation

-   **Goal**: Implement the logic within the event handlers defined in the application layer.
-   **Example**: `UserCreatedEventHandler`

```typescript
// apps/user-service/src/application/event-handlers/user-created.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from 'src/domain/events/user-created.event';
import { IEmailProvider } from '../interfaces/email.provider.interface';

@EventsHandler(UserCreatedEvent)
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
    constructor(private readonly emailProvider: IEmailProvider) {}

    async handle(event: UserCreatedEvent) {
        console.log('Handling UserCreatedEvent...');
        
        // Use the email provider to send a welcome email
        await this.emailProvider.sendWelcomeEmail(
            event.payload.email,
            event.payload.profile.firstName,
        );

        // This could also trigger other workflows, like creating a
        // default profile in another service.
    }
}
```
These handlers are automatically invoked by the NestJS CQRS module when a use case publishes an event to the in-memory event bus.

## 3. End-to-End Event Workflow Testing

-   **Goal**: Verify that events are published and handled correctly.
-   **Strategy**:
    1.  **Integration Test**: Write an integration test that calls a use case (e.g., `CreateUserUseCase`).
    2.  **Mock the Publisher**: In the test, mock the `IEventPublisher` to assert that its `publish` method is called with the correct event object.
    3.  **E2E Test (Manual or Automated)**:
        -   Execute an API call that triggers an event.
        -   Go to the AWS EventBridge console for the specified event bus and check the "Monitoring" tab to see that the event was published.
        -   Check the CloudWatch Logs for the downstream service (e.g., the `notification-service` Lambda) to confirm it was triggered and processed the event successfully.
        -   Verify the side effect (e.g., check that an email was received).
