# Phase 7: Reviews Service Subgraph
**Duration: 8 days | Priority: Medium**

## Phase Overview

This phase implements the Reviews Service for ratings, feedback, and reputation management following our standardized microservice architecture with DDD + Clean Architecture + Use Case Pattern.

### Dependencies
- **Prerequisites**: Phase 6 (Communication Service) completed
- **Integrates with**: User Service, Learning Service, Communication Service
- **Provides**: Review and rating system for all platform interactions

## Subphase 7.1: Reviews Service Implementation (6 days)

### Domain Layer Implementation (1 day)

#### Entities (AggregateRoot)
```typescript
// domain/entities/review.entity.ts
export class Review extends AggregateRoot {
  constructor(
    private readonly _id: ReviewId,
    private readonly _reviewerId: UserId,
    private readonly _revieweeId: UserId,
    private readonly _entityType: ReviewEntityType,
    private readonly _entityId: string,
    private readonly _rating: Rating,
    private readonly _comment: string,
    private _isVerified: boolean = false,
    private readonly _createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateReviewData): Review {
    const review = new Review(
      ReviewId.generate(),
      new UserId(data.reviewerId),
      new UserId(data.revieweeId),
      data.entityType,
      data.entityId,
      new Rating(data.rating),
      data.comment,
    );

    review.apply(new ReviewCreatedEvent(review));
    return review;
  }

  verify(): void {
    this._isVerified = true;
    this.apply(new ReviewVerifiedEvent(this));
  }

  // Getters
  get id(): ReviewId { return this._id; }
  get reviewerId(): UserId { return this._reviewerId; }
  get revieweeId(): UserId { return this._revieweeId; }
  get entityType(): ReviewEntityType { return this._entityType; }
  get entityId(): string { return this._entityId; }
  get rating(): Rating { return this._rating; }
  get comment(): string { return this._comment; }
  get isVerified(): boolean { return this._isVerified; }
  get createdAt(): Date { return this._createdAt; }
}
```

#### Value Objects
```typescript
// domain/value-objects/rating.vo.ts
export class Rating {
  constructor(private readonly value: number) {
    if (value < 1 || value > 5) {
      throw new InvalidRatingException();
    }
  }

  getValue(): number { return this.value; }
  
  isExcellent(): boolean { return this.value >= 4.5; }
  isGood(): boolean { return this.value >= 3.5; }
  isPoor(): boolean { return this.value <= 2; }
}
```

### Application Layer Implementation (2 days)

#### Use Cases
```typescript
// application/use-cases/create-review/create-review.usecase.ts
@Injectable()
export class CreateReviewUseCase implements IUseCase<CreateReviewRequest, CreateReviewResponse> {
  constructor(
    private reviewRepository: ReviewRepository,
    private sessionRepository: SessionRepository,
    private userServiceClient: UserServiceClient,
  ) {}

  async execute(request: CreateReviewRequest): Promise<CreateReviewResponse> {
    // 1. Validate session completed
    if (request.entityType === ReviewEntityType.SESSION) {
      const session = await this.sessionRepository.findById(request.entityId);
      if (!session || session.status !== SessionStatus.COMPLETED) {
        throw new SessionNotCompletedException();
      }
    }

    // 2. Check for duplicate review
    const existingReview = await this.reviewRepository.findByReviewerAndEntity(
      request.reviewerId,
      request.entityType,
      request.entityId,
    );
    if (existingReview) {
      throw new DuplicateReviewException();
    }

    // 3. Create review
    const review = Review.create({
      reviewerId: request.reviewerId,
      revieweeId: request.revieweeId,
      entityType: request.entityType,
      entityId: request.entityId,
      rating: request.rating,
      comment: request.comment,
    });

    // 4. Persist
    const savedReview = await this.reviewRepository.save(review);
    savedReview.commit();

    return CreateReviewResponse.fromDomain(savedReview);
  }
}

// application/use-cases/get-entity-reviews/get-entity-reviews.usecase.ts
@Injectable()
export class GetEntityReviewsUseCase implements IUseCase<GetEntityReviewsRequest, GetEntityReviewsResponse> {
  constructor(
    private reviewRepository: ReviewRepository,
  ) {}

  async execute(request: GetEntityReviewsRequest): Promise<GetEntityReviewsResponse> {
    const reviews = await this.reviewRepository.findByEntity(
      request.entityType,
      request.entityId,
      request.limit,
      request.offset,
    );

    const averageRating = await this.reviewRepository.getAverageRating(
      request.entityType,
      request.entityId,
    );

    return GetEntityReviewsResponse.fromDomainList(reviews, averageRating);
  }
}
```

### Infrastructure Layer Implementation (2 days)

#### PostgreSQL Integration
```typescript
// infrastructure/postgres/entities/review.orm-entity.ts
@Entity('reviews')
export class ReviewOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  reviewerId: string;

  @Column('uuid')
  revieweeId: string;

  @Column()
  entityType: string;

  @Column()
  entityId: string;

  @Column('int')
  rating: number;

  @Column('text')
  comment: string;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Index(['entityType', 'entityId'])
  @Index(['revieweeId'])
  @Index(['reviewerId'])
}
```

### Presentation Layer Implementation (1 day)

#### Internal HTTP Controllers
```typescript
// presentation/http/controllers/internal/reviews.internal.controller.ts
@Controller('internal/reviews')
@UseGuards(ServiceAuthGuard)
export class InternalReviewsController {
  constructor(
    private createReviewUseCase: CreateReviewUseCase,
    private getEntityReviewsUseCase: GetEntityReviewsUseCase,
  ) {}

  @Post()
  async createReview(@Body() dto: CreateReviewDto): Promise<ReviewDto> {
    const request = new CreateReviewRequest();
    request.reviewerId = dto.reviewerId;
    request.revieweeId = dto.revieweeId;
    request.entityType = dto.entityType;
    request.entityId = dto.entityId;
    request.rating = dto.rating;
    request.comment = dto.comment;
    
    const response = await this.createReviewUseCase.execute(request);
    return response.review;
  }

  @Get(':entityType/:entityId')
  async getEntityReviews(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: GetReviewsDto,
  ): Promise<EntityReviewsDto> {
    const request = new GetEntityReviewsRequest();
    request.entityType = entityType as ReviewEntityType;
    request.entityId = entityId;
    request.limit = query.limit;
    request.offset = query.offset;
    
    const response = await this.getEntityReviewsUseCase.execute(request);
    return {
      reviews: response.reviews,
      averageRating: response.averageRating,
      totalCount: response.totalCount,
    };
  }
}
```

#### GraphQL Subgraph Schema
```graphql
# presentation/graphql/schemas/reviews.subgraph.graphql
extend type Query {
  review(id: ID!): Review
  entityReviews(entityType: ReviewEntityType!, entityId: ID!): EntityReviews!
  userReviews(userId: ID!, asReviewer: Boolean!): [Review!]!
}

extend type Mutation {
  createReview(input: CreateReviewInput!): Review! @auth(requires: USER)
  verifyReview(id: ID!): Review! @auth(requires: ADMIN)
}

type Review @key(fields: "id") {
  id: ID!
  reviewerId: ID!
  revieweeId: ID!
  entityType: ReviewEntityType!
  entityId: ID!
  rating: Int!
  comment: String!
  isVerified: Boolean!
  createdAt: AWSDateTime!
  reviewer: User @provides(fields: "reviewerId")
  reviewee: User @provides(fields: "revieweeId")
}

type EntityReviews {
  reviews: [Review!]!
  averageRating: Float!
  totalCount: Int!
  ratingDistribution: [RatingCount!]!
}

type RatingCount {
  rating: Int!
  count: Int!
}

enum ReviewEntityType {
  TUTOR
  COURSE
  SESSION
}

# Federation relationships
extend type User @key(fields: "id") {
  id: ID! @external
  reviewsGiven: [Review!]! @requires(fields: "id")
  reviewsReceived: [Review!]! @requires(fields: "id")
  averageRating: Float! @requires(fields: "id")
}

extend type Course @key(fields: "id") {
  id: ID! @external
  reviews: EntityReviews! @requires(fields: "id")
}

extend type Session @key(fields: "id") {
  id: ID! @external
  review: Review @requires(fields: "id")
}

input CreateReviewInput {
  revieweeId: ID!
  entityType: ReviewEntityType!
  entityId: ID!
  rating: Int!
  comment: String!
}
```

## Subphase 7.2: Advanced Features & Integration (2 days)

### Review Analytics (1 day)
- Rating trends and insights
- Review sentiment analysis
- Reputation scoring algorithms
- Review quality assessment

### GraphQL Integration (1 day)
- Lambda resolvers for review operations
- Federation with User, Course, Session entities
- Real-time rating updates
- Review moderation workflows

## Success Criteria

### Technical Acceptance Criteria
- ✅ Review creation and management working
- ✅ Rating aggregation and statistics
- ✅ Reviews subgraph schema validates
- ✅ Duplicate review prevention
- ✅ Review verification system

### Functional Acceptance Criteria
- ✅ Users can leave reviews after sessions
- ✅ Tutors and courses display accurate ratings
- ✅ Review moderation and verification
- ✅ Rating trends and analytics
- ✅ Reputation system working

### Performance Criteria
- ✅ Review creation < 500ms
- ✅ Rating aggregation < 200ms
- ✅ Reviews query performance < 300ms
- ✅ Real-time rating updates

## Dependencies & Integration
- **User Service**: Reviewer and reviewee profiles
- **Learning Service**: Course reviews and ratings
- **Communication Service**: Session completion verification
- **Analytics Service**: Review and rating analytics

This service provides comprehensive review and rating capabilities for the platform! 