# Phase 5: Tutor Matching Service Subgraph
**Duration: 14 days | Priority: High**

## ⚠️ Service Boundary Strategy

**Important Architectural Context**: This phase implements the Tutor Matching Service based on our [Service Boundary Analysis](../../docs/architecture-decisions/service-boundary-analysis.md) decision.

### Migration from User Service

During Phase 1, **all user-related logic (including tutor-specific business rules) remains in User Service** for faster development and solid foundation establishment. Phase 5 will involve:

1. **Extract Tutor-Specific Logic** from User Service:
   - Tutor tier classification (Junior/Senior/Expert)
   - Tutoring performance metrics and reputation
   - Subject expertise and qualification management
   - Session-based business rules

2. **Preserve User Service Responsibilities**:
   - Basic user identity and role management (Student→Tutor transitions)
   - Core security and authentication
   - Basic profile information
   - Superadmin operations for admin management

3. **Implement Service Integration**:
   - User Service validates basic tutor eligibility
   - Tutor Matching Service handles specialized tutoring operations
   - Clean API contracts between services
   - Event-driven synchronization where needed

### Benefits of This Approach

- ✅ **Phase 1 Simplicity**: Single service reduces initial complexity
- ✅ **Solid Foundation**: Proven domain patterns before extraction
- ✅ **Clean Migration**: Clear boundaries established for refactoring
- ✅ **Better Specialization**: Dedicated tutor service for complex matching algorithms

## Phase Overview

This phase implements the Tutor Matching Service following our standardized microservice architecture with DDD + Clean Architecture + Use Case Pattern. It handles tutor discovery, matching algorithms, and booking workflows **with logic migrated from User Service**.

### Dependencies
- **Prerequisites**: Phase 1 (User Service) completed with tutor-related logic to be extracted
- **Integrates with**: User Service for basic user operations and role management
- **Provides**: Specialized tutor discovery and matching for the platform
- **Migration Source**: Extracts tutor-specific domain logic from User Service

## Subphase 5.1: Tutor Matching Implementation (10 days)

### Domain Layer Implementation (2 days)

#### Entities (AggregateRoot)
```typescript
// domain/entities/tutor-profile.entity.ts
import { AggregateRoot } from '@nestjs/cqrs';

export class TutorProfile extends AggregateRoot {
  constructor(
    private readonly _id: TutorProfileId,
    private readonly _userId: UserId,
    private _subjects: Subject[],
    private _hourlyRate: Money,
    private _availability: Availability[],
    private _bio: string,
    private _experience: number, // years
    private _rating: number = 0,
    private _totalSessions: number = 0,
    private _isActive: boolean = true,
    private readonly _createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateTutorProfileData): TutorProfile {
    const profile = new TutorProfile(
      TutorProfileId.generate(),
      new UserId(data.userId),
      data.subjects.map(s => new Subject(s)),
      new Money(data.hourlyRate, data.currency),
      data.availability.map(a => new Availability(a)),
      data.bio,
      data.experience,
    );

    profile.apply(new TutorProfileCreatedEvent(profile));
    return profile;
  }

  updateAvailability(availability: AvailabilityData[]): void {
    this._availability = availability.map(a => new Availability(a));
    this.apply(new TutorAvailabilityUpdatedEvent(this));
  }

  updateRate(newRate: Money): void {
    this._hourlyRate = newRate;
    this.apply(new TutorRateUpdatedEvent(this));
  }

  addSubject(subject: Subject): void {
    if (!this._subjects.find(s => s.equals(subject))) {
      this._subjects.push(subject);
      this.apply(new TutorSubjectAddedEvent(this, subject));
    }
  }

  completeSession(rating: number): void {
    this._totalSessions++;
    // Recalculate average rating
    this._rating = ((this._rating * (this._totalSessions - 1)) + rating) / this._totalSessions;
    this.apply(new TutorSessionCompletedEvent(this, rating));
  }

  deactivate(): void {
    this._isActive = false;
    this.apply(new TutorProfileDeactivatedEvent(this));
  }

  // Getters
  get id(): TutorProfileId { return this._id; }
  get userId(): UserId { return this._userId; }
  get subjects(): Subject[] { return [...this._subjects]; }
  get hourlyRate(): Money { return this._hourlyRate; }
  get availability(): Availability[] { return [...this._availability]; }
  get bio(): string { return this._bio; }
  get experience(): number { return this._experience; }
  get rating(): number { return this._rating; }
  get totalSessions(): number { return this._totalSessions; }
  get isActive(): boolean { return this._isActive; }
  get createdAt(): Date { return this._createdAt; }
}

// domain/entities/matching-request.entity.ts
export class MatchingRequest extends AggregateRoot {
  constructor(
    private readonly _id: MatchingRequestId,
    private readonly _studentId: UserId,
    private readonly _subject: Subject,
    private readonly _preferredRate: Money,
    private readonly _schedulingPreferences: SchedulingPreferences,
    private _status: MatchingStatus,
    private _matches: TutorMatch[] = [],
    private readonly _createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateMatchingRequestData): MatchingRequest {
    const request = new MatchingRequest(
      MatchingRequestId.generate(),
      new UserId(data.studentId),
      new Subject(data.subject),
      new Money(data.preferredRate, data.currency),
      new SchedulingPreferences(data.schedulingPreferences),
      MatchingStatus.PENDING,
    );

    request.apply(new MatchingRequestCreatedEvent(request));
    return request;
  }

  addMatches(matches: TutorMatchData[]): void {
    this._matches = matches.map(m => new TutorMatch(m));
    this._status = MatchingStatus.MATCHES_FOUND;
    this.apply(new MatchesFoundEvent(this, this._matches));
  }

  selectTutor(tutorId: UserId): void {
    const selectedMatch = this._matches.find(m => m.tutorId.equals(tutorId));
    if (!selectedMatch) {
      throw new TutorNotFoundInMatchesException();
    }

    this._status = MatchingStatus.TUTOR_SELECTED;
    this.apply(new TutorSelectedEvent(this, selectedMatch));
  }

  complete(): void {
    this._status = MatchingStatus.COMPLETED;
    this.apply(new MatchingRequestCompletedEvent(this));
  }

  // Getters
  get id(): MatchingRequestId { return this._id; }
  get studentId(): UserId { return this._studentId; }
  get subject(): Subject { return this._subject; }
  get preferredRate(): Money { return this._preferredRate; }
  get schedulingPreferences(): SchedulingPreferences { return this._schedulingPreferences; }
  get status(): MatchingStatus { return this._status; }
  get matches(): TutorMatch[] { return [...this._matches]; }
  get createdAt(): Date { return this._createdAt; }
}
```

#### Value Objects
```typescript
// domain/value-objects/subject.vo.ts
export class Subject {
  constructor(
    private readonly name: string,
    private readonly category: SubjectCategory,
    private readonly level: EducationLevel,
  ) {
    if (!name || name.trim().length === 0) {
      throw new InvalidSubjectException();
    }
  }

  getName(): string { return this.name; }
  getCategory(): SubjectCategory { return this.category; }
  getLevel(): EducationLevel { return this.level; }

  equals(other: Subject): boolean {
    return this.name === other.name &&
           this.category === other.category &&
           this.level === other.level;
  }
}

// domain/value-objects/availability.vo.ts
export class Availability {
  constructor(
    private readonly dayOfWeek: DayOfWeek,
    private readonly startTime: TimeSlot,
    private readonly endTime: TimeSlot,
    private readonly timezone: string,
  ) {
    if (startTime.isAfter(endTime)) {
      throw new InvalidTimeSlotException();
    }
  }

  getDayOfWeek(): DayOfWeek { return this.dayOfWeek; }
  getStartTime(): TimeSlot { return this.startTime; }
  getEndTime(): TimeSlot { return this.endTime; }
  getTimezone(): string { return this.timezone; }

  overlaps(other: Availability): boolean {
    if (this.dayOfWeek !== other.dayOfWeek) return false;

    return this.startTime.isBefore(other.endTime) &&
           this.endTime.isAfter(other.startTime);
  }
}

// domain/value-objects/tutor-match.vo.ts
export class TutorMatch {
  constructor(
    private readonly tutorId: UserId,
    private readonly compatibilityScore: number,
    private readonly rateMatch: boolean,
    private readonly availabilityMatch: boolean,
    private readonly subjectExpertise: number,
  ) {
    if (compatibilityScore < 0 || compatibilityScore > 100) {
      throw new InvalidCompatibilityScoreException();
    }
  }

  getTutorId(): UserId { return this.tutorId; }
  getCompatibilityScore(): number { return this.compatibilityScore; }
  isRateMatch(): boolean { return this.rateMatch; }
  isAvailabilityMatch(): boolean { return this.availabilityMatch; }
  getSubjectExpertise(): number { return this.subjectExpertise; }
}
```

### Application Layer Implementation (3 days)

#### Use Cases
```typescript
// application/use-cases/create-tutor-profile/create-tutor-profile.usecase.ts
@Injectable()
export class CreateTutorProfileUseCase implements IUseCase<CreateTutorProfileRequest, CreateTutorProfileResponse> {
  constructor(
    private tutorProfileRepository: TutorProfileRepository,
    private userServiceClient: UserServiceClient,
  ) {}

  async execute(request: CreateTutorProfileRequest): Promise<CreateTutorProfileResponse> {
    // 1. Validate user exists and is a tutor
    const user = await this.userServiceClient.getUser(request.userId);
    if (!user || !user.isTutor) {
      throw new UserNotATutorException();
    }

    // 2. Check if profile already exists
    const existingProfile = await this.tutorProfileRepository.findByUserId(request.userId);
    if (existingProfile) {
      throw new TutorProfileAlreadyExistsException();
    }

    // 3. Create tutor profile
    const profile = TutorProfile.create({
      userId: request.userId,
      subjects: request.subjects,
      hourlyRate: request.hourlyRate,
      currency: request.currency,
      availability: request.availability,
      bio: request.bio,
      experience: request.experience,
    });

    // 4. Persist
    const savedProfile = await this.tutorProfileRepository.save(profile);

    // 5. Commit events
    savedProfile.commit();

    return CreateTutorProfileResponse.fromDomain(savedProfile);
  }
}

// application/use-cases/find-tutors/find-tutors.usecase.ts
@Injectable()
export class FindTutorsUseCase implements IUseCase<FindTutorsRequest, FindTutorsResponse> {
  constructor(
    private tutorProfileRepository: TutorProfileRepository,
    private matchingService: TutorMatchingService,
  ) {}

  async execute(request: FindTutorsRequest): Promise<FindTutorsResponse> {
    // 1. Build search criteria
    const searchCriteria = new TutorSearchCriteria({
      subject: request.subject,
      maxRate: request.maxRate,
      minRating: request.minRating || 0,
      availability: request.preferredSchedule,
      location: request.location,
    });

    // 2. Find matching tutors
    const tutors = await this.tutorProfileRepository.findBySearchCriteria(searchCriteria);

    // 3. Calculate compatibility scores
    const rankedTutors = await this.matchingService.rankTutors(tutors, searchCriteria);

    // 4. Apply pagination
    const paginatedResults = rankedTutors.slice(
      request.offset || 0,
      (request.offset || 0) + (request.limit || 20)
    );

    return FindTutorsResponse.fromDomainList(paginatedResults);
  }
}

// application/use-cases/create-matching-request/create-matching-request.usecase.ts
@Injectable()
export class CreateMatchingRequestUseCase implements IUseCase<CreateMatchingRequestRequest, CreateMatchingRequestResponse> {
  constructor(
    private matchingRequestRepository: MatchingRequestRepository,
    private tutorMatchingService: TutorMatchingService,
    private userServiceClient: UserServiceClient,
  ) {}

  async execute(request: CreateMatchingRequestRequest): Promise<CreateMatchingRequestResponse> {
    // 1. Validate student exists
    const student = await this.userServiceClient.getUser(request.studentId);
    if (!student || student.isTutor) {
      throw new UserNotAStudentException();
    }

    // 2. Create matching request
    const matchingRequest = MatchingRequest.create({
      studentId: request.studentId,
      subject: request.subject,
      preferredRate: request.preferredRate,
      currency: request.currency,
      schedulingPreferences: request.schedulingPreferences,
    });

    // 3. Persist
    const savedRequest = await this.matchingRequestRepository.save(matchingRequest);

    // 4. Start matching process asynchronously
    this.tutorMatchingService.processMatchingRequest(savedRequest.id.getValue());

    // 5. Commit events
    savedRequest.commit();

    return CreateMatchingRequestResponse.fromDomain(savedRequest);
  }
}
```

#### Domain Services
```typescript
// application/services/tutor-matching.service.ts
@Injectable()
export class TutorMatchingService {
  constructor(
    private tutorProfileRepository: TutorProfileRepository,
    private matchingRequestRepository: MatchingRequestRepository,
    private neo4jService: Neo4jService,
  ) {}

  async rankTutors(tutors: TutorProfile[], criteria: TutorSearchCriteria): Promise<RankedTutor[]> {
    const rankedTutors: RankedTutor[] = [];

    for (const tutor of tutors) {
      const score = this.calculateCompatibilityScore(tutor, criteria);
      rankedTutors.push(new RankedTutor(tutor, score));
    }

    return rankedTutors.sort((a, b) => b.score - a.score);
  }

  private calculateCompatibilityScore(tutor: TutorProfile, criteria: TutorSearchCriteria): number {
    let score = 0;

    // Subject expertise (40%)
    const subjectMatch = this.calculateSubjectMatch(tutor.subjects, criteria.subject);
    score += subjectMatch * 0.4;

    // Rate compatibility (25%)
    const rateMatch = this.calculateRateMatch(tutor.hourlyRate, criteria.maxRate);
    score += rateMatch * 0.25;

    // Availability match (20%)
    const availabilityMatch = this.calculateAvailabilityMatch(tutor.availability, criteria.availability);
    score += availabilityMatch * 0.2;

    // Rating and experience (15%)
    const qualityScore = (tutor.rating / 5) * 0.1 + (Math.min(tutor.experience, 10) / 10) * 0.05;
    score += qualityScore * 0.15;

    return Math.round(score * 100);
  }

  async processMatchingRequest(requestId: string): Promise<void> {
    // 1. Get matching request
    const request = await this.matchingRequestRepository.findById(requestId);
    if (!request) return;

    // 2. Find suitable tutors
    const criteria = new TutorSearchCriteria({
      subject: request.subject,
      maxRate: request.preferredRate,
      availability: request.schedulingPreferences.preferredTimeSlots,
    });

    const tutors = await this.tutorProfileRepository.findBySearchCriteria(criteria);
    const rankedTutors = await this.rankTutors(tutors, criteria);

    // 3. Create matches
    const matches = rankedTutors.slice(0, 5).map(rt => ({
      tutorId: rt.tutor.userId.getValue(),
      compatibilityScore: rt.score,
      rateMatch: rt.tutor.hourlyRate.getAmount() <= request.preferredRate.getAmount(),
      availabilityMatch: this.hasAvailabilityOverlap(rt.tutor.availability, request.schedulingPreferences.preferredTimeSlots),
      subjectExpertise: this.calculateSubjectExpertise(rt.tutor.subjects, request.subject),
    }));

    // 4. Update request with matches
    request.addMatches(matches);
    await this.matchingRequestRepository.save(request);

    // 5. Commit events
    request.commit();
  }
}
```

### Infrastructure Layer Implementation (4 days)

#### Neo4j Integration (for advanced matching)
```typescript
// infrastructure/neo4j/services/tutor-graph.service.ts
@Injectable()
export class TutorGraphService {
  constructor(
    @Inject('NEO4J_DRIVER') private driver: Driver,
  ) {}

  async createTutorNode(tutorProfile: TutorProfile): Promise<void> {
    const session = this.driver.session();

    try {
      await session.run(`
        CREATE (t:Tutor {
          id: $id,
          userId: $userId,
          hourlyRate: $hourlyRate,
          currency: $currency,
          experience: $experience,
          rating: $rating,
          totalSessions: $totalSessions,
          isActive: $isActive,
          createdAt: $createdAt
        })
      `, {
        id: tutorProfile.id.getValue(),
        userId: tutorProfile.userId.getValue(),
        hourlyRate: tutorProfile.hourlyRate.getAmount(),
        currency: tutorProfile.hourlyRate.getCurrency(),
        experience: tutorProfile.experience,
        rating: tutorProfile.rating,
        totalSessions: tutorProfile.totalSessions,
        isActive: tutorProfile.isActive,
        createdAt: tutorProfile.createdAt.toISOString(),
      });

      // Create subject relationships
      for (const subject of tutorProfile.subjects) {
        await session.run(`
          MATCH (t:Tutor {id: $tutorId})
          MERGE (s:Subject {name: $subjectName, category: $category, level: $level})
          CREATE (t)-[:TEACHES {expertise: $expertise}]->(s)
        `, {
          tutorId: tutorProfile.id.getValue(),
          subjectName: subject.getName(),
          category: subject.getCategory(),
          level: subject.getLevel(),
          expertise: this.calculateSubjectExpertise(subject, tutorProfile.experience),
        });
      }
    } finally {
      await session.close();
    }
  }

  async findSimilarTutors(tutorId: string, limit: number = 10): Promise<string[]> {
    const session = this.driver.session();

    try {
      const result = await session.run(`
        MATCH (t1:Tutor {id: $tutorId})-[:TEACHES]->(s:Subject)<-[:TEACHES]-(t2:Tutor)
        WHERE t1 <> t2 AND t2.isActive = true
        WITH t2, COUNT(s) as commonSubjects,
             ABS(t1.hourlyRate - t2.hourlyRate) as rateDiff,
             ABS(t1.experience - t2.experience) as expDiff
        ORDER BY commonSubjects DESC, rateDiff ASC, expDiff ASC
        LIMIT $limit
        RETURN t2.userId as userId
      `, {
        tutorId,
        limit,
      });

      return result.records.map(record => record.get('userId'));
    } finally {
      await session.close();
    }
  }

  async getMatchingRecommendations(studentPreferences: StudentPreferences): Promise<TutorRecommendation[]> {
    const session = this.driver.session();

    try {
      const result = await session.run(`
        MATCH (t:Tutor)-[:TEACHES]->(s:Subject)
        WHERE s.name = $subjectName
          AND s.level = $level
          AND t.hourlyRate <= $maxRate
          AND t.isActive = true
          AND t.rating >= $minRating
        WITH t, s,
             CASE
               WHEN t.hourlyRate <= $preferredRate THEN 1.0
               ELSE 1.0 - (t.hourlyRate - $preferredRate) / $maxRate
             END as rateScore,
             t.rating / 5.0 as ratingScore,
             CASE
               WHEN t.experience >= 5 THEN 1.0
               ELSE t.experience / 5.0
             END as experienceScore
        ORDER BY (rateScore * 0.4 + ratingScore * 0.4 + experienceScore * 0.2) DESC
        LIMIT $limit
        RETURN t.userId as userId,
               (rateScore * 0.4 + ratingScore * 0.4 + experienceScore * 0.2) as score
      `, {
        subjectName: studentPreferences.subject.getName(),
        level: studentPreferences.subject.getLevel(),
        maxRate: studentPreferences.maxRate.getAmount(),
        preferredRate: studentPreferences.preferredRate.getAmount(),
        minRating: studentPreferences.minRating || 0,
        limit: studentPreferences.limit || 20,
      });

      return result.records.map(record => new TutorRecommendation(
        record.get('userId'),
        record.get('score')
      ));
    } finally {
      await session.close();
    }
  }
}
```

#### PostgreSQL Integration
```typescript
// infrastructure/postgres/entities/tutor-profile.orm-entity.ts
@Entity('tutor_profiles')
export class TutorProfileOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('text')
  bio: string;

  @Column('int')
  experience: number;

  @Column('decimal', { precision: 10, scale: 2 })
  hourlyRate: number;

  @Column({ length: 3 })
  currency: string;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column('int', { default: 0 })
  totalSessions: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => TutorSubjectOrmEntity, subject => subject.tutorProfile)
  subjects: TutorSubjectOrmEntity[];

  @OneToMany(() => TutorAvailabilityOrmEntity, availability => availability.tutorProfile)
  availability: TutorAvailabilityOrmEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// infrastructure/postgres/repositories/tutor-profile.repository.impl.ts
@Injectable()
export class TutorProfileRepositoryImpl implements TutorProfileRepository {
  constructor(
    @InjectRepository(TutorProfileOrmEntity)
    private tutorProfileOrmRepository: Repository<TutorProfileOrmEntity>,
    private tutorProfileMapper: TutorProfileMapper,
  ) {}

  async save(tutorProfile: TutorProfile): Promise<TutorProfile> {
    const ormEntity = this.tutorProfileMapper.toOrmEntity(tutorProfile);
    const savedEntity = await this.tutorProfileOrmRepository.save(ormEntity);
    return this.tutorProfileMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<TutorProfile | null> {
    const entity = await this.tutorProfileOrmRepository.findOne({
      where: { id },
      relations: ['subjects', 'availability'],
    });
    return entity ? this.tutorProfileMapper.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<TutorProfile | null> {
    const entity = await this.tutorProfileOrmRepository.findOne({
      where: { userId },
      relations: ['subjects', 'availability'],
    });
    return entity ? this.tutorProfileMapper.toDomain(entity) : null;
  }

  async findBySearchCriteria(criteria: TutorSearchCriteria): Promise<TutorProfile[]> {
    const queryBuilder = this.tutorProfileOrmRepository
      .createQueryBuilder('tutor')
      .leftJoinAndSelect('tutor.subjects', 'subjects')
      .leftJoinAndSelect('tutor.availability', 'availability')
      .where('tutor.isActive = true');

    if (criteria.subject) {
      queryBuilder.andWhere('subjects.name = :subjectName', {
        subjectName: criteria.subject.getName(),
      });
    }

    if (criteria.maxRate) {
      queryBuilder.andWhere('tutor.hourlyRate <= :maxRate', {
        maxRate: criteria.maxRate.getAmount(),
      });
    }

    if (criteria.minRating) {
      queryBuilder.andWhere('tutor.rating >= :minRating', {
        minRating: criteria.minRating,
      });
    }

    const entities = await queryBuilder
      .orderBy('tutor.rating', 'DESC')
      .addOrderBy('tutor.totalSessions', 'DESC')
      .getMany();

    return entities.map(entity => this.tutorProfileMapper.toDomain(entity));
  }
}
```

### Presentation Layer Implementation (1 day)

#### Internal HTTP Controllers
```typescript
// presentation/http/controllers/internal/tutors.internal.controller.ts
@Controller('internal/tutors')
@UseGuards(ServiceAuthGuard)
export class InternalTutorsController {
  constructor(
    private createTutorProfileUseCase: CreateTutorProfileUseCase,
    private findTutorsUseCase: FindTutorsUseCase,
    private getTutorProfileUseCase: GetTutorProfileUseCase,
    private updateTutorProfileUseCase: UpdateTutorProfileUseCase,
  ) {}

  @Post('profiles')
  async createTutorProfile(@Body() dto: CreateTutorProfileDto): Promise<TutorProfileDto> {
    const request = new CreateTutorProfileRequest();
    request.userId = dto.userId;
    request.subjects = dto.subjects;
    request.hourlyRate = dto.hourlyRate;
    request.currency = dto.currency;
    request.availability = dto.availability;
    request.bio = dto.bio;
    request.experience = dto.experience;

    const response = await this.createTutorProfileUseCase.execute(request);
    return response.tutorProfile;
  }

  @Get('search')
  async findTutors(@Query() query: FindTutorsDto): Promise<TutorProfileDto[]> {
    const request = new FindTutorsRequest();
    request.subject = query.subject;
    request.maxRate = query.maxRate;
    request.minRating = query.minRating;
    request.preferredSchedule = query.preferredSchedule;
    request.location = query.location;
    request.limit = query.limit;
    request.offset = query.offset;

    const response = await this.findTutorsUseCase.execute(request);
    return response.tutors;
  }

  @Get('profiles/:id')
  async getTutorProfile(@Param('id') id: string): Promise<TutorProfileDto> {
    const request = new GetTutorProfileRequest();
    request.id = id;

    const response = await this.getTutorProfileUseCase.execute(request);
    return response.tutorProfile;
  }

  @Put('profiles/:id')
  async updateTutorProfile(
    @Param('id') id: string,
    @Body() dto: UpdateTutorProfileDto,
  ): Promise<TutorProfileDto> {
    const request = new UpdateTutorProfileRequest();
    request.id = id;
    request.bio = dto.bio;
    request.hourlyRate = dto.hourlyRate;
    request.availability = dto.availability;
    request.subjects = dto.subjects;

    const response = await this.updateTutorProfileUseCase.execute(request);
    return response.tutorProfile;
  }
}
```

#### GraphQL Subgraph Schema
```graphql
# presentation/graphql/schemas/tutor-matching.subgraph.graphql
extend type Query {
  tutorProfile(id: ID!): TutorProfile
  findTutors(input: FindTutorsInput!): [TutorProfile!]!
  matchingRequest(id: ID!): MatchingRequest
  tutorRecommendations(input: RecommendationInput!): [TutorProfile!]!
}

extend type Mutation {
  createTutorProfile(input: CreateTutorProfileInput!): TutorProfile! @auth(requires: TUTOR)
  updateTutorProfile(id: ID!, input: UpdateTutorProfileInput!): TutorProfile! @auth(requires: TUTOR)
  createMatchingRequest(input: CreateMatchingRequestInput!): MatchingRequest! @auth(requires: USER)
  selectTutor(requestId: ID!, tutorId: ID!): MatchingRequest! @auth(requires: USER)
}

type TutorProfile @key(fields: "id") {
  id: ID!
  userId: ID!
  subjects: [String!]!
  hourlyRate: Float!
  currency: String!
  availability: [Availability!]!
  bio: String!
  experience: Int!
  rating: Float!
  totalSessions: Int!
  isActive: Boolean!
  createdAt: AWSDateTime!
  user: User @provides(fields: "userId")
}

type MatchingRequest @key(fields: "id") {
  id: ID!
  studentId: ID!
  subject: String!
  preferredRate: Float!
  currency: String!
  status: MatchingStatus!
  matches: [TutorMatch!]!
  createdAt: AWSDateTime!
  student: User @provides(fields: "studentId")
}

type TutorMatch {
  tutorId: ID!
  compatibilityScore: Int!
  rateMatch: Boolean!
  availabilityMatch: Boolean!
  subjectExpertise: Int!
  tutor: User @provides(fields: "tutorId")
}

type Availability {
  dayOfWeek: String!
  startTime: String!
  endTime: String!
  timezone: String!
}

enum MatchingStatus {
  PENDING
  MATCHES_FOUND
  TUTOR_SELECTED
  COMPLETED
  CANCELLED
}

# Federation relationships
extend type User @key(fields: "id") {
  id: ID! @external
  tutorProfile: TutorProfile @requires(fields: "id")
  matchingRequests: [MatchingRequest!]! @requires(fields: "id")
}

input CreateTutorProfileInput {
  subjects: [String!]!
  hourlyRate: Float!
  currency: String!
  availability: [AvailabilityInput!]!
  bio: String!
  experience: Int!
}

input FindTutorsInput {
  subject: String!
  maxRate: Float
  minRating: Float
  preferredSchedule: [AvailabilityInput!]
  location: String
  limit: Int = 20
  offset: Int = 0
}

input CreateMatchingRequestInput {
  subject: String!
  preferredRate: Float!
  currency: String!
  schedulingPreferences: SchedulingPreferencesInput!
}

input AvailabilityInput {
  dayOfWeek: String!
  startTime: String!
  endTime: String!
  timezone: String!
}
```

## Subphase 5.2: Advanced Matching & Integration (4 days)

### Machine Learning Matching (2 days)
- Compatibility scoring algorithms
- Learning from successful matches
- Personalized tutor recommendations
- A/B testing for matching algorithms

### GraphQL Integration (2 days)
- Lambda resolvers for tutor operations
- Federation with User service (tutor/student relationships)
- Real-time matching status updates
- Search and filtering resolvers

## Success Criteria

### Technical Acceptance Criteria
- ✅ Tutor profile creation and management
- ✅ Advanced matching algorithms operational
- ✅ Neo4j graph database integration
- ✅ Tutor matching subgraph schema validates
- ✅ Real-time matching request processing
- ✅ Performance optimization for search queries

### Functional Acceptance Criteria
- ✅ Tutors can create comprehensive profiles
- ✅ Students can search and find suitable tutors
- ✅ Intelligent matching based on multiple criteria
- ✅ Availability scheduling integration
- ✅ Rating and review system working
- ✅ Matching request workflow complete

### Performance Criteria
- ✅ Tutor search response time < 500ms
- ✅ Matching algorithm execution < 2 seconds
- ✅ 90%+ matching accuracy rate
- ✅ Neo4j query performance < 100ms

## Dependencies & Integration
- **User Service**: Tutor and student profiles
- **Communication Service**: Session booking and scheduling
- **Reviews Service**: Tutor ratings and feedback
- **Analytics Service**: Matching performance tracking

This service provides intelligent tutor discovery and matching capabilities for the platform!
