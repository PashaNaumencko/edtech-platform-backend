import { AggregateRoot } from "@nestjs/cqrs";
import { TutorSubject, ExperienceLevel } from './tutor.entity';

export enum MatchingRequestStatus {
  PENDING = "PENDING",
  MATCHED = "MATCHED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

// Domain Events
export class MatchingRequestCreatedEvent {
  constructor(
    public readonly requestId: string,
    public readonly studentId: string,
    public readonly subject: TutorSubject,
  ) {}
}

export class MatchingRequestMatchedEvent {
  constructor(
    public readonly requestId: string,
    public readonly studentId: string,
    public readonly tutorId: string,
  ) {}
}

export class MatchingRequestCancelledEvent {
  constructor(
    public readonly requestId: string,
    public readonly reason?: string,
  ) {}
}

// MVP-focused MatchingRequest Aggregate
export class MatchingRequest extends AggregateRoot {
  public id: string;
  public studentId: string;
  public subject: TutorSubject;
  public preferredExperienceLevel?: ExperienceLevel;
  public maxHourlyRate?: number;
  public preferredLanguages: string[];
  public description?: string;
  public status: MatchingRequestStatus;
  public matchedTutorId?: string;
  public createdAt: Date;
  public updatedAt: Date;
  public expiresAt: Date;

  constructor() {
    super();
  }

  public static create(data: {
    studentId: string;
    subject: TutorSubject;
    preferredExperienceLevel?: ExperienceLevel;
    maxHourlyRate?: number;
    preferredLanguages?: string[];
    description?: string;
  }): MatchingRequest {
    const request = new MatchingRequest();
    request.id = `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    request.studentId = data.studentId;
    request.subject = data.subject;
    request.preferredExperienceLevel = data.preferredExperienceLevel;
    request.maxHourlyRate = data.maxHourlyRate;
    request.preferredLanguages = data.preferredLanguages || [];
    request.description = data.description;
    request.status = MatchingRequestStatus.PENDING;
    request.createdAt = new Date();
    request.updatedAt = new Date();
    request.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Emit domain event
    request.apply(new MatchingRequestCreatedEvent(request.id, request.studentId, request.subject));
    
    return request;
  }


  public matchWithTutor(tutorId: string): void {
    if (this.status !== MatchingRequestStatus.PENDING) {
      throw new Error('Can only match pending requests');
    }

    this.matchedTutorId = tutorId;
    this.status = MatchingRequestStatus.MATCHED;
    this.updatedAt = new Date();

    this.apply(new MatchingRequestMatchedEvent(this.id, this.studentId, tutorId));
  }

  public cancel(reason?: string): void {
    if (this.status === MatchingRequestStatus.MATCHED) {
      throw new Error('Cannot cancel matched requests');
    }

    this.status = MatchingRequestStatus.CANCELLED;
    this.updatedAt = new Date();

    this.apply(new MatchingRequestCancelledEvent(this.id, reason));
  }

  public expire(): void {
    if (this.status === MatchingRequestStatus.PENDING) {
      this.status = MatchingRequestStatus.EXPIRED;
      this.updatedAt = new Date();
    }
  }

  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public isPending(): boolean {
    return this.status === MatchingRequestStatus.PENDING;
  }
}