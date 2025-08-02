/**
 * User-related constants and enums shared across services
 */

export enum UserRole {
  STUDENT = 'STUDENT',
  TUTOR = 'TUTOR',
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

// User role hierarchy for authorization
export const USER_ROLE_HIERARCHY = {
  [UserRole.SUPERADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.TUTOR]: 2,
  [UserRole.STUDENT]: 1,
} as const;

// Default user configuration
export const USER_DEFAULTS = {
  ROLE: UserRole.STUDENT,
  STATUS: UserStatus.PENDING_VERIFICATION,
  SKILLS: [] as string[],
  BIO: null,
} as const;

// User validation constants
export const USER_VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_BIO_LENGTH: 1000,
  MAX_SKILLS_COUNT: 20,
  MAX_SKILL_LENGTH: 50,
} as const;