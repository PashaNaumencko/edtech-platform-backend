/**
 * Base class for domain errors
 *
 * Domain errors represent business rule violations and
 * should be handled differently from technical errors.
 *
 * @example
 * ```typescript
 * class InvalidEmailError extends DomainError {
 *   constructor(email: string) {
 *     super(`Invalid email format: ${email}`, 'INVALID_EMAIL');
 *   }
 * }
 *
 * class UserAlreadyExistsError extends DomainError {
 *   constructor(email: string) {
 *     super(`User with email ${email} already exists`, 'USER_ALREADY_EXISTS');
 *   }
 * }
 * ```
 */
export class DomainError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code?: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code || 'DOMAIN_ERROR';
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends DomainError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

/**
 * Not found error - thrown when entity is not found
 */
export class NotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id ${id} not found`, 'NOT_FOUND');
  }
}

/**
 * Conflict error - thrown when operation conflicts with current state
 */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT');
  }
}

/**
 * Unauthorized error - thrown when user lacks permission
 */
export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED');
  }
}
