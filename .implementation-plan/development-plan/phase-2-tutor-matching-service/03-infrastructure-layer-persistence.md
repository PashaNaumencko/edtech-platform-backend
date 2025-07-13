# Step 3: Infrastructure Layer & Persistence

**Objective**: Persist the `TutorProfile` aggregate in a PostgreSQL database.

We will use **Prisma** as the ORM for its type safety and ease of use.

## 1. Prisma Schema

Define the data model in `schema.prisma`.

```prisma
// apps/tutor-matching-service/prisma/schema.prisma

model TutorProfile {
  tutorProfileId String @id @default(uuid())
  userId         String @unique
  bio            String @db.Text
  hourlyRate     Float
  currency       String @default("USD")

  // Subjects and Availability will be stored as JSON for simplicity in MVP
  // A relational approach would be better for complex queries post-MVP
  subjects       Json
  availability   Json

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

**Note on JSON storage**: Storing `subjects` and `availability` as JSON is a trade-off for faster MVP development. It makes querying by these fields harder. A normalized schema with separate `Subject` and `Availability` tables would be a good post-MVP improvement.

## 2. Repository Interface (Domain Layer)

The interface is defined in the domain layer, free of any infrastructure-specific details.

```typescript
// apps/tutor-matching-service/src/domain/tutor-profile.repository.ts
import { TutorProfile } from './tutor-profile.aggregate';

export interface ITutorProfileRepository {
    findByUserId(userId: string): Promise<TutorProfile | null>;
    findById(tutorProfileId: string): Promise<TutorProfile | null>;
    save(profile: TutorProfile): Promise<void>;
    search(criteria: { subject?: string }): Promise<TutorProfile[]>;
}
```

## 3. Prisma Repository Implementation (Infrastructure Layer)

This class implements the repository interface using Prisma Client.

```typescript
// apps/tutor-matching-service/src/infrastructure/persistence/prisma-tutor-profile.repository.ts
import { PrismaClient } from '@prisma/client';
import { ITutorProfileRepository } from '../../domain/tutor-profile.repository';
import { TutorProfile } from '../../domain/tutor-profile.aggregate';
// ... other imports

export class PrismaTutorProfileRepository implements ITutorProfileRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async findByUserId(userId: string): Promise<TutorProfile | null> {
        const record = await this.prisma.tutorProfile.findUnique({ where: { userId } });
        return record ? this.toDomain(record) : null;
    }

    async save(profile: TutorProfile): Promise<void> {
        const data = this.toPersistence(profile);
        await this.prisma.tutorProfile.upsert({
            where: { tutorProfileId: profile.tutorProfileId },
            create: data,
            update: data,
        });
    }

    async search(criteria: { subject?: string }): Promise<TutorProfile[]> {
        const records = await this.prisma.tutorProfile.findMany({
            where: {
                subjects: criteria.subject
                    ? { path: '$[*].name', string_contains: criteria.subject }
                    : undefined,
            },
        });
        return records.map(this.toDomain);
    }

    // --- Private Mappers ---

    private toDomain(record: any): TutorProfile {
        // Logic to map the Prisma record to a TutorProfile aggregate instance
        // This includes reconstructing the Value Objects.
    }

    private toPersistence(profile: TutorProfile): any {
        // Logic to map the TutorProfile aggregate to a Prisma data structure
    }
}
```
