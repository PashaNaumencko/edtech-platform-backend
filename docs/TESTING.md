# Testing Guide

Comprehensive testing strategies for the EdTech Platform backend, covering unit tests, integration tests, and E2E tests across all microservices.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Structure](#test-structure)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Mocking Strategies](#mocking-strategies)
- [Test Coverage](#test-coverage)
- [Testing Commands](#testing-commands)
- [Best Practices](#best-practices)

## Testing Philosophy

Our testing strategy follows the testing pyramid:

```
        /\
       /  \      E2E Tests (10%)
      /    \     - Critical user flows
     /------\    - End-to-end scenarios
    /        \
   /  Integration\ Integration Tests (30%)
  /    Tests     \- Database operations
 /--------------\ - External service mocks
/                \
/   Unit Tests    \ Unit Tests (60%)
/                  \- Domain logic
/------------------\- Business rules
```

### Key Principles

1. **Fast Feedback**: Unit tests should run in milliseconds
2. **Isolation**: Each test should be independent
3. **Clarity**: Test names should describe behavior
4. **Coverage**: Focus on business logic, not infrastructure
5. **Maintainability**: Tests should be easy to update

## Test Structure

### Directory Organization

```
apps/[service-name]/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   └── user.entity.spec.ts        # Unit tests
│   │   ├── value-objects/
│   │   │   ├── email.vo.ts
│   │   │   └── email.vo.spec.ts           # Unit tests
│   │   └── services/
│   │       ├── user-domain.service.ts
│   │       └── user-domain.service.spec.ts # Unit tests
│   ├── application/
│   │   └── use-cases/
│   │       ├── create-user.usecase.ts
│   │       └── create-user.usecase.spec.ts # Integration tests
│   └── infrastructure/
│       └── repositories/
│           ├── drizzle-user.repository.ts
│           └── drizzle-user.repository.spec.ts # Integration tests
└── test/
    ├── app.e2e-spec.ts                    # E2E tests
    └── jest-e2e.json                      # E2E config
```

### Naming Conventions

```typescript
// Unit test file: [name].spec.ts
describe('UserEntity', () => {
  describe('create', () => {
    it('should create valid user with required fields', () => {});
    it('should throw error when email is invalid', () => {});
  });
});

// Integration test file: [name].integration.spec.ts
describe('CreateUserUseCase (Integration)', () => {
  it('should create user and persist to database', async () => {});
});

// E2E test file: [feature].e2e-spec.ts
describe('User Registration Flow (E2E)', () => {
  it('should complete full registration workflow', async () => {});
});
```

## Unit Testing

Unit tests focus on **domain logic** in isolation. They should not require database, external services, or complex setup.

### Domain Entity Tests

**File**: `apps/user-service/src/domain/entities/user.entity.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { User } from './user.entity';
import { UserRole } from '../value-objects/user-role.vo';
import { Email } from '../value-objects/email.vo';

describe('User Entity', () => {
  describe('create', () => {
    it('should create a new user with valid data', () => {
      // Arrange
      const userData = {
        email: 'student@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.student(),
      };

      // Act
      const user = User.create(userData);

      // Assert
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.role.equals(UserRole.student())).toBe(true);
      expect(user.isActive()).toBe(false); // New users are inactive
      expect(user.getUncommittedEvents()).toHaveLength(1); // UserCreatedEvent
    });

    it('should throw error when email is invalid', () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.student(),
      };

      // Act & Assert
      expect(() => User.create(invalidData)).toThrow('Invalid email format');
    });

    it('should throw error when first name is empty', () => {
      const invalidData = {
        email: 'student@example.com',
        firstName: '',
        lastName: 'Doe',
        role: UserRole.student(),
      };

      expect(() => User.create(invalidData)).toThrow('First name is required');
    });
  });

  describe('activate', () => {
    it('should activate inactive user', () => {
      // Arrange
      const user = User.create({
        email: 'student@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.student(),
      });

      // Act
      user.activate();

      // Assert
      expect(user.isActive()).toBe(true);
      expect(user.getUncommittedEvents()).toHaveLength(2); // UserCreatedEvent + UserActivatedEvent
    });

    it('should throw error when activating already active user', () => {
      const user = User.create({
        email: 'student@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.student(),
      });
      user.activate();

      expect(() => user.activate()).toThrow('User is already active');
    });
  });

  describe('changeRole', () => {
    it('should allow student to become tutor', () => {
      const user = User.create({
        email: 'student@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.student(),
      });
      user.activate();

      user.changeRole(UserRole.tutor());

      expect(user.role.equals(UserRole.tutor())).toBe(true);
      const events = user.getUncommittedEvents();
      expect(events.some(e => e.constructor.name === 'UserRoleChangedEvent')).toBe(true);
    });

    it('should not allow role change if user is inactive', () => {
      const user = User.create({
        email: 'student@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.student(),
      });

      expect(() => user.changeRole(UserRole.tutor())).toThrow('User must be active');
    });
  });
});
```

### Value Object Tests

**File**: `apps/user-service/src/domain/value-objects/email.vo.spec.ts`

```typescript
import { Email } from './email.vo';

describe('Email Value Object', () => {
  describe('create', () => {
    it('should create valid email', () => {
      const email = Email.create('user@example.com');

      expect(email.value).toBe('user@example.com');
      expect(email.domain).toBe('example.com');
      expect(email.localPart).toBe('user');
    });

    it('should normalize email to lowercase', () => {
      const email = Email.create('User@Example.COM');

      expect(email.value).toBe('user@example.com');
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
      ];

      invalidEmails.forEach(invalid => {
        expect(() => Email.create(invalid)).toThrow('Invalid email format');
      });
    });
  });

  describe('equals', () => {
    it('should return true for equal emails', () => {
      const email1 = Email.create('user@example.com');
      const email2 = Email.create('user@example.com');

      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different emails', () => {
      const email1 = Email.create('user1@example.com');
      const email2 = Email.create('user2@example.com');

      expect(email1.equals(email2)).toBe(false);
    });

    it('should be case-insensitive', () => {
      const email1 = Email.create('User@Example.com');
      const email2 = Email.create('user@example.com');

      expect(email1.equals(email2)).toBe(true);
    });
  });

  describe('isEducationalDomain', () => {
    it('should identify .edu domains', () => {
      const email = Email.create('student@university.edu');

      expect(email.isEducationalDomain()).toBe(true);
    });

    it('should identify .ac domains', () => {
      const email = Email.create('student@university.ac.uk');

      expect(email.isEducationalDomain()).toBe(true);
    });

    it('should return false for non-educational domains', () => {
      const email = Email.create('user@gmail.com');

      expect(email.isEducationalDomain()).toBe(false);
    });
  });
});
```

### Domain Service Tests

**File**: `apps/user-service/src/domain/services/user-domain.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserDomainService, ReputationFactors } from './user-domain.service';
import { User } from '../entities/user.entity';
import { UserRole } from '../value-objects/user-role.vo';

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
      ...overrides,
    });
  };

  describe('calculateReputationScore', () => {
    it('should calculate score for active user with reviews', () => {
      const user = createTestUser();
      user.activate();

      const factors: ReputationFactors = {
        reviews: [
          { rating: 5, verified: true },
          { rating: 4, verified: false },
        ],
        completedSessions: 10,
        responseTime: 2, // hours
        cancellationRate: 0.05, // 5%
      };

      const score = service.calculateReputationScore(user, factors);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher scores to users with verified reviews', () => {
      const user = createTestUser();
      user.activate();

      const withVerified: ReputationFactors = {
        reviews: [{ rating: 5, verified: true }],
        completedSessions: 5,
        responseTime: 2,
        cancellationRate: 0,
      };

      const withoutVerified: ReputationFactors = {
        reviews: [{ rating: 5, verified: false }],
        completedSessions: 5,
        responseTime: 2,
        cancellationRate: 0,
      };

      const scoreWithVerified = service.calculateReputationScore(user, withVerified);
      const scoreWithoutVerified = service.calculateReputationScore(user, withoutVerified);

      expect(scoreWithVerified).toBeGreaterThan(scoreWithoutVerified);
    });

    it('should penalize high cancellation rates', () => {
      const user = createTestUser();
      user.activate();

      const lowCancellation: ReputationFactors = {
        reviews: [],
        completedSessions: 10,
        responseTime: 2,
        cancellationRate: 0.05, // 5%
      };

      const highCancellation: ReputationFactors = {
        reviews: [],
        completedSessions: 10,
        responseTime: 2,
        cancellationRate: 0.30, // 30%
      };

      const scoreLow = service.calculateReputationScore(user, lowCancellation);
      const scoreHigh = service.calculateReputationScore(user, highCancellation);

      expect(scoreLow).toBeGreaterThan(scoreHigh);
    });
  });

  describe('canBecomeTutor', () => {
    it('should return false for inactive user', () => {
      const user = createTestUser();

      expect(service.canBecomeTutor(user)).toBe(false);
    });

    it('should return false for user already a tutor', () => {
      const user = createTestUser({ role: UserRole.tutor() });
      user.activate();

      expect(service.canBecomeTutor(user)).toBe(false);
    });

    it('should return true for active student', () => {
      const user = createTestUser({ role: UserRole.student() });
      user.activate();

      expect(service.canBecomeTutor(user)).toBe(true);
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

    it('should suggest tutor when educator context provided', () => {
      const result = service.suggestOptimalUserRole('example.com', {
        isEducator: true,
      });

      expect(result.equals(UserRole.tutor())).toBe(true);
    });
  });
});
```

## Integration Testing

Integration tests verify that **application layer** (use cases) works correctly with **infrastructure** (repositories, databases).

### Use Case Integration Tests

**File**: `apps/user-service/src/application/use-cases/create-user.usecase.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { CreateUserUseCase } from './create-user.usecase';
import { IUserRepository } from '../interfaces/repository.interface';
import { CreateUserRequestDto } from '../dto/create-user.dto';
import { User } from '../../domain/entities/user.entity';
import { UserRole } from '../../domain/value-objects/user-role.vo';
import { DI_TOKENS } from '../../constants';

describe('CreateUserUseCase (Integration)', () => {
  let useCase: CreateUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    // Create mocks
    const mockUserRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        {
          provide: DI_TOKENS.USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    useCase = module.get<CreateUserUseCase>(CreateUserUseCase);
    userRepository = module.get(DI_TOKENS.USER_REPOSITORY);
    eventBus = module.get(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create user and save to repository', async () => {
    // Arrange
    const dto: CreateUserRequestDto = {
      email: 'newuser@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.student(),
    };

    userRepository.findByEmail.mockResolvedValue(null); // No existing user
    userRepository.save.mockImplementation(async (user: User) => user);

    // Act
    const result = await useCase.execute(dto);

    // Assert
    expect(result).toBeDefined();
    expect(result.email).toBe(dto.email);
    expect(result.firstName).toBe(dto.firstName);
    expect(userRepository.findByEmail).toHaveBeenCalledWith(dto.email);
    expect(userRepository.save).toHaveBeenCalledWith(expect.any(User));
  });

  it('should throw error when user already exists', async () => {
    // Arrange
    const dto: CreateUserRequestDto = {
      email: 'existing@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.student(),
    };

    const existingUser = User.create(dto);
    userRepository.findByEmail.mockResolvedValue(existingUser);

    // Act & Assert
    await expect(useCase.execute(dto)).rejects.toThrow(
      'User with this email already exists'
    );
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('should publish domain events after saving', async () => {
    // Arrange
    const dto: CreateUserRequestDto = {
      email: 'newuser@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.student(),
    };

    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.save.mockImplementation(async (user: User) => user);

    // Act
    const result = await useCase.execute(dto);

    // Assert
    expect(result.getUncommittedEvents()).toHaveLength(0); // Events committed
  });
});
```

### Repository Integration Tests (with Database)

**File**: `apps/user-service/src/infrastructure/repositories/drizzle-user.repository.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DrizzleService } from '@edtech/drizzle';
import { DrizzleUserRepository } from './drizzle-user.repository';
import { User } from '../../domain/entities/user.entity';
import { UserRole } from '../../domain/value-objects/user-role.vo';

describe('DrizzleUserRepository (Integration)', () => {
  let repository: DrizzleUserRepository;
  let drizzleService: DrizzleService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrizzleUserRepository,
        {
          provide: DrizzleService,
          useValue: {
            db: {
              insert: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              delete: jest.fn().mockReturnThis(),
              from: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              offset: jest.fn().mockReturnThis(),
              values: jest.fn().mockReturnThis(),
              onConflictDoUpdate: jest.fn().mockReturnThis(),
              returning: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<DrizzleUserRepository>(DrizzleUserRepository);
    drizzleService = module.get<DrizzleService>(DrizzleService);
  });

  describe('save', () => {
    it('should insert new user into database', async () => {
      // Arrange
      const user = User.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.student(),
      });

      const mockDbUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.value,
        status: user.status,
        bio: null,
        skills: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (drizzleService.db.returning as jest.Mock).mockResolvedValue([mockDbUser]);

      // Act
      const result = await repository.save(user);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
    });

    it('should update existing user', async () => {
      const user = User.create({
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'User',
        role: UserRole.student(),
      });

      const mockDbUser = {
        id: user.id,
        email: user.email,
        firstName: 'Updated',
        lastName: user.lastName,
        role: user.role.value,
        status: user.status,
        bio: null,
        skills: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (drizzleService.db.returning as jest.Mock).mockResolvedValue([mockDbUser]);

      const result = await repository.save(user);

      expect(result.firstName).toBe('Updated');
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockDbUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'student',
        status: 'active',
        bio: null,
        skills: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (drizzleService.db.limit as jest.Mock).mockResolvedValue([mockDbUser]);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      (drizzleService.db.limit as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });
});
```

### Testing with Real Database (Docker)

**Setup**: Create `docker-compose.test.yml`

```yaml
version: '3.8'

services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: user_service_test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data  # Use tmpfs for faster tests
```

**Run tests with database**:

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run migrations
DATABASE_URL=postgresql://test:test@localhost:5433/user_service_test \
  pnpm drizzle:user:migrate

# Run integration tests
DATABASE_URL=postgresql://test:test@localhost:5433/user_service_test \
  pnpm test --testPathPattern=integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

## E2E Testing

E2E tests verify complete workflows from HTTP request to database and back.

### E2E Test Setup

**File**: `apps/user-service/test/app.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DrizzleService } from '@edtech/drizzle';

describe('UserService E2E Tests', () => {
  let app: INestApplication;
  let drizzleService: DrizzleService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    drizzleService = app.get<DrizzleService>(DrizzleService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await drizzleService.db.delete(users);
  });

  describe('POST /internal/users', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
      };

      const response = await request(app.getHttpServer())
        .post('/internal/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.email).toBe(createUserDto.email);
      expect(response.body.data.data.firstName).toBe(createUserDto.firstName);
    });

    it('should return 400 for invalid email', async () => {
      const invalidDto = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
      };

      const response = await request(app.getHttpServer())
        .post('/internal/users')
        .send(invalidDto)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 409 when user already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
      };

      // Create first user
      await request(app.getHttpServer())
        .post('/internal/users')
        .send(createUserDto)
        .expect(201);

      // Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/internal/users')
        .send(createUserDto)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /internal/users/:userId', () => {
    it('should retrieve user by ID', async () => {
      // Create user first
      const createResponse = await request(app.getHttpServer())
        .post('/internal/users')
        .send({
          email: 'getuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'student',
        });

      const userId = createResponse.body.data.data.id;

      // Retrieve user
      const response = await request(app.getHttpServer())
        .get(`/internal/users/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.id).toBe(userId);
      expect(response.body.data.data.email).toBe('getuser@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .get('/internal/users/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /internal/users/:userId/profile', () => {
    it('should update user profile', async () => {
      // Create user
      const createResponse = await request(app.getHttpServer())
        .post('/internal/users')
        .send({
          email: 'updateuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'student',
        });

      const userId = createResponse.body.data.data.id;

      // Update profile
      const updateDto = {
        bio: 'Passionate about mathematics',
        skills: ['algebra', 'geometry'],
      };

      const response = await request(app.getHttpServer())
        .put(`/internal/users/${userId}/profile`)
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.bio).toBe(updateDto.bio);
      expect(response.body.data.data.skills).toEqual(updateDto.skills);
    });
  });

  describe('POST /internal/users/:userId/become-tutor', () => {
    it('should promote student to tutor', async () => {
      // Create student
      const createResponse = await request(app.getHttpServer())
        .post('/internal/users')
        .send({
          email: 'student@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'student',
        });

      const userId = createResponse.body.data.data.id;

      // Promote to tutor
      const response = await request(app.getHttpServer())
        .post(`/internal/users/${userId}/become-tutor`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.role).toBe('tutor');
    });
  });

  describe('Full User Lifecycle E2E', () => {
    it('should complete full user lifecycle', async () => {
      // 1. Create user
      const createResponse = await request(app.getHttpServer())
        .post('/internal/users')
        .send({
          email: 'lifecycle@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'student',
        })
        .expect(201);

      const userId = createResponse.body.data.data.id;

      // 2. Update profile
      await request(app.getHttpServer())
        .put(`/internal/users/${userId}/profile`)
        .send({
          bio: 'Math enthusiast',
          skills: ['calculus'],
        })
        .expect(200);

      // 3. Promote to tutor
      await request(app.getHttpServer())
        .post(`/internal/users/${userId}/become-tutor`)
        .send({})
        .expect(200);

      // 4. Verify final state
      const finalResponse = await request(app.getHttpServer())
        .get(`/internal/users/${userId}`)
        .expect(200);

      expect(finalResponse.body.data.data.role).toBe('tutor');
      expect(finalResponse.body.data.data.bio).toBe('Math enthusiast');
      expect(finalResponse.body.data.data.skills).toContain('calculus');
    });
  });
});
```

## Mocking Strategies

### Mocking Repositories

```typescript
const mockUserRepository: jest.Mocked<IUserRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  delete: jest.fn(),
};

// Configure mock behavior
mockUserRepository.findByEmail.mockResolvedValue(null);
mockUserRepository.save.mockImplementation(async (user) => user);
```

### Mocking EventBus

```typescript
const mockEventBus: jest.Mocked<EventBus> = {
  publish: jest.fn(),
  publishAll: jest.fn(),
};

// Verify events were published
expect(mockEventBus.publish).toHaveBeenCalledWith(
  expect.objectContaining({
    eventName: 'user.created',
  })
);
```

### Mocking External Services

```typescript
// Mock AWS Cognito
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ User: { Username: 'test-user' } }),
  })),
}));

// Mock S3
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ ETag: 'mock-etag' }),
  })),
}));
```

## Test Coverage

### Coverage Requirements

- **Domain Layer**: 90%+ coverage (business logic is critical)
- **Application Layer**: 80%+ coverage
- **Infrastructure Layer**: 70%+ coverage
- **Overall Project**: 80%+ coverage

### Generating Coverage Reports

```bash
# Run tests with coverage
pnpm test:cov

# View coverage report
open coverage/lcov-report/index.html
```

### Coverage Configuration

**File**: `jest.config.js`

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/**/src/**/*.ts',
    'libs/**/src/**/*.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/index.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
  ],
  coverageDirectory: './coverage',
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/', '<rootDir>/libs/'],
  moduleNameMapper: {
    '^@edtech/(.*)$': '<rootDir>/libs/$1/src',
  },
};
```

## Testing Commands

### Run All Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Run tests in debug mode
pnpm test:debug
```

### Run Service-Specific Tests

```bash
# Test specific service
pnpm test --testPathPattern=apps/user-service

# Test specific file
pnpm test apps/user-service/src/domain/entities/user.entity.spec.ts

# Test with pattern matching
pnpm test --testNamePattern="should create user"
```

### Run Integration Tests

```bash
# Run only integration tests
pnpm test --testPathPattern=integration

# Run integration tests for specific service
pnpm test --testPathPattern="apps/user-service.*integration"
```

### Run E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E for specific service
pnpm test:e2e --testPathPattern=user-service
```

## Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
it('should create user', () => {
  // Arrange - Set up test data
  const userData = { email: 'test@example.com', ... };

  // Act - Execute the behavior
  const user = User.create(userData);

  // Assert - Verify the outcome
  expect(user.email).toBe(userData.email);
});
```

### 2. Test One Thing at a Time

```typescript
// BAD: Testing multiple behaviors
it('should create and activate user', () => {
  const user = User.create(data);
  user.activate();
  expect(user.isActive()).toBe(true);
  expect(user.email).toBe(data.email);
});

// GOOD: Separate tests
it('should create user with email', () => {
  const user = User.create(data);
  expect(user.email).toBe(data.email);
});

it('should activate user', () => {
  const user = User.create(data);
  user.activate();
  expect(user.isActive()).toBe(true);
});
```

### 3. Use Descriptive Test Names

```typescript
// BAD
it('test user', () => {});

// GOOD
it('should throw error when creating user with invalid email format', () => {});
```

### 4. Clean Up After Tests

```typescript
afterEach(async () => {
  // Clear mocks
  jest.clearAllMocks();

  // Clean database
  await drizzleService.db.delete(users);
});

afterAll(async () => {
  // Close connections
  await app.close();
});
```

### 5. Test Error Cases

```typescript
describe('error handling', () => {
  it('should throw specific error for invalid email', () => {
    expect(() => User.create({ email: 'invalid' })).toThrow('Invalid email format');
  });

  it('should handle database connection failure', async () => {
    mockRepository.save.mockRejectedValue(new Error('Connection failed'));

    await expect(useCase.execute(dto)).rejects.toThrow('Connection failed');
  });
});
```

### 6. Use Test Factories

```typescript
// test/factories/user.factory.ts
export class UserFactory {
  static create(overrides?: Partial<UserData>): User {
    const defaults = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.student(),
    };

    return User.create({ ...defaults, ...overrides });
  }

  static createStudent(): User {
    return this.create({ role: UserRole.student() });
  }

  static createTutor(): User {
    return this.create({ role: UserRole.tutor() });
  }
}

// Usage in tests
it('should create student', () => {
  const student = UserFactory.createStudent();
  expect(student.role.equals(UserRole.student())).toBe(true);
});
```

### 7. Parallel Test Execution

```bash
# Run tests in parallel (faster)
pnpm test --maxWorkers=4

# Run tests sequentially (for debugging)
pnpm test --runInBand
```

### 8. Integration with CI/CD

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run linter
        run: pnpm lint:check

      - name: Run unit tests
        run: pnpm test --coverage

      - name: Run integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Summary

This testing guide provides:

- **Unit tests** for domain logic (entities, value objects, services)
- **Integration tests** for use cases and repositories
- **E2E tests** for complete workflows
- **Mocking strategies** for external dependencies
- **Coverage requirements** (80%+ overall)
- **Testing commands** for all scenarios
- **Best practices** for maintainable tests

Follow these patterns to ensure high-quality, well-tested code across all microservices.
