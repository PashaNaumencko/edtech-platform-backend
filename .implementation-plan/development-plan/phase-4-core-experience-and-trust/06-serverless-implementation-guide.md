# Step 6: Serverless Implementation Guide

**Objective**: To provide a clear, practical example of how to develop a standalone, event-driven Lambda function for business logic that doesn't require a persistent server.

We will use the `notification-service`'s primary function—handling a `SessionConfirmed` event—as our case study.

## 1. Project Structure for a Serverless Function

Even within a larger monorepo, a serverless function should be self-contained.

```
apps/notification-service/
├── src/
│   ├── handlers/
│   │   └── session-confirmed.handler.ts  // The Lambda entry point
│   ├── use-cases/
│   │   └── send-notification.use-case.ts // The core logic
│   ├── services/
│   │   └── user.service.ts               // A client for the user-service API
│   └── providers/
│       └── email.provider.ts             // Interface for SES
├── test/
│   └── session-confirmed.handler.test.ts
└── cdk/
    └── stack.ts                          // Infrastructure definition
```

## 2. The Lambda Handler (`session-confirmed.handler.ts`)

This is the entry point. Its only job is to parse the event, bootstrap dependencies, and execute the use case. It should contain minimal logic.

```typescript
// apps/notification-service/src/handlers/session-confirmed.handler.ts
import 'source-map-support/register'; // For correct error line numbers
import { SendNotificationUseCase } from '../use-cases/send-notification.use-case';
import { UserService } from '../services/user.service';
import { SesEmailProvider } from '../providers/email.provider';

// --- Dependency Injection (Manual) ---
// In a real scenario, a lightweight DI container could be used.
// For simplicity, we instantiate dependencies manually here.
const userService = new UserService();
const emailProvider = new SesEmailProvider();
const sendNotificationUseCase = new SendNotificationUseCase(userService, emailProvider);
// ---

// The main handler function
export const handler = async (event: any, context: any): Promise<void> => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // The actual event payload is in `event.detail`
    const eventDetail = event.detail;

    try {
        await sendNotificationUseCase.execute({
            type: 'SESSION_CONFIRMED',
            recipients: [eventDetail.studentId, eventDetail.tutorId],
            data: {
                sessionId: eventDetail.sessionId,
                scheduledAt: eventDetail.scheduledAt,
            },
        });
        console.log('Successfully processed SessionConfirmed event.');
    } catch (error) {
        console.error('Failed to process event', { error });
        // Re-throw the error to allow for retries via SQS/DLQ
        throw error;
    }
};
```

## 3. The Use Case (`send-notification.use-case.ts`)

This contains the core, testable business logic, completely decoupled from the Lambda runtime.

```typescript
// apps/notification-service/src/use-cases/send-notification.use-case.ts
// (Content is similar to the original plan, but now it's clear how it's instantiated and called)

export class SendNotificationUseCase {
    constructor(
        private readonly userService: IUserService,
        private readonly emailProvider: IEmailProvider,
    ) {}

    async execute(command: { type: string; recipients: string[]; data: any }): Promise<void> {
        // ... logic to get user info, generate templates, and send email ...
    }
}
```

## 4. Infrastructure as Code (CDK)

The CDK stack defines the Lambda function and its trigger.

```typescript
// apps/notification-service/cdk/stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class NotificationServiceStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 1. Define the Lambda function
        const sessionConfirmedHandler = new lambda.Function(this, 'SessionConfirmedHandler', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'session-confirmed.handler.handler', // file.function
            code: lambda.Code.fromAsset('dist/apps/notification-service'), // Point to compiled JS
            // ... other config like memory, timeout, environment variables
        });

        // 2. Define the EventBridge rule to trigger it
        const rule = new events.Rule(this, 'SessionConfirmedRule', {
            eventBus: events.EventBus.fromEventBusName(this, 'MainBus', 'default'), // Use the shared bus
            eventPattern: {
                source: ['edtech.communication-service'],
                detailType: ['SessionConfirmed'],
            },
        });

        // 3. Set the Lambda function as the target for the rule
        rule.addTarget(new targets.LambdaFunction(sessionConfirmedHandler));
    }
}
```
This provides a complete, end-to-end example of a serverless function within our architecture.
