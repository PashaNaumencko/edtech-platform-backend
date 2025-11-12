import { AggregateRoot } from "@nestjs/cqrs";

export class UserAccountAggregate extends AggregateRoot {
  constructor(
    public id: string,
    public email: string,
    public name: string,
    public isActive: boolean
  ) {
    super();
  }

  activate() {
    this.isActive = true;
    this.apply(new UserActivatedEvent(this.id));
  }

  deactivate() {
    this.isActive = false;
    this.apply(new UserDeactivatedEvent(this.id));
  }
}

class UserActivatedEvent {
  constructor(public readonly userId: string) {}
}
