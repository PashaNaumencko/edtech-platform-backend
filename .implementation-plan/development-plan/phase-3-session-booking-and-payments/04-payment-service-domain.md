# Step 4: Payment Service - Domain Layer

**Objective**: Define the `Payment` aggregate to track financial transactions.

## 1. `Payment` Aggregate

This aggregate represents a single payment transaction for a session.

### `PaymentStatus` Enum

```typescript
// apps/payment-service/src/domain/payment-status.enum.ts
export enum PaymentStatus {
    PENDING = "PENDING",
    SUCCEEDED = "SUCCEEDED",
    FAILED = "FAILED",
}
```

### `Payment` Class Definition

```typescript
// apps/payment-service/src/domain/payment.aggregate.ts
import { PaymentStatus } from './payment-status.enum';
import { Money } from './money.vo'; // Assuming a shared Money VO

export class Payment {
    private constructor(
        public readonly paymentId: string,
        public readonly userId: string, // The student
        public readonly sagaId: string, // Link to the booking saga instance
        public readonly amount: Money,
        public status: PaymentStatus,
        public stripePaymentIntentId?: string,
    ) {}

    public static create(input: { userId: string; sagaId: string; amount: Money }): Payment {
        const id = '...'; // uuidv4()
        return new Payment(id, input.userId, input.sagaId, input.amount, PaymentStatus.PENDING);
    }

    public associateWithStripe(paymentIntentId: string): void {
        this.stripePaymentIntentId = paymentIntentId;
    }

    public markAsSucceeded(): void {
        if (this.status !== PaymentStatus.PENDING) {
            throw new Error("Payment is not in a pending state.");
        }
        this.status = PaymentStatus.SUCCEEDED;
        // Publish PaymentSucceeded event
    }

    public markAsFailed(): void {
        this.status = PaymentStatus.FAILED;
        // Publish PaymentFailed event
    }
}
```

## 2. Repository Interface

```typescript
// apps/payment-service/src/domain/payment.repository.ts
import { Payment } from './payment.aggregate';

export interface IPaymentRepository {
    findById(paymentId: string): Promise<Payment | null>;
    findBySagaId(sagaId: string): Promise<Payment | null>;
    findByStripeIntentId(intentId: string): Promise<Payment | null>;
    save(payment: Payment): Promise<void>;
}
```
