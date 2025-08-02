import { BaseDomainEvent } from "./base-domain.event";

export interface PreferenceChange {
  preference: string;
  previousValue: any;
  newValue: any;
  category: "notification" | "language" | "timezone" | "display" | "privacy";
}

export interface UserPreferencesChangedPayload {
  userId: string;
  email: string;
  changes: PreferenceChange[];
  changedBy: string;
}

/**
 * User Preferences Changed Event
 *
 * Fired when user preferences are updated.
 */
export class UserPreferencesChangedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = "user.preferences.changed";

  constructor(
    payload: UserPreferencesChangedPayload,
    options: {
      correlationId?: string;
      causationId?: string;
      userId?: string;
    } = {}
  ) {
    super(
      UserPreferencesChangedEvent.EVENT_NAME,
      payload.userId, // aggregateId
      payload,
      {
        ...options,
        userId: payload.userId,
      }
    );
  }

  // Convenience getters
  get changedBy(): string {
    return this.payload.changedBy;
  }

  get changeCount(): number {
    return Array.isArray(this.payload.changes) ? this.payload.changes.length : 0;
  }
}
