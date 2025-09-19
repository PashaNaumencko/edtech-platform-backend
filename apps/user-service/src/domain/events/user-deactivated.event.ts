export class UserDeactivatedEvent {
  public readonly eventName = 'user.deactivated';
  public readonly occurredAt = new Date();

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly reason?: string,
    public readonly deactivatedBy?: string
  ) {}
}
