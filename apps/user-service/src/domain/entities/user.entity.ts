import { AggregateRoot } from '@nestjs/cqrs';
import {
  UserActivatedEvent,
  UserCreatedEvent,
  UserDeactivatedEvent,
  UserUpdatedEvent,
} from '../events';
import { UserBusinessRules } from '../rules/user-business-rules';
import { Email, UserId, UserName, UserRole, UserRoleType } from '../value-objects';
import { UserPreferences } from '../value-objects/user-preferences.value-object';
import { UserProfile } from '../value-objects/user-profile.value-object';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  status?: UserStatus;
  preferences?: UserPreferences;
  profile?: UserProfile;
}

interface UserPersistenceData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  preferences: UserPreferences;
  profile: UserProfile;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface CreateUserProps {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRoleType;
  status?: UserStatus;
  preferences?: UserPreferences;
  profile?: UserProfile;
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
  private _status: UserStatus;
  private _preferences: UserPreferences;
  private _profile: UserProfile;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _lastLoginAt?: Date;

  private constructor(
    id: UserId,
    email: Email,
    name: UserName,
    role: UserRole,
    status: UserStatus,
    preferences: UserPreferences,
    profile: UserProfile,
    createdAt?: Date,
    updatedAt?: Date,
    lastLoginAt?: Date
  ) {
    super();
    this._id = id;
    this._email = email;
    this._name = name;
    this._role = role;
    this._status = status;
    this._preferences = preferences;
    this._profile = profile;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
    this._lastLoginAt = lastLoginAt;
  }

  public static create(data: CreateUserData): User {
    const userId = UserId.generate();
    const name = UserName.create(data.firstName, data.lastName);
    const email = Email.create(data.email);
    const role = data.role || UserRole.student();
    const status = data.status || UserStatus.PENDING_VERIFICATION;
    const now = new Date();

    // Create default preferences and profile if not provided
    const preferences = data.preferences || UserPreferences.createDefault();
    const profile = data.profile || UserProfile.createMinimal();

    const user = new User(
      userId,
      email,
      name,
      role,
      status,
      preferences,
      profile,
      now,
      now
    );

    user.apply(new UserCreatedEvent(
      userId.value,
      email.value,
      name.firstName,
      name.lastName,
      role.value
    ));
    return user;
  }

  public static fromPersistence(data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    preferences?: UserPreferences;
    profile?: UserProfile;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
  }): User {
    return new User(
      UserId.fromString(data.id),
      Email.create(data.email),
      UserName.create(data.firstName, data.lastName),
      UserRole.create(data.role),
      data.status as UserStatus,
      data.preferences || UserPreferences.createDefault(),
      data.profile || UserProfile.createMinimal(),
      data.createdAt,
      data.updatedAt,
      data.lastLoginAt
    );
  }

  public update(props: UpdateUserProps, updatedBy: string): void {
    const changes: Record<string, any> = {};

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
    if (this._status === UserStatus.ACTIVE) {
      throw new Error('User is already active');
    }

    this._status = UserStatus.ACTIVE;
    this._updatedAt = new Date();
    this.apply(new UserActivatedEvent(this._id.value, this._email.value, activatedBy));
  }

  public deactivate(reason?: string, deactivatedBy?: string): void {
    if (this._status === UserStatus.INACTIVE) {
      throw new Error('User is already inactive');
    }

    this._status = UserStatus.INACTIVE;
    this._updatedAt = new Date();
    this.apply(new UserDeactivatedEvent(this._id.value, this._email.value, reason, deactivatedBy));
  }

  /**
   * Suspends the user account
   */
  suspend(suspendedBy: string = 'system'): void {
    this._status = UserStatus.SUSPENDED;
    this._updatedAt = new Date();
    this.apply(new UserUpdatedEvent(this._id.value, { status: UserStatus.SUSPENDED }, suspendedBy));
  }

  public recordLogin(): void {
    this._lastLoginAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Updates user preferences
   */
  updatePreferences(preferences: UserPreferences, updatedBy: string = 'user'): void {
    if (!this._preferences.equals(preferences)) {
      this._preferences = preferences;
      this._updatedAt = new Date();
      this.apply(new UserUpdatedEvent(this._id.value, { preferences: true }, updatedBy));
    }
  }

  /**
   * Updates user profile
   */
  updateProfile(profile: UserProfile, updatedBy: string = 'user'): void {
    if (!this._profile.equals(profile)) {
      this._profile = profile;
      this._updatedAt = new Date();
      this.apply(new UserUpdatedEvent(this._id.value, { profile: true }, updatedBy));
    }
  }

  /**
   * Checks if user profile is complete enough for tutoring
   * Delegates to UserProfile domain logic
   */
  isEligibleForTutoring(): boolean {
    // Must be active
    if (this._status !== UserStatus.ACTIVE) {
      return false;
    }

    // Must have Student or Tutor role
    if (![UserRole.student(), UserRole.tutor()].some(role => role.equals(this._role))) {
      return false;
    }

    // Delegate profile completeness check to UserProfile value object
    return this._profile.isCompleteForTutoring();
  }

  /**
   * Checks if user can be promoted to tutor
   * Uses business rules for comprehensive validation
   */
  canBePromotedToTutor(): boolean {
    return UserBusinessRules.canBecomeTutor(this);
  }

  /**
   * Gets user's age if available
   */
  getAge(): number | null {
    return this._profile.age;
  }

  /**
   * Checks if user has a specific skill
   */
  hasSkill(skillName: string): boolean {
    return this._profile.hasSkill(skillName);
  }

  /**
   * Gets profile completeness percentage
   */
  getProfileCompleteness(): number {
    return this._profile.calculateCompleteness();
  }

  /**
   * Checks if user should receive a notification
   */
  shouldReceiveNotification(notificationType: any): boolean {
    return this._preferences.shouldReceiveNotification(notificationType);
  }

  public isActive(): boolean {
    return this._status === UserStatus.ACTIVE;
  }

  public isStudent(): boolean {
    return this._role.equals(UserRole.student());
  }

  public isTutor(): boolean {
    return this._role.equals(UserRole.tutor());
  }

  public isAdmin(): boolean {
    return this._role.equals(UserRole.admin());
  }

  public isSuperadmin(): boolean {
    return this._role.equals(UserRole.superadmin());
  }

  public canBePromotedToAdmin(): boolean {
    return this.isTutor() && this.isActive();
  }

  /**
   * Changes user role with validation
   */
  changeRole(newRole: UserRole, changedBy: string = 'system'): void {
    if (this._role.equals(newRole)) {
      return;
    }

    const oldRole = this._role;
    this._role = newRole;
    this._updatedAt = new Date();

    this.apply(new UserUpdatedEvent(this._id.value, {
      role: { from: oldRole.value, to: newRole.value }
    }, changedBy));
  }

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

  public get status(): UserStatus {
    return this._status;
  }

  public get preferences(): UserPreferences {
    return this._preferences;
  }

  public get profile(): UserProfile {
    return this._profile;
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

  public toSnapshot() {
    return {
      id: this._id.value,
      email: this._email.value,
      firstName: this._name.firstName,
      lastName: this._name.lastName,
      fullName: this._name.fullName,
      role: this._role.value,
      status: this._status,
      preferences: this._preferences.toPersistence(),
      profile: this._profile.toPersistence(),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      lastLoginAt: this._lastLoginAt,
    };
  }

  public toPersistence(): UserPersistenceData {
    return {
      id: this._id.value,
      firstName: this._name.firstName,
      lastName: this._name.lastName,
      email: this._email.value,
      role: this._role,
      status: this._status,
      preferences: this._preferences,
      profile: this._profile,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      lastLoginAt: this._lastLoginAt
    };
  }

  public toString(): string {
    return `User(id=${this._id.value}, email=${this._email.value}, role=${this._role.value}, status=${this._status})`;
  }
}
