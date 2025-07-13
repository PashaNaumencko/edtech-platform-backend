# Step 1: Learning Service - Domain Layer

**Objective**: Model the concepts of courses, lessons, and student enrollments.

## 1. `Course` Aggregate

The `Course` is the central aggregate, representing a full course created by a tutor.

```typescript
// apps/learning-service/src/domain/course.aggregate.ts
import { Lesson } from './lesson.entity';
import { Money } from './money.vo';

export class Course {
    private constructor(
        public readonly courseId: string,
        public readonly tutorId: string,
        public title: string,
        public description: string,
        public price: Money,
        public lessons: Lesson[],
        public isPublished: boolean,
    ) {}

    public static create(input: { tutorId: string; title: string; price: Money }): Course {
        const id = '...'; // uuidv4()
        return new Course(id, input.tutorId, input.title, '', input.price, [], false);
    }

    public addLesson(lesson: Lesson): void {
        if (this.isPublished) throw new Error("Cannot add lessons to a published course.");
        this.lessons.push(lesson);
        // Reorder logic if necessary
    }

    public publish(): void {
        if (this.lessons.length === 0) throw new Error("Cannot publish a course with no lessons.");
        this.isPublished = true;
        // Publish CoursePublished event
    }
}
```

## 2. `Lesson` Entity

A `Lesson` is part of a `Course`. It's an entity, not an aggregate, as it's always managed within the context of a `Course`.

```typescript
// apps/learning-service/src/domain/lesson.entity.ts
export class Lesson {
    constructor(
        public readonly lessonId: string,
        public title: string,
        public content: string, // Text content
        public videoAssetId?: string, // Link to content-service
        public documentAssetIds?: string[], // Link to content-service
    ) {}
}
```

## 3. `Enrollment` Aggregate

Represents a student's enrollment in a course.

```typescript
// apps/learning-service/src/domain/enrollment.aggregate.ts
export class Enrollment {
    private constructor(
        public readonly enrollmentId: string,
        public readonly studentId: string,
        public readonly courseId: string,
        public progress: Map<string, boolean>, // lessonId -> isCompleted
    ) {}

    public static create(input: { studentId: string; courseId: string; lessonIds: string[] }): Enrollment {
        const id = '...'; // uuidv4()
        const progress = new Map(lessonIds.map(id => [id, false]));
        return new Enrollment(id, input.studentId, input.courseId, progress);
    }

    public markLessonAsComplete(lessonId: string): void {
        if (!this.progress.has(lessonId)) {
            throw new Error("Lesson not found in this course enrollment.");
        }
        this.progress.set(lessonId, true);
    }

    public getCompletionPercentage(): number {
        const total = this.progress.size;
        if (total === 0) return 100;
        const completed = [...this.progress.values()].filter(Boolean).length;
        return (completed / total) * 100;
    }
}
```
