# Step 5: Payment Service - Stripe Integration

**Objective**: Handle interactions with the Stripe API for payments.

## 1. `CreatePaymentIntentForSession` Use Case

-   **Description**: Creates a `Payment` record and a corresponding Stripe Payment Intent.
-   **Trigger**: `CREATE_PAYMENT_INTENT` command from the booking saga.

### Implementation Sketch

```typescript
// apps/payment-service/src/application/use-cases/create-payment-intent.use-case.ts
// ... (implementation as before)
```

## 2. Stripe Webhook Handler (Lambda Pattern)

-   **Description**: An HTTP endpoint to receive webhook events from Stripe. This is a prime example of the **"Webhook Handler" Lambda Pattern**.
-   **Architecture**: An **AWS API Gateway** endpoint (e.g., `POST /internal/stripe/webhook`) will be configured to trigger a dedicated Lambda function. This is more secure and scalable than exposing the main ECS service.
-   **Lambda's Responsibility**:
    1.  Receive the raw request from API Gateway.
    2.  Verify the `stripe-signature` header to ensure the request is authentic.
    3.  Parse the event payload.
    4.  Publish a clean, internal domain event to EventBridge (e.g., `PaymentSucceeded`, `PaymentFailed`). The booking saga will listen for this internal event.

### Implementation Sketch (Webhook Lambda)

```typescript
// apps/payment-service/src/infrastructure/lambda/stripe-webhook.handler.ts
import { Stripe } from 'stripe';
import { IEventPublisher } from 'src/application/interfaces/event-publisher.interface';
import { EventBridgePublisher } from './event-bridge.publisher'; // A shared publisher utility

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const eventPublisher: IEventPublisher = new EventBridgePublisher();

export async function handler(event: any) {
    const sig = event.headers['stripe-signature'];
    const body = event.body;

    let stripeEvent: Stripe.Event;
    try {
        stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
        // Handle invalid signature
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    // Handle the event
    switch (stripeEvent.type) {
        case 'payment_intent.succeeded':
            const intent = stripeEvent.data.object as Stripe.PaymentIntent;
            // Publish an internal event for the saga to consume
            await eventPublisher.publish('edtech.payment-service', 'PaymentSucceeded', {
                payload: { stripePaymentIntentId: intent.id }
            });
            break;
        // ... handle other event types
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
}
```
This approach decouples the `payment-service` from Stripe's specific webhook contract and leverages a highly scalable serverless function for ingestion.