export abstract class ValueObject<T> {
  protected readonly value: T;

  protected constructor(value: T) {
    this.validate(value);
    this.value = value;
  }

  protected abstract validate(value: T): void;

  equals(other?: ValueObject<T>): boolean {
    return other ? JSON.stringify(this.value) === JSON.stringify(other.value) : false;
  }
}
