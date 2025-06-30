export class UserName {
  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 50;
  private static readonly NAME_REGEX = /^[a-zA-Z\s'-]{1,50}$/;

  private constructor(
    private readonly _firstName: string,
    private readonly _lastName: string
  ) {}

  public static create(firstName: string, lastName: string): UserName {
    const validatedFirstName = this.validateName(firstName, 'First name');
    const validatedLastName = this.validateName(lastName, 'Last name');

    return new UserName(validatedFirstName, validatedLastName);
  }

  private static validateName(name: string, fieldName: string): string {
    if (!name || typeof name !== 'string') {
      throw new Error(`${fieldName} is required and must be a string`);
    }

    const trimmedName = name.trim();

    if (trimmedName.length < this.MIN_LENGTH) {
      throw new Error(`${fieldName} must be at least ${this.MIN_LENGTH} character(s)`);
    }

    if (trimmedName.length > this.MAX_LENGTH) {
      throw new Error(`${fieldName} must not exceed ${this.MAX_LENGTH} characters`);
    }

    if (!this.NAME_REGEX.test(trimmedName)) {
      throw new Error(
        `${fieldName} contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed`
      );
    }

    // Capitalize first letter of each word
    return trimmedName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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

  public get initials(): string {
    return `${this._firstName.charAt(0)}${this._lastName.charAt(0)}`.toUpperCase();
  }

  public equals(other: UserName): boolean {
    return this._firstName === other._firstName && this._lastName === other._lastName;
  }

  public toString(): string {
    return this.fullName;
  }
}
