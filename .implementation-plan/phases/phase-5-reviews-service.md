# Phase 5: Reviews & Rating System
**Sprint 11-12 | Duration: 2 weeks**

## Phase Objectives
Implement a centralized Reviews Service that handles both tutor reviews and course reviews, with sophisticated rating algorithms, moderation capabilities, and analytics to support trust and quality across the platform.

## Phase Dependencies
- **Prerequisites**: Phase 1-4 completed (User, Courses, Tutor Matching, Payment Services)
- **Requires**: User authentication, course data, tutor profiles, payment completion events
- **Outputs**: Comprehensive review system, rating algorithms, moderation tools, analytics

## Detailed Subphases

### 5.1 Reviews Infrastructure Setup
**Duration: 2 days | Priority: Critical**

#### PostgreSQL Database Design
- Reviews table with polymorphic subject handling (tutors/courses)
- ReviewCategories table for structured feedback
- ReviewModerations table for content moderation
- ReviewHelpfulness table for community validation
- ReviewAnalytics table for aggregated insights

#### Review Data Model
```typescript
interface Review {
  reviewId: string;
  reviewerId: string;
  subjectId: string; // tutorId or courseId
  subjectType: 'TUTOR' | 'COURSE';
  overallRating: number; // 1-5 scale
  categoryRatings: CategoryRating[];
  reviewText: string;
  reviewTitle: string;
  helpfulnessScore: number;
  moderationStatus: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

#### ECS Fargate Service
- Dedicated Reviews Service container
- Content moderation integration
- Analytics processing capabilities
- Integration with notification systems

### 5.2 Review Categories & Rating Framework
**Duration: 3 days | Priority: Critical**

#### Tutor Review Categories
```typescript
interface TutorReviewCategories {
  subjectExpertise: number; // 1-5: Knowledge depth and accuracy
  teachingClarity: number; // 1-5: Explanation effectiveness
  communication: number; // 1-5: Responsiveness and clarity
  patience: number; // 1-5: Student support and encouragement
  punctuality: number; // 1-5: Timeliness and reliability
  adaptability: number; // 1-5: Customization to student needs
}
```

#### Course Review Categories
```typescript
interface CourseReviewCategories {
  contentQuality: number; // 1-5: Material accuracy and depth
  courseStructure: number; // 1-5: Logical progression and organization
  practicalValue: number; // 1-5: Real-world applicability
  difficultyLevel: number; // 1-5: Appropriate challenge level
  supportMaterials: number; // 1-5: Quality of resources provided
  valueForMoney: number; // 1-5: Price vs content value
}
```

#### Rating Aggregation Algorithm
- Weighted average based on review recency
- Category-specific score calculations
- Outlier detection and handling
- Minimum review threshold requirements
- Confidence intervals for ratings

### 5.3 Review Domain Implementation
**Duration: 3 days | Priority: Critical**

#### Domain Layer Architecture
- Review aggregate with business rules
- Rating value objects with validation
- ReviewEligibility domain service
- ReviewModerator domain service
- ReviewAnalytics domain service

#### Business Rules
```typescript
class ReviewEligibilityRules {
  // Only students who completed lessons/courses can review
  canReviewTutor(studentId: string, tutorId: string): boolean;
  canReviewCourse(studentId: string, courseId: string): boolean;
  
  // One review per student per tutor/course
  hasExistingReview(reviewerId: string, subjectId: string): boolean;
  
  // Time window restrictions
  isWithinReviewWindow(completionDate: Date): boolean;
}
```

#### Review Lifecycle
- **Creation**: Eligibility check → Validation → Storage
- **Moderation**: Auto-screening → Manual review → Approval/Rejection
- **Updates**: Author can update within 30 days
- **Responses**: Tutors/Course creators can respond to reviews
- **Archival**: Old reviews weighted less in calculations

### 5.4 Review Moderation System
**Duration: 3 days | Priority: Critical**

#### Automated Content Screening
```typescript
interface ContentModerationService {
  checkProfanity(text: string): ModerationResult;
  detectSpam(review: Review): ModerationResult;
  validateAuthenticity(review: Review): ModerationResult;
  checkPersonalInfo(text: string): ModerationResult;
}
```

#### Moderation Workflows
- **Auto-Approval**: Reviews passing all automated checks
- **Manual Review**: Flagged content requiring human review
- **Community Moderation**: Users can report inappropriate reviews
- **Appeals Process**: Authors can appeal moderation decisions

#### Fake Review Detection
- Velocity checks (unusual review patterns)
- Account analysis (new accounts, suspicious activity)
- Content similarity detection
- Cross-platform verification
- Machine learning anomaly detection

### 5.5 Application Layer Implementation
**Duration: 2 days | Priority: Critical**

#### CQRS Commands
- CreateReview, UpdateReview, DeleteReview
- ModerateReview, ApproveReview, RejectReview
- RespondToReview, ReportReview
- MarkHelpful, MarkUnhelpful

#### CQRS Queries
- GetReviewsForTutor, GetReviewsForCourse
- GetUserReviews, GetReviewById
- GetAggregatedRatings, GetReviewAnalytics
- GetPendingModerations, GetReportedReviews

#### Review Services
- Review eligibility verification service
- Rating calculation and aggregation service
- Content moderation service
- Review analytics and insights service

### 5.6 Infrastructure Layer Implementation
**Duration: 3 days | Priority: Critical**

#### Database Integration
- PostgreSQL repository with complex queries
- Review aggregation stored procedures
- Full-text search capabilities
- Database triggers for rating updates
- Data consistency and integrity checks

#### External Service Integration
- Content moderation API integration
- Sentiment analysis service
- Translation service for multi-language reviews
- Notification service for review events
- Analytics tracking integration

#### REST API Controllers
- Review CRUD operations
- Rating and analytics endpoints
- Moderation workflow APIs
- Reporting and admin endpoints
- Public review display APIs

### 5.7 Rating Algorithm & Analytics
**Duration: 2 days | Priority: Critical**

#### Advanced Rating Calculation
```typescript
interface RatingAlgorithm {
  calculateWeightedAverage(reviews: Review[]): number;
  applyRecencyWeight(review: Review): number;
  detectAndFilterOutliers(ratings: number[]): number[];
  calculateConfidenceInterval(ratings: number[]): ConfidenceInterval;
  generateTrendingScore(recentReviews: Review[]): number;
}
```

#### Analytics & Insights
- Rating trends over time
- Category-specific performance insights
- Comparative analysis (vs similar tutors/courses)
- Review sentiment analysis
- Helpfulness and quality metrics

#### Integration with Matching Algorithm
- Rating boost for highly-rated tutors
- Category scores influence matching weights
- Review recency affects matching priority
- Quality indicators in search results

### 5.8 Review Display & User Experience
**Duration: 1 day | Priority: High**

#### Review Presentation
- Chronological and relevance sorting options
- Category breakdowns and visual representations
- Helpful review highlighting
- Review summary and highlights
- Responsive design for all devices

#### Review Interaction Features
- Helpful/Not helpful voting
- Review response threads
- Review filtering and search
- Report inappropriate content
- Share and bookmark reviews

## Success Criteria

### Technical Acceptance Criteria
- Reviews Service deploys successfully
- All review CRUD operations work correctly
- Rating algorithms produce consistent results
- Moderation system filters inappropriate content
- Integration with other services functions properly
- Performance meets response time requirements

### Functional Acceptance Criteria
- Students can submit reviews after lesson/course completion
- Tutors and course creators can respond to reviews
- Rating aggregation reflects review content accurately
- Moderation prevents inappropriate content publication
- Review search and filtering work effectively
- Analytics provide actionable insights

### Quality Acceptance Criteria
- Review authenticity validation prevents fake reviews
- Content moderation maintains platform quality
- Rating algorithms provide fair representation
- User experience encourages quality review submission
- System handles high review volumes efficiently

## Risk Mitigation

### Technical Risks
- **Rating Manipulation**: Implement sophisticated detection algorithms
- **Performance Issues**: Optimize database queries and implement caching
- **Content Moderation Accuracy**: Balance automation with human oversight
- **Data Consistency**: Ensure review aggregations stay synchronized

### Business Risks
- **Fake Reviews**: Multi-layered detection and prevention systems
- **Negative Review Impact**: Fair and transparent rating algorithms
- **Content Liability**: Clear moderation policies and legal compliance
- **User Engagement**: Incentivize quality review creation

### Legal Risks
- **Defamation Claims**: Content moderation and dispute resolution
- **Privacy Compliance**: Proper handling of personal information in reviews
- **Platform Liability**: Clear terms of service and moderation policies

## Key Performance Indicators

### Performance Metrics
- Review submission time: < 3 seconds
- Rating calculation time: < 1 second
- Search response time: < 500ms
- Moderation processing time: < 24 hours

### Quality Metrics
- Fake review detection rate: > 95%
- Content moderation accuracy: > 90%
- Review helpfulness ratio: > 60%
- User satisfaction with review system: > 4.0/5.0

### Business Metrics
- Review submission rate: > 70% of completed transactions
- Review response rate from tutors/creators: > 50%
- Review reading engagement rate
- Impact on booking/enrollment conversions

## Phase Timeline

| Subphase | Duration | Dependencies | Critical Path |
|----------|----------|--------------|---------------|
| 5.1 Infrastructure Setup | 2 days | Phase 1-4 | Yes |
| 5.2 Rating Framework | 3 days | 5.1 | Yes |
| 5.3 Domain Implementation | 3 days | 5.2 | Yes |
| 5.4 Moderation System | 3 days | 5.3 | Yes |
| 5.5 Application Layer | 2 days | 5.4 | Yes |
| 5.6 Infrastructure Layer | 3 days | 5.5 | Yes |
| 5.7 Rating Algorithms | 2 days | 5.6 | Yes |
| 5.8 User Experience | 1 day | 5.7 | No |

**Total Duration**: 19 days (3.8 weeks)  
**Buffer**: +3 days for algorithm optimization and testing

---

**Previous Phase**: [Phase 4: Payment Service & Billing](phase-4-payment-service.md)  
**Next Phase**: [Phase 6: Admin Panel & Moderation System](phase-6-admin-panel.md) 