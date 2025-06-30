import { User } from '../entities/user.entity';
import { UserBusinessRules } from '../rules/user-business-rules';
import { UserRole } from '../value-objects';
import { BaseSpecification } from './specification.interface';

/**
 * Specification for active users
 */
export class ActiveUserSpecification extends BaseSpecification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.isActive;
  }
}

/**
 * Specification for inactive users
 */
export class InactiveUserSpecification extends BaseSpecification<User> {
  isSatisfiedBy(user: User): boolean {
    return !user.isActive;
  }
}

/**
 * Specification for users eligible to become tutors
 */
export class EligibleTutorSpecification extends BaseSpecification<User> {
  constructor(private readonly customMinDays?: number) {
    super();
  }

  isSatisfiedBy(user: User): boolean {
    return UserBusinessRules.canBecomeTutor(user, this.customMinDays);
  }
}

/**
 * Specification for users with specific role
 */
export class UserRoleSpecification extends BaseSpecification<User> {
  constructor(private readonly role: UserRole) {
    super();
  }

  isSatisfiedBy(user: User): boolean {
    return user.role.equals(this.role);
  }
}

/**
 * Specification for student users
 */
export class StudentUserSpecification extends BaseSpecification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.role.isStudent();
  }
}

/**
 * Specification for tutor users
 */
export class TutorUserSpecification extends BaseSpecification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.role.isTutor();
  }
}

/**
 * Specification for admin users
 */
export class AdminUserSpecification extends BaseSpecification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.role.isAdmin();
  }
}

/**
 * Specification for users with complete profiles
 */
export class CompleteProfileSpecification extends BaseSpecification<User> {
  isSatisfiedBy(user: User): boolean {
    return UserBusinessRules.isProfileComplete(user);
  }
}

/**
 * Specification for users eligible for premium access
 */
export class PremiumEligibleSpecification extends BaseSpecification<User> {
  constructor(private readonly reputationScore: number) {
    super();
  }

  isSatisfiedBy(user: User): boolean {
    return UserBusinessRules.hasPremiumAccess(user, this.reputationScore);
  }
}

/**
 * Specification for users created within specified days
 */
export class RecentlyRegisteredSpecification extends BaseSpecification<User> {
  constructor(private readonly days: number) {
    super();
  }

  isSatisfiedBy(user: User): boolean {
    const accountAge = UserBusinessRules.getAccountAge(user);
    return accountAge <= this.days;
  }
}

/**
 * Specification for users registered longer than specified days
 */
export class LongTimeUserSpecification extends BaseSpecification<User> {
  constructor(private readonly days: number) {
    super();
  }

  isSatisfiedBy(user: User): boolean {
    const accountAge = UserBusinessRules.getAccountAge(user);
    return accountAge > this.days;
  }
}

/**
 * Specification for users with email domain matching pattern
 */
export class EmailDomainSpecification extends BaseSpecification<User> {
  constructor(private readonly domain: string) {
    super();
  }

  isSatisfiedBy(user: User): boolean {
    return user.email.value.toLowerCase().endsWith(`@${this.domain.toLowerCase()}`);
  }
}

/**
 * Specification for users from educational institutions
 */
export class EducationalUserSpecification extends BaseSpecification<User> {
  private readonly educationalDomains = [
    'university.edu',
    'college.edu',
    'school.edu',
    'teacher.org',
    'educator.com',
    'academic.org'
  ];

  isSatisfiedBy(user: User): boolean {
    const userDomain = user.email.value.split('@')[1]?.toLowerCase();
    return this.educationalDomains.includes(userDomain);
  }
}
