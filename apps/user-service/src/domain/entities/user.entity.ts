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

/**
 * Simplified User Aggregate Root
 *
 * Focuses on essential data for Day 13:
 * - Core user information (id, email, name, role, status)
 * - Basic profile data (bio, skills)
 * - Essential domain operations
 * - Event emission for domain changes
 */
export class User extends AggregateRoot {
  private _id: string;
  private _email: string;
  private _firstName: string;
  private _lastName: string;
  private _role: UserRoleType;
  private _status: UserStatus;
  private _bio?: string;
  private _skills: string[];
  private _createdAt: Date;
  private _updatedAt: Date;
  private _lastLoginAt?: Date;

  private constructor(
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    role: UserRoleType,
    status: UserStatus,
    bio?: string,
    skills: string[] = [],
    createdAt?: Date,
    updatedAt?: Date,
    lastLoginAt?: Date
  ) {
    super();
    this._id = id;
    this._email = email;
    this._firstName = firstName;
    this._lastName = lastName;
    this._role = role;
    this._status = status;
    this._bio = bio;
    this._skills = skills;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
    this._lastLoginAt = lastLoginAt;
  }

  public static create(data: CreateUserData): User {
    const userId = this.generateId();
    const role = data.role || UserRoleType.STUDENT;
    const status = data.status || UserStatus.PENDING_VERIFICATION;
    const now = new Date();

    const user = new User(
      userId,
      data.email,
      data.firstName,
      data.lastName,
      role,
      status,
      data.bio,
      data.skills || [],
      now,
      now
    );

    user.apply(
      new UserCreatedEvent({
        userId: userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: role,
        status: status,
      })
    );
    return user;
  }

  public static fromPersistence(data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    bio?: string;
    skills?: string[];
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
  }): User {
    return new User(
      data.id,
      data.email,
      data.firstName,
      data.lastName,
      data.role as UserRoleType,
      data.status as UserStatus,
      data.bio,
      data.skills || [],
      data.createdAt,
      data.updatedAt,
      data.lastLoginAt
    );
  }

  /**
   * Updates basic user information
   */
  public update(props: UpdateUserProps, updatedBy: string): void {
    const changes: Record<string, any> = {};

    if (props.email && props.email !== this._email) {
      this._email = props.email;
      changes.email = props.email;
    }

    if (props.firstName && props.firstName !== this._firstName) {
      this._firstName = props.firstName;
      changes.firstName = props.firstName;
    }

    if (props.lastName && props.lastName !== this._lastName) {
      this._lastName = props.lastName;
      changes.lastName = props.lastName;
    }

    if (props.bio !== undefined && props.bio !== this._bio) {
      this._bio = props.bio;
      changes.bio = props.bio;
    }

    if (props.skills && JSON.stringify(props.skills) !== JSON.stringify(this._skills)) {
      this._skills = props.skills;
      changes.skills = props.skills;
    }

    if (Object.keys(changes).length > 0) {
      this._updatedAt = new Date();
      this.apply(new UserUpdatedEvent(this._id, changes, updatedBy));
    }
  }

  /**
   * Activates the user account
   */
  public activate(activatedBy?: string): void {
    if (this._status === UserStatus.ACTIVE) {
      throw new Error("User is already active");
    }

    this._status = UserStatus.ACTIVE;
    this._updatedAt = new Date();
    this.apply(new UserActivatedEvent(this._id, this._email, activatedBy));
  }

  /**
   * Deactivates the user account
   */
  public deactivate(reason?: string, deactivatedBy?: string): void {
    if (this._status === UserStatus.INACTIVE) {
      throw new Error("User is already inactive");
    }

    this._status = UserStatus.INACTIVE;
    this._updatedAt = new Date();
    this.apply(new UserDeactivatedEvent(this._id, this._email, reason, deactivatedBy));
  }

  /**
   * Suspends the user account
   */
  public suspend(): void {
    this._status = UserStatus.SUSPENDED;
    this._updatedAt = new Date();
  }

  /**
   * Records user login time
   */
  public recordLogin(): void {
    this._lastLoginAt = new Date();
  }

  /**
   * Changes user role
   */
  public changeRole(newRole: UserRoleType, changedBy: string = "system"): void {
    if (this._role === newRole) {
      throw new Error("User already has this role");
    }

    const oldRole = this._role;
    this._role = newRole;
    this._updatedAt = new Date();

    this.apply(
      new UserRoleChangedEvent({
        userId: this._id,
        oldRole: oldRole,
        newRole: newRole,
        changedBy,
        reason: "Role updated by " + changedBy,
      })
    );
  }

  // Query methods
  public isActive(): boolean {
    return this._status === UserStatus.ACTIVE;
  }

  public isStudent(): boolean {
    return this._role === UserRoleType.STUDENT;
  }

  public isTutor(): boolean {
    return this._role === UserRoleType.TUTOR;
  }

  public isAdmin(): boolean {
    return this._role === UserRoleType.ADMIN;
  }

  public isSuperadmin(): boolean {
    return this._role === UserRoleType.SUPERADMIN;
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get email(): string {
    return this._email;
  }

  public get firstName(): string {
    return this._firstName;
  }

  public get lastName(): string {
    return this._lastName;
  }

  public get fullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  public get role(): UserRoleType {
    return this._role;
  }

  public get status(): UserStatus {
    return this._status;
  }

  public get bio(): string | undefined {
    return this._bio;
  }

  public get skills(): string[] {
    return [...this._skills];
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get lastLoginAt(): Date | undefined {
    return this._lastLoginAt;
  }

  /**
   * Creates a snapshot of the user for serialization
   */
  public toSnapshot() {
    return {
      id: this._id,
      email: this._email,
      firstName: this._firstName,
      lastName: this._lastName,
      role: this._role,
      status: this._status,
      bio: this._bio,
      skills: this._skills,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      lastLoginAt: this._lastLoginAt,
    };
  }

  /**
   * Creates persistence data for database storage
   */
  public toPersistence() {
    return {
      id: this._id,
      email: this._email,
      firstName: this._firstName,
      lastName: this._lastName,
      role: this._role,
      status: this._status,
      bio: this._bio,
      skills: this._skills,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      lastLoginAt: this._lastLoginAt,
    };
  }

  /**
   * Generates a unique ID
   */
  private static generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public toString(): string {
    return `User(${this._id}, ${this._email}, ${this.fullName})`;
  }
}
