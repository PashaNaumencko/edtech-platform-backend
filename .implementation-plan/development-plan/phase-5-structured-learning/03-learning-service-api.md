# Step 3: Learning Service - API

**Objective**: Expose courses, lessons, and enrollments via a GraphQL subgraph.

## 1. GraphQL Schema (`learning.subgraph.graphql`)

```graphql
# learning.subgraph.graphql

type Query {
  listCourses(filter: CourseFilter): [Course!]!
  getCourseDetails(id: ID!): Course
  myEnrollments: [Enrollment!]! @authenticated
}

type Mutation {
  createCourse(input: CreateCourseInput!): Course! @authenticated(role: "TUTOR")
  addLesson(input: AddLessonInput!): Course! @authenticated(role: "TUTOR")
  publishCourse(courseId: ID!): Course! @authenticated(role: "TUTOR")
  enrollInCourse(courseId: ID!): EnrollInCoursePayload! @authenticated(role: "STUDENT")
  markLessonAsComplete(lessonId: ID!): Enrollment! @authenticated(role: "STUDENT")
}

type Course @key(fields: "courseId") {
  courseId: ID!
  tutor: User!
  title: String!
  description: String!
  price: Money!
  lessons: [Lesson!]!
  isPublished: Boolean!
}

type Lesson {
  lessonId: ID!
  title: String!
  content: String!
  video: MediaAsset
  attachments: [MediaAsset!]
}

type Enrollment @key(fields: "enrollmentId") {
  enrollmentId: ID!
  course: Course!
  student: User!
  progress: Float! # Percentage
  completedLessons: [ID!]!
}

# Extend other types
type User @key(fields: "id") @extends {
  id: ID! @external
}
type MediaAsset @key(fields: "assetId") @extends {
  assetId: ID! @external
}

# Inputs and Payloads
input CreateCourseInput {
  title: String!
  price: MoneyInput!
}

input AddLessonInput {
  courseId: ID!
  title: String!
  content: String!
  videoAssetId: ID
}

type EnrollInCoursePayload {
  sagaId: ID!
  # As with session booking, payment details are handled by the saga
  # and may require async communication back to the client.
}
```

## 2. Resolver Implementation

Resolvers will call the corresponding use cases. The `enrollInCourse` mutation will kick off the saga.

```typescript
// apps/learning-service/src/presentation/graphql/course.resolver.ts
@Resolver('Course')
export class CourseResolver {
    constructor(
        private readonly createCourseUseCase: CreateCourseUseCase,
        // ... other use cases
        private readonly eventBus: EventBus,
    ) {}

    @Mutation()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('TUTOR')
    async createCourse(@Args('input') input: CreateCourseInput, @Context() ctx: any): Promise<Course> {
        const tutorId = ctx.req.user.id;
        return this.createCourseUseCase.execute({ ...input, tutorId });
    }

    @Mutation()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('STUDENT')
    async enrollInCourse(@Args('courseId') courseId: string, @Context() ctx: any): Promise<EnrollInCoursePayload> {
        const studentId = ctx.req.user.id;
        const sagaId = '...'; // generate ID

        // Publish the event to start the saga
        this.eventBus.publish(
            new EnrollInCourseInitiatedEvent({ sagaId, studentId, courseId })
        );

        return { sagaId };
    }
}
```
