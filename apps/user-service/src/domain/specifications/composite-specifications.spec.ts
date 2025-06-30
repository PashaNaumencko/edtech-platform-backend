import { User } from '../entities/user.entity';
import { UserBusinessRules } from '../rules/user-business-rules';
import { UserRole } from '../value-objects';
import { UserCompositeSpecifications } from './composite-specifications';

describe('UserCompositeSpecifications', () => {
  let activeStudent: User;
  let activeTutor: User;
  let inactiveStudent: User;
  let educationalUser: User;
  let newUser: User;
  let experiencedUser: User;
  let adminUser: User;

  beforeEach(() => {
    activeStudent = User.create({
      email: 'student@example.com',
      firstName: 'Active',
      lastName: 'Student',
      role: UserRole.student(),
    });
    activeStudent.activate();
    // 30 days old
    activeStudent['_createdAt'] = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    activeTutor = User.create({
      email: 'tutor@example.com',
      firstName: 'Active',
      lastName: 'Tutor',
      role: UserRole.tutor(),
    });
    activeTutor.activate();
    // 60 days old
    activeTutor['_createdAt'] = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    inactiveStudent = User.create({
      email: 'inactive@example.com',
      firstName: 'Inactive',
      lastName: 'Student',
      role: UserRole.student(),
    });
    inactiveStudent.deactivate();

    educationalUser = User.create({
      email: 'prof@university.edu',
      firstName: 'Prof',
      lastName: 'Academic',
      role: UserRole.student(),
    });
    // 20 days old
    educationalUser['_createdAt'] = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

    newUser = User.create({
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      role: UserRole.student(),
    });
    // 5 days old
    newUser['_createdAt'] = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    experiencedUser = User.create({
      email: 'experienced@example.com',
      firstName: 'Experienced',
      lastName: 'User',
      role: UserRole.student(),
    });
    experiencedUser.activate();
    // 120 days old
    experiencedUser['_createdAt'] = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);

    adminUser = User.create({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.student(),
    });
    adminUser.activate();
  });

  describe('activeStudentEligibleForTutor', () => {
    it('should return true for active students with complete profiles', () => {
      // Mock business rules for eligible student
      jest.spyOn(UserBusinessRules, 'canBecomeTutor')
        .mockReturnValue(true);

      const spec = UserCompositeSpecifications.activeStudentEligibleForTutor();
      expect(spec.isSatisfiedBy(activeStudent)).toBe(true);
    });

    it('should return false for tutors', () => {
      const spec = UserCompositeSpecifications.activeStudentEligibleForTutor();
      expect(spec.isSatisfiedBy(activeTutor)).toBe(false);
    });

    it('should return false for inactive students', () => {
      const spec = UserCompositeSpecifications.activeStudentEligibleForTutor();
      expect(spec.isSatisfiedBy(inactiveStudent)).toBe(false);
    });
  });

  describe('activeTutorWithCompleteProfile', () => {
    it('should return true for active tutors with complete profiles', () => {
      // Mock profile completion
      jest.spyOn(UserBusinessRules, 'isProfileComplete')
        .mockReturnValue(true);

      const spec = UserCompositeSpecifications.activeTutorWithCompleteProfile();
      expect(spec.isSatisfiedBy(activeTutor)).toBe(true);
    });

    it('should return false for students', () => {
      const spec = UserCompositeSpecifications.activeTutorWithCompleteProfile();
      expect(spec.isSatisfiedBy(activeStudent)).toBe(false);
    });
  });

  describe('premiumEligibleActiveUsers', () => {
    it('should return true for active premium users', () => {
      // Mock business rules for premium access
      jest.spyOn(UserBusinessRules, 'hasPremiumAccess')
        .mockReturnValue(true);

      const spec = UserCompositeSpecifications.premiumEligibleActiveUsers(80);
      expect(spec.isSatisfiedBy(experiencedUser)).toBe(true);
    });

    it('should return false for inactive users', () => {
      const spec = UserCompositeSpecifications.premiumEligibleActiveUsers(80);
      expect(spec.isSatisfiedBy(inactiveStudent)).toBe(false);
    });

    it('should return false for non-premium users', () => {
      // Mock business rules for no premium access
      jest.spyOn(UserBusinessRules, 'hasPremiumAccess')
        .mockReturnValue(false);

      const spec = UserCompositeSpecifications.premiumEligibleActiveUsers(80);
      expect(spec.isSatisfiedBy(activeStudent)).toBe(false);
    });
  });

  describe('experiencedUsers', () => {
    it('should return true for experienced active users with complete profiles', () => {
      // Mock profile completion and account age
      jest.spyOn(UserBusinessRules, 'isProfileComplete')
        .mockReturnValue(true);
      jest.spyOn(UserBusinessRules, 'getAccountAge')
        .mockReturnValue(100);

      const spec = UserCompositeSpecifications.experiencedUsers(90);
      expect(spec.isSatisfiedBy(experiencedUser)).toBe(true);
    });

    it('should return false for new users', () => {
      const spec = UserCompositeSpecifications.experiencedUsers(90);
      expect(spec.isSatisfiedBy(newUser)).toBe(false);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
