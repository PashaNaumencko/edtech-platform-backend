export class UserUpdatedEvent {
  public readonly eventName = 'user.updated';
  public readonly occurredAt = new Date();

  constructor(
    public readonly userId: string,
    public readonly changes: {
      firstName?: string;
      lastName?: string;
      email?: string;
    },
    public readonly updatedBy: string
  ) {}
}
