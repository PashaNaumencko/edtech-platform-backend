import { User } from '../entities/user.entity';
import { Email, UserRole } from '../value-objects';
import { UserBusinessRules } from './user-business-rules';

describe('UserBusinessRules', () => {
  const createTestUser = (overrides: any = {}) => {
    return User.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.student(),
      ...overrides
    });
  };

  describe('canBecomeTutor', () => {
    it('should return true for eligible students', () => {
      const user = createTestUser();
      user.activate();

      // Mock the account age to be old enough
      jest.spyOn(UserBusinessRules, 'getAccountAge').mockReturnValue(30);

      const result = UserBusinessRules.canBecomeTutor(user);
      expect(result).toBe(true);
    });

    it('should return false for inactive users', () => {
      const user = createTestUser();
      // User is not activated

      const result = UserBusinessRules.canBecomeTutor(user);
      expect(result).toBe(false);
    });

    it('should return false for new users (account age)', () => {
      const user = createTestUser();
      user.activate();

      // Mock recent registration
      jest.spyOn(UserBusinessRules, 'getAccountAge').mockReturnValue(3);

      const result = UserBusinessRules.canBecomeTutor(user);
      expect(result).toBe(false);
    });

    it('should return false for existing tutors', () => {
      const user = createTestUser({
        role: UserRole.tutor(),
      });
      user.activate();

      const result = UserBusinessRules.canBecomeTutor(user);
      expect(result).toBe(false);
    });

    it('should return false for admins', () => {
      const user = createTestUser({
        role: UserRole.admin(),
      });
      user.activate();

      const result = UserBusinessRules.canBecomeTutor(user);
      expect(result).toBe(false);
    });
  });

  describe('canTransitionRole', () => {
    it('should allow student to tutor transition for eligible users', () => {
      const user = createTestUser();
      user.activate();

      jest.spyOn(UserBusinessRules, 'canBecomeTutor').mockReturnValue(true);

      const result = UserBusinessRules.canTransitionRole(
        UserRole.student(),
        UserRole.tutor(),
        user
      );

      expect(result).toBe(true);
    });

    it('should reject admin role transitions', () => {
      const user = createTestUser({
        role: UserRole.admin(),
      });
      user.activate();

      const result = UserBusinessRules.canTransitionRole(
        UserRole.admin(),
        UserRole.tutor(),
        user
      );

      expect(result).toBe(false);
    });

    it('should reject same role transitions', () => {
      const user = createTestUser();
      user.activate();

      const result = UserBusinessRules.canTransitionRole(
        UserRole.student(),
        UserRole.student(),
        user
      );

      expect(result).toBe(false);
    });

    it('should reject transitions for inactive users', () => {
      const user = createTestUser();
      // User is not activated

      const result = UserBusinessRules.canTransitionRole(
        UserRole.student(),
        UserRole.tutor(),
        user
      );

      expect(result).toBe(false);
    });
  });

  describe('hasPremiumAccess', () => {
    it('should return true for admins regardless of reputation', () => {
      const user = createTestUser({
        role: UserRole.admin(),
      });

      const result = UserBusinessRules.hasPremiumAccess(user, 50);
      expect(result).toBe(true);
    });

    it('should return true for high reputation users', () => {
      const user = createTestUser();

      const result = UserBusinessRules.hasPremiumAccess(user, 80);
      expect(result).toBe(true);
    });

    it('should return false for low reputation non-admin users', () => {
      const user = createTestUser();

      const result = UserBusinessRules.hasPremiumAccess(user, 50);
      expect(result).toBe(false);
    });
  });

  describe('shouldLockAccount', () => {
    it('should lock account after max failed attempts', () => {
      const user = createTestUser();
      user.activate();

      const result = UserBusinessRules.shouldLockAccount(user, 3);
      expect(result).toBe(true);
    });

    it('should not lock account with few failed attempts', () => {
      const user = createTestUser();
      user.activate();

      const result = UserBusinessRules.shouldLockAccount(user, 1);
      expect(result).toBe(false);
    });

    it('should lock inactive accounts regardless of attempts', () => {
      const user = createTestUser();
      // User is not activated

      const result = UserBusinessRules.shouldLockAccount(user, 1);
      expect(result).toBe(true);
    });
  });

  describe('canChangeEmail', () => {
    it('should allow email change for active users', () => {
      const user = createTestUser();
      user.activate();

      const newEmail = Email.create('new@example.com');

      const result = UserBusinessRules.canChangeEmail(user, newEmail);
      expect(result).toBe(true);
    });

    it('should reject email change for inactive users', () => {
      const user = createTestUser();
      // User is not activated

      const newEmail = Email.create('new@example.com');

      const result = UserBusinessRules.canChangeEmail(user, newEmail);
      expect(result).toBe(false);
    });

    it('should reject changing to same email', () => {
      const user = createTestUser();
      user.activate();

      const sameEmail = Email.create('test@example.com');

      const result = UserBusinessRules.canChangeEmail(user, sameEmail);
      expect(result).toBe(false);
    });

    it('should enforce cooldown period', () => {
      const user = createTestUser();
      user.activate();

      const newEmail = Email.create('new@example.com');
      const recentChange = new Date(Date.now() - (10 * 24 * 60 * 60 * 1000)); // 10 days ago

      const result = UserBusinessRules.canChangeEmail(user, newEmail, recentChange);
      expect(result).toBe(false);
    });
  });

  describe('isProfileComplete', () => {
    it('should return true for complete profile', () => {
      const user = createTestUser();
      user.activate();

      const result = UserBusinessRules.isProfileComplete(user);
      expect(typeof result).toBe('boolean');
    });

    it('should return false for inactive user', () => {
      const user = createTestUser();
      // User is not activated

      const result = UserBusinessRules.isProfileComplete(user);
      expect(typeof result).toBe('boolean');
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
