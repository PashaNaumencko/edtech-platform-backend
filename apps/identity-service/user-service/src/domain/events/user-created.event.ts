import { BaseDomainEvent } from "./base-domain.event";

export interface UserCreatedPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

/**
 * Simplified User Created Event
 *
 * Fired when a new user is created in the system.
 */
export class UserCreatedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = "user.created";

  constructor(
    payload: UserCreatedPayload,
    options: {
      correlationId?: string;
      causationId?: string;
      userId?: string;
    } = {},
  ) {
    super(
      UserCreatedEvent.EVENT_NAME,
      payload.userId, // aggregateId
      payload,
      {
        ...options,
        userId: payload.userId, // ensure userId is set from payload
      },
    );
  }

  // Convenience getters for common access patterns
  get email(): string {
    return this.payload.email;
  }

  get fullName(): string {
    return `${this.payload.firstName} ${this.payload.lastName}`;
  }

  get role(): string {
    return this.payload.role;
  }
}
