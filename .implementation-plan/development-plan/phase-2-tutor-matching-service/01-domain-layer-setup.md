# Step 1: Domain Layer Setup

**Objective**: Define the core building blocks of the `tutor-matching-service` domain.

## 1. `TutorProfile` Aggregate

The `TutorProfile` is the central aggregate of this service. It encapsulates all data related to a tutor's public profile.

### `TutorProfile` Class Definition

We will use TypeScript classes to represent our domain entities.

```typescript
// apps/tutor-matching-service/src/domain/tutor-profile.aggregate.ts
import { Money } from './money.vo';
import { Availability } from './availability.vo';
import { Subject } from './subject.vo';

export class TutorProfile {
    private constructor(
        public readonly tutorProfileId: string,
        public readonly userId: string,
        public bio: string,
        public hourlyRate: Money,
        public subjects: Subject[],
        public availability: Availability[],
    ) {}

    public static create(input: { userId: string }): TutorProfile {
        // Logic to generate a new UUID for tutorProfileId
        const id = '...'; // e.g., uuidv4()
        return new TutorProfile(id, input.userId, '', Money.zero(), [], []);
    }

    public updateProfile(bio: string, hourlyRate: Money, subjects: Subject[]): void {
        this.bio = bio;
        this.hourlyRate = hourlyRate; // Add validation if needed
        this.subjects = subjects;
    }

    public setAvailability(availability: Availability[]): void {
        // Add validation to ensure no overlapping slots
        this.availability = availability;
    }
}
```

## 2. Value Objects (VOs)

Value Objects are immutable objects defined by their attributes.

### `Money` VO

Represents a monetary value.

```typescript
// apps/tutor-matching-service/src/domain/money.vo.ts
export class Money {
    private constructor(
        public readonly amount: number,
        public readonly currency: string,
    ) {
        if (amount < 0) {
            throw new Error("Amount cannot be negative.");
        }
    }

    public static create(amount: number, currency: string): Money {
        return new Money(amount, currency);
    }

    public static zero(currency: string = 'USD'): Money {
        return new Money(0, currency);
    }
}
```

### `Subject` VO

Represents a subject the tutor teaches.

```typescript
// apps/tutor-matching-service/src/domain/subject.vo.ts
export class Subject {
    private constructor(
        public readonly name: string,
        public readonly category: string,
        public readonly level: string,
    ) {}

    public static create(name: string, category: string, level: string): Subject {
        return new Subject(name, category, level);
    }
}
```

### `Availability` VO

Represents a recurring weekly time slot.

```typescript
// apps/tutor-matching-service/src/domain/availability.vo.ts
export enum DayOfWeek {
    MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
}

export class Availability {
    private constructor(
        public readonly dayOfWeek: DayOfWeek,
        public readonly startTime: string, // "HH:mm" format
        public readonly endTime: string,   // "HH:mm" format
        public readonly timezone: string,  // IANA timezone name
    ) {
        // Add validation for time format and start/end times
    }

    public static create(dayOfWeek: DayOfWeek, startTime: string, endTime: string, timezone: string): Availability {
        return new Availability(dayOfWeek, startTime, endTime, timezone);
    }
}
```
