/**
 * User Service Constants
 *
 * Centralized constants for the user service including injection tokens.
 */

/**
 * Injection Tokens
 *
 * Using symbols for type-safe dependency injection
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
  STUDENT: "student",
  TUTOR: "tutor",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
} as const;
