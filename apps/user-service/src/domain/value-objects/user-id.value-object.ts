import { randomUUID } from 'crypto';

export class UserId {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private constructor(private readonly _value: string) {}

  public static create(id?: string): UserId {
    if (id) {
      return this.fromString(id);
    }
    return this.generate();
  }

  public static generate(): UserId {
    return new UserId(randomUUID());
  }

  public static fromString(id: string): UserId {
    if (!id || typeof id !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    if (!this.UUID_REGEX.test(id)) {
      throw new Error('Invalid UUID format for User ID');
    }

    return new UserId(id);
  }

  public get value(): string {
    return this._value;
  }

  public equals(other: UserId): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
