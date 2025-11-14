/**
 * @edtech/shared-kernel
 *
 * Shared domain primitives for all microservices.
 * Pure domain layer only - no infrastructure concerns.
 *
 * @example
 * ```typescript
 * import {
 *   ValueObject,
 *   Entity,
 *   AggregateRoot,
 *   EntityId,
 *   DomainError,
 *   ValidationError,
 * } from '@edtech/shared-kernel';
 *
 * // Create value objects
 * class Email extends ValueObject<{ value: string }> {
 *   static create(email: string): Email {
 *     if (!email.includes('@')) throw new ValidationError('Invalid email');
 *     return new Email({ value: email.toLowerCase() });
 *   }
 * }
 *
 * // Create entities
 * class User extends Entity<UserProps> {
 *   // ... entity logic
 * }
 *
 * // Create aggregates
 * class UserAccount extends AggregateRoot<UserAccountProps> {
 *   register() {
 *     this.apply(new UserRegisteredEvent(this.id.value));
 *   }
 * }
 * ```
 */

// Domain exports only
export * from './domain';
