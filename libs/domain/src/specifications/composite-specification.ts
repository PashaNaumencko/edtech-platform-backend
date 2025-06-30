import { Specification } from './specification.interface';

/**
 * Base composite specification class providing AND, OR, NOT operations
 * Use this as a base for creating composable specifications across services
 */
export abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(item: T): boolean;

  /**
   * Creates a specification that is satisfied when both this and other are satisfied
   */
  and(other: Specification<T>): Specification<T> {
    return new AndSpecification<T>(this, other);
  }

  /**
   * Creates a specification that is satisfied when either this or other is satisfied
   */
  or(other: Specification<T>): Specification<T> {
    return new OrSpecification<T>(this, other);
  }

  /**
   * Creates a specification that is satisfied when this is not satisfied
   */
  not(): Specification<T> {
    return new NotSpecification<T>(this);
  }
}

/**
 * Internal AND specification implementation
 */
class AndSpecification<T> extends CompositeSpecification<T> {
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
 * Internal OR specification implementation
 */
class OrSpecification<T> extends CompositeSpecification<T> {
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
 * Internal NOT specification implementation
 */
class NotSpecification<T> extends CompositeSpecification<T> {
  constructor(private readonly specification: Specification<T>) {
    super();
  }

  isSatisfiedBy(item: T): boolean {
    return !this.specification.isSatisfiedBy(item);
  }
}
