import { User } from '../entities/user.entity';
import { Email, UserRole } from '../value-objects';

/**
 * Centralized business rules for the User domain
 * Single source of truth for all business policies and validations
 */
export class UserBusinessRules {
  // Age and time-based constants
  static readonly MIN_AGE_FOR_TUTOR = 18;
  static readonly MIN_REGISTRATION_DAYS_FOR_TUTOR = 7;

  // System limits
  static readonly MAX_LOGIN_ATTEMPTS = 3;
  static readonly ACCOUNT_LOCKOUT_DURATION_MINUTES = 30;
  static readonly EMAIL_CHANGE_COOLDOWN_DAYS = 30;

  // Reputation and quality thresholds
  static readonly MIN_REPUTATION_FOR_PREMIUM = 75;
  static readonly MIN_SESSIONS_FOR_SENIOR_TUTOR = 50;
  static readonly MAX_CANCELLATION_RATE = 0.15; // 15%

  /**
   * Determines if a user can become a tutor
   * Single source of truth for tutor eligibility
   */
  static canBecomeTutor(user: User, customMinDays?: number): boolean {
    // Must be active student
    if (!user.isActive || !user.role.isStudent()) {
      return false;
    }

    // Check registration time (allows custom requirements)
    const minDays = customMinDays ?? this.MIN_REGISTRATION_DAYS_FOR_TUTOR;
    const daysSinceRegistration = this.calculateDaysSince(user.createdAt);

    if (daysSinceRegistration < minDays) {
      return false;
    }

    return true;
  }

  /**
   * Validates if a role transition is business-rule compliant
   * Single source of truth for role transition logic
   */
  static canTransitionRole(fromRole: UserRole, toRole: UserRole, user: User): boolean {
    // Cannot transition to same role
    if (fromRole.equals(toRole)) {
      return false;
    }

    // Admin role changes are superadmin-only operations
    if (toRole.isAdmin() || fromRole.isAdmin()) {
      return false; // Must use superadmin system operations
    }

    // Must be active to change roles
    if (!user.isActive) {
      return false;
    }

    // Student -> Tutor: Check eligibility
    if (fromRole.isStudent() && toRole.isTutor()) {
      return this.canBecomeTutor(user);
    }

    return true;
  }

  /**
   * Determines if a user can change their email
   * Single source of truth for email change rules
   */
  static canChangeEmail(user: User, newEmail: Email, lastEmailChange?: Date): boolean {
    // Must be active
    if (!user.isActive) {
      return false;
    }

    // Cannot change to the same email
    if (user.email.equals(newEmail)) {
      return false;
    }

    // Check cooldown period
    if (lastEmailChange) {
      const daysSinceLastChange = this.calculateDaysSince(lastEmailChange);
      if (daysSinceLastChange < this.EMAIL_CHANGE_COOLDOWN_DAYS) {
        return false;
      }
    }

    return true;
  }

  /**
   * Determines if an account should be locked due to failed attempts
   */
  static shouldLockAccount(user: User, failedAttempts: number): boolean {
    if (!user.isActive) {
      return true; // Already inactive
    }

    return failedAttempts >= this.MAX_LOGIN_ATTEMPTS;
  }

  /**
   * Determines if a user has premium access based on reputation
   */
  static hasPremiumAccess(user: User, reputationScore: number): boolean {
    // Admins always have premium access
    if (user.role.isAdmin()) {
      return true;
    }

    // High reputation users get premium access
    if (reputationScore >= this.MIN_REPUTATION_FOR_PREMIUM) {
      return true;
    }

    return false;
  }

  /**
   * Determines tutor tier based on experience and performance
   */
  static getTutorTier(
    completedSessions: number,
    reputationScore: number,
    cancellationRate: number
  ): 'junior' | 'senior' | 'expert' {
    if (cancellationRate > this.MAX_CANCELLATION_RATE) {
      return 'junior'; // High cancellation rate = junior tier
    }

    if (completedSessions >= this.MIN_SESSIONS_FOR_SENIOR_TUTOR && reputationScore >= 80) {
      return reputationScore >= 90 ? 'expert' : 'senior';
    }

    return 'junior';
  }

  /**
   * Calculates user account age in days
   */
  static getAccountAge(user: User): number {
    return this.calculateDaysSince(user.createdAt);
  }

  /**
   * Checks if user profile meets basic completeness requirements
   */
  static isProfileComplete(user: User): boolean {
    // Basic checks - could be enhanced with more fields
    return !!(user.isActive && user.email.value && user.name.firstName && user.name.lastName);
  }

  // Helper method - single implementation
  private static calculateDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}
