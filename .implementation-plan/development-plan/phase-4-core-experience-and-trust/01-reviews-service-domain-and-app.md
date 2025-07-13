# Step 1: Reviews Service - Domain & Application

**Objective**: Define the `Review` aggregate and the use cases for managing it.

## 1. `Review` Aggregate

The `Review` aggregate captures a student's feedback for a completed session.

```typescript
// apps/reviews-service/src/domain/review.aggregate.ts

export class Review {
    private constructor(
        public readonly reviewId: string,
        public readonly sessionId: string,
        public readonly reviewerId: string, // Student's userId
        public readonly revieweeId: string, // Tutor's userId
        public readonly rating: number,   // 1-5
        public readonly comment?: string,
    ) {}

    public static create(input: {
        sessionId: string;
        reviewerId: string;
        revieweeId: string;
        rating: number;
        comment?: string;
    }): Review {
        if (input.rating < 1 || input.rating > 5) {
            throw new Error("Rating must be between 1 and 5.");
        }
        const id = '...'; // uuidv4()
        return new Review(id, input.sessionId, input.reviewerId, input.revieweeId, input.rating, input.comment);
    }
}
```

## 2. Repository Interface

```typescript
// apps/reviews-service/src/domain/review.repository.ts
import { Review } from './review.aggregate';

export interface IReviewRepository {
    findById(reviewId: string): Promise<Review | null>;
    findBySessionId(sessionId: string): Promise<Review | null>;
    findByTutorId(tutorId: string): Promise<Review[]>;
    getAverageRatingByTutorId(tutorId: string): Promise<number>;
    save(review: Review): Promise<void>;
}
```

## 3. Application Use Cases

### `CreateReview`

-   **Description**: Allows a student to submit a review for a completed session.
-   **Precondition**: The use case must verify the session is `COMPLETED`.

```typescript
// apps/reviews-service/src/application/use-cases/create-review.use-case.ts
import { ICommunicationService } from '../services/communication.service.interface';

export class CreateReviewUseCase {
    constructor(
        private readonly reviewRepo: IReviewRepository,
        private readonly communicationService: ICommunicationService, // To check session status
    ) {}

    async execute(command: { /* ... */, studentId: string }): Promise<Review> {
        // 1. Check if a review for this session already exists
        const existingReview = await this.reviewRepo.findBySessionId(command.sessionId);
        if (existingReview) {
            throw new Error("A review for this session has already been submitted.");
        }

        // 2. Verify with communication-service that the session is COMPLETED
        //    and that the person leaving the review is the student from that session.
        const session = await this.communicationService.getSessionDetails(command.sessionId);
        if (session.status !== 'COMPLETED' || session.studentId !== command.studentId) {
            throw new Error("Review can only be submitted by the student for a completed session.");
        }

        // 3. Create and save the review
        const review = Review.create({ ...command, revieweeId: session.tutorId });
        await this.reviewRepo.save(review);

        // 4. Publish a ReviewSubmitted event
        // This can be used to update the tutor's average rating asynchronously.

        return review;
    }
}
```

### `GetTutorReviews` & `GetTutorAverageRating`

These are simple query use cases that will call the corresponding repository methods.
