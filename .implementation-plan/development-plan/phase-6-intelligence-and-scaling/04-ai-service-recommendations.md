# Step 4: AI Service - Recommendations

**Objective**: Implement use cases that leverage the vector database to generate recommendations.

## 1. `GenerateTutorRecommendations` Use Case

-   **Description**: Finds tutors with profiles similar to a given student's learning goals or similar to another tutor.

### Implementation Sketch

```typescript
// apps/ai-service/src/application/use-cases/generate-tutor-recommendations.use-case.ts
import { IVectorDBRepository } from '../persistence/vector-db.repository.interface';

export class GenerateTutorRecommendationsUseCase {
    constructor(private readonly vectorDbRepo: IVectorDBRepository) {}

    async execute(command: {
        studentId: string;
        learningGoals: string; // Text describing what the student wants to learn
    }): Promise<{ recommendedTutorIds: string[]; scores: number[] }> {
        
        // 1. Convert the student's learning goals into a search vector.
        // This requires calling the same embedding model used for indexing.
        const searchVector = await this.embeddingService.createEmbedding(command.learningGoals);

        // 2. Perform a k-NN search in the vector database.
        const results = await this.vectorDbRepo.findSimilar({
            vector: searchVector,
            k: 10, // Find the top 10 most similar tutors
            filter: { type: 'tutor' } // Only search for tutors
        });

        // 3. Extract IDs and similarity scores from the results.
        const recommendedTutorIds = results.map(r => r.id);
        const scores = results.map(r => r.score);

        // Optional: Further re-ranking based on other business logic
        // (e.g., tutor's average rating, availability).

        return { recommendedTutorIds, scores };
    }
}
```

## 2. `GenerateCourseRecommendations` Use Case

-   **Description**: Finds courses similar to a student's interests.
-   **Implementation**: This follows the exact same pattern as tutor recommendations. The `ai-service` will also need to consume `CourseUpdated` events, generate embeddings for course titles and descriptions, and store them in the same OpenSearch index but with `metadata.type: 'course'`. The use case will then filter its k-NN search accordingly.

## 3. `IVectorDBRepository` Interface

This abstracts the connection to OpenSearch.

```typescript
// apps/ai-service/src/application/persistence/vector-db.repository.interface.ts

export interface IVectorDBRepository {
    findSimilar(query: {
        vector: number[];
        k: number;
        filter: { type: 'tutor' | 'course' };
    }): Promise<Array<{ id: string; score: number }>>;
}
```
The implementation of this interface will use the OpenSearch client to build and execute a `knn` query.
