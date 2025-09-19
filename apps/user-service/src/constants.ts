/**
 * User Service Constants
 *
 * Centralized constants for the user service including injection tokens.
 */

/**
 * Dependency Injection Tokens
 *
 * Using string tokens for NestJS dependency injection
 */
export const DI_TOKENS = {
  // Repositories
  USER_REPOSITORY: 'IUserRepository',
  
  // Services
  USER_DOMAIN_SERVICE: 'UserDomainService',
  EVENT_BRIDGE_SERVICE: 'EventBridgeService',
  EMAIL_SERVICE: 'EmailService',
  ANALYTICS_SERVICE: 'AnalyticsService',
  SETTINGS_SERVICE: 'SettingsService',
  
  // Configuration
  USER_SERVICE_CONFIG: 'USER_SERVICE_CONFIG',
  DATABASE_CONFIG: 'DATABASE_CONFIG',
  DRIZZLE_CONFIG: 'DRIZZLE_CONFIG',
  
  // External Services
  COGNITO_SERVICE: 'CognitoService',
  S3_SERVICE: 'S3Service',
} as const;

/**
 * Legacy Injection Tokens (Symbols)
 * @deprecated Use DI_TOKENS instead
 */
export const USER_SERVICE_TOKENS = {
  USER_REPOSITORY: Symbol("USER_REPOSITORY"),
  USER_DOMAIN_SERVICE: Symbol("USER_DOMAIN_SERVICE"),
  EVENT_PUBLISHER: Symbol("EVENT_PUBLISHER"),
} as const;

/**
 * User Service Configuration Constants
 */
export const USER_SERVICE_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PASSWORD_LENGTH: 8,
  MAX_BIO_LENGTH: 500,
  MAX_SKILLS_COUNT: 10,
} as const;

/**
 * User Status Constants
 */
export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  PENDING_VERIFICATION: "pending_verification",
} as const;

/**
 * User Role Constants
 */
export const USER_ROLE = {
  STUDENT: "STUDENT",
  TUTOR: "TUTOR",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

/**
 * Event Names
 */
export const USER_EVENTS = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  ACTIVATED: 'user.activated',
  DEACTIVATED: 'user.deactivated',
  ROLE_CHANGED: 'user.role_changed',
  PROFILE_UPDATED: 'user.profile_updated',
} as const;

/**
 * Error Messages
 */
export const USER_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User with this email already exists',
  INVALID_EMAIL: 'Invalid email format',
  INVALID_ROLE: 'Invalid user role',
  INVALID_STATUS: 'Invalid user status',
  UNAUTHORIZED: 'Unauthorized access',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
} as const;
