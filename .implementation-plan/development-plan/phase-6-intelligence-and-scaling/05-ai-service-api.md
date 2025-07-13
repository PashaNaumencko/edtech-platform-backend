# Step 5: AI Service - API

**Objective**: Expose the recommendation engines through the GraphQL supergraph.

## 1. GraphQL Schema (`ai.subgraph.graphql`)

The API should be simple and focused on getting lists of recommendations.

```graphql
# ai.subgraph.graphql

type Query {
  # Get recommendations based on a student's general interests
  getRecommendedTutors(interest: String!, count: Int = 10): [TutorRecommendation!]! @authenticated
  getRecommendedCourses(interest: String!, count: Int = 10): [CourseRecommendation!]! @authenticated
}

# We can also extend other types to add contextual recommendations
type Course @key(fields: "courseId") @extends {
  courseId: ID! @external
  # Show tutors who are recommended for this course's topic
  recommendedTutors: [TutorRecommendation!]!
}

type TutorRecommendation {
  # The recommended tutor profile
  profile: TutorProfile!
  # A score indicating the strength of the recommendation
  confidenceScore: Float!
}

type CourseRecommendation {
  course: Course!
  confidenceScore: Float!
}

# We need to be able to resolve TutorProfile and Course
type TutorProfile @key(fields: "tutorProfileId") @extends {
  tutorProfileId: ID! @external
}
# The AI service doesn't own the full TutorProfile, it just needs to link to it.
# A better approach might be to just return IDs and let the gateway fetch the full objects.

# Revised, simpler approach:
type Query {
  getRecommendedTutorIds(interest: String!): [ID!]!
}
# This is simpler and more in line with federation principles. The gateway or client
# would then be responsible for fetching the full profiles for those IDs.
# Let's proceed with the richer model for now as it's described in the phase doc,
# but the simpler ID-based one is often better practice.
```

## 2. Resolver Implementation

The resolvers will call the use cases and then stitch the results.

```typescript
// apps/ai-service/src/presentation/graphql/recommendation.resolver.ts

@Resolver()
export class RecommendationResolver {
    constructor(
        private readonly generateTutors: GenerateTutorRecommendationsUseCase,
        // ... other use cases
    ) {}

    @Query()
    @UseGuards(JwtAuthGuard)
    async getRecommendedTutors(
        @Args('interest') interest: string,
        @Context() ctx: any,
    ): Promise<TutorRecommendation[]> {
        const studentId = ctx.req.user.id;

        const { recommendedTutorIds, scores } = await this.generateTutors.execute({
            studentId,
            learningGoals: interest,
        });

        // The resolver needs to return a list of `TutorRecommendation` objects.
        // It knows the IDs and scores. It needs to return a `TutorProfile` stub
        // that the GraphQL gateway can use to fetch the full object from the
        // `tutor-matching-service`.
        return recommendedTutorIds.map((id, index) => ({
            profile: {
                // This is a federated stub.
                // We need userId, but the recommendation gives us userId.
                // The TutorProfile is keyed by tutorProfileId. This is a recurring
                // design challenge that needs to be solved. Assuming we can get the profile ID.
                tutorProfileId: '...', // getProfileIdFromUserId(id)
                __typename: 'TutorProfile',
            },
            confidenceScore: scores[index],
        }));
    }
}
```
