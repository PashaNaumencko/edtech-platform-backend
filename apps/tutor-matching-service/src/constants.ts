/**
 * Tutor Matching Service Constants
 *
 * Centralized constants for the tutor matching service including injection tokens.
 */

/**
 * Dependency Injection Tokens
 *
 * Using string tokens for NestJS dependency injection
 */
export const DI_TOKENS = {
  // Repositories
  TUTOR_REPOSITORY: 'ITutorRepository',
  MATCHING_REQUEST_REPOSITORY: 'IMatchingRequestRepository',
  USER_REPOSITORY: 'IUserRepository',
  
  // Services
  TUTOR_MATCHING_SERVICE: 'TutorMatchingService',
  NOTIFICATION_SERVICE: 'NotificationService',
  PAYMENT_SERVICE: 'PaymentService',
  
  // Configuration
  TUTOR_SERVICE_CONFIG: 'TUTOR_SERVICE_CONFIG',
  DATABASE_CONFIG: 'DATABASE_CONFIG',
  DRIZZLE_CONFIG: 'DRIZZLE_CONFIG',
  
  // External Services
  ML_MATCHING_SERVICE: 'MLMatchingService',
  RECOMMENDATION_SERVICE: 'RecommendationService',
} as const;

/**
 * Tutor Service Configuration Constants
 */
export const TUTOR_SERVICE_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_HOURLY_RATE: 1000, // in cents ($10)
  MAX_HOURLY_RATE: 50000, // in cents ($500)
  MAX_SUBJECTS_COUNT: 10,
  MAX_LANGUAGES_COUNT: 5,
  MAX_EXPERIENCE_LENGTH: 2000,
  MAX_QUALIFICATIONS_COUNT: 20,
} as const;

/**
 * Matching Request Status Constants
 */
export const MATCHING_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  MATCHED: 'MATCHED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

/**
 * Tutor Verification Status Constants
 */
export const VERIFICATION_STATUS = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

/**
 * Event Names
 */
export const TUTOR_EVENTS = {
  TUTOR_CREATED: 'tutor.created',
  TUTOR_UPDATED: 'tutor.updated',
  TUTOR_VERIFIED: 'tutor.verified',
  MATCHING_REQUEST_CREATED: 'matching_request.created',
  MATCHING_REQUEST_UPDATED: 'matching_request.updated',
  MATCH_FOUND: 'match.found',
  MATCH_ACCEPTED: 'match.accepted',
  MATCH_REJECTED: 'match.rejected',
} as const;

/**
 * Error Messages
 */
export const TUTOR_ERRORS = {
  TUTOR_NOT_FOUND: 'Tutor not found',
  TUTOR_ALREADY_EXISTS: 'Tutor profile already exists for this user',
  MATCHING_REQUEST_NOT_FOUND: 'Matching request not found',
  INVALID_HOURLY_RATE: 'Invalid hourly rate',
  INVALID_SUBJECT: 'Invalid subject',
  INVALID_LANGUAGE: 'Invalid language',
  UNAUTHORIZED: 'Unauthorized access',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  TUTOR_NOT_VERIFIED: 'Tutor is not verified',
} as const;

/**
 * Subject Categories
 */
export const SUBJECT_CATEGORIES = {
  MATHEMATICS: 'MATHEMATICS',
  SCIENCE: 'SCIENCE',
  LANGUAGES: 'LANGUAGES',
  PROGRAMMING: 'PROGRAMMING',
  BUSINESS: 'BUSINESS',
  ARTS: 'ARTS',
  MUSIC: 'MUSIC',
  OTHER: 'OTHER',
} as const;