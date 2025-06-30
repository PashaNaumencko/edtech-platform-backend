export class UserCreatedEvent {
  public readonly eventName = 'user.created';
  public readonly occurredAt = new Date();

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: string
  ) {}
}
