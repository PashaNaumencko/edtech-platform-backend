import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../entities/user.entity';
import { UserRole } from '../value-objects';
import { ReputationFactors, UserDomainService } from './user-domain.service';

describe('UserDomainService', () => {
  let service: UserDomainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserDomainService],
    }).compile();

    service = module.get<UserDomainService>(UserDomainService);
  });

  const createTestUser = (overrides: any = {}) => {
    return User.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.student(),
      ...overrides
    });
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateUserReputationScore', () => {
    it('should calculate score for active user', () => {
      const user = createTestUser();
      user.activate();

      const factors: ReputationFactors = {
        reviews: [
          { rating: 5, verified: true },
          { rating: 4, verified: false }
        ],
        completedSessions: 10,
        responseTime: 2, // hours
        cancellationRate: 0.05 // 5%
      };

      const score = service.calculateUserReputationScore(user, factors);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher scores to admin users', () => {
      const adminUser = createTestUser({
        role: UserRole.admin(),
      });
      adminUser.activate();

      const factors: ReputationFactors = {
        reviews: [],
        completedSessions: 0,
        responseTime: 5,
        cancellationRate: 0
      };

      const score = service.calculateUserReputationScore(adminUser, factors);
      expect(score).toBeGreaterThan(30); // Base + admin bonus
    });
  });

  describe('validateAndLogRoleTransition', () => {
    it('should validate authorized transitions', () => {
      const user = createTestUser({
        role: UserRole.student(),
      });
      user.activate();

      const tutorUser = createTestUser({
        role: UserRole.tutor(),
      });
      tutorUser.activate();

      expect(() => {
        service.validateAndLogRoleTransition(
          UserRole.student(),
          UserRole.tutor(),
          user,
          tutorUser
        );
      }).not.toThrow();
    });

    it('should reject unauthorized transitions', () => {
      const user = createTestUser({
        role: UserRole.student(),
      });
      user.activate();

      const studentRequester = createTestUser({
        role: UserRole.student(),
      });
      studentRequester.activate();

      expect(() => {
        service.validateAndLogRoleTransition(
          UserRole.student(),
          UserRole.tutor(),
          user,
          studentRequester
        );
      }).toThrow();
    });
  });

  describe('suggestOptimalUserRole', () => {
    it('should suggest tutor for educational domains', () => {
      const result = service.suggestOptimalUserRole('university.edu');
      expect(result.equals(UserRole.tutor())).toBe(true);
    });

    it('should suggest student for regular domains', () => {
      const result = service.suggestOptimalUserRole('gmail.com');
      expect(result.equals(UserRole.student())).toBe(true);
    });

    it('should suggest tutor for educator context', () => {
      const result = service.suggestOptimalUserRole('example.com', {
        isEducator: true
      });
      expect(result.equals(UserRole.tutor())).toBe(true);
    });
  });

  describe('createAdminUser', () => {
    it('should create admin user with bypass validation', () => {
      const userData = {
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User'
      };

      const adminUser = service.createAdminUser(userData);
      expect(adminUser.role.equals(UserRole.admin())).toBe(true);
    });
  });
});
