import { AggregateRoot } from '@nestjs/cqrs';
import {
  UserActivatedEvent,
  UserCreatedEvent,
  UserDeactivatedEvent,
  UserUpdatedEvent,
} from '../events';
import { Email, UserId, UserName, UserRole, UserRoleType } from '../value-objects';

export interface CreateUserProps {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRoleType;
}

export interface UpdateUserProps {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export class User extends AggregateRoot {
  private _id: UserId;
  private _email: Email;
  private _name: UserName;
  private _role: UserRole;
  private _isActive: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: UserId,
    email: Email,
    name: UserName,
    role: UserRole,
    isActive: boolean = true,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super();
    this._id = id;
    this._email = email;
    this._name = name;
    this._role = role;
    this._isActive = isActive;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  public static create(props: CreateUserProps): User {
    const id = UserId.generate();
    const email = Email.create(props.email);
    const name = UserName.create(props.firstName, props.lastName);
    const role = UserRole.create(props.role || UserRoleType.STUDENT);

    const user = new User(id, email, name, role);

    user.apply(
      new UserCreatedEvent(id.value, email.value, name.firstName, name.lastName, role.value)
    );

    return user;
  }

  public static fromPersistence(data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      UserId.fromString(data.id),
      Email.create(data.email),
      UserName.create(data.firstName, data.lastName),
      UserRole.create(data.role),
      data.isActive,
      data.createdAt,
      data.updatedAt
    );
  }

  public update(props: UpdateUserProps, updatedBy: string): void {
    const changes: any = {};

    if (props.email && props.email !== this._email.value) {
      this._email = Email.create(props.email);
      changes.email = props.email;
    }

    if (props.firstName || props.lastName) {
      const firstName = props.firstName || this._name.firstName;
      const lastName = props.lastName || this._name.lastName;
      this._name = UserName.create(firstName, lastName);

      if (props.firstName) changes.firstName = props.firstName;
      if (props.lastName) changes.lastName = props.lastName;
    }

    if (Object.keys(changes).length > 0) {
      this._updatedAt = new Date();
      this.apply(new UserUpdatedEvent(this._id.value, changes, updatedBy));
    }
  }

  public activate(activatedBy?: string): void {
    if (this._isActive) {
      throw new Error('User is already active');
    }

    this._isActive = true;
    this._updatedAt = new Date();
    this.apply(new UserActivatedEvent(this._id.value, this._email.value, activatedBy));
  }

  public deactivate(reason?: string, deactivatedBy?: string): void {
    if (!this._isActive) {
      throw new Error('User is already inactive');
    }

    this._isActive = false;
    this._updatedAt = new Date();
    this.apply(new UserDeactivatedEvent(this._id.value, this._email.value, reason, deactivatedBy));
  }

  // Getters
  public get id(): UserId {
    return this._id;
  }
  public get email(): Email {
    return this._email;
  }
  public get name(): UserName {
    return this._name;
  }
  public get role(): UserRole {
    return this._role;
  }
  public get isActive(): boolean {
    return this._isActive;
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business logic
  public equals(other: User): boolean {
    return this._id.equals(other._id);
  }

  public toSnapshot() {
    return {
      id: this._id.value,
      email: this._email.value,
      firstName: this._name.firstName,
      lastName: this._name.lastName,
      fullName: this._name.fullName,
      role: this._role.value,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
