import { User } from '../entities/user.entity';
import { Email, UserRole, UserRoleType } from '../value-objects';
import { UserBusinessRules } from './user-business-rules';

describe('UserBusinessRules', () => {
  let testUser: User;

  beforeEach(() => {
    testUser = User.create({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRoleType.STUDENT,
    });

    // Set creation date to 30 days ago for testing
    testUser['_createdAt'] = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  });

  describe('canBecomeTutor', () => {
    it('should allow eligible student to become tutor', () => {
      const result = UserBusinessRules.canBecomeTutor(testUser);
      expect(result).toBe(true);
    });

    it('should not allow inactive user to become tutor', () => {
      testUser.deactivate();
      const result = UserBusinessRules.canBecomeTutor(testUser);
      expect(result).toBe(false);
    });

    it('should not allow non-student to become tutor', () => {
      const tutorUser = User.create({
        email: 'tutor@example.com',
        firstName: 'Tutor',
        lastName: 'User',
        role: UserRoleType.TUTOR,
      });

      const result = UserBusinessRules.canBecomeTutor(tutorUser);
      expect(result).toBe(false);
    });

    it('should not allow new user to become tutor', () => {
      const newUser = User.create({
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        role: UserRoleType.STUDENT,
      });

      const result = UserBusinessRules.canBecomeTutor(newUser);
      expect(result).toBe(false);
    });

    it('should allow custom minimum days requirement', () => {
      const result = UserBusinessRules.canBecomeTutor(testUser, 60);
      expect(result).toBe(false); // 30 days < 60 days requirement
    });
  });

  describe('canTransitionRole', () => {
    it('should allow valid student to tutor transition', () => {
      const result = UserBusinessRules.canTransitionRole(
        UserRole.student(),
        UserRole.tutor(),
        testUser
      );
      expect(result).toBe(true);
    });

    it('should not allow transition to same role', () => {
      const result = UserBusinessRules.canTransitionRole(
        UserRole.student(),
        UserRole.student(),
        testUser
      );
      expect(result).toBe(false);
    });

    it('should not allow transition to admin role', () => {
      const result = UserBusinessRules.canTransitionRole(
        UserRole.student(),
        UserRole.admin(),
        testUser
      );
      expect(result).toBe(false);
    });

    it('should not allow admin role transitions', () => {
      const adminUser = User.create({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRoleType.ADMIN,
      });

      const result = UserBusinessRules.canTransitionRole(
        UserRole.admin(),
        UserRole.tutor(),
        adminUser
      );
      expect(result).toBe(false);
    });

    it('should not allow inactive user role transitions', () => {
      testUser.deactivate();
      const result = UserBusinessRules.canTransitionRole(
        UserRole.student(),
        UserRole.tutor(),
        testUser
      );
      expect(result).toBe(false);
    });
  });

  describe('canChangeEmail', () => {
    it('should allow email change for active user', () => {
      const newEmail = Email.create('newemail@example.com');
      const result = UserBusinessRules.canChangeEmail(testUser, newEmail);
      expect(result).toBe(true);
    });

    it('should not allow inactive user to change email', () => {
      testUser.deactivate();
      const newEmail = Email.create('newemail@example.com');
      const result = UserBusinessRules.canChangeEmail(testUser, newEmail);
      expect(result).toBe(false);
    });

    it('should not allow change to same email', () => {
      const sameEmail = Email.create('test@example.com');
      const result = UserBusinessRules.canChangeEmail(testUser, sameEmail);
      expect(result).toBe(false);
    });

    it('should enforce cooldown period', () => {
      const newEmail = Email.create('newemail@example.com');
      const recentChange = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const result = UserBusinessRules.canChangeEmail(testUser, newEmail, recentChange);
      expect(result).toBe(false); // Within 30-day cooldown
    });

    it('should allow email change after cooldown period', () => {
      const newEmail = Email.create('newemail@example.com');
      const oldChange = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago

      const result = UserBusinessRules.canChangeEmail(testUser, newEmail, oldChange);
      expect(result).toBe(true); // After 30-day cooldown
    });
  });

  describe('shouldLockAccount', () => {
    it('should lock account after max login attempts', () => {
      const result = UserBusinessRules.shouldLockAccount(testUser, 3);
      expect(result).toBe(true);
    });

    it('should not lock account before max attempts', () => {
      const result = UserBusinessRules.shouldLockAccount(testUser, 2);
      expect(result).toBe(false);
    });

    it('should lock inactive user regardless of attempts', () => {
      testUser.deactivate();
      const result = UserBusinessRules.shouldLockAccount(testUser, 1);
      expect(result).toBe(true);
    });
  });

  describe('hasPremiumAccess', () => {
    it('should give admin users premium access', () => {
      const adminUser = User.create({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRoleType.ADMIN,
      });

      const result = UserBusinessRules.hasPremiumAccess(adminUser, 50);
      expect(result).toBe(true);
    });

    it('should give high reputation users premium access', () => {
      const result = UserBusinessRules.hasPremiumAccess(testUser, 80);
      expect(result).toBe(true);
    });

    it('should not give low reputation users premium access', () => {
      const result = UserBusinessRules.hasPremiumAccess(testUser, 50);
      expect(result).toBe(false);
    });
  });

  describe('getTutorTier', () => {
    it('should return junior for new tutor', () => {
      const tier = UserBusinessRules.getTutorTier(5, 70, 0.1);
      expect(tier).toBe('junior');
    });

    it('should return senior for experienced tutor', () => {
      const tier = UserBusinessRules.getTutorTier(60, 85, 0.1);
      expect(tier).toBe('senior');
    });

    it('should return expert for top tutor', () => {
      const tier = UserBusinessRules.getTutorTier(100, 95, 0.05);
      expect(tier).toBe('expert');
    });

    it('should return junior for high cancellation rate', () => {
      const tier = UserBusinessRules.getTutorTier(100, 95, 0.2);
      expect(tier).toBe('junior');
    });
  });

  describe('getAccountAge', () => {
    it('should calculate correct account age', () => {
      const age = UserBusinessRules.getAccountAge(testUser);
      expect(age).toBeGreaterThanOrEqual(29);
      expect(age).toBeLessThanOrEqual(31);
    });
  });

  describe('isProfileComplete', () => {
    it('should return true for complete profile', () => {
      const result = UserBusinessRules.isProfileComplete(testUser);
      expect(result).toBe(true);
    });

    it('should return false for inactive user', () => {
      testUser.deactivate();
      const result = UserBusinessRules.isProfileComplete(testUser);
      expect(result).toBe(false);
    });
  });
});
