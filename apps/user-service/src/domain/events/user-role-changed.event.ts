import { BaseDomainEvent } from "./base-domain.event";

export interface UserRoleChangedPayload {
  userId: string;
  oldRole: string;
  newRole: string;
  changedBy?: string;
  reason?: string;
}

/**
 * User Role Changed Event
 *
 * Fired when a user's role is changed.
 */
export class UserRoleChangedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = "user.role_changed";

  constructor(
    payload: UserRoleChangedPayload,
    options: {
      correlationId?: string;
      causationId?: string;
      userId?: string;
    } = {},
  ) {
    super(
      UserRoleChangedEvent.EVENT_NAME,
      payload.userId, // aggregateId
      payload,
      {
        ...options,
        userId: payload.userId,
      },
    );
  }

  // Convenience getters for common access patterns
  get oldRole(): string {
    return this.payload.oldRole;
  }

  get newRole(): string {
    return this.payload.newRole;
  }
}
