import { AggregateRoot } from "@nestjs/cqrs";
import {
  UserActivatedEvent,
  UserCreatedEvent,
  UserDeactivatedEvent,
  UserRoleChangedEvent,
  UserUpdatedEvent,
} from "../events";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
}

export enum UserRoleType {
  STUDENT = "STUDENT",
  TUTOR = "TUTOR",
  ADMIN = "ADMIN",
  SUPERADMIN = "SUPERADMIN",
}

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRoleType;
  status?: UserStatus;
  bio?: string;
  skills?: string[];
}

export interface CreateUserProps {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRoleType;
  status?: UserStatus;
  bio?: string;
  skills?: string[];
}

export interface UpdateUserProps {
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  skills?: string[];
}

// MVP-focused User Aggregate
export class User extends AggregateRoot {
  public id: string;
  public email: string;
  public firstName: string;
  public lastName: string;
  public role: UserRoleType;
  public status: UserStatus;
  public bio?: string;
  public skills: string[];
  public createdAt: Date;
  public updatedAt: Date;
  public lastLoginAt?: Date;

  constructor() {
    super();
  }

  public static create(data: CreateUserData): User {
    const user = new User();
    user.id = this.generateId();
    user.email = data.email;
    user.firstName = data.firstName;
    user.lastName = data.lastName;
    user.role = data.role || UserRoleType.STUDENT;
    user.status = data.status || UserStatus.PENDING_VERIFICATION;
    user.bio = data.bio;
    user.skills = data.skills || [];
    user.createdAt = new Date();
    user.updatedAt = new Date();

    user.apply(
      new UserCreatedEvent({
        userId: user.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: user.role,
        status: user.status,
      })
    );
    return user;
  }


  /**
   * Updates basic user information
   */
  public update(props: UpdateUserProps, updatedBy: string): void {
    const changes: Record<string, any> = {};

    if (props.email && props.email !== this.email) {
      this.email = props.email;
      changes.email = props.email;
    }

    if (props.firstName && props.firstName !== this.firstName) {
      this.firstName = props.firstName;
      changes.firstName = props.firstName;
    }

    if (props.lastName && props.lastName !== this.lastName) {
      this.lastName = props.lastName;
      changes.lastName = props.lastName;
    }

    if (props.bio !== undefined && props.bio !== this.bio) {
      this.bio = props.bio;
      changes.bio = props.bio;
    }

    if (props.skills && JSON.stringify(props.skills) !== JSON.stringify(this.skills)) {
      this.skills = props.skills;
      changes.skills = props.skills;
    }

    if (Object.keys(changes).length > 0) {
      this.updatedAt = new Date();
      this.apply(new UserUpdatedEvent(this.id, changes, updatedBy));
    }
  }

  /**
   * Activates the user account
   */
  public activate(activatedBy?: string): void {
    if (this.status === UserStatus.ACTIVE) {
      throw new Error("User is already active");
    }

    this.status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
    this.apply(new UserActivatedEvent(this.id, this.email, activatedBy));
  }

  /**
   * Deactivates the user account
   */
  public deactivate(reason?: string, deactivatedBy?: string): void {
    if (this.status === UserStatus.INACTIVE) {
      throw new Error("User is already inactive");
    }

    this.status = UserStatus.INACTIVE;
    this.updatedAt = new Date();
    this.apply(new UserDeactivatedEvent(this.id, this.email, reason, deactivatedBy));
  }

  /**
   * Suspends the user account
   */
  public suspend(): void {
    this.status = UserStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  /**
   * Records user login time
   */
  public recordLogin(): void {
    this.lastLoginAt = new Date();
  }

  /**
   * Changes user role
   */
  public changeRole(newRole: UserRoleType, changedBy: string = "system"): void {
    if (this.role === newRole) {
      throw new Error("User already has this role");
    }

    const oldRole = this.role;
    this.role = newRole;
    this.updatedAt = new Date();

    this.apply(
      new UserRoleChangedEvent({
        userId: this.id,
        oldRole: oldRole,
        newRole: newRole,
        changedBy,
        reason: "Role updated by " + changedBy,
      })
    );
  }

  // Query methods
  public isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  public isStudent(): boolean {
    return this.role === UserRoleType.STUDENT;
  }

  public isTutor(): boolean {
    return this.role === UserRoleType.TUTOR;
  }

  public isAdmin(): boolean {
    return this.role === UserRoleType.ADMIN;
  }

  public isSuperadmin(): boolean {
    return this.role === UserRoleType.SUPERADMIN;
  }

  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Generates a unique ID
   */
  private static generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public toString(): string {
    return `User(${this.id}, ${this.email}, ${this.fullName})`;
  }
}
