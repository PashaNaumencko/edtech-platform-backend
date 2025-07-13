# Phase 5: Structured Learning (Courses)

**Priority**: Medium (Post-MVP Iteration 2)

## 🎯 Phase Objective

To expand the platform's offerings beyond 1-on-1 tutoring by introducing structured, multi-lesson courses that tutors can create and sell. This requires a dedicated service for learning management and another for handling content and media.

## 📋 Dependencies

-   **Prerequisites**: Phase 4 (Core Experience & Trust) must be complete.
-   **Integrates with**: `user-service`, `payment-service`, `content-service`.

## 🔧 Microservice Implementation

### **1. Learning Service (`learning-service`)**

-   **Objective**: To manage the lifecycle of courses, lessons, and student enrollments.
-   **Key Data Structures**:
    -   **`Course` Aggregate**:
        -   `courseId`: Unique identifier.
        -   `tutorId`: The `userId` of the course creator.
        -   `title`, `description`: Details about the course.
        -   `price`: A `Money` Value Object for the course enrollment fee.
        -   `lessons`: An ordered list of `Lesson` entities.
        -   `isPublished`: A boolean to control visibility.
    -   **`Lesson` Entity**:
        -   `lessonId`: Unique identifier.
        -   `title`, `content`: The educational material of the lesson.
        -   `videoAssetId`, `documentAssetIds`: Links to media in the `content-service`.
    -   **`Enrollment` Aggregate**:
        -   `enrollmentId`: Unique identifier.
        -   `studentId`: The `userId` of the enrolled student.
        -   `courseId`: The course they are enrolled in.
        -   `progress`: A percentage or map of completed lesson IDs.
-   **Key Use Cases**:
    -   `CreateCourse`: Allows a tutor to create a new course.
    -   `AddLessonToCourse`: Enables adding lessons to a draft course.
    -   `PublishCourse`: Makes a course available for enrollment.
    -   `EnrollInCourse`: A saga-driven use case that handles payment via the `payment-service` before creating the `Enrollment` record.
    -   `TrackProgress`: Allows students to mark lessons as complete.
-   **GraphQL API**:
    -   **Queries**: `getCourseDetails(id: ID!)`, `listCourses`, `getMyEnrollments`.
    -   **Mutations**: `createCourse`, `publishCourse`, `enrollInCourse(courseId: ID!)`.

### **2. Content Service (`content-service`)**

-   **Objective**: To provide a centralized system for uploading, storing, processing, and delivering all media assets for the platform.
-   **Key Data Structures**:
    -   **`MediaAsset` Aggregate**:
        -   `assetId`: Unique identifier.
        -   `uploaderId`: The `userId` of the person who uploaded the asset.
        -   `fileName`, `mimeType`, `size`: File metadata.
        -   `s3Key`: The key for the object in the S3 bucket.
        -   `cdnUrl`: The public URL for the asset, delivered via CloudFront.
        -   `status`: `UPLOADING`, `PROCESSING`, `READY`, `FAILED`.
-   **Key Use Cases**:
    -   `UploadAsset`: Handles file uploads, performs virus scans, and stores the file in S3.
    -   `ProcessVideo`: An asynchronous use case triggered after a video upload. It uses a service like AWS MediaConvert to transcode the video into web-friendly formats.
    -   `GetAssetUrl`: Provides a secure, CDN-backed URL for accessing a media asset.
-   **GraphQL API**:
    -   **Mutation**: `uploadAsset(file: Upload!): MediaAsset!`. This will return a pre-signed URL for the client to upload the file directly to S3.
    -   **Query**: `getAsset(id: ID!): MediaAsset`.

### **3. Payment Service (`payment-service`) Enhancement**

-   The `payment-service` will be updated to handle a new payment context: `course_enrollment` in addition to `session_booking`. This allows the system to differentiate between the two types of transactions.

## ✅ Success Criteria

-   Tutors can create, manage, and publish multi-lesson courses.
-   Tutors can upload video and document assets for their lessons.
-   Uploaded videos are automatically transcoded for optimal web streaming.
-   Students can browse the course catalog and enroll in a course by completing a payment.
-   Enrolled students can view course content and track their progress.
-   All new services (`learning-service`, `content-service`) are successfully federated into the GraphQL supergraph.
-   All new code has at least 90% unit test coverage.
