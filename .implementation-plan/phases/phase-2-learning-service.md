# Phase 2: Learning Service Subgraph
**Duration: 14 days | Priority: High**

## Phase Overview

This phase implements the Learning Service following our standardized microservice architecture with DDD + Clean Architecture + Use Case Pattern. It demonstrates course management, enrollment workflows, and content integration.

### Dependencies
- **Prerequisites**: Phase 1 (User Service) completed
- **Requires**: User Service APIs for tutor federation
- **Integrates with**: Content Service (Phase 3) for materials

## Subphase 2.1: Learning Service Complete Implementation (10 days)

### Domain Layer Implementation (2 days)

#### Entities (AggregateRoot)
```typescript
// domain/entities/course.entity.ts
import { AggregateRoot } from '@nestjs/cqrs';

export class Course extends AggregateRoot {
  constructor(
    private readonly _id: CourseId,
    private readonly _tutorId: UserId,
    private _title: string,
    private _description: string,
    private _price: Money,
    private _isPublished: boolean = false,
    private readonly _createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateCourseData): Course {
    const course = new Course(
      CourseId.generate(),
      new UserId(data.tutorId),
      data.title,
      data.description,
      new Money(data.price, data.currency),
    );

    course.apply(new CourseCreatedEvent(course));
    return course;
  }

  publish(): void {
    if (this._isPublished) {
      throw new CourseAlreadyPublishedException();
    }

    this._isPublished = true;
    this.apply(new CoursePublishedEvent(this));
  }

  addLesson(lessonData: AddLessonData): void {
    const lesson = Lesson.create({
      courseId: this._id,
      ...lessonData,
    });

    this.apply(new LessonAddedToCourseEvent(this, lesson));
  }

  // Getters
  get id(): CourseId { return this._id; }
  get tutorId(): UserId { return this._tutorId; }
  get title(): string { return this._title; }
  get description(): string { return this._description; }
  get price(): Money { return this._price; }
  get isPublished(): boolean { return this._isPublished; }
  get createdAt(): Date { return this._createdAt; }
}

// domain/entities/lesson.entity.ts
export class Lesson extends AggregateRoot {
  constructor(
    private readonly _id: LessonId,
    private readonly _courseId: CourseId,
    private _title: string,
    private _content: string,
    private _duration: number, // in minutes
    private _order: number,
    private _videoUrl?: string,
  ) {
    super();
  }

  static create(data: CreateLessonData): Lesson {
    const lesson = new Lesson(
      LessonId.generate(),
      new CourseId(data.courseId),
      data.title,
      data.content,
      data.duration,
      data.order,
      data.videoUrl,
    );

    lesson.apply(new LessonCreatedEvent(lesson));
    return lesson;
  }

  updateContent(content: string, videoUrl?: string): void {
    this._content = content;
    this._videoUrl = videoUrl;
    this.apply(new LessonContentUpdatedEvent(this));
  }
}

// domain/entities/enrollment.entity.ts
export class Enrollment extends AggregateRoot {
  constructor(
    private readonly _id: EnrollmentId,
    private readonly _studentId: UserId,
    private readonly _courseId: CourseId,
    private _status: EnrollmentStatus,
    private _progress: number = 0,
    private readonly _enrolledAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateEnrollmentData): Enrollment {
    const enrollment = new Enrollment(
      EnrollmentId.generate(),
      new UserId(data.studentId),
      new CourseId(data.courseId),
      EnrollmentStatus.ACTIVE,
    );

    enrollment.apply(new StudentEnrolledEvent(enrollment));
    return enrollment;
  }

  updateProgress(progress: number): void {
    if (progress < 0 || progress > 100) {
      throw new InvalidProgressException();
    }

    const oldProgress = this._progress;
    this._progress = progress;

    this.apply(new ProgressUpdatedEvent(this, oldProgress, progress));

    if (progress === 100 && oldProgress < 100) {
      this.apply(new CourseCompletedEvent(this));
    }
  }
}
```

#### Value Objects
```typescript
// domain/value-objects/course-id.vo.ts
export class CourseId {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new InvalidCourseIdException();
    }
  }

  static generate(): CourseId {
    return new CourseId(randomUUID());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: CourseId): boolean {
    return this.value === other.value;
  }
}

// domain/value-objects/money.vo.ts
export class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: string,
  ) {
    if (amount < 0) {
      throw new InvalidAmountException();
    }
    if (!['USD', 'EUR', 'GBP'].includes(currency)) {
      throw new UnsupportedCurrencyException();
    }
  }

  getAmount(): number { return this.amount; }
  getCurrency(): string { return this.currency; }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchException();
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}
```

#### Domain Events
```typescript
// domain/events/course-created.event.ts
export class CourseCreatedEvent {
  constructor(public readonly course: Course) {}
}

// domain/events/student-enrolled.event.ts
export class StudentEnrolledEvent {
  constructor(public readonly enrollment: Enrollment) {}
}

// domain/events/progress-updated.event.ts
export class ProgressUpdatedEvent {
  constructor(
    public readonly enrollment: Enrollment,
    public readonly oldProgress: number,
    public readonly newProgress: number,
  ) {}
}
```

### Application Layer Implementation (3 days)

#### Use Cases
```typescript
// application/use-cases/create-course/create-course.usecase.ts
@Injectable()
export class CreateCourseUseCase implements IUseCase<CreateCourseRequest, CreateCourseResponse> {
  constructor(
    private courseRepository: CourseRepository,
    private userServiceClient: UserServiceClient,
    private eventBus: EventBus,
  ) {}

  async execute(request: CreateCourseRequest): Promise<CreateCourseResponse> {
    // 1. Validate tutor exists and is authorized
    const tutor = await this.userServiceClient.getUser(request.tutorId);
    if (!tutor.isTutor) {
      throw new NotATutorException();
    }

    // 2. Create course domain entity
    const course = Course.create({
      tutorId: request.tutorId,
      title: request.title,
      description: request.description,
      price: request.price,
      currency: request.currency,
    });

    // 3. Persist to database
    const savedCourse = await this.courseRepository.save(course);

    // 4. Commit domain events
    savedCourse.commit();

    // 5. Return response
    return CreateCourseResponse.fromDomain(savedCourse);
  }
}

// application/use-cases/enroll-student/enroll-student.usecase.ts
@Injectable()
export class EnrollStudentUseCase implements IUseCase<EnrollStudentRequest, EnrollStudentResponse> {
  constructor(
    private enrollmentRepository: EnrollmentRepository,
    private courseRepository: CourseRepository,
    private paymentServiceClient: PaymentServiceClient,
    private eventBus: EventBus,
  ) {}

  async execute(request: EnrollStudentRequest): Promise<EnrollStudentResponse> {
    // 1. Validate course exists and is published
    const course = await this.courseRepository.findById(request.courseId);
    if (!course || !course.isPublished) {
      throw new CourseNotAvailableException();
    }

    // 2. Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findByStudentAndCourse(
      request.studentId,
      request.courseId,
    );
    if (existingEnrollment) {
      throw new AlreadyEnrolledException();
    }

    // 3. Process payment if course has a price
    if (course.price.getAmount() > 0) {
      await this.paymentServiceClient.processPayment({
        userId: request.studentId,
        amount: course.price.getAmount(),
        currency: course.price.getCurrency(),
        description: `Course: ${course.title}`,
      });
    }

    // 4. Create enrollment
    const enrollment = Enrollment.create({
      studentId: request.studentId,
      courseId: request.courseId,
    });

    // 5. Persist
    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    // 6. Commit events
    savedEnrollment.commit();

    return EnrollStudentResponse.fromDomain(savedEnrollment);
  }
}

// application/use-cases/track-progress/track-progress.usecase.ts
@Injectable()
export class TrackProgressUseCase implements IUseCase<TrackProgressRequest, TrackProgressResponse> {
  constructor(
    private enrollmentRepository: EnrollmentRepository,
    private analyticsServiceClient: AnalyticsServiceClient,
  ) {}

  async execute(request: TrackProgressRequest): Promise<TrackProgressResponse> {
    // 1. Find enrollment
    const enrollment = await this.enrollmentRepository.findByStudentAndCourse(
      request.studentId,
      request.courseId,
    );
    if (!enrollment) {
      throw new NotEnrolledException();
    }

    // 2. Update progress
    enrollment.updateProgress(request.progress);

    // 3. Persist
    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    // 4. Track analytics
    await this.analyticsServiceClient.trackEvent({
      type: 'course_progress_updated',
      userId: request.studentId,
      courseId: request.courseId,
      progress: request.progress,
    });

    // 5. Commit events
    savedEnrollment.commit();

    return TrackProgressResponse.fromDomain(savedEnrollment);
  }
}
```

#### Request/Response Objects
```typescript
// application/use-cases/create-course/create-course.request.ts
export class CreateCourseRequest {
  tutorId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
}

// application/use-cases/create-course/create-course.response.ts
export class CreateCourseResponse {
  course: CourseDto;

  static fromDomain(course: Course): CreateCourseResponse {
    return {
      course: CourseDto.fromDomain(course),
    };
  }
}

// application/use-cases/enroll-student/enroll-student.request.ts
export class EnrollStudentRequest {
  studentId: string;
  courseId: string;
}

// application/use-cases/enroll-student/enroll-student.response.ts
export class EnrollStudentResponse {
  enrollment: EnrollmentDto;

  static fromDomain(enrollment: Enrollment): EnrollStudentResponse {
    return {
      enrollment: EnrollmentDto.fromDomain(enrollment),
    };
  }
}
```

#### DTOs (API Layer)
```typescript
// application/dto/course.dto.ts
export class CourseDto {
  id: string;
  tutorId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  isPublished: boolean;
  lessonsCount: number;
  enrollmentCount: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(course: Course): CourseDto {
    return {
      id: course.id.getValue(),
      tutorId: course.tutorId.getValue(),
      title: course.title,
      description: course.description,
      price: course.price.getAmount(),
      currency: course.price.getCurrency(),
      isPublished: course.isPublished,
      lessonsCount: 0, // Will be populated by repository
      enrollmentCount: 0, // Will be populated by repository
      rating: 0, // Will be calculated from reviews
      createdAt: course.createdAt,
      updatedAt: course.createdAt, // Will be updated by repository
    };
  }
}

// application/dto/enrollment.dto.ts
export class EnrollmentDto {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  progress: number;
  enrolledAt: Date;
  completedAt?: Date;

  static fromDomain(enrollment: Enrollment): EnrollmentDto {
    return {
      id: enrollment.id.getValue(),
      studentId: enrollment.studentId.getValue(),
      courseId: enrollment.courseId.getValue(),
      status: enrollment.status,
      progress: enrollment.progress,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
    };
  }
}
```

#### Event Handlers
```typescript
// application/event-handlers/course-created.handler.ts
@EventsHandler(CourseCreatedEvent)
export class CourseCreatedHandler implements IEventHandler<CourseCreatedEvent> {
  constructor(
    private analyticsServiceClient: AnalyticsServiceClient,
    private notificationServiceClient: NotificationServiceClient,
  ) {}

  async handle(event: CourseCreatedEvent): Promise<void> {
    await Promise.all([
      // Track course creation analytics
      this.analyticsServiceClient.trackEvent({
        type: 'course_created',
        tutorId: event.course.tutorId.getValue(),
        courseId: event.course.id.getValue(),
        price: event.course.price.getAmount(),
      }),

      // Notify platform administrators
      this.notificationServiceClient.sendNotification({
        type: 'new_course_pending_review',
        recipients: ['admin@platform.com'],
        data: {
          courseId: event.course.id.getValue(),
          tutorId: event.course.tutorId.getValue(),
          title: event.course.title,
        },
      }),
    ]);
  }
}

// application/event-handlers/student-enrolled.handler.ts
@EventsHandler(StudentEnrolledEvent)
export class StudentEnrolledHandler implements IEventHandler<StudentEnrolledEvent> {
  constructor(
    private notificationServiceClient: NotificationServiceClient,
    private analyticsServiceClient: AnalyticsServiceClient,
  ) {}

  async handle(event: StudentEnrolledEvent): Promise<void> {
    await Promise.all([
      // Welcome notification to student
      this.notificationServiceClient.sendNotification({
        type: 'enrollment_welcome',
        userId: event.enrollment.studentId.getValue(),
        data: {
          courseId: event.enrollment.courseId.getValue(),
          enrollmentId: event.enrollment.id.getValue(),
        },
      }),

      // Track enrollment analytics
      this.analyticsServiceClient.trackEvent({
        type: 'student_enrolled',
        studentId: event.enrollment.studentId.getValue(),
        courseId: event.enrollment.courseId.getValue(),
      }),
    ]);
  }
}
```

### Infrastructure Layer Implementation (4 days)

#### PostgreSQL Integration
```typescript
// infrastructure/database/entities/course.orm-entity.ts
@Entity('courses')
export class CourseOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tutorId: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ default: false })
  isPublished: boolean;

  @OneToMany(() => LessonOrmEntity, lesson => lesson.course)
  lessons: LessonOrmEntity[];

  @OneToMany(() => EnrollmentOrmEntity, enrollment => enrollment.course)
  enrollments: EnrollmentOrmEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// infrastructure/database/repositories/course.repository.impl.ts
@Injectable()
export class CourseRepositoryImpl implements CourseRepository {
  constructor(
    @InjectRepository(CourseOrmEntity)
    private courseOrmRepository: Repository<CourseOrmEntity>,
    private courseMapper: CourseMapper,
  ) {}

  async save(course: Course): Promise<Course> {
    const ormEntity = this.courseMapper.toOrmEntity(course);
    const savedEntity = await this.courseOrmRepository.save(ormEntity);
    return this.courseMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<Course | null> {
    const entity = await this.courseOrmRepository.findOne({
      where: { id },
      relations: ['lessons', 'enrollments'],
    });
    return entity ? this.courseMapper.toDomain(entity) : null;
  }

  async findByTutor(tutorId: string): Promise<Course[]> {
    const entities = await this.courseOrmRepository.find({
      where: { tutorId },
      relations: ['lessons', 'enrollments'],
      order: { createdAt: 'DESC' },
    });
    return entities.map(entity => this.courseMapper.toDomain(entity));
  }

  async search(query: SearchCoursesQuery): Promise<Course[]> {
    const queryBuilder = this.courseOrmRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.lessons', 'lessons')
      .leftJoinAndSelect('course.enrollments', 'enrollments')
      .where('course.isPublished = true');

    if (query.searchTerm) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search)',
        { search: `%${query.searchTerm}%` }
      );
    }

    if (query.minPrice !== undefined) {
      queryBuilder.andWhere('course.price >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      queryBuilder.andWhere('course.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    const entities = await queryBuilder
      .orderBy('course.createdAt', 'DESC')
      .limit(query.limit || 20)
      .offset(query.offset || 0)
      .getMany();

    return entities.map(entity => this.courseMapper.toDomain(entity));
  }
}
```

#### Redis Caching
```typescript
// infrastructure/redis/cache/course.cache.ts
@Injectable()
export class CourseCacheService {
  constructor(
    @InjectRedis() private redis: Redis,
  ) {}

  private getCacheKey(id: string): string {
    return `course:${id}`;
  }

  private getSearchCacheKey(query: SearchCoursesQuery): string {
    const queryHash = createHash('md5')
      .update(JSON.stringify(query))
      .digest('hex');
    return `course:search:${queryHash}`;
  }

  async getCourse(id: string): Promise<CourseDto | null> {
    const cached = await this.redis.get(this.getCacheKey(id));
    return cached ? JSON.parse(cached) : null;
  }

  async setCourse(course: CourseDto): Promise<void> {
    await this.redis.setex(
      this.getCacheKey(course.id),
      3600, // 1 hour
      JSON.stringify(course)
    );
  }

  async invalidateCourse(id: string): Promise<void> {
    await this.redis.del(this.getCacheKey(id));
  }

  async getSearchResults(query: SearchCoursesQuery): Promise<CourseDto[] | null> {
    const cached = await this.redis.get(this.getSearchCacheKey(query));
    return cached ? JSON.parse(cached) : null;
  }

  async setSearchResults(query: SearchCoursesQuery, results: CourseDto[]): Promise<void> {
    await this.redis.setex(
      this.getSearchCacheKey(query),
      1800, // 30 minutes
      JSON.stringify(results)
    );
  }
}
```

#### S3 Integration (Course Materials)
```typescript
// infrastructure/s3/services/course-material.service.ts
@Injectable()
export class CourseMaterialService {
  constructor(
    @Inject('S3_CLIENT') private s3Client: S3Client,
    private configService: ConfigService,
  ) {}

  async uploadCourseMaterial(
    courseId: string,
    lessonId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const key = `courses/${courseId}/lessons/${lessonId}/${file.originalname}`;
    
    const command = new PutObjectCommand({
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        courseId,
        lessonId,
        originalName: file.originalname,
      },
    });

    await this.s3Client.send(command);

    return `https://${this.configService.get('AWS_S3_BUCKET')}.s3.amazonaws.com/${key}`;
  }

  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  async deleteCourseMaterial(courseId: string, lessonId: string, fileName: string): Promise<void> {
    const key = `courses/${courseId}/lessons/${lessonId}/${fileName}`;
    
    const command = new DeleteObjectCommand({
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
    });

    await this.s3Client.send(command);
  }
}
```

#### Analytics Integration
```typescript
// infrastructure/analytics/services/learning-analytics.service.ts
@Injectable()
export class LearningAnalyticsService {
  constructor(
    private analyticsServiceClient: AnalyticsServiceClient,
  ) {}

  async trackCourseCreated(course: Course): Promise<void> {
    await this.analyticsServiceClient.trackEvent({
      type: 'course_created',
      userId: course.tutorId.getValue(),
      properties: {
        courseId: course.id.getValue(),
        title: course.title,
        price: course.price.getAmount(),
        currency: course.price.getCurrency(),
      },
      timestamp: new Date(),
    });
  }

  async trackStudentEnrolled(enrollment: Enrollment): Promise<void> {
    await this.analyticsServiceClient.trackEvent({
      type: 'student_enrolled',
      userId: enrollment.studentId.getValue(),
      properties: {
        courseId: enrollment.courseId.getValue(),
        enrollmentId: enrollment.id.getValue(),
      },
      timestamp: new Date(),
    });
  }

  async trackProgressUpdate(enrollment: Enrollment, oldProgress: number): Promise<void> {
    await this.analyticsServiceClient.trackEvent({
      type: 'progress_updated',
      userId: enrollment.studentId.getValue(),
      properties: {
        courseId: enrollment.courseId.getValue(),
        enrollmentId: enrollment.id.getValue(),
        oldProgress,
        newProgress: enrollment.progress,
        progressDelta: enrollment.progress - oldProgress,
      },
      timestamp: new Date(),
    });
  }
}
```

#### EventBridge Integration
```typescript
// infrastructure/event-bridge/publishers/learning-event.publisher.ts
@Injectable()
export class LearningEventPublisher {
  constructor(
    @Inject('EVENTBRIDGE_CLIENT') private eventBridge: EventBridgeClient,
    private configService: ConfigService,
  ) {}

  async publishCourseCreated(course: Course): Promise<void> {
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: 'learning-service',
          DetailType: 'Course Created',
          Detail: JSON.stringify({
            courseId: course.id.getValue(),
            tutorId: course.tutorId.getValue(),
            title: course.title,
            price: course.price.getAmount(),
            currency: course.price.getCurrency(),
            timestamp: new Date().toISOString(),
          }),
          EventBusName: this.configService.get('AWS_EVENTBRIDGE_BUS_NAME'),
        },
      ],
    });

    await this.eventBridge.send(command);
  }

  async publishStudentEnrolled(enrollment: Enrollment): Promise<void> {
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: 'learning-service',
          DetailType: 'Student Enrolled',
          Detail: JSON.stringify({
            enrollmentId: enrollment.id.getValue(),
            studentId: enrollment.studentId.getValue(),
            courseId: enrollment.courseId.getValue(),
            timestamp: new Date().toISOString(),
          }),
          EventBusName: this.configService.get('AWS_EVENTBRIDGE_BUS_NAME'),
        },
      ],
    });

    await this.eventBridge.send(command);
  }
}
```

### Presentation Layer Implementation (1 day)

#### Internal HTTP Controllers
```typescript
// presentation/http/controllers/internal/courses.internal.controller.ts
@Controller('internal/courses')
@UseGuards(ServiceAuthGuard)
export class InternalCoursesController {
  constructor(
    private createCourseUseCase: CreateCourseUseCase,
    private publishCourseUseCase: PublishCourseUseCase,
    private searchCoursesUseCase: SearchCoursesUseCase,
    private getCourseUseCase: GetCourseUseCase,
  ) {}

  @Get(':id')
  async getCourse(@Param('id') id: string): Promise<CourseDto> {
    const request = new GetCourseRequest();
    request.id = id;
    
    const response = await this.getCourseUseCase.execute(request);
    return response.course;
  }

  @Get()
  async searchCourses(@Query() query: SearchCoursesDto): Promise<CourseDto[]> {
    const request = new SearchCoursesRequest();
    request.searchTerm = query.searchTerm;
    request.minPrice = query.minPrice;
    request.maxPrice = query.maxPrice;
    request.limit = query.limit;
    request.offset = query.offset;
    
    const response = await this.searchCoursesUseCase.execute(request);
    return response.courses;
  }

  @Post()
  async createCourse(@Body() dto: CreateCourseDto): Promise<CourseDto> {
    const request = new CreateCourseRequest();
    request.tutorId = dto.tutorId;
    request.title = dto.title;
    request.description = dto.description;
    request.price = dto.price;
    request.currency = dto.currency;
    
    const response = await this.createCourseUseCase.execute(request);
    return response.course;
  }

  @Put(':id/publish')
  async publishCourse(@Param('id') id: string): Promise<CourseDto> {
    const request = new PublishCourseRequest();
    request.id = id;
    
    const response = await this.publishCourseUseCase.execute(request);
    return response.course;
  }
}

// presentation/http/controllers/internal/enrollments.internal.controller.ts
@Controller('internal/enrollments')
@UseGuards(ServiceAuthGuard)
export class InternalEnrollmentsController {
  constructor(
    private enrollStudentUseCase: EnrollStudentUseCase,
    private trackProgressUseCase: TrackProgressUseCase,
    private getEnrollmentUseCase: GetEnrollmentUseCase,
  ) {}

  @Post()
  async enrollStudent(@Body() dto: EnrollStudentDto): Promise<EnrollmentDto> {
    const request = new EnrollStudentRequest();
    request.studentId = dto.studentId;
    request.courseId = dto.courseId;
    
    const response = await this.enrollStudentUseCase.execute(request);
    return response.enrollment;
  }

  @Put(':id/progress')
  async updateProgress(
    @Param('id') enrollmentId: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<EnrollmentDto> {
    const request = new TrackProgressRequest();
    request.enrollmentId = enrollmentId;
    request.progress = dto.progress;
    
    const response = await this.trackProgressUseCase.execute(request);
    return response.enrollment;
  }

  @Get('student/:studentId/course/:courseId')
  async getEnrollment(
    @Param('studentId') studentId: string,
    @Param('courseId') courseId: string,
  ): Promise<EnrollmentDto> {
    const request = new GetEnrollmentRequest();
    request.studentId = studentId;
    request.courseId = courseId;
    
    const response = await this.getEnrollmentUseCase.execute(request);
    return response.enrollment;
  }
}
```

#### GraphQL Subgraph Schema
```graphql
# presentation/graphql/schemas/learning.subgraph.graphql
extend type Query {
  course(id: ID!): Course
  courses(
    searchTerm: String
    minPrice: Float
    maxPrice: Float
    limit: Int = 20
    offset: Int = 0
  ): [Course!]!
  myEnrollments(studentId: ID!): [Enrollment!]!
  coursesByTutor(tutorId: ID!): [Course!]!
}

extend type Mutation {
  createCourse(input: CreateCourseInput!): Course! @auth(requires: TUTOR)
  publishCourse(id: ID!): Course! @auth(requires: TUTOR)
  enrollInCourse(input: EnrollmentInput!): Enrollment! @auth(requires: USER)
  updateProgress(input: UpdateProgressInput!): Enrollment! @auth(requires: USER)
}

type Course @key(fields: "id") {
  id: ID!
  tutorId: ID!
  title: String!
  description: String!
  price: Float!
  currency: String!
  isPublished: Boolean!
  lessons: [Lesson!]!
  enrollmentCount: Int!
  rating: Float!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
  tutor: User @provides(fields: "tutorId")
}

type Lesson @key(fields: "id") {
  id: ID!
  courseId: ID!
  title: String!
  content: String!
  duration: Int!
  order: Int!
  videoUrl: String
  course: Course @provides(fields: "courseId")
}

type Enrollment @key(fields: "id") {
  id: ID!
  studentId: ID!
  courseId: ID!
  status: EnrollmentStatus!
  progress: Float!
  enrolledAt: AWSDateTime!
  completedAt: AWSDateTime
  student: User @provides(fields: "studentId")
  course: Course @provides(fields: "courseId")
}

enum EnrollmentStatus {
  ACTIVE
  COMPLETED
  SUSPENDED
  CANCELLED
}

# Federation relationships
extend type User @key(fields: "id") {
  id: ID! @external
  enrollments: [Enrollment!]! @requires(fields: "id")
  coursesAsTutor: [Course!]! @requires(fields: "id")
}

input CreateCourseInput {
  title: String!
  description: String!
  price: Float!
  currency: String!
}

input EnrollmentInput {
  courseId: ID!
}

input UpdateProgressInput {
  enrollmentId: ID!
  progress: Float!
}
```

## Subphase 2.2: Content Management & Lambda Resolvers (4 days)

### File Upload Pipeline (2 days)
- Video processing and transcoding with AWS MediaConvert
- Image optimization and thumbnail generation
- CDN distribution setup with CloudFront

### GraphQL Integration (2 days)
- Lambda resolvers for course operations
- Federation with User service (course.tutor)
- Search and filtering resolvers

## Success Criteria

### Technical Acceptance Criteria
- ✅ Learning subgraph schema validates and composes successfully
- ✅ Course CRUD operations working via internal APIs
- ✅ Enrollment workflow with payment integration
- ✅ Progress tracking with analytics
- ✅ File upload for course materials
- ✅ Federation with User service working

### Functional Acceptance Criteria
- ✅ Tutors can create and publish courses
- ✅ Students can enroll in courses
- ✅ Progress tracking updates correctly
- ✅ Course search and filtering works
- ✅ Materials upload and access via CDN
- ✅ Real-time analytics tracking

### Performance Criteria
- ✅ Course search response time < 300ms
- ✅ Enrollment process < 2 seconds
- ✅ File upload handling up to 100MB
- ✅ Redis caching reduces DB load by 70%

## Dependencies & Integration
- **User Service**: Federation for tutor/student relationships
- **Payment Service**: Course purchase processing
- **Content Service**: File storage and CDN
- **Analytics Service**: Learning event tracking
- **Notification Service**: Enrollment confirmations

This phase establishes the foundation for all learning-related operations in the platform! 