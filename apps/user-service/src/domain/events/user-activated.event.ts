export class UserActivatedEvent {
  public readonly eventName = 'user.activated';
  public readonly occurredAt = new Date();

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly activatedBy?: string
  ) {}
}
