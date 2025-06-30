import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../entities/user.entity';
import {
  BusinessRuleViolationError,
  UnauthorizedRoleTransitionError,
  UserRequirementsNotMetError
} from '../errors/user.errors';
import { UserRole, UserRoleType } from '../value-objects';
import { ReputationFactors, UserDomainService } from './user-domain.service';

describe('UserDomainService', () => {
  let service: UserDomainService;
  let testUser: User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserDomainService],
    }).compile();

    service = module.get<UserDomainService>(UserDomainService);

    // Create a test user
    testUser = User.create({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRoleType.STUDENT,
    });

    // Set creation date to 30 days ago for testing
    testUser['_createdAt'] = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateUserReputationScore', () => {
    it('should calculate correct base score for active student', () => {
      const factors: ReputationFactors = {
        reviews: [],
        completedSessions: 0,
        responseTime: 24,
        cancellationRate: 0,
      };

      const score = service.calculateUserReputationScore(testUser, factors);
      expect(score).toBeGreaterThan(0); // Should get base score + account age
    });

    it('should give higher score for good reviews', () => {
      const factorsWithGoodReviews: ReputationFactors = {
        reviews: [
          { rating: 5, verified: true },
          { rating: 4, verified: true },
        ],
        completedSessions: 10,
        responseTime: 1,
        cancellationRate: 0.05,
      };

      const score = service.calculateUserReputationScore(testUser, factorsWithGoodReviews);
      expect(score).toBeGreaterThan(50);
    });

    it('should calculate maximum score correctly', () => {
      const perfectFactors: ReputationFactors = {
        reviews: [
          { rating: 5, verified: true },
          { rating: 5, verified: true },
          { rating: 5, verified: true },
        ],
        completedSessions: 100,
        responseTime: 0.5,
        cancellationRate: 0,
      };

      const score = service.calculateUserReputationScore(testUser, perfectFactors);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('validateAndLogRoleTransition', () => {
    let adminUser: User;

    beforeEach(() => {
      adminUser = User.create({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRoleType.ADMIN,
      });
    });

    it('should allow valid role transition', () => {
      expect(() => {
        service.validateAndLogRoleTransition(
          UserRole.student(),
          UserRole.tutor(),
          testUser,
          adminUser
        );
      }).not.toThrow();
    });

    it('should throw UnauthorizedRoleTransitionError for invalid transition', () => {
      expect(() => {
        service.validateAndLogRoleTransition(
          UserRole.student(),
          UserRole.admin(),
          testUser,
          adminUser
        );
      }).toThrow(UnauthorizedRoleTransitionError);
    });

    it('should throw UnauthorizedRoleTransitionError for non-admin promotion', () => {
      const studentUser = User.create({
        email: 'student@example.com',
        firstName: 'Student',
        lastName: 'User',
        role: UserRoleType.STUDENT,
      });

      expect(() => {
        service.validateAndLogRoleTransition(
          UserRole.student(),
          UserRole.tutor(),
          testUser,
          studentUser
        );
      }).toThrow(UnauthorizedRoleTransitionError);
    });

    it('should throw BusinessRuleViolationError for inactive requester', () => {
      adminUser.deactivate();

      expect(() => {
        service.validateAndLogRoleTransition(
          UserRole.student(),
          UserRole.tutor(),
          testUser,
          adminUser
        );
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('validateTutorPromotionRequirements', () => {
    it('should pass validation for eligible user', () => {
      expect(() => {
        service.validateTutorPromotionRequirements(testUser);
      }).not.toThrow();
    });

    it('should throw UserRequirementsNotMetError for inactive user', () => {
      testUser.deactivate();

      expect(() => {
        service.validateTutorPromotionRequirements(testUser);
      }).toThrow(UserRequirementsNotMetError);
    });

    it('should throw BusinessRuleViolationError for existing tutor', () => {
      const tutorUser = User.create({
        email: 'tutor@example.com',
        firstName: 'Tutor',
        lastName: 'User',
        role: UserRoleType.TUTOR,
      });

      expect(() => {
        service.validateTutorPromotionRequirements(tutorUser);
      }).toThrow(BusinessRuleViolationError);
    });

    it('should throw UserRequirementsNotMetError for new user', () => {
      const newUser = User.create({
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        role: UserRoleType.STUDENT,
      });

      expect(() => {
        service.validateTutorPromotionRequirements(newUser);
      }).toThrow(UserRequirementsNotMetError);
    });

    it('should handle custom minimum days requirement', () => {
      expect(() => {
        service.validateTutorPromotionRequirements(testUser, 60);
      }).toThrow(UserRequirementsNotMetError);
    });
  });

  describe('suggestOptimalUserRole', () => {
    it('should suggest tutor for educational domain', () => {
      const role = service.suggestOptimalUserRole('university.edu');
      expect(role.isTutor()).toBe(true);
    });

    it('should suggest tutor for educator context', () => {
      const role = service.suggestOptimalUserRole('gmail.com', {
        isEducator: true,
        hasTeachingExperience: true,
      });
      expect(role.isTutor()).toBe(true);
    });

    it('should default to student for regular domain', () => {
      const role = service.suggestOptimalUserRole('gmail.com');
      expect(role.isStudent()).toBe(true);
    });

    it('should suggest tutor for educator context only', () => {
      const role = service.suggestOptimalUserRole('gmail.com', {
        isEducator: true,
      });
      expect(role.isTutor()).toBe(true);
    });

    it('should suggest tutor for teaching experience only', () => {
      const role = service.suggestOptimalUserRole('gmail.com', {
        hasTeachingExperience: true,
      });
      expect(role.isTutor()).toBe(true);
    });
  });

  describe('generateUserMetrics', () => {
    it('should generate comprehensive user metrics', () => {
      const metrics = service.generateUserMetrics(testUser, 75);

      expect(metrics.accountAge).toBeGreaterThan(25);
      expect(metrics.isEligibleForTutor).toBe(true);
      expect(metrics.profileCompleteness).toBe(true);
      expect(typeof metrics.userTier).toBe('string');
    });

    it('should handle metrics without reputation score', () => {
      const metrics = service.generateUserMetrics(testUser);

      expect(metrics.accountAge).toBeGreaterThan(25);
      expect(metrics.isEligibleForTutor).toBe(true);
      expect(metrics.isEligibleForPremium).toBe(false);
      expect(metrics.userTier).toBe('basic');
    });

    it('should identify admin tier correctly', () => {
      const adminUser = User.create({
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRoleType.ADMIN,
      });

      const metrics = service.generateUserMetrics(adminUser, 90);
      expect(metrics.userTier).toBe('admin');
    });

    it('should identify premium tier correctly', () => {
      const metrics = service.generateUserMetrics(testUser, 80);
      expect(metrics.isEligibleForPremium).toBe(true);
      expect(metrics.userTier).toBe('premium');
    });
  });

  describe('createAdminUser', () => {
    it('should create admin user for superadmin operation', () => {
      const adminUser = service.createAdminUser({
        email: 'newadmin@example.com',
        firstName: 'New',
        lastName: 'Admin',
      });

      expect(adminUser.role.isAdmin()).toBe(true);
      expect(adminUser.email.value).toBe('newadmin@example.com');
      expect(adminUser.name.firstName).toBe('New');
      expect(adminUser.name.lastName).toBe('Admin');
    });
  });
});
