import { User } from '../entities/user.entity';
import { UserRole, UserRoleType } from '../value-objects';
import {
  ActiveUserSpecification,
  InactiveUserSpecification,
  EligibleTutorSpecification,
  UserRoleSpecification,
  StudentUserSpecification,
  TutorUserSpecification,
  AdminUserSpecification,
  CompleteProfileSpecification,
  PremiumEligibleSpecification,
  RecentlyRegisteredSpecification,
  LongTimeUserSpecification,
  EmailDomainSpecification,
  EducationalUserSpecification
} from './user.specifications';

describe('UserSpecifications', () => {
  let activeUser: User;
  let inactiveUser: User;
  let tutorUser: User;
  let adminUser: User;
  let educationalUser: User;

  beforeEach(() => {
    activeUser = User.create({
      email: 'student@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRoleType.STUDENT,
    });
    // Set creation date to 30 days ago
    activeUser['_createdAt'] = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    inactiveUser = User.create({
      email: 'inactive@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRoleType.STUDENT,
    });
    inactiveUser.deactivate();

    tutorUser = User.create({
      email: 'tutor@example.com',
      firstName: 'Bob',
      lastName: 'Wilson',
      role: UserRoleType.TUTOR,
    });

    adminUser = User.create({
      email: 'admin@example.com',
      firstName: 'Alice',
      lastName: 'Johnson',
      role: UserRoleType.ADMIN,
    });

    educationalUser = User.create({
      email: 'professor@university.edu',
      firstName: 'Prof',
      lastName: 'Academic',
      role: UserRoleType.STUDENT,
    });
  });

  describe('ActiveUserSpecification', () => {
    it('should return true for active users', () => {
      const spec = new ActiveUserSpecification();
      expect(spec.isSatisfiedBy(activeUser)).toBe(true);
      expect(spec.isSatisfiedBy(tutorUser)).toBe(true);
      expect(spec.isSatisfiedBy(adminUser)).toBe(true);
    });

    it('should return false for inactive users', () => {
      const spec = new ActiveUserSpecification();
      expect(spec.isSatisfiedBy(inactiveUser)).toBe(false);
    });
  });

  describe('InactiveUserSpecification', () => {
    it('should return true for inactive users', () => {
      const spec = new InactiveUserSpecification();
      expect(spec.isSatisfiedBy(inactiveUser)).toBe(true);
    });

    it('should return false for active users', () => {
      const spec = new InactiveUserSpecification();
      expect(spec.isSatisfiedBy(activeUser)).toBe(false);
    });
  });

  describe('EligibleTutorSpecification', () => {
    it('should return true for eligible student', () => {
      const spec = new EligibleTutorSpecification();
      expect(spec.isSatisfiedBy(activeUser)).toBe(true);
    });

    it('should return false for inactive user', () => {
      const spec = new EligibleTutorSpecification();
      expect(spec.isSatisfiedBy(inactiveUser)).toBe(false);
    });

    it('should return false for existing tutor', () => {
      const spec = new EligibleTutorSpecification();
      expect(spec.isSatisfiedBy(tutorUser)).toBe(false);
    });

    it('should handle custom minimum days', () => {
      const spec = new EligibleTutorSpecification(60);
      expect(spec.isSatisfiedBy(activeUser)).toBe(false); // 30 days < 60 days
    });
  });

  describe('UserRoleSpecification', () => {
    it('should return true for matching role', () => {
      const studentSpec = new UserRoleSpecification(UserRole.student());
      const tutorSpec = new UserRoleSpecification(UserRole.tutor());
      
      expect(studentSpec.isSatisfiedBy(activeUser)).toBe(true);
      expect(tutorSpec.isSatisfiedBy(tutorUser)).toBe(true);
    });

    it('should return false for non-matching role', () => {
      const adminSpec = new UserRoleSpecification(UserRole.admin());
      expect(adminSpec.isSatisfiedBy(activeUser)).toBe(false);
    });
  });

  describe('StudentUserSpecification', () => {
    it('should return true for student users', () => {
      const spec = new StudentUserSpecification();
      expect(spec.isSatisfiedBy(activeUser)).toBe(true);
    });

    it('should return false for non-student users', () => {
      const spec = new StudentUserSpecification();
      expect(spec.isSatisfiedBy(tutorUser)).toBe(false);
      expect(spec.isSatisfiedBy(adminUser)).toBe(false);
    });
  });

  describe('TutorUserSpecification', () => {
    it('should return true for tutor users', () => {
      const spec = new TutorUserSpecification();
      expect(spec.isSatisfiedBy(tutorUser)).toBe(true);
    });

    it('should return false for non-tutor users', () => {
      const spec = new TutorUserSpecification();
      expect(spec.isSatisfiedBy(activeUser)).toBe(false);
      expect(spec.isSatisfiedBy(adminUser)).toBe(false);
    });
  });

  describe('AdminUserSpecification', () => {
    it('should return true for admin users', () => {
      const spec = new AdminUserSpecification();
      expect(spec.isSatisfiedBy(adminUser)).toBe(true);
    });

    it('should return false for non-admin users', () => {
      const spec = new AdminUserSpecification();
      expect(spec.isSatisfiedBy(activeUser)).toBe(false);
      expect(spec.isSatisfiedBy(tutorUser)).toBe(false);
    });
  });

  describe('CompleteProfileSpecification', () => {
    it('should return true for users with complete profiles', () => {
      const spec = new CompleteProfileSpecification();
      expect(spec.isSatisfiedBy(activeUser)).toBe(true);
    });

    it('should return false for inactive users', () => {
      const spec = new CompleteProfileSpecification();
      expect(spec.isSatisfiedBy(inactiveUser)).toBe(false);
    });
  });

  describe('PremiumEligibleSpecification', () => {
    it('should return true for high reputation users', () => {
      const spec = new PremiumEligibleSpecification(80);
      expect(spec.isSatisfiedBy(activeUser)).toBe(true); // Based on UserBusinessRules
    });

    it('should return true for admin users regardless of score', () => {
      const spec = new PremiumEligibleSpecification(50);
      expect(spec.isSatisfiedBy(adminUser)).toBe(true);
    });

    it('should return false for low reputation users', () => {
      const spec = new PremiumEligibleSpecification(50);
      expect(spec.isSatisfiedBy(activeUser)).toBe(false);
    });
  });

  describe('RecentlyRegisteredSpecification', () => {
    it('should return true for recently registered users', () => {
      const spec = new RecentlyRegisteredSpecification(60);
      expect(spec.isSatisfiedBy(activeUser)).toBe(true); // 30 days <= 60 days
    });

    it('should return false for users registered longer ago', () => {
      const spec = new RecentlyRegisteredSpecification(15);
      expect(spec.isSatisfiedBy(activeUser)).toBe(false); // 30 days > 15 days
    });
  });

  describe('LongTimeUserSpecification', () => {
    it('should return true for long-time users', () => {
      const spec = new LongTimeUserSpecification(15);
      expect(spec.isSatisfiedBy(activeUser)).toBe(true); // 30 days > 15 days
    });

    it('should return false for new users', () => {
      const spec = new LongTimeUserSpecification(60);
      expect(spec.isSatisfiedBy(activeUser)).toBe(false); // 30 days <= 60 days
    });
  });

  describe('EmailDomainSpecification', () => {
    it('should return true for matching domain', () => {
      const spec = new EmailDomainSpecification('example.com');
      expect(spec.isSatisfiedBy(activeUser)).toBe(true);
    });

    it('should return false for non-matching domain', () => {
      const spec = new EmailDomainSpecification('different.com');
      expect(spec.isSatisfiedBy(activeUser)).toBe(false);
    });

    it('should be case insensitive', () => {
      const spec = new EmailDomainSpecification('EXAMPLE.COM');
      expect(spec.isSatisfiedBy(activeUser)).toBe(true);
    });
  });

  describe('EducationalUserSpecification', () => {
    it('should return true for educational domains', () => {
      const spec = new EducationalUserSpecification();
      expect(spec.isSatisfiedBy(educationalUser)).toBe(true);
    });

    it('should return false for non-educational domains', () => {
      const spec = new EducationalUserSpecification();
      expect(spec.isSatisfiedBy(activeUser)).toBe(false);
    });
  });

  describe('Specification Composition', () => {
    it('should support AND composition', () => {
      const activeStudentSpec = new ActiveUserSpecification()
        .and(new StudentUserSpecification());
      
      expect(activeStudentSpec.isSatisfiedBy(activeUser)).toBe(true);
      expect(activeStudentSpec.isSatisfiedBy(inactiveUser)).toBe(false);
      expect(activeStudentSpec.isSatisfiedBy(tutorUser)).toBe(false);
    });

    it('should support OR composition', () => {
      const tutorOrAdminSpec = new TutorUserSpecification()
        .or(new AdminUserSpecification());
      
      expect(tutorOrAdminSpec.isSatisfiedBy(tutorUser)).toBe(true);
      expect(tutorOrAdminSpec.isSatisfiedBy(adminUser)).toBe(true);
      expect(tutorOrAdminSpec.isSatisfiedBy(activeUser)).toBe(false);
    });

    it('should support NOT composition', () => {
      const notStudentSpec = new StudentUserSpecification().not();
      
      expect(notStudentSpec.isSatisfiedBy(tutorUser)).toBe(true);
      expect(notStudentSpec.isSatisfiedBy(adminUser)).toBe(true);
      expect(notStudentSpec.isSatisfiedBy(activeUser)).toBe(false);
    });

    it('should support complex composition', () => {
      const complexSpec = new ActiveUserSpecification()
        .and(new StudentUserSpecification().or(new TutorUserSpecification()))
        .and(new CompleteProfileSpecification());
      
      expect(complexSpec.isSatisfiedBy(activeUser)).toBe(true);
      expect(complexSpec.isSatisfiedBy(tutorUser)).toBe(true);
      expect(complexSpec.isSatisfiedBy(inactiveUser)).toBe(false);
      expect(complexSpec.isSatisfiedBy(adminUser)).toBe(false);
    });
  });
});
