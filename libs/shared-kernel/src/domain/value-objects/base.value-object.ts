/**
 * Base class for Value Objects in DDD
 *
 * Value Objects are immutable and defined by their attributes.
 * Two value objects with the same attributes are considered equal.
 *
 * @example
 * ```typescript
 * class Email extends ValueObject<{ value: string }> {
 *   private constructor(props: { value: string }) {
 *     super(props);
 *   }
 *
 *   static create(email: string): Email {
 *     if (!email.includes('@')) {
 *       throw new DomainError('Invalid email format');
 *     }
 *     return new Email({ value: email.toLowerCase() });
 *   }
 *
 *   get value(): string {
 *     return this.props.value;
 *   }
 * }
 * ```
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  /**
   * Check if this value object equals another
   */
  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}
