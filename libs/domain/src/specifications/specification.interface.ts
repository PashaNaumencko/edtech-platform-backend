/**
 * Core specification interface for domain queries
 * Implements the Specification pattern for business rules encapsulation
 */
export interface Specification<T> {
  /**
   * Checks if the given item satisfies this specification
   */
  isSatisfiedBy(item: T): boolean;

  /**
   * Combines this specification with another using AND logic
   */
  and(other: Specification<T>): Specification<T>;

  /**
   * Combines this specification with another using OR logic
   */
  or(other: Specification<T>): Specification<T>;

  /**
   * Creates the negation of this specification
   */
  not(): Specification<T>;
}

/**
 * Abstract base class for specifications providing default composition methods
 */
export abstract class BaseSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(item: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }

  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

/**
 * Composite specification for AND operations
 */
export class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(item: T): boolean {
    return this.left.isSatisfiedBy(item) && this.right.isSatisfiedBy(item);
  }
}

/**
 * Composite specification for OR operations
 */
export class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>
  ) {
    super();
  }

  isSatisfiedBy(item: T): boolean {
    return this.left.isSatisfiedBy(item) || this.right.isSatisfiedBy(item);
  }
}

/**
 * Composite specification for NOT operations
 */
export class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly spec: Specification<T>) {
    super();
  }

  isSatisfiedBy(item: T): boolean {
    return !this.spec.isSatisfiedBy(item);
  }
}
