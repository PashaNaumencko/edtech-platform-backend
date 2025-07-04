import { Injectable, Logger } from "@nestjs/common";
import { User, UserRoleType, UserStatus } from "../entities/user.entity";
import {
  BusinessRuleViolationError,
  UnauthorizedRoleTransitionError,
  UserRequirementsNotMetError,
} from "../errors/user.errors";

/**
 * Simplified User Domain Service
 *
 * Provides business logic for user operations.
 * Focuses on essential functionality for Day 13.
 */
@Injectable()
export class UserDomainService {
  private readonly logger = new Logger(UserDomainService.name);

  // Business rule constants
  private static readonly MIN_AGE_FOR_TUTOR = 18;
  private static readonly MIN_REGISTRATION_DAYS_FOR_TUTOR = 7;
  private static readonly MIN_REPUTATION_FOR_PREMIUM = 75;
  private static readonly MIN_SESSIONS_FOR_SENIOR_TUTOR = 50;
  private static readonly MAX_CANCELLATION_RATE = 0.15;
  private static readonly EMAIL_CHANGE_COOLDOWN_DAYS = 30;

  /**
   * Determines if a user can become a tutor
   * Simplified version for Day 13
   */
  canBecomeTutor(user: User): boolean {
    // Must be active
    if (!user.isActive()) {
      this.logger.debug(`User ${user.id} is not active`);
      return false;
    }

    // Must be student (not already tutor/admin)
    if (!user.isStudent()) {
      this.logger.debug(`User ${user.id} is not a student`);
      return false;
    }

    // Check account age requirement
    const accountAge = this.calculateAccountAge(user);
    if (accountAge < UserDomainService.MIN_REGISTRATION_DAYS_FOR_TUTOR) {
      this.logger.debug(
        `User ${user.id} account age ${accountAge} days is below minimum ${UserDomainService.MIN_REGISTRATION_DAYS_FOR_TUTOR}`
      );
      return false;
    }

    // Check bio requirement
    if (!user.bio || user.bio.length < 50) {
      this.logger.debug(`User ${user.id} bio is insufficient for tutoring`);
      return false;
    }

    // Check skills requirement
    if (user.skills.length < 3) {
      this.logger.debug(`User ${user.id} has only ${user.skills.length} skills (minimum 3)`);
      return false;
    }

    return true;
  }

  /**
   * Calculates account age in days
   */
  private calculateAccountAge(user: User): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - user.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Validates tutor promotion with detailed error reporting
   */
  validateTutorPromotionRequirements(user: User): void {
    this.logger.debug(`Validating tutor promotion requirements for user ${user.id}`);

    if (!this.canBecomeTutor(user)) {
      const reasons: string[] = [];

      if (!user.isActive()) {
        reasons.push("must be active user");
      }

      if (user.isTutor() || user.isAdmin()) {
        throw new BusinessRuleViolationError(
          "RoleEscalationPrevention",
          "User already has elevated role"
        );
      }

      const accountAge = this.calculateAccountAge(user);
      if (accountAge < UserDomainService.MIN_REGISTRATION_DAYS_FOR_TUTOR) {
        reasons.push(
          `minimum ${UserDomainService.MIN_REGISTRATION_DAYS_FOR_TUTOR} days registration (current: ${accountAge} days)`
        );
      }

      if (!user.bio || user.bio.length < 50) {
        reasons.push("bio with at least 50 characters");
      }

      if (user.skills.length < 3) {
        reasons.push("at least 3 skills");
      }

      throw new UserRequirementsNotMetError("tutor promotion", reasons);
    }

    this.logger.debug("Tutor promotion requirements validated successfully");
  }

  /**
   * Validates role transitions
   */
  validateRoleTransition(
    from: UserRoleType,
    to: UserRoleType,
    user: User,
    requestedBy: User
  ): void {
    this.logger.debug(`Validating role transition from ${from} to ${to} for user ${user.id}`);

    if (!this.canTransitionRole(from, to)) {
      this.logger.warn(`Role transition denied: ${from} -> ${to} for user ${user.id}`);
      throw new UnauthorizedRoleTransitionError(from, to, "Role transition not allowed");
    }

    // Additional authorization checks
    if (to === UserRoleType.TUTOR && !requestedBy.isAdmin()) {
      this.logger.warn(`Unauthorized tutor promotion attempt by user ${requestedBy.id}`);
      throw new UnauthorizedRoleTransitionError(from, to, "Only admins can promote users to tutor");
    }

    // Validate requesting user is active
    if (!requestedBy.isActive()) {
      this.logger.warn(`Inactive user ${requestedBy.id} attempted role transition`);
      throw new BusinessRuleViolationError(
        "ActiveUserRequired",
        "Inactive users cannot perform role transitions"
      );
    }

    this.logger.log(`Role transition approved: ${from} -> ${to} for user ${user.id}`);
  }

  /**
   * Checks if role transition is allowed
   */
  private canTransitionRole(from: UserRoleType, to: UserRoleType): boolean {
    // user parameter reserved for future validation logic
    if (from === to) {
      return false;
    }

    // Prevent demoting admins/superadmins
    if (from === UserRoleType.ADMIN || from === UserRoleType.SUPERADMIN) {
      return false;
    }

    return true;
  }

  /**
   * Validates email change
   */
  validateEmailChange(user: User, newEmail: string): boolean {
    if (user.email === newEmail) {
      return false;
    }

    // Add more validation as needed
    return true;
  }

  /**
   * Checks if user has premium access
   */
  hasPremiumAccess(user: User, reputationScore: number): boolean {
    if (user.isAdmin()) {
      return true;
    }

    if (user.isTutor() && reputationScore >= UserDomainService.MIN_REPUTATION_FOR_PREMIUM) {
      return true;
    }

    return false;
  }

  /**
   * Calculates reputation score
   */
  calculateReputationScore(user: User): number {
    this.logger.debug(`Calculating reputation score for user ${user.id}`);

    let score = 0;

    // Base score for active users
    if (user.isActive()) {
      score += 10;
    }

    // Role-based score
    if (user.isTutor()) {
      score += 20;
    } else if (user.isAdmin()) {
      score += 30;
    }

    // factors parameter reserved for future reputation calculation logic
    return Math.min(score, 100);
  }

  /**
   * Generates user metrics
   */
  generateUserMetrics(user: User, reputationFactors?: any): any {
    this.logger.debug(`Generating comprehensive metrics for user ${user.id}`);

    const accountAge = this.calculateAccountAge(user);
    const isEligibleForTutor = this.canBecomeTutor(user);
    const profileCompleteness = this.calculateProfileCompleteness(user);

    let reputationScore: number | undefined;
    let isEligibleForPremium = false;

    if (reputationFactors) {
      reputationScore = this.calculateReputationScore(user);
      isEligibleForPremium = this.hasPremiumAccess(user, reputationScore);
    } else if (user.isAdmin()) {
      isEligibleForPremium = true;
    }

    // Determine user tier
    let userTier = "basic";
    if (user.isAdmin()) {
      userTier = "admin";
    } else if (user.isTutor() && reputationFactors) {
      userTier = this.getTutorTier(
        Array.isArray(reputationFactors.completedSessions)
          ? reputationFactors.completedSessions.length
          : 0,
        reputationScore || 0
      );
    }

    return {
      userId: user.id,
      accountAge,
      isEligibleForTutor,
      profileCompleteness,
      reputationScore,
      isEligibleForPremium,
      userTier,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Calculates profile completeness percentage
   */
  private calculateProfileCompleteness(user: User): number {
    let completeness = 0;
    if (user.firstName) completeness += 20;
    if (user.lastName) completeness += 20;
    if (user.email) completeness += 20;
    if (user.bio) completeness += 20;
    if (user.skills && user.skills.length > 0) completeness += 20;
    return completeness;
  }

  /**
   * Gets tutor tier based on sessions and reputation
   */
  private getTutorTier(completedSessions: number, reputationScore: number): string {
    if (
      completedSessions >= UserDomainService.MIN_SESSIONS_FOR_SENIOR_TUTOR &&
      reputationScore >= 80
    ) {
      return "senior";
    } else if (completedSessions >= 10 && reputationScore >= 60) {
      return "intermediate";
    } else {
      return "beginner";
    }
  }

  /**
   * Creates an admin user (system operation)
   */
  createAdminUser(userData: { email: string; firstName: string; lastName: string }): User {
    this.logger.warn("Creating admin user - this is a system operation");

    const adminUser = User.create({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: UserRoleType.ADMIN,
      status: UserStatus.ACTIVE, // Admins start active
    });

    this.logger.warn(`Admin user created: ${adminUser.id} - ${adminUser.email}`);
    return adminUser;
  }
}
