import { User } from '../entities/user.entity';
import { UserBusinessRules } from '../rules/user-business-rules';
import { UserRole } from '../value-objects';
import {
  ActiveUserSpecification,
  EligibleTutorSpecification,
  PremiumEligibleSpecification,
  UserRoleSpecification,
} from './user.specifications';

describe('UserSpecifications', () => {
  const createTestUser = (overrides: any = {}) => {
    return User.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.student(),
      ...overrides
    });
  };

  describe('ActiveUserSpecification', () => {
    it('should return true for active users', () => {
      const user = createTestUser();
      user.activate();

      const spec = new ActiveUserSpecification();
      expect(spec.isSatisfiedBy(user)).toBe(true);
    });

    it('should return false for inactive users', () => {
      const user = createTestUser();

      const spec = new ActiveUserSpecification();
      expect(spec.isSatisfiedBy(user)).toBe(false);
    });
  });

  describe('UserRoleSpecification', () => {
    it('should return true for matching role', () => {
      const user = createTestUser({
        role: UserRole.tutor(),
      });

      const spec = new UserRoleSpecification(UserRole.tutor());
      expect(spec.isSatisfiedBy(user)).toBe(true);
    });

    it('should return false for non-matching role', () => {
      const user = createTestUser({
        role: UserRole.admin(),
      });

      const spec = new UserRoleSpecification(UserRole.student());
      expect(spec.isSatisfiedBy(user)).toBe(false);
    });
  });

  describe('EligibleTutorSpecification', () => {
    it('should return true for eligible students', () => {
      const user = createTestUser();
      user.activate();

      // Mock business rules to return eligible
      jest.spyOn(UserBusinessRules, 'canBecomeTutor')
        .mockReturnValue(true);

      const spec = new EligibleTutorSpecification();
      expect(spec.isSatisfiedBy(user)).toBe(true);
    });

    it('should return false for ineligible users', () => {
      const user = createTestUser();
      user.activate();

      // Mock business rules to return ineligible
      jest.spyOn(UserBusinessRules, 'canBecomeTutor')
        .mockReturnValue(false);

      const spec = new EligibleTutorSpecification();
      expect(spec.isSatisfiedBy(user)).toBe(false);
    });
  });

  describe('PremiumEligibleSpecification', () => {
    it('should return true for users with premium access', () => {
      const user = createTestUser();
      user.activate();

      // Mock business rules to return premium access
      jest.spyOn(UserBusinessRules, 'hasPremiumAccess')
        .mockReturnValue(true);

      const spec = new PremiumEligibleSpecification(80);
      expect(spec.isSatisfiedBy(user)).toBe(true);
    });

    it('should return false for users without premium access', () => {
      const user = createTestUser();
      user.activate();

      // Mock business rules to return no premium access
      jest.spyOn(UserBusinessRules, 'hasPremiumAccess')
        .mockReturnValue(false);

      const spec = new PremiumEligibleSpecification(40);
      expect(spec.isSatisfiedBy(user)).toBe(false);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
