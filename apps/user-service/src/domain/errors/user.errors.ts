/**
 * Base class for all user domain errors
 */
export abstract class UserDomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when a user is not found
 */
export class UserNotFoundError extends UserDomainError {
  readonly code = 'USER_NOT_FOUND';
  readonly statusCode = 404;

  constructor(identifier: string, identifierType: 'id' | 'email' = 'id') {
    super(`User not found with ${identifierType}: ${identifier}`, { identifier, identifierType });
  }
}

/**
 * Thrown when an invalid user role is provided
 */
export class InvalidUserRoleError extends UserDomainError {
  readonly code = 'INVALID_USER_ROLE';
  readonly statusCode = 400;

  constructor(role: string, validRoles?: string[]) {
    const message = validRoles
      ? `Invalid user role: ${role}. Valid roles are: ${validRoles.join(', ')}`
      : `Invalid user role: ${role}`;
    super(message, { role, validRoles });
  }
}

/**
 * Thrown when attempting to create a user that already exists
 */
export class UserAlreadyExistsError extends UserDomainError {
  readonly code = 'USER_ALREADY_EXISTS';
  readonly statusCode = 409;

  constructor(email: string) {
    super(`User already exists with email: ${email}`, { email });
  }
}

/**
 * Thrown when a role transition is not authorized
 */
export class UnauthorizedRoleTransitionError extends UserDomainError {
  readonly code = 'UNAUTHORIZED_ROLE_TRANSITION';
  readonly statusCode = 403;

  constructor(fromRole: string, toRole: string, reason?: string) {
    const message = reason
      ? `Unauthorized role transition from ${fromRole} to ${toRole}: ${reason}`
      : `Unauthorized role transition from ${fromRole} to ${toRole}`;
    super(message, { fromRole, toRole, reason });
  }
}

/**
 * Thrown when admin operations are attempted by non-superadmin users
 */
export class SuperadminOnlyOperationError extends UserDomainError {
  readonly code = 'SUPERADMIN_ONLY_OPERATION';
  readonly statusCode = 403;

  constructor(operation: string) {
    super(`Operation '${operation}' is restricted to superadmin access only`, { operation });
  }
}

/**
 * Thrown when an account is locked
 */
export class AccountLockedError extends UserDomainError {
  readonly code = 'ACCOUNT_LOCKED';
  readonly statusCode = 423;

  constructor(unlockTime?: Date, reason?: string) {
    const message = unlockTime
      ? `Account is locked until ${unlockTime.toISOString()}`
      : 'Account is locked';
    super(message, { unlockTime, reason });
  }
}

/**
 * Thrown when user doesn't meet requirements for an action
 */
export class UserRequirementsNotMetError extends UserDomainError {
  readonly code = 'USER_REQUIREMENTS_NOT_MET';
  readonly statusCode = 400;

  constructor(action: string, requirements: string[]) {
    super(`User does not meet requirements for ${action}: ${requirements.join(', ')}`, {
      action,
      requirements,
    });
  }
}

/**
 * Thrown when email change is not allowed
 */
export class EmailChangeNotAllowedError extends UserDomainError {
  readonly code = 'EMAIL_CHANGE_NOT_ALLOWED';
  readonly statusCode = 400;

  constructor(reason: string, cooldownDays?: number) {
    const message = cooldownDays
      ? `Email change not allowed: ${reason}. Cooldown period: ${cooldownDays} days`
      : `Email change not allowed: ${reason}`;
    super(message, { reason, cooldownDays });
  }
}

/**
 * Thrown when profile is incomplete for required action
 */
export class IncompleteProfileError extends UserDomainError {
  readonly code = 'INCOMPLETE_PROFILE';
  readonly statusCode = 400;

  constructor(action: string, missingFields: string[]) {
    super(`Profile incomplete for ${action}. Missing fields: ${missingFields.join(', ')}`, {
      action,
      missingFields,
    });
  }
}

/**
 * Thrown when user reputation is insufficient for action
 */
export class InsufficientReputationError extends UserDomainError {
  readonly code = 'INSUFFICIENT_REPUTATION';
  readonly statusCode = 403;

  constructor(action: string, currentReputation: number, requiredReputation: number) {
    super(
      `Insufficient reputation for ${action}. Current: ${currentReputation}, Required: ${requiredReputation}`,
      { action, currentReputation, requiredReputation }
    );
  }
}

/**
 * Thrown when business rule validation fails
 */
export class BusinessRuleViolationError extends UserDomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly statusCode = 400;

  constructor(rule: string, details?: string) {
    const message = details
      ? `Business rule violation: ${rule} - ${details}`
      : `Business rule violation: ${rule}`;
    super(message, { rule, details });
  }
}
