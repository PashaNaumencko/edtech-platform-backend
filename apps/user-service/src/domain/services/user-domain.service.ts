import { Injectable, Logger } from '@nestjs/common';
import { User } from '../entities/user.entity';
import {
  BusinessRuleViolationError,
  UnauthorizedRoleTransitionError,
  UserRequirementsNotMetError
} from '../errors/user.errors';
import { UserBusinessRules } from '../rules/user-business-rules';
import { UserRole, UserRoleType } from '../value-objects';

export interface ReputationFactors {
  reviews: Array<{ rating: number; verified: boolean }>;
  completedSessions: number;
  responseTime: number; // in hours
  cancellationRate: number; // percentage
}

@Injectable()
export class UserDomainService {
  private readonly logger = new Logger(UserDomainService.name);

  /**
   * Calculates comprehensive user reputation score
   * Complex orchestration of multiple factors and business rules
   */
  calculateUserReputationScore(user: User, factors: ReputationFactors): number {
    this.logger.debug(`Calculating reputation score for user ${user.id.value}`);

    let score = 0;

    // Base score for being active
    if (user.isActive) {
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
      const averageRating = factors.reviews.reduce((sum, review) => sum + review.rating, 0) / factors.reviews.length;
      const verifiedReviews = factors.reviews.filter(r => r.verified).length;
      const verificationBonus = (verifiedReviews / factors.reviews.length) * 5;

      score += (averageRating * 7) + verificationBonus; // Max 40 points (5*7 + 5)
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
    const accountAge = UserBusinessRules.getAccountAge(user);
    score += Math.min(accountAge * 0.1, 10);

    const finalScore = Math.max(0, Math.min(100, score)); // Clamp between 0-100
    this.logger.debug(`Calculated reputation score: ${finalScore}`);

    return finalScore;
  }

  /**
   * Validates and executes role transition with comprehensive logging
   * Orchestrates business rules with operational concerns
   */
  validateAndLogRoleTransition(from: UserRole, to: UserRole, user: User, requestedBy: User): void {
    this.logger.debug(`Validating role transition from ${from.value} to ${to.value} for user ${user.id.value} requested by ${requestedBy.id.value}`);

    // Use business rules for validation
    if (!UserBusinessRules.canTransitionRole(from, to, user)) {
      this.logger.warn(`Role transition denied: ${from.value} -> ${to.value} for user ${user.id.value}`);
      throw new UnauthorizedRoleTransitionError(
        from.value,
        to.value,
        'Business rules validation failed'
      );
    }

    // Additional authorization checks
    if (to.isTutor() && !requestedBy.role.canManageUsers()) {
      this.logger.warn(`Unauthorized tutor promotion attempt by user ${requestedBy.id.value}`);
      throw new UnauthorizedRoleTransitionError(
        from.value,
        to.value,
        'Only administrators can promote users to tutor role'
      );
    }

    if (!requestedBy.isActive) {
      this.logger.warn(`Inactive user ${requestedBy.id.value} attempted role transition`);
      throw new BusinessRuleViolationError(
        'ActiveUserRequired',
        'Inactive users cannot perform role transitions'
      );
    }

    this.logger.log(`Role transition approved: ${from.value} -> ${to.value} for user ${user.id.value}`);
  }

  /**
   * Validates tutor promotion requirements with domain-specific errors
   */
  validateTutorPromotionRequirements(user: User, customMinDays?: number): void {
    this.logger.debug(`Validating tutor promotion requirements for user ${user.id.value}`);

    if (!user.isActive) {
      throw new UserRequirementsNotMetError('tutor promotion', ['must be active user']);
    }

    if (user.role.isTutor() || user.role.isAdmin()) {
      throw new BusinessRuleViolationError(
        'RoleEscalationPrevention',
        'User already has elevated role'
      );
    }

    const minDays = customMinDays ?? UserBusinessRules.MIN_REGISTRATION_DAYS_FOR_TUTOR;
    const accountAge = UserBusinessRules.getAccountAge(user);

    if (accountAge < minDays) {
      throw new UserRequirementsNotMetError('tutor promotion', [
        `minimum ${minDays} days registration (current: ${accountAge} days)`
      ]);
    }

    if (!UserBusinessRules.isProfileComplete(user)) {
      throw new UserRequirementsNotMetError('tutor promotion', ['complete profile']);
    }

    this.logger.debug('Tutor promotion requirements validated successfully');
  }

  /**
   * Determines optimal user role with intelligent suggestions
   * Combines business rules with contextual analysis
   */
  suggestOptimalUserRole(emailDomain: string, context?: {
    isEducator?: boolean;
    hasTeachingExperience?: boolean
  }): UserRole {
    this.logger.debug(`Determining optimal role for domain: ${emailDomain}`);

    // Educational institution domains typically get tutor role suggestion
    const educationalDomains = [
      'university.edu', 'college.edu', 'school.edu',
      'teacher.org', 'educator.com', 'academic.org'
    ];

    if (educationalDomains.includes(emailDomain.toLowerCase())) {
      this.logger.debug('Educational domain detected, suggesting tutor role');
      return UserRole.tutor();
    }

    // Context-based role assignment
    if (context?.isEducator || context?.hasTeachingExperience) {
      this.logger.debug('Teaching context detected, suggesting tutor role');
      return UserRole.tutor();
    }

    // Default to student
    this.logger.debug('No special context detected, defaulting to student role');
    return UserRole.student();
  }

  /**
   * Comprehensive user analytics and metrics
   * Orchestrates multiple business rules for complete user assessment
   */
  generateUserMetrics(user: User, reputationScore?: number): {
    accountAge: number;
    isEligibleForTutor: boolean;
    isEligibleForPremium: boolean;
    profileCompleteness: boolean;
    userTier: string;
  } {
    this.logger.debug(`Generating comprehensive metrics for user ${user.id.value}`);

    const accountAge = UserBusinessRules.getAccountAge(user);
    const isEligibleForTutor = UserBusinessRules.canBecomeTutor(user);
    const profileCompleteness = UserBusinessRules.isProfileComplete(user);
    const isEligibleForPremium = reputationScore ? UserBusinessRules.hasPremiumAccess(user, reputationScore) : false;

    // Determine user tier based on multiple factors
    let userTier = 'basic';
    if (user.role.isAdmin()) {
      userTier = 'admin';
    } else if (user.role.isTutor()) {
      userTier = reputationScore ? UserBusinessRules.getTutorTier(0, reputationScore, 0) : 'junior';
    } else if (isEligibleForPremium) {
      userTier = 'premium';
    }

    return {
      accountAge,
      isEligibleForTutor,
      isEligibleForPremium,
      profileCompleteness,
      userTier,
    };
  }

  /**
   * Creates an admin user - Superadmin-only system operation
   * This method bypasses normal business rules for system-level operations
   */
  createAdminUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
  }): User {
    this.logger.warn('Creating admin user via superadmin operation');

    // This is a system-level operation that bypasses normal validation
    const adminUser = User.create({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: UserRoleType.ADMIN,
    });

    this.logger.warn(`Admin user created: ${adminUser.id.value} - ${adminUser.email.value}`);
    return adminUser;
  }
}
