import { Injectable, Logger } from "@nestjs/common";
import { User, UserStatus } from "../entities/user.entity";
import {
  BusinessRuleViolationError,
  UnauthorizedRoleTransitionError,
  UserRequirementsNotMetError,
} from "../errors/user.errors";
import { Email, UserRole } from "../value-objects";

export interface ReputationFactors {
  reviews: Array<{ rating: number; verified: boolean }>;
  completedSessions: number;
  responseTime: number; // in hours
  cancellationRate: number; // percentage
}

export interface UserMetrics {
  accountAge: number;
  isEligibleForTutor: boolean;
  isEligibleForPremium: boolean;
  profileCompleteness: number;
  userTier: string;
  reputationScore?: number;
}

/**
 * Consolidated User Domain Service
 *
 * Single source of truth for all user domain logic including:
 * - Business rule validation
 * - Complex calculations
 * - Cross-entity operations
 * - Domain-specific workflows
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
   * Consolidates all tutoring eligibility logic
   */
  canBecomeTutor(user: User): boolean {
    // Must be active
    if (!user.isActive()) {
      this.logger.debug(`User ${user.id.value} is not active`);
      return false;
    }

    // Must be student (not already tutor/admin)
    if (!user.isStudent()) {
      this.logger.debug(`User ${user.id.value} is not a student`);
      return false;
    }

    // Check account age requirement
    const accountAge = this.calculateAccountAge(user);
    if (accountAge < UserDomainService.MIN_REGISTRATION_DAYS_FOR_TUTOR) {
      this.logger.debug(
        `User ${user.id.value} account age ${accountAge} days is below minimum ${UserDomainService.MIN_REGISTRATION_DAYS_FOR_TUTOR}`,
      );
      return false;
    }

    // Check age requirement if available
    const userAge = user.profile.age;
    if (userAge && userAge < UserDomainService.MIN_AGE_FOR_TUTOR) {
      this.logger.debug(
        `User ${user.id.value} age ${userAge} is below minimum ${UserDomainService.MIN_AGE_FOR_TUTOR}`,
      );
      return false;
    }

    // Check profile completeness (minimum 70%, bio, skills, education/achievements)
    const completeness = user.profile.calculateCompleteness();
    if (completeness < 70) {
      this.logger.debug(`User ${user.id.value} profile completeness ${completeness}% is below 70%`);
      return false;
    }

    if (!user.profile.bio || user.profile.bio.length < 50) {
      this.logger.debug(`User ${user.id.value} bio is insufficient for tutoring`);
      return false;
    }

    if (user.profile.skills.length < 3) {
      this.logger.debug(
        `User ${user.id.value} has only ${user.profile.skills.length} skills (minimum 3)`,
      );
      return false;
    }

    if (user.profile.education.length === 0 && user.profile.achievements.length === 0) {
      this.logger.debug(`User ${user.id.value} lacks education or achievements`);
      return false;
    }

    return true;
  }

  /**
   * Validates if a role transition is allowed
   */
  canTransitionRole(fromRole: UserRole, toRole: UserRole, user: User): boolean {
    // Cannot transition to same role
    if (fromRole.equals(toRole)) {
      return false;
    }

    // Admin role changes are superadmin-only operations
    if (toRole.isAdmin() || fromRole.isAdmin()) {
      return false;
    }

    // Must be active to change roles
    if (!user.isActive()) {
      return false;
    }

    // Student -> Tutor: Check eligibility
    if (fromRole.isStudent() && toRole.isTutor()) {
      return this.canBecomeTutor(user);
    }

    return true;
  }

  /**
   * Validates and executes role transition with comprehensive validation
   */
  validateRoleTransition(from: UserRole, to: UserRole, user: User, requestedBy: User): void {
    this.logger.debug(
      `Validating role transition from ${from.value} to ${to.value} for user ${user.id.value}`,
    );

    if (!this.canTransitionRole(from, to, user)) {
      this.logger.warn(
        `Role transition denied: ${from.value} -> ${to.value} for user ${user.id.value}`,
      );
      throw new UnauthorizedRoleTransitionError(
        from.value,
        to.value,
        "Business rules validation failed",
      );
    }

    // Additional authorization checks
    if (to.isTutor() && !requestedBy.role.canManageUsers()) {
      this.logger.warn(`Unauthorized tutor promotion attempt by user ${requestedBy.id.value}`);
      throw new UnauthorizedRoleTransitionError(
        from.value,
        to.value,
        "Only administrators can promote users to tutor role",
      );
    }

    if (!requestedBy.isActive()) {
      this.logger.warn(`Inactive user ${requestedBy.id.value} attempted role transition`);
      throw new BusinessRuleViolationError(
        "ActiveUserRequired",
        "Inactive users cannot perform role transitions",
      );
    }

    this.logger.log(
      `Role transition approved: ${from.value} -> ${to.value} for user ${user.id.value}`,
    );
  }

  /**
   * Validates tutor promotion with detailed error reporting
   */
  validateTutorPromotionRequirements(user: User): void {
    this.logger.debug(`Validating tutor promotion requirements for user ${user.id.value}`);

    if (!this.canBecomeTutor(user)) {
      const reasons: string[] = [];

      if (!user.isActive()) {
        reasons.push("must be active user");
      }

      if (user.role.isTutor() || user.role.isAdmin()) {
        throw new BusinessRuleViolationError(
          "RoleEscalationPrevention",
          "User already has elevated role",
        );
      }

      const accountAge = this.calculateAccountAge(user);
      if (accountAge < UserDomainService.MIN_REGISTRATION_DAYS_FOR_TUTOR) {
        reasons.push(
          `minimum ${UserDomainService.MIN_REGISTRATION_DAYS_FOR_TUTOR} days registration (current: ${accountAge} days)`,
        );
      }

      const userAge = user.profile.age;
      if (userAge && userAge < UserDomainService.MIN_AGE_FOR_TUTOR) {
        reasons.push(`minimum age ${UserDomainService.MIN_AGE_FOR_TUTOR} (current: ${userAge})`);
      }

      const completeness = user.profile.calculateCompleteness();
      if (completeness < 70) {
        reasons.push(`profile completeness 70% (current: ${completeness}%)`);
      }

      if (!user.profile.bio || user.profile.bio.length < 50) {
        reasons.push("bio with at least 50 characters");
      }

      if (user.profile.skills.length < 3) {
        reasons.push("at least 3 skills");
      }

      if (user.profile.education.length === 0 && user.profile.achievements.length === 0) {
        reasons.push("education or achievements");
      }

      throw new UserRequirementsNotMetError("tutor promotion", reasons);
    }

    this.logger.debug("Tutor promotion requirements validated successfully");
  }

  /**
   * Determines if user can change email
   */
  canChangeEmail(user: User, newEmail: Email, lastEmailChange?: Date): boolean {
    if (!user.isActive()) {
      return false;
    }

    if (user.email.equals(newEmail)) {
      return false;
    }

    if (lastEmailChange) {
      const daysSinceLastChange = this.calculateDaysSince(lastEmailChange);
      if (daysSinceLastChange < UserDomainService.EMAIL_CHANGE_COOLDOWN_DAYS) {
        return false;
      }
    }

    return true;
  }

  /**
   * Determines if user has premium access
   */
  hasPremiumAccess(user: User, reputationScore: number): boolean {
    if (user.role.isAdmin()) {
      return true;
    }

    return reputationScore >= UserDomainService.MIN_REPUTATION_FOR_PREMIUM;
  }

  /**
   * Determines tutor tier based on performance
   */
  getTutorTier(
    completedSessions: number,
    reputationScore: number,
    cancellationRate: number,
  ): "junior" | "senior" | "expert" {
    if (cancellationRate > UserDomainService.MAX_CANCELLATION_RATE) {
      return "junior";
    }

    if (
      completedSessions >= UserDomainService.MIN_SESSIONS_FOR_SENIOR_TUTOR &&
      reputationScore >= 80
    ) {
      return reputationScore >= 90 ? "expert" : "senior";
    }

    return "junior";
  }

  /**
   * Calculates comprehensive user reputation score
   */
  calculateReputationScore(user: User, factors: ReputationFactors): number {
    this.logger.debug(`Calculating reputation score for user ${user.id.value}`);

    let score = 0;

    // Base score for being active
    if (user.isActive()) {
      score += 10;
    }

    // Role-based score
    if (user.role.isTutor()) {
      score += 20;
    } else if (user.role.isAdmin()) {
      score += 30;
    }

    // Review-based score (0-40 points)
    if (factors.reviews.length > 0) {
      const averageRating =
        factors.reviews.reduce((sum, review) => sum + review.rating, 0) / factors.reviews.length;
      const verifiedReviews = factors.reviews.filter((r) => r.verified).length;
      const verificationBonus = (verifiedReviews / factors.reviews.length) * 5;
      score += averageRating * 7 + verificationBonus;
    }

    // Completed sessions bonus (0-20 points)
    score += Math.min(factors.completedSessions * 0.5, 20);

    // Response time bonus (0-10 points)
    if (factors.responseTime <= 1) score += 10;
    else if (factors.responseTime <= 4) score += 7;
    else if (factors.responseTime <= 12) score += 4;

    // Cancellation rate penalty
    score -= factors.cancellationRate * 0.5;

    // Account age bonus
    const accountAge = this.calculateAccountAge(user);
    score += Math.min(accountAge * 0.1, 10);

    const finalScore = Math.max(0, Math.min(100, score));
    this.logger.debug(`Calculated reputation score: ${finalScore}`);

    return finalScore;
  }

  /**
   * Suggests optimal user role based on context
   */
  suggestOptimalUserRole(
    emailDomain: string,
    context?: {
      isEducator?: boolean;
      hasTeachingExperience?: boolean;
    },
  ): UserRole {
    this.logger.debug(`Determining optimal role for domain: ${emailDomain}`);

    const educationalDomains = [
      "university.edu",
      "college.edu",
      "school.edu",
      "teacher.org",
      "educator.com",
      "academic.org",
    ];

    if (educationalDomains.includes(emailDomain.toLowerCase())) {
      this.logger.debug("Educational domain detected, suggesting tutor role");
      return UserRole.tutor();
    }

    if (context?.isEducator || context?.hasTeachingExperience) {
      this.logger.debug("Teaching context detected, suggesting tutor role");
      return UserRole.tutor();
    }

    this.logger.debug("No special context detected, defaulting to student role");
    return UserRole.student();
  }

  /**
   * Generates comprehensive user metrics
   */
  generateUserMetrics(user: User, reputationFactors?: ReputationFactors): UserMetrics {
    this.logger.debug(`Generating comprehensive metrics for user ${user.id.value}`);

    const accountAge = this.calculateAccountAge(user);
    const isEligibleForTutor = this.canBecomeTutor(user);
    const profileCompleteness = user.profile.calculateCompleteness();

    let reputationScore: number | undefined;
    let isEligibleForPremium = false;

    if (reputationFactors) {
      reputationScore = this.calculateReputationScore(user, reputationFactors);
      isEligibleForPremium = this.hasPremiumAccess(user, reputationScore);
    } else if (user.role.isAdmin()) {
      isEligibleForPremium = true;
    }

    // Determine user tier
    let userTier = "basic";
    if (user.role.isAdmin()) {
      userTier = "admin";
    } else if (user.role.isTutor() && reputationFactors) {
      userTier = this.getTutorTier(
        reputationFactors.completedSessions,
        reputationScore!,
        reputationFactors.cancellationRate,
      );
    } else if (isEligibleForPremium) {
      userTier = "premium";
    }

    return {
      accountAge,
      isEligibleForTutor,
      isEligibleForPremium,
      profileCompleteness,
      userTier,
      reputationScore,
    };
  }

  /**
   * Creates an admin user - System-level operation
   */
  createAdminUser(userData: { email: string; firstName: string; lastName: string }): User {
    this.logger.warn("Creating admin user via system operation");

    const adminUser = User.create({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: UserRole.admin(),
      status: UserStatus.ACTIVE, // Admins start active
    });

    this.logger.warn(`Admin user created: ${adminUser.id.value} - ${adminUser.email.value}`);
    return adminUser;
  }

  /**
   * Calculates user account age in days
   */
  calculateAccountAge(user: User): number {
    return this.calculateDaysSince(user.createdAt);
  }

  /**
   * Helper method to calculate days since a date
   */
  private calculateDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}
