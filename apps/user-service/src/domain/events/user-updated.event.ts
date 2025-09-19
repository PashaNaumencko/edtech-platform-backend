import { UserStatus } from '../entities/user.entity';

export interface UserUpdateChanges {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: UserStatus;
  preferences?: boolean;
  profile?: boolean;
  role?: { from: string; to: string };
}

export class UserUpdatedEvent {
  public readonly eventName = 'user.updated';
  public readonly occurredAt = new Date();

  constructor(
    public readonly userId: string,
    public readonly changes: UserUpdateChanges,
    public readonly updatedBy: string
  ) {}
}
