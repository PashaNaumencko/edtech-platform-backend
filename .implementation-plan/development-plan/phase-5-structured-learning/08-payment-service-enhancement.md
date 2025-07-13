# Step 8: Payment Service - Enhancement

**Objective**: Update the `payment-service` to differentiate between `session_booking` and `course_enrollment` payments.

This is a crucial enhancement to support the new `learning-service`.

## 1. Add Payment Context

The `Payment` aggregate and the booking/enrollment sagas need a way to know what the payment is for.

### Update `Payment` Aggregate

Add a `context` field to the `Payment` aggregate.

```typescript
// apps/payment-service/src/domain/payment.aggregate.ts

export enum PaymentContext {
    SESSION_BOOKING = "SESSION_BOOKING",
    COURSE_ENROLLMENT = "COURSE_ENROLLMENT",
}

export class Payment {
    private constructor(
        // ... other fields
        public readonly context: PaymentContext,
        public readonly contextId: string, // sessionId or courseId
    ) {}

    public static create(input: {
        // ...
        context: PaymentContext;
        contextId: string;
    }): Payment {
        // ...
    }
}
```

## 2. Update Stripe Integration

The `metadata` sent to Stripe should be updated to include the context. This is vital for reconciliation and webhook handling.

```typescript
// In CreatePaymentIntentUseCase
const stripeIntent = await this.stripe.paymentIntents.create({
    // ...
    metadata: {
        paymentId: payment.paymentId,
        sagaId: command.sagaId,
        paymentContext: command.context, // "COURSE_ENROLLMENT"
        contextId: command.contextId,   // The courseId
    },
});
```

## 3. Create a New Saga for Course Enrollment

A new saga, `EnrollInCourseSaga`, will be created. It will be very similar to the `BookAndPayForSessionSaga` but will interact with the `learning-service` instead of the `tutor-matching-service` and `communication-service`.

-   **Initiation**: Listens for `EnrollInCourseInitiated` from the `learning-service`.
-   **Steps**:
    1.  Verify the course exists and is published (by querying `learning-service`).
    2.  Create a payment intent with the `COURSE_ENROLLMENT` context.
    3.  Wait for the `PaymentSucceeded` event from the Stripe webhook.
    4.  Send the `CREATE_ENROLLMENT_RECORD` command to the `learning-service`.
-   **Completion**: The saga completes when the enrollment is confirmed.

This ensures that payment logic remains centralized while the orchestration logic is specific to the flow being executed.
