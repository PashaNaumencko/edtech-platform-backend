import { BaseDomainEvent } from "./base-domain.event";

export interface ProfileChange {
  field: string;
  previousValue: any;
  newValue: any;
  changeType: "added" | "updated" | "removed";
}

export interface UserProfileUpdatedPayload {
  userId: string;
  email: string;
  profileSection: "basic" | "skills" | "education" | "achievements" | "preferences" | "complete";
  changes: ProfileChange[];
  previousCompleteness: number;
  newCompleteness: number;
  updatedBy: string;
  updatedFields: string[];
}

/**
 * User Profile Updated Event
 *
 * Fired when a user's profile is updated.
 */
export class UserProfileUpdatedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = "user.profile.updated";

  constructor(
    payload: UserProfileUpdatedPayload,
    options: {
      correlationId?: string;
      causationId?: string;
      userId?: string;
    } = {},
  ) {
    super(
      UserProfileUpdatedEvent.EVENT_NAME,
      payload.userId, // aggregateId
      payload,
      {
        ...options,
        userId: payload.userId,
      },
    );
  }

  // Convenience getters
  get profileSection(): string {
    return this.payload.profileSection;
  }

  get completenessIncrease(): number {
    return this.payload.newCompleteness - this.payload.previousCompleteness;
  }

  get changedFields(): string[] {
    return this.payload.updatedFields;
  }
}
