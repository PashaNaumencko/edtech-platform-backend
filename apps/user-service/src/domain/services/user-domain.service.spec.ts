import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../entities/user.entity';
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

    it('should throw error for invalid transition', () => {
      expect(() => {
        service.validateAndLogRoleTransition(
          UserRole.student(),
          UserRole.admin(),
          testUser,
          adminUser
        );
      }).toThrow();
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
  });

  describe('generateUserMetrics', () => {
    it('should generate comprehensive user metrics', () => {
      const metrics = service.generateUserMetrics(testUser, 75);

      expect(metrics.accountAge).toBeGreaterThan(25);
      expect(metrics.isEligibleForTutor).toBe(true);
      expect(metrics.profileCompleteness).toBe(true);
      expect(typeof metrics.userTier).toBe('string');
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
    });
  });
});
