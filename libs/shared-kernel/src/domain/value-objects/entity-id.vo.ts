import { ValueObject } from './base.value-object';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

interface EntityIdProps {
  value: string;
}

/**
 * Generic Entity ID value object
 *
 * Ensures all entity IDs are valid UUIDs.
 *
 * @example
 * ```typescript
 * // Generate new ID
 * const userId = EntityId.create();
 *
 * // From existing ID
 * const userId = EntityId.fromString('123e4567-e89b-12d3-a456-426614174000');
 *
 * // Get string value
 * userId.value; // '123e4567-e89b-12d3-a456-426614174000'
 * ```
 */
export class EntityId extends ValueObject<EntityIdProps> {
  private constructor(props: EntityIdProps) {
    super(props);
  }

  /**
   * Create a new UUID-based entity ID
   */
  public static create(): EntityId {
    return new EntityId({ value: uuidv4() });
  }

  /**
   * Create entity ID from existing string
   */
  public static fromString(id: string): EntityId {
    if (!uuidValidate(id)) {
      throw new Error(`Invalid UUID format: ${id}`);
    }
    return new EntityId({ value: id });
  }

  /**
   * Get the string value of the ID
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Convert to string representation
   */
  public toString(): string {
    return this.props.value;
  }
}
