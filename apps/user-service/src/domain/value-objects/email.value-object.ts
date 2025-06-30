export class Email {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  private constructor(private readonly _value: string) {}

  public static create(email: string): Email {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required and must be a string');
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!this.EMAIL_REGEX.test(normalizedEmail)) {
      throw new Error('Invalid email format');
    }

    if (normalizedEmail.length > 254) {
      throw new Error('Email address is too long');
    }

    return new Email(normalizedEmail);
  }

  public get value(): string {
    return this._value;
  }

  public get domain(): string {
    return this._value.split('@')[1];
  }

  public get localPart(): string {
    return this._value.split('@')[0];
  }

  public equals(other: Email): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
