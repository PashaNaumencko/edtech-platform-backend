import { User } from '../entities/user.entity';
import { UserRoleType } from '../value-objects';
import { UserCompositeSpecifications } from './composite-specifications';

describe('UserCompositeSpecifications', () => {
  let activeStudent: User;
  let activeTutor: User;
  let inactiveStudent: User;
  let educationalUser: User;
  let newUser: User;
  let experiencedUser: User;

  beforeEach(() => {
    activeStudent = User.create({
      email: 'student@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRoleType.STUDENT,
    });
    // 30 days old
    activeStudent['_createdAt'] = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    activeTutor = User.create({
      email: 'tutor@example.com',
      firstName: 'Bob',
      lastName: 'Wilson',
      role: UserRoleType.TUTOR,
    });
    // 60 days old
    activeTutor['_createdAt'] = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    inactiveStudent = User.create({
      email: 'inactive@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRoleType.STUDENT,
    });
    inactiveStudent.deactivate();

    educationalUser = User.create({
      email: 'prof@university.edu',
      firstName: 'Prof',
      lastName: 'Academic',
      role: UserRoleType.STUDENT,
    });
    // 20 days old
    educationalUser['_createdAt'] = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

    newUser = User.create({
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      role: UserRoleType.STUDENT,
    });
    // 5 days old
    newUser['_createdAt'] = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    experiencedUser = User.create({
      email: 'experienced@example.com',
      firstName: 'Experienced',
      lastName: 'User',
      role: UserRoleType.STUDENT,
    });
    // 120 days old
    experiencedUser['_createdAt'] = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
  });

  describe('activeStudentEligibleForTutor', () => {
    it('should return true for eligible active students', () => {
      const spec = UserCompositeSpecifications.activeStudentEligibleForTutor();
      expect(spec.isSatisfiedBy(activeStudent)).toBe(true);
    });

    it('should return false for inactive students', () => {
      const spec = UserCompositeSpecifications.activeStudentEligibleForTutor();
      expect(spec.isSatisfiedBy(inactiveStudent)).toBe(false);
    });

    it('should return false for tutors', () => {
      const spec = UserCompositeSpecifications.activeStudentEligibleForTutor();
      expect(spec.isSatisfiedBy(activeTutor)).toBe(false);
    });

    it('should handle custom minimum days', () => {
      const spec = UserCompositeSpecifications.activeStudentEligibleForTutor(60);
      expect(spec.isSatisfiedBy(activeStudent)).toBe(false); // 30 days < 60 days
    });
  });

  describe('activeTutorWithCompleteProfile', () => {
    it('should return true for active tutors with complete profiles', () => {
      const spec = UserCompositeSpecifications.activeTutorWithCompleteProfile();
      expect(spec.isSatisfiedBy(activeTutor)).toBe(true);
    });

    it('should return false for students', () => {
      const spec = UserCompositeSpecifications.activeTutorWithCompleteProfile();
      expect(spec.isSatisfiedBy(activeStudent)).toBe(false);
    });
  });

  describe('premiumEligibleActiveUsers', () => {
    it('should return true for high reputation active students', () => {
      const spec = UserCompositeSpecifications.premiumEligibleActiveUsers(80);
      expect(spec.isSatisfiedBy(activeStudent)).toBe(true);
    });

    it('should return true for high reputation active tutors', () => {
      const spec = UserCompositeSpecifications.premiumEligibleActiveUsers(80);
      expect(spec.isSatisfiedBy(activeTutor)).toBe(true);
    });

    it('should return false for low reputation users', () => {
      const spec = UserCompositeSpecifications.premiumEligibleActiveUsers(50);
      expect(spec.isSatisfiedBy(activeStudent)).toBe(false);
    });
  });

  describe('newEducationalUsers', () => {
    it('should return true for new users from educational domains', () => {
      const spec = UserCompositeSpecifications.newEducationalUsers(30);
      expect(spec.isSatisfiedBy(educationalUser)).toBe(true);
    });

    it('should return false for non-educational users', () => {
      const spec = UserCompositeSpecifications.newEducationalUsers(30);
      expect(spec.isSatisfiedBy(newUser)).toBe(false);
    });

    it('should return false for old educational users', () => {
      const spec = UserCompositeSpecifications.newEducationalUsers(10);
      expect(spec.isSatisfiedBy(educationalUser)).toBe(false); // 20 days > 10 days
    });
  });

  describe('experiencedUsers', () => {
    it('should return true for long-time active users with complete profiles', () => {
      const spec = UserCompositeSpecifications.experiencedUsers(90);
      expect(spec.isSatisfiedBy(experiencedUser)).toBe(true);
    });

    it('should return false for new users', () => {
      const spec = UserCompositeSpecifications.experiencedUsers(90);
      expect(spec.isSatisfiedBy(newUser)).toBe(false);
    });

    it('should return false for inactive experienced users', () => {
      experiencedUser.deactivate();
      const spec = UserCompositeSpecifications.experiencedUsers(90);
      expect(spec.isSatisfiedBy(experiencedUser)).toBe(false);
    });
  });

  describe('highValueUsers', () => {
    it('should return true for active tutors', () => {
      const spec = UserCompositeSpecifications.highValueUsers(80);
      expect(spec.isSatisfiedBy(activeTutor)).toBe(true);
    });

    it('should return true for premium eligible active users', () => {
      const spec = UserCompositeSpecifications.highValueUsers(80);
      expect(spec.isSatisfiedBy(activeStudent)).toBe(true);
    });

    it('should return false for low value users', () => {
      const spec = UserCompositeSpecifications.highValueUsers(50);
      expect(spec.isSatisfiedBy(activeStudent)).toBe(false);
    });
  });

  describe('domainUsersEligibleForTutor', () => {
    it('should return true for eligible users from specific domain', () => {
      const spec = UserCompositeSpecifications.domainUsersEligibleForTutor('example.com');
      expect(spec.isSatisfiedBy(activeStudent)).toBe(true);
    });

    it('should return false for users from different domains', () => {
      const spec = UserCompositeSpecifications.domainUsersEligibleForTutor('different.com');
      expect(spec.isSatisfiedBy(activeStudent)).toBe(false);
    });
  });

  describe('potentialTutorCandidates', () => {
    it('should return true for experienced active students with complete profiles', () => {
      const spec = UserCompositeSpecifications.potentialTutorCandidates(30);
      expect(spec.isSatisfiedBy(experiencedUser)).toBe(true);
    });

    it('should return false for new users', () => {
      const spec = UserCompositeSpecifications.potentialTutorCandidates(30);
      expect(spec.isSatisfiedBy(newUser)).toBe(false);
    });

    it('should return false for tutors', () => {
      const spec = UserCompositeSpecifications.potentialTutorCandidates(30);
      expect(spec.isSatisfiedBy(activeTutor)).toBe(false);
    });
  });

  describe('usersNeedingProfileCompletion', () => {
    it('should return false for users with complete profiles', () => {
      const spec = UserCompositeSpecifications.usersNeedingProfileCompletion();
      expect(spec.isSatisfiedBy(activeStudent)).toBe(false);
    });

    it('should return false for inactive users', () => {
      const spec = UserCompositeSpecifications.usersNeedingProfileCompletion();
      expect(spec.isSatisfiedBy(inactiveStudent)).toBe(false);
    });
  });

  describe('promotionCandidates', () => {
    it('should return true for qualified experienced students', () => {
      const spec = UserCompositeSpecifications.promotionCandidates(60);
      expect(spec.isSatisfiedBy(experiencedUser)).toBe(true);
    });

    it('should return false for new users', () => {
      const spec = UserCompositeSpecifications.promotionCandidates(60);
      expect(spec.isSatisfiedBy(activeStudent)).toBe(false); // 30 days < 60 days
    });

    it('should return false for existing tutors', () => {
      const spec = UserCompositeSpecifications.promotionCandidates(60);
      expect(spec.isSatisfiedBy(activeTutor)).toBe(false);
    });
  });
});
