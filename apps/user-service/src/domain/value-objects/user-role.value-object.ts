export enum UserRoleType {
  STUDENT = 'student',
  TUTOR = 'tutor',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

export class UserRole {
  private static readonly VALID_ROLES = Object.values(UserRoleType);

  private constructor(private readonly _value: UserRoleType) {}

  public static create(role: string): UserRole {
    if (!role || typeof role !== 'string') {
      throw new Error('Role is required and must be a string');
    }

    const normalizedRole = role.toLowerCase() as UserRoleType;

    if (!this.VALID_ROLES.includes(normalizedRole)) {
      throw new Error(`Invalid role. Must be one of: ${this.VALID_ROLES.join(', ')}`);
    }

    return new UserRole(normalizedRole);
  }

  public static student(): UserRole {
    return new UserRole(UserRoleType.STUDENT);
  }

  public static tutor(): UserRole {
    return new UserRole(UserRoleType.TUTOR);
  }

  public static admin(): UserRole {
    return new UserRole(UserRoleType.ADMIN);
  }

  public static superadmin(): UserRole {
    return new UserRole(UserRoleType.SUPERADMIN);
  }

  public get value(): UserRoleType {
    return this._value;
  }

  public isStudent(): boolean {
    return this._value === UserRoleType.STUDENT;
  }

  public isTutor(): boolean {
    return this._value === UserRoleType.TUTOR;
  }

  public isAdmin(): boolean {
    return this._value === UserRoleType.ADMIN;
  }

  public isSuperadmin(): boolean {
    return this._value === UserRoleType.SUPERADMIN;
  }

  public canManageUsers(): boolean {
    return this.isAdmin() || this.isSuperadmin();
  }

  public canTeach(): boolean {
    return this.isTutor() || this.isAdmin() || this.isSuperadmin();
  }

  public equals(other: UserRole): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
