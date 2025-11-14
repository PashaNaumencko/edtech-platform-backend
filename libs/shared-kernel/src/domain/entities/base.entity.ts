import { EntityId } from '../value-objects/entity-id.vo';

/**
 * Base class for Entities in DDD
 *
 * Entities are objects with identity. Two entities with the same ID
 * are considered the same entity, even if their attributes differ.
 *
 * @example
 * ```typescript
 * interface UserProps {
 *   email: string;
 *   name: string;
 * }
 *
 * class User extends Entity<UserProps> {
 *   private constructor(props: UserProps, id?: EntityId) {
 *     super(props, id);
 *   }
 *
 *   static create(props: UserProps, id?: EntityId): User {
 *     return new User(props, id);
 *   }
 *
 *   get email(): string {
 *     return this.props.email;
 *   }
 *
 *   updateEmail(email: string): void {
 *     this.props.email = email;
 *   }
 * }
 * ```
 */
export abstract class Entity<T> {
  protected readonly _id: EntityId;
  protected props: T;

  protected constructor(props: T, id?: EntityId) {
    this._id = id ?? EntityId.create();
    this.props = props;
  }

  /**
   * Get the entity's unique identifier
   */
  get id(): EntityId {
    return this._id;
  }

  /**
   * Check if this entity equals another (based on ID)
   */
  public equals(entity?: Entity<T>): boolean {
    if (entity === null || entity === undefined) {
      return false;
    }

    if (this === entity) {
      return true;
    }

    return this._id.equals(entity._id);
  }
}
