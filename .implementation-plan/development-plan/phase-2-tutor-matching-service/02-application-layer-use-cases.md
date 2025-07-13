# Step 2: Application Layer Use Cases

**Objective**: Implement the business logic that orchestrates domain objects.

Each use case will be implemented as a class with a single public `execute` method. This aligns with the Command pattern and makes the application layer easy to test and understand.

## 1. `CreateTutorProfile`

-   **Description**: Creates an initial, empty profile for a user with the `TUTOR` role.
-   **Trigger**: Called when a `TUTOR` signs up and needs a profile created.

### Implementation Sketch

```typescript
// apps/tutor-matching-service/src/application/use-cases/create-tutor-profile.use-case.ts
import { TutorProfile } from '../../domain/tutor-profile.aggregate';
import { ITutorProfileRepository } from '../../domain/tutor-profile.repository';

export class CreateTutorProfileUseCase {
    constructor(private readonly profileRepo: ITutorProfileRepository) {}

    async execute(input: { userId: string }): Promise<TutorProfile> {
        // 1. Check if a profile already exists for this userId
        const existingProfile = await this.profileRepo.findByUserId(input.userId);
        if (existingProfile) {
            throw new Error("Tutor profile already exists for this user.");
        }

        // 2. Create a new TutorProfile aggregate
        const newProfile = TutorProfile.create({ userId: input.userId });

        // 3. Save the new profile to the database
        await this.profileRepo.save(newProfile);

        return newProfile;
    }
}
```

## 2. `UpdateTutorProfile`

-   **Description**: Allows a tutor to update their main profile details.
-   **Authorization**: Only the tutor who owns the profile can execute this.

### Implementation Sketch

```typescript
// apps/tutor-matching-service/src/application/use-cases/update-tutor-profile.use-case.ts
// ... imports

export class UpdateTutorProfileUseCase {
    constructor(private readonly profileRepo: ITutorProfileRepository) {}

    async execute(input: { userId: string; bio: string; hourlyRate: Money; subjects: Subject[] }): Promise<TutorProfile> {
        // 1. Fetch the existing profile
        const profile = await this.profileRepo.findByUserId(input.userId);
        if (!profile) {
            throw new Error("Tutor profile not found.");
        }

        // 2. Call the domain method to update the profile
        profile.updateProfile(input.bio, input.hourlyRate, input.subjects);

        // 3. Save the updated profile
        await this.profileRepo.save(profile);

        return profile;
    }
}
```

## 3. `SetAvailability`

-   **Description**: A dedicated use case for managing weekly availability.
-   **Authorization**: Only the tutor who owns the profile can execute this.

### Implementation Sketch

```typescript
// apps/tutor-matching-service/src/application/use-cases/set-availability.use-case.ts
// ... imports

export class SetAvailabilityUseCase {
    constructor(private readonly profileRepo: ITutorProfileRepository) {}

    async execute(input: { userId: string; availability: Availability[] }): Promise<void> {
        const profile = await this.profileRepo.findByUserId(input.userId);
        if (!profile) {
            throw new Error("Tutor profile not found.");
        }

        profile.setAvailability(input.availability);

        await this.profileRepo.save(profile);
    }
}
```

## 4. `FindTutors`

-   **Description**: A query-like use case for students to find tutors.
-   **Note**: This is a read-only operation.

### Implementation Sketch

```typescript
// apps/tutor-matching-service/src/application/use-cases/find-tutors.use-case.ts
// ... imports

export class FindTutorsUseCase {
    constructor(private readonly profileRepo: ITutorProfileRepository) {}

    async execute(criteria: { subject?: string; availability?: any }): Promise<TutorProfile[]> {
        // The repository will handle the complexity of the search query
        return this.profileRepo.search(criteria);
    }
}
```
