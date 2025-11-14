import { AggregateRoot as NestAggregateRoot } from '@nestjs/cqrs';
import { Entity } from '../entities/base.entity';
import { EntityId } from '../value-objects/entity-id.vo';

/**
 * Base class for Aggregate Roots in DDD
 *
 * Aggregate Roots are entities that serve as entry points to aggregates.
 * They enforce consistency boundaries and emit domain events.
 *
 * This class extends NestJS CQRS AggregateRoot for event sourcing support.
 *
 * @example
 * ```typescript
 * interface UserAccountProps {
 *   email: string;
 *   cognitoId: string;
 *   isEmailVerified: boolean;
 * }
 *
 * class UserAccount extends AggregateRoot<UserAccountProps> {
 *   private constructor(props: UserAccountProps, id?: EntityId) {
 *     super(props, id);
 *   }
 *
 *   static create(props: UserAccountProps, id?: EntityId): UserAccount {
 *     const user = new UserAccount(props, id);
 *     user.apply(new UserRegisteredEvent(user.id.value, user.email));
 *     return user;
 *   }
 *
 *   verifyEmail(): void {
 *     this.props.isEmailVerified = true;
 *     this.apply(new EmailVerifiedEvent(this.id.value));
 *   }
 *
 *   get email(): string {
 *     return this.props.email;
 *   }
 * }
 * ```
 */
export abstract class AggregateRoot<T> extends Entity<T> {
  private readonly aggregate: NestAggregateRoot;

  protected constructor(props: T, id?: EntityId) {
    super(props, id);
    this.aggregate = Reflect.construct(NestAggregateRoot, []);
  }

  /**
   * Apply a domain event (will be published after transaction completes)
   */
  protected apply(event: any): void {
    this.aggregate.apply(event);
  }

  /**
   * Get uncommitted events (for event sourcing)
   */
  public getUncommittedEvents(): any[] {
    return this.aggregate.getUncommittedEvents();
  }

  /**
   * Commit events (publish them)
   */
  public commit(): void {
    this.aggregate.commit();
  }

  /**
   * Uncommit events (for rollback scenarios)
   */
  public uncommit(): void {
    this.aggregate.uncommit();
  }

  /**
   * Load events from history (for event sourcing)
   */
  public loadFromHistory(history: any[]): void {
    this.aggregate.loadFromHistory(history);
  }
}
