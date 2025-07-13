# Step 2: Reviews Service - API

**Objective**: Expose review functionality via GraphQL and extend the `TutorProfile`.

## 1. GraphQL Schema (`reviews.subgraph.graphql`)

```graphql
# reviews.subgraph.graphql

type Query {
  getTutorReviews(tutorId: ID!): [Review!]!
}

type Mutation {
  submitReview(input: SubmitReviewInput!): Review! @authenticated(role: "STUDENT")
}

type Review @key(fields: "reviewId") {
  reviewId: ID!
  reviewer: User!
  rating: Int!
  comment: String
  createdAt: AWSDateTime!
}

# Extend the TutorProfile from the tutor-matching-service
type TutorProfile @key(fields: "tutorProfileId") @extends {
  tutorProfileId: ID! @external
  averageRating: Float
  reviewCount: Int
  reviews: [Review!]
}

# Extend the User type to show who wrote the review
type User @key(fields: "id") @extends {
  id: ID! @external
}

input SubmitReviewInput {
  sessionId: ID!
  rating: Int!
  comment: String
}
```

## 2. Resolver Implementation

### `submitReview` Mutation

```typescript
// apps/reviews-service/src/presentation/graphql/reviews.resolver.ts
@Mutation()
@UseGuards(JwtAuthGuard)
async submitReview(@Args('input') input: SubmitReviewInput, @Context() ctx: any): Promise<Review> {
    const studentId = ctx.req.user.id;
    return this.createReviewUseCase.execute({ ...input, studentId });
}
```

### `TutorProfile` Extension Resolver

This resolver is responsible for populating the new review-related fields on the `TutorProfile` type.

```typescript
// apps/reviews-service/src/presentation/graphql/tutor-profile.resolver.ts
@Resolver('TutorProfile')
export class TutorProfileResolver {
    constructor(private readonly reviewRepo: IReviewRepository) {}

    @ResolveField('averageRating')
    async getAverageRating(@Parent() profile: { tutorProfileId: string }): Promise<number> {
        // This needs a way to map tutorProfileId to userId.
        // This highlights a potential design issue. It's better to key the
        // TutorProfile on `userId` if possible, or have a way to look it up.
        // Assuming we can get the userId:
        const userId = '...'; // await this.getUserIdForProfile(profile.tutorProfileId);
        return this.reviewRepo.getAverageRatingByTutorId(userId);
    }

    @ResolveField('reviews')
    async getReviews(@Parent() profile: { tutorProfileId: string }): Promise<Review[]> {
        const userId = '...';
        return this.reviewRepo.findByTutorId(userId);
    }
}
```
