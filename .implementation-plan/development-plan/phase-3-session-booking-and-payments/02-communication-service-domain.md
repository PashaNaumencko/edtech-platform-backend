# Step 2: Communication Service - Domain Layer

**Objective**: Define the `Session` aggregate, which represents a scheduled lesson between a tutor and a student.

## 1. `Session` Aggregate

The `Session` aggregate is the core of the `communication-service`.

### `SessionStatus` Enum

```typescript
// apps/communication-service/src/domain/session-status.enum.ts
export enum SessionStatus {
    PENDING_PAYMENT = "PENDING_PAYMENT",
    CONFIRMED = "CONFIRMED",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
}
```

### `Session` Class Definition

```typescript
// apps/communication-service/src/domain/session.aggregate.ts
import { SessionStatus } from './session-status.enum';

export class Session {
    private constructor(
        public readonly sessionId: string,
        public readonly tutorId: string,
        public readonly studentId: string,
        public readonly scheduledAt: Date,
        public readonly duration: number, // in minutes
        public status: SessionStatus,
        public meetingLink?: string,
    ) {}

    public static create(input: {
        tutorId: string;
        studentId: string;
        scheduledAt: Date;
        duration: number;
    }): Session {
        const id = '...'; // uuidv4()
        // Initially created as confirmed because the saga ensures payment is done.
        return new Session(
            id,
            input.tutorId,
            input.studentId,
            input.scheduledAt,
            input.duration,
            SessionStatus.CONFIRMED,
            // Meeting link can be generated here or later
        );
    }

    public cancel(): void {
        if (this.status === SessionStatus.COMPLETED) {
            throw new Error("Cannot cancel a completed session.");
        }
        this.status = SessionStatus.CANCELLED;
        // Domain event: SessionCancelled
    }

    public complete(): void {
        if (this.status !== SessionStatus.CONFIRMED) {
            throw new Error("Only a confirmed session can be completed.");
        }
        this.status = SessionStatus.COMPLETED;
        // Domain event: SessionCompleted
    }
}
```

## 2. Repository Interface

```typescript
// apps/communication-service/src/domain/session.repository.ts
import { Session } from './session.aggregate';

export interface ISessionRepository {
    findById(sessionId: string): Promise<Session | null>;
    findByUserId(userId: string): Promise<Session[]>;
    save(session: Session): Promise<void>;
}
```
