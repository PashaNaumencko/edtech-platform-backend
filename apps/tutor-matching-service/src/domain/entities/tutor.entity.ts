import { AggregateRoot } from "@nestjs/cqrs";

// Domain enums
export enum TutorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
}

export enum TutorSubject {
  MATHEMATICS = 'MATHEMATICS',
  PHYSICS = 'PHYSICS',
  CHEMISTRY = 'CHEMISTRY',
  BIOLOGY = 'BIOLOGY',
  ENGLISH = 'ENGLISH',
  COMPUTER_SCIENCE = 'COMPUTER_SCIENCE',
  PROGRAMMING = 'PROGRAMMING',
  OTHER = 'OTHER',
}

export enum ExperienceLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

// Domain Events
export class TutorCreatedEvent {
  constructor(
    public readonly tutorId: string,
    public readonly userId: string,
    public readonly subjects: TutorSubject[],
  ) {}
}

export class TutorStatusChangedEvent {
  constructor(
    public readonly tutorId: string,
    public readonly oldStatus: TutorStatus,
    public readonly newStatus: TutorStatus,
  ) {}
}

export class TutorProfileUpdatedEvent {
  constructor(
    public readonly tutorId: string,
    public readonly changes: Record<string, any>,
  ) {}
}

// MVP-focused Tutor Aggregate
export class Tutor extends AggregateRoot {
  public id: string;
  public userId: string;
  public bio: string;
  public subjects: TutorSubject[];
  public experienceLevel: ExperienceLevel;
  public hourlyRate: number;
  public currency: string;
  public languages: string[];
  public education: string;
  public status: TutorStatus;
  public rating: number;
  public totalReviews: number;
  public createdAt: Date;
  public updatedAt: Date;

  constructor() {
    super();
  }

  // Factory method for creating new tutors
  public static create(data: {
    userId: string;
    bio: string;
    subjects: TutorSubject[];
    experienceLevel: ExperienceLevel;
    hourlyRate: number;
    currency?: string;
    languages: string[];
    education: string;
  }): Tutor {
    const tutor = new Tutor();
    tutor.id = `tutor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    tutor.userId = data.userId;
    tutor.bio = data.bio;
    tutor.subjects = data.subjects;
    tutor.experienceLevel = data.experienceLevel;
    tutor.hourlyRate = data.hourlyRate;
    tutor.currency = data.currency || 'USD';
    tutor.languages = data.languages;
    tutor.education = data.education;
    tutor.status = TutorStatus.PENDING_APPROVAL;
    tutor.rating = 0;
    tutor.totalReviews = 0;
    tutor.createdAt = new Date();
    tutor.updatedAt = new Date();

    // Emit domain event
    tutor.apply(new TutorCreatedEvent(tutor.id, tutor.userId, tutor.subjects));
    
    return tutor;
  }


  // Business logic methods
  public updateProfile(data: {
    bio?: string;
    subjects?: TutorSubject[];
    experienceLevel?: ExperienceLevel;
    hourlyRate?: number;
    languages?: string[];
    education?: string;
  }): void {
    const changes: Record<string, any> = {};

    if (data.bio && data.bio !== this.bio) {
      this.bio = data.bio;
      changes.bio = data.bio;
    }

    if (data.subjects && JSON.stringify(data.subjects) !== JSON.stringify(this.subjects)) {
      this.subjects = data.subjects;
      changes.subjects = data.subjects;
    }

    if (data.experienceLevel && data.experienceLevel !== this.experienceLevel) {
      this.experienceLevel = data.experienceLevel;
      changes.experienceLevel = data.experienceLevel;
    }

    if (data.hourlyRate && data.hourlyRate !== this.hourlyRate) {
      this.hourlyRate = data.hourlyRate;
      changes.hourlyRate = data.hourlyRate;
    }

    if (data.languages && JSON.stringify(data.languages) !== JSON.stringify(this.languages)) {
      this.languages = data.languages;
      changes.languages = data.languages;
    }

    if (data.education && data.education !== this.education) {
      this.education = data.education;
      changes.education = data.education;
    }

    if (Object.keys(changes).length > 0) {
      this.updatedAt = new Date();
      this.apply(new TutorProfileUpdatedEvent(this.id, changes));
    }
  }

  public approve(): void {
    if (this.status === TutorStatus.ACTIVE) {
      return; // Already active
    }

    const oldStatus = this.status;
    this.status = TutorStatus.ACTIVE;
    this.updatedAt = new Date();
    
    this.apply(new TutorStatusChangedEvent(this.id, oldStatus, this.status));
  }

  public suspend(): void {
    if (this.status === TutorStatus.SUSPENDED) {
      return; // Already suspended
    }

    const oldStatus = this.status;
    this.status = TutorStatus.SUSPENDED;
    this.updatedAt = new Date();
    
    this.apply(new TutorStatusChangedEvent(this.id, oldStatus, this.status));
  }

  public updateRating(newRating: number, totalReviews: number): void {
    this.rating = newRating;
    this.totalReviews = totalReviews;
    this.updatedAt = new Date();
  }

  public isActive(): boolean {
    return this.status === TutorStatus.ACTIVE;
  }
}