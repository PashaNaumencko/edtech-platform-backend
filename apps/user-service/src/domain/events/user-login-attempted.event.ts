import { BaseDomainEvent } from "./base-domain.event";

export interface UserLoginAttemptedPayload {
  userId?: string;
  email: string;
  success: boolean;
  failureReason?: string;
  loginMethod: string;
  ipAddress: string;
}

/**
 * User Login Attempted Event
 *
 * Fired on every login attempt (successful or failed).
 */
export class UserLoginAttemptedEvent extends BaseDomainEvent {
  public static readonly EVENT_NAME = "user.login.attempted";

  constructor(
    payload: UserLoginAttemptedPayload,
    options: {
      correlationId?: string;
      causationId?: string;
      userId?: string;
    } = {},
  ) {
    super(
      UserLoginAttemptedEvent.EVENT_NAME,
      payload.userId || payload.email, // Use email if no userId for failed attempts
      payload,
      {
        ...options,
        userId: payload.userId,
      },
    );
  }

  // Convenience getters
  get isSuccessful(): boolean {
    return this.payload.success;
  }

  get isFailed(): boolean {
    return !this.payload.success;
  }

  get email(): string {
    return this.payload.email;
  }

  get loginMethod(): string {
    return this.payload.loginMethod;
  }
}
