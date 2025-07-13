# Step 2: Learning Service - Use Cases

**Objective**: Implement the business logic for managing the lifecycle of courses and enrollments.

## 1. `CreateCourse`

-   **Description**: Allows a tutor to create a new draft course.

```typescript
// apps/learning-service/src/application/use-cases/create-course.use-case.ts
export class CreateCourseUseCase {
    constructor(private readonly courseRepo: ICourseRepository) {}

    async execute(command: { tutorId: string; title: string; price: Money }): Promise<Course> {
        const course = Course.create(command);
        await this.courseRepo.save(course);
        return course;
    }
}
```

## 2. `AddLessonToCourse`

-   **Description**: Adds a lesson to a course that is not yet published.

```typescript
// apps/learning-service/src/application/use-cases/add-lesson.use-case.ts
export class AddLessonToCourseUseCase {
    constructor(private readonly courseRepo: ICourseRepository) {}

    async execute(command: { courseId: string; tutorId: string; title: string; content: string; videoAssetId?: string }): Promise<void> {
        const course = await this.courseRepo.findById(command.courseId);
        if (!course || course.tutorId !== command.tutorId) {
            throw new Error("Course not found or access denied.");
        }
        const lesson = new Lesson(/* ... */);
        course.addLesson(lesson);
        await this.courseRepo.save(course);
    }
}
```

## 3. `EnrollInCourse`

-   **Description**: Enrolls a student in a course. This will be a saga-driven process involving the `payment-service`.
-   **Trigger**: `enrollInCourse` GraphQL mutation.

### Saga Flow for Enrollment

1.  **`ENROLL_IN_COURSE_INITIATED` (Event)**: Published by the `learning-service` when the mutation is called.
2.  **`PROCESS_COURSE_PAYMENT` (Command)**: The saga (which could live in the `payment-service`) commands the `payment-service` to handle the payment, similar to session booking but with a `course_enrollment` context.
3.  **`PAYMENT_SUCCEEDED` (Event)**: Published by `payment-service`.
4.  **`CREATE_ENROLLMENT_RECORD` (Command)**: The saga sends a command back to the `learning-service`.
5.  **`CreateEnrollment` Use Case**: This internal use case is triggered by the command.

### `CreateEnrollment` Use Case (Internal)

```typescript
// apps/learning-service/src/application/use-cases/create-enrollment.use-case.ts
export class CreateEnrollmentUseCase {
    constructor(
        private readonly enrollmentRepo: IEnrollmentRepository,
        private readonly courseRepo: ICourseRepository,
    ) {}

    async execute(command: { studentId: string; courseId: string }): Promise<Enrollment> {
        const course = await this.courseRepo.findById(command.courseId);
        if (!course) throw new Error("Course not found.");

        const lessonIds = course.lessons.map(l => l.lessonId);
        const enrollment = Enrollment.create({ ...command, lessonIds });
        
        await this.enrollmentRepo.save(enrollment);
        // Publish StudentEnrolled event
        return enrollment;
    }
}
```
