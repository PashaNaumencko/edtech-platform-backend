# Phase 2: Learning Service & Educational Content
**Sprint 5-6 | Duration: 2 weeks**

## Phase Objectives
Implement the Learning Service with comprehensive course management and educational content organization for math and programming education, supporting both structured courses and private lesson templates with enrollment tracking and progress management.

## Phase Dependencies
- **Prerequisites**: Phase 1 (User Service) completed
- **Requires**: User authentication system, EventBridge, S3 bucket setup
- **Outputs**: Functional Learning Service, course management system, enrollment tracking, progress monitoring

## Detailed Subphases

### 2.1 Learning Service Infrastructure Setup
**Duration: 2 days | Priority: Critical**

#### PostgreSQL Database Design
- Courses table with subject categorization (Math/Programming)
- Lessons table with structured content
- Enrollments table for student progress tracking
- Users_courses junction table for many-to-many relationships
- Progress tracking tables for lesson completion

#### S3 Content Storage
- Bucket for course materials (videos, PDFs, code repositories)
- Content delivery optimization
- File upload and management APIs

#### ECS Fargate Service
- Dedicated Learning Service container
- Internal Application Load Balancer
- Health checks and monitoring

### 2.2 Learning Service Domain Implementation
**Duration: 3 days | Priority: Critical**

#### Domain Layer Architecture
- Course Aggregate (structured courses vs private lesson templates)
- Lesson Aggregate with content types and progress tracking
- Enrollment Aggregate with progress and completion logic
- Subject Value Objects (Math/Programming categories)
- Learning Path management and prerequisites

#### Course Types Support
- **Structured Courses**: Full curriculum with multiple lessons
- **Private Lesson Templates**: Individual session planning
- Subject categorization (Algebra, Calculus, Python, JavaScript, etc.)
- Difficulty levels (Beginner, Intermediate, Advanced)

#### Content Management
- Rich content support (text, video, code examples, math formulas)
- Version control for course updates
- Content validation and quality checks

### 2.3 Application Layer Implementation
**Duration: 3 days | Priority: Critical**

#### CQRS Commands
- CreateCourse, UpdateCourse, DeleteCourse
- CreateLesson, UpdateLesson, DeleteLesson
- EnrollInCourse, UnenrollFromCourse
- CreatePrivateLessonTemplate

#### CQRS Queries
- GetCourse, GetCoursesBySubject
- GetMathCourses, GetProgrammingCourses
- GetUserEnrollments, GetCourseAnalytics
- SearchCourses with filtering

#### Business Rules
- Course pricing models (one-time vs subscription)
- Enrollment prerequisites and validation
- Content access control based on enrollment

### 2.4 Infrastructure Layer Implementation
**Duration: 3 days | Priority: Critical**

#### PostgreSQL Integration
- Course and lesson repositories with TypeORM
- Complex queries for learning analytics
- ACID compliance for enrollment transactions
- Progress tracking with relational data integrity

#### S3 Content Management
- File upload service with presigned URLs
- Content type validation and processing
- CDN integration for content delivery

#### REST API Controllers
- Course CRUD operations
- Content management endpoints
- Enrollment management APIs
- Search and discovery endpoints

### 2.5 Course Discovery & Search
**Duration: 2 days | Priority: High**

#### Discovery Algorithms
- Subject-based filtering (Math vs Programming)
- Difficulty level matching
- Popularity and rating-based sorting
- Tutor reputation integration

#### Search Implementation
- Full-text search capabilities
- Advanced filtering options
- Elasticsearch integration (optional)

### 2.6 Database Migration & Seeding
**Duration: 1 day | Priority: High**

#### PostgreSQL Schema
- Database migrations with TypeORM
- Table relationships and indexes
- Schema versioning and rollback strategy

#### Sample Content Creation
- Math courses (Algebra, Calculus, Statistics)
- Programming courses (Python, JavaScript, Algorithms)
- Private lesson templates
- Test content for development

## Success Criteria

### Technical Acceptance Criteria
- Learning Service deploys successfully to ECS
- PostgreSQL database created with proper relationships and indexes
- S3 content storage functional
- All CRUD operations work correctly
- Course discovery APIs return relevant results
- Progress tracking and enrollment management working
- File upload and download working

### Functional Acceptance Criteria
- Users can create structured courses
- Tutors can create private lesson templates
- Students can enroll in courses
- Content can be uploaded and accessed
- Course discovery works for both subject types
- Enrollment tracking is accurate

### Content Management Criteria
- Support for multiple content types
- Version control for course updates
- Content validation and quality checks
- Efficient content delivery via CDN

## Risk Mitigation

### Technical Risks
- **PostgreSQL Query Performance**: Design efficient indexes and optimize complex queries
- **Content Storage Costs**: Implement content lifecycle policies
- **File Upload Security**: Validate file types and implement virus scanning

### Business Risks
- **Content Quality**: Implement review and approval workflows
- **Copyright Issues**: Clear content ownership and licensing policies
- **Content Discovery**: Ensure relevant results for user searches

## Key Performance Indicators

### Performance Metrics
- Course creation time: < 5 seconds
- Content upload speed: Based on file size
- Search response time: < 500ms
- Page load time: < 2 seconds

### Business Metrics
- Course creation rate
- Enrollment conversion rate
- Content engagement metrics
- Search success rate

## Phase Timeline

| Subphase | Duration | Dependencies | Critical Path |
|----------|----------|--------------|---------------|
| 2.1 Infrastructure Setup | 2 days | Phase 1 | Yes |
| 2.2 Domain Implementation | 3 days | 2.1 | Yes |
| 2.3 Application Layer | 3 days | 2.2 | Yes |
| 2.4 Infrastructure Layer | 3 days | 2.3 | Yes |
| 2.5 Course Discovery | 2 days | 2.4 | No |
| 2.6 Database & Seeding | 1 day | 2.4 | No |

**Total Duration**: 14 days (2.8 weeks)  
**Buffer**: +2 days for integration testing

---

**Previous Phase**: [Phase 1: Core Infrastructure & User Service](phase-1-user-service.md)  
**Next Phase**: [Phase 3: Tutor Matching Service](phase-3-tutor-matching.md) 