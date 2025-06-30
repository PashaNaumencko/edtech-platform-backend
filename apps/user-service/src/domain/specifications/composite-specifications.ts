import { User } from '../entities/user.entity';
import { BaseSpecification } from './specification.interface';
import {
    ActiveUserSpecification,
    CompleteProfileSpecification,
    EducationalUserSpecification,
    EligibleTutorSpecification,
    EmailDomainSpecification,
    LongTimeUserSpecification,
    PremiumEligibleSpecification,
    RecentlyRegisteredSpecification,
    StudentUserSpecification,
    TutorUserSpecification
} from './user.specifications';

/**
 * Composite specifications for common business scenarios
 */
export class UserCompositeSpecifications {

  /**
   * Active students eligible to become tutors
   */
  static activeStudentEligibleForTutor(customMinDays?: number): BaseSpecification<User> {
    return new ActiveUserSpecification()
      .and(new StudentUserSpecification())
      .and(new EligibleTutorSpecification(customMinDays));
  }

  /**
   * Active tutors with complete profiles
   */
  static activeTutorWithCompleteProfile(): BaseSpecification<User> {
    return new ActiveUserSpecification()
      .and(new TutorUserSpecification())
      .and(new CompleteProfileSpecification());
  }

  /**
   * Premium eligible active users (students or tutors)
   */
  static premiumEligibleActiveUsers(reputationScore: number): BaseSpecification<User> {
    return new ActiveUserSpecification()
      .and(new StudentUserSpecification().or(new TutorUserSpecification()))
      .and(new PremiumEligibleSpecification(reputationScore));
  }

  /**
   * New users from educational institutions
   */
  static newEducationalUsers(maxDays: number = 30): BaseSpecification<User> {
    return new RecentlyRegisteredSpecification(maxDays)
      .and(new EducationalUserSpecification())
      .and(new ActiveUserSpecification());
  }

  /**
   * Experienced users ready for advanced features
   */
  static experiencedUsers(minDays: number = 90): BaseSpecification<User> {
    return new LongTimeUserSpecification(minDays)
      .and(new ActiveUserSpecification())
      .and(new CompleteProfileSpecification());
  }

  /**
   * High-value users (tutors or premium eligible)
   */
  static highValueUsers(reputationScore: number): BaseSpecification<User> {
    return new TutorUserSpecification()
      .or(new PremiumEligibleSpecification(reputationScore))
      .and(new ActiveUserSpecification());
  }

  /**
   * Users from specific domain who could be tutors
   */
  static domainUsersEligibleForTutor(domain: string, customMinDays?: number): BaseSpecification<User> {
    return new EmailDomainSpecification(domain)
      .and(new ActiveUserSpecification())
      .and(new EligibleTutorSpecification(customMinDays));
  }

  /**
   * Potential tutor candidates (active students with some experience)
   */
  static potentialTutorCandidates(minDays: number = 30): BaseSpecification<User> {
    return new ActiveUserSpecification()
      .and(new StudentUserSpecification())
      .and(new LongTimeUserSpecification(minDays))
      .and(new CompleteProfileSpecification());
  }

  /**
   * Users requiring profile completion
   */
  static usersNeedingProfileCompletion(): BaseSpecification<User> {
    return new ActiveUserSpecification()
      .and(new CompleteProfileSpecification().not());
  }

  /**
   * Quality control: Active users ready for promotion consideration
   */
  static promotionCandidates(minDays: number = 60): BaseSpecification<User> {
    return new ActiveUserSpecification()
      .and(new StudentUserSpecification())
      .and(new LongTimeUserSpecification(minDays))
      .and(new CompleteProfileSpecification())
      .and(new EligibleTutorSpecification());
  }
}
