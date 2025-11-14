# Shared Libraries - Implementation Guide

**Libraries:** @edtech/auth, @edtech/s3, @edtech/cache
**Purpose:** Reusable infrastructure integrations for AWS services

---

## Table of Contents

1. [Overview](#overview)
2. [Library 1: @edtech/auth](#library-1-edtechauth)
3. [Library 2: @edtech/s3](#library-2-edtechs3)
4. [Library 3: @edtech/cache](#library-3-edtechcache)
5. [Testing Shared Libraries](#testing-shared-libraries)

---

## Overview

### When to Implement

These libraries are **infrastructure concerns** that wrap AWS services. Implement them **iteratively** when needed:

| Library | When to Implement | Used By |
|---------|-------------------|---------|
| `@edtech/auth` | **Phase 4 of Identity Service** | All services for authentication |
| `@edtech/s3` | **Tutor Service document upload** | Tutor Service, Admin Service |
| `@edtech/cache` | **Performance optimization** | Any service (optional) |

### Architecture Pattern

All shared libraries follow this structure:
```
libs/[library-name]/
├── src/
│   ├── [library-name].module.ts    # NestJS module
│   ├── [library-name].service.ts   # Main service
│   ├── interfaces/                  # TypeScript interfaces
│   ├── config/                      # Configuration
│   └── index.ts                     # Public API
├── tsconfig.lib.json
└── package.json (optional)
```

---

## Library 1: @edtech/auth

**Purpose:** AWS Cognito authentication integration
**When:** Implement during Identity Service Phase 4 (Application Layer)

### Step 1.1: Generate Library with NestJS CLI

```bash
# Generate library
nest generate library auth

# This creates:
# - libs/auth/src/
# - libs/auth/tsconfig.lib.json
# - Updates nest-cli.json and tsconfig.json
```

### Step 1.2: Create Directory Structure

```bash
# Create subdirectories
mkdir -p libs/auth/src/{config,interfaces,services}
```

### Step 1.3: Define Interfaces

**`libs/auth/src/interfaces/auth.interfaces.ts`**
```typescript
export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export interface AuthContext {
  userId: string;
  email?: string;
  roles: string[];
  isAuthenticated: boolean;
}

export interface CognitoUser {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
  attributes: Record<string, string>;
}
```

### Step 1.4: Create Configuration

**`libs/auth/src/config/cognito.config.ts`**
```typescript
import { registerAs } from '@nestjs/config';

export const cognitoConfig = registerAs('cognito', () => ({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  region: process.env.COGNITO_REGION || 'us-east-1',
}));
```

### Step 1.5: Implement Cognito JWT Service

**`libs/auth/src/services/cognito-jwt.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

@Injectable()
export class CognitoJwtService {
  private readonly logger = new Logger(CognitoJwtService.name);
  private readonly verifier;

  constructor(private readonly configService: ConfigService) {
    const cognitoConfig = this.configService.get('cognito');

    // TODO: Initialize JWT verifier
    // this.verifier = CognitoJwtVerifier.create({
    //   userPoolId: cognitoConfig.userPoolId,
    //   tokenUse: 'id',
    //   clientId: cognitoConfig.clientId,
    // });
  }

  async verifyToken(token: string): Promise<any> {
    try {
      // TODO: Implement token verification
      // const payload = await this.verifier.verify(token);
      // return payload;

      this.logger.debug('Token verified successfully');
      return {};
    } catch (error) {
      this.logger.error('Token verification failed:', error);
      throw new Error('Invalid token');
    }
  }
}
```

**Tasks for Step 1.5:**
- [ ] Install dependency: `pnpm add aws-jwt-verify`
- [ ] Implement JWT verification with aws-jwt-verify
- [ ] Add token caching for performance
- [ ] Write unit tests

### Step 1.6: Implement Cognito Auth Service

**`libs/auth/src/services/cognito-auth.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminGetUserCommand,
  AdminUserGlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { AuthRequest, AuthResponse, CognitoUser } from '../interfaces/auth.interfaces';

@Injectable()
export class CognitoAuthService {
  private readonly logger = new Logger(CognitoAuthService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    const cognitoConfig = this.configService.get('cognito');
    this.userPoolId = cognitoConfig.userPoolId;
    this.clientId = cognitoConfig.clientId;

    // TODO: Initialize Cognito client
    // this.cognitoClient = new CognitoIdentityProviderClient({
    //   region: cognitoConfig.region,
    // });
  }

  async authenticate(request: AuthRequest): Promise<AuthResponse> {
    try {
      // TODO: Implement authentication
      // 1. Create AdminInitiateAuthCommand
      // 2. Send command to Cognito
      // 3. Extract tokens from response
      // 4. Return AuthResponse

      this.logger.debug(`Authenticating user: ${request.username}`);
      throw new Error('Not implemented');
    } catch (error) {
      this.logger.error(`Authentication failed for ${request.username}:`, error);
      throw error;
    }
  }

  async getUser(userId: string): Promise<CognitoUser | null> {
    try {
      // TODO: Implement user retrieval
      // 1. Create AdminGetUserCommand
      // 2. Send command to Cognito
      // 3. Map response to CognitoUser
      // 4. Return user or null

      this.logger.debug(`Fetching user: ${userId}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to get user ${userId}:`, error);
      return null;
    }
  }

  async signOut(username: string): Promise<void> {
    try {
      // TODO: Implement global sign out
      // 1. Create AdminUserGlobalSignOutCommand
      // 2. Send command to Cognito

      this.logger.debug(`Signing out user: ${username}`);
    } catch (error) {
      this.logger.error(`Failed to sign out user ${username}:`, error);
      throw error;
    }
  }
}
```

**Tasks for Step 1.6:**
- [ ] Install dependency: `pnpm add @aws-sdk/client-cognito-identity-provider`
- [ ] Implement authenticate method with AdminInitiateAuthCommand
- [ ] Implement getUser method with AdminGetUserCommand
- [ ] Implement signOut method with AdminUserGlobalSignOutCommand
- [ ] Add error handling for Cognito errors
- [ ] Write integration tests

### Step 1.7: Implement User Pool Service

**`libs/auth/src/services/cognito-user-pool.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';

export interface CreateUserParams {
  username: string;
  email: string;
  password: string;
  attributes?: Record<string, any>;
}

@Injectable()
export class CognitoUserPoolService {
  private readonly logger = new Logger(CognitoUserPoolService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor(private readonly configService: ConfigService) {
    const cognitoConfig = this.configService.get('cognito');
    this.userPoolId = cognitoConfig.userPoolId;

    // TODO: Initialize Cognito client
  }

  async createUser(params: CreateUserParams): Promise<string> {
    try {
      // TODO: Implement user creation
      // 1. Create AdminCreateUserCommand
      // 2. Set temporary password with AdminSetUserPasswordCommand
      // 3. Return user ID

      this.logger.debug(`Creating user: ${params.username}`);
      throw new Error('Not implemented');
    } catch (error) {
      this.logger.error(`Failed to create user ${params.username}:`, error);
      throw error;
    }
  }
}
```

**Tasks for Step 1.7:**
- [ ] Implement createUser method
- [ ] Add email verification trigger
- [ ] Handle duplicate user errors
- [ ] Write integration tests

### Step 1.8: Create Main Auth Service (Facade)

**`libs/auth/src/auth.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CognitoAuthService } from './services/cognito-auth.service';
import { CognitoJwtService } from './services/cognito-jwt.service';
import { CognitoUserPoolService } from './services/cognito-user-pool.service';
import { AuthContext } from './interfaces/auth.interfaces';

export interface AuthResult {
  success: boolean;
  user?: AuthContext;
  error?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly cognitoAuthService: CognitoAuthService,
    private readonly cognitoJwtService: CognitoJwtService,
    private readonly cognitoUserPoolService: CognitoUserPoolService,
  ) {}

  async authenticateUser(username: string, password: string): Promise<AuthResult> {
    try {
      // TODO: Implement authentication flow
      // 1. Call cognitoAuthService.authenticate()
      // 2. Extract user from token
      // 3. Return AuthResult

      return { success: false, error: 'Not implemented' };
    } catch (error) {
      this.logger.error(`Authentication error for user ${username}:`, error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  async validateToken(token: string): Promise<AuthResult> {
    try {
      // TODO: Implement token validation
      // 1. Verify token with cognitoJwtService
      // 2. Extract user context
      // 3. Return AuthResult

      return { success: false, error: 'Not implemented' };
    } catch (error) {
      this.logger.error('Token validation error:', error);
      return { success: false, error: 'Invalid token' };
    }
  }

  async createUser(username: string, email: string, password: string): Promise<boolean> {
    try {
      // TODO: Implement user creation
      await this.cognitoUserPoolService.createUser({ username, email, password });
      return true;
    } catch (error) {
      this.logger.error(`Error creating user ${username}:`, error);
      return false;
    }
  }
}
```

**Tasks for Step 1.8:**
- [ ] Implement authenticateUser method
- [ ] Implement validateToken method
- [ ] Implement createUser method
- [ ] Add role-based access control helpers
- [ ] Write unit tests

### Step 1.9: Create Auth Module

**`libs/auth/src/auth.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { CognitoAuthService } from './services/cognito-auth.service';
import { CognitoJwtService } from './services/cognito-jwt.service';
import { CognitoUserPoolService } from './services/cognito-user-pool.service';
import { cognitoConfig } from './config/cognito.config';

@Module({
  imports: [
    ConfigModule.forFeature(cognitoConfig),
  ],
  providers: [
    AuthService,
    CognitoAuthService,
    CognitoJwtService,
    CognitoUserPoolService,
  ],
  exports: [
    AuthService,
    CognitoAuthService,
    CognitoJwtService,
    CognitoUserPoolService,
  ],
})
export class AuthModule {}
```

### Step 1.10: Export Public API

**`libs/auth/src/index.ts`**
```typescript
// Module
export * from './auth.module';

// Services
export * from './auth.service';
export * from './services/cognito-auth.service';
export * from './services/cognito-jwt.service';
export * from './services/cognito-user-pool.service';

// Interfaces
export * from './interfaces/auth.interfaces';
```

### Step 1.11: Usage in Identity Service

**In `apps/identity-service/src/identity.module.ts`:**
```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '@edtech/auth'; // Import shared library

@Module({
  imports: [
    AuthModule, // Add to imports
    // ... other modules
  ],
})
export class IdentityModule {}
```

**In command handler:**
```typescript
import { CognitoUserPoolService } from '@edtech/auth';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler {
  constructor(
    private readonly cognitoUserPool: CognitoUserPoolService,
  ) {}

  async execute(command: CreateUserCommand): Promise<string> {
    // Use the shared library
    const cognitoUserId = await this.cognitoUserPool.createUser({
      username: command.email,
      email: command.email,
      password: command.password,
    });

    // ... continue with domain logic
  }
}
```

---

## Library 2: @edtech/s3

**Purpose:** AWS S3 file upload/download integration
**When:** Implement during Tutor Service document upload feature

### Step 2.1: Generate Library

```bash
# Generate library
nest generate library s3

# Create subdirectories
mkdir -p libs/s3/src/{config,interfaces}
```

### Step 2.2: Define Interfaces

**`libs/s3/src/interfaces/s3.interfaces.ts`**
```typescript
export interface S3Config {
  region: string;
  bucketName: string;
  endpoint?: string; // For local development
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url: string;
}
```

### Step 2.3: Create Configuration

**`libs/s3/src/config/s3.config.ts`**
```typescript
import { registerAs } from '@nestjs/config';

export const s3Config = registerAs('s3', () => ({
  region: process.env.S3_REGION || 'us-east-1',
  bucketName: process.env.S3_BUCKET_NAME,
  endpoint: process.env.S3_ENDPOINT, // For LocalStack
}));
```

### Step 2.4: Implement S3 Service

**`libs/s3/src/s3.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Config, UploadOptions, UploadResult } from './interfaces/s3.interfaces';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly config: S3Config;

  constructor(private readonly configService: ConfigService) {
    const s3Config = this.configService.get<S3Config>('s3');
    this.config = s3Config;

    // TODO: Initialize S3 client
    // this.s3Client = new S3Client({
    //   region: this.config.region,
    //   ...(this.config.endpoint && {
    //     endpoint: this.config.endpoint,
    //     forcePathStyle: true, // Required for LocalStack
    //   }),
    // });
  }

  async generateUploadUrl(key: string, options: UploadOptions = {}): Promise<string> {
    try {
      // TODO: Generate presigned upload URL
      // 1. Create PutObjectCommand
      // 2. Generate signed URL with expiration
      // 3. Return URL

      this.logger.log(`Upload URL generated for: ${key}`);
      throw new Error('Not implemented');
    } catch (error) {
      this.logger.error(`Failed to generate upload URL for ${key}:`, error);
      throw error;
    }
  }

  async generateDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      // TODO: Generate presigned download URL
      // 1. Create GetObjectCommand
      // 2. Generate signed URL with expiration
      // 3. Return URL

      this.logger.log(`Download URL generated for: ${key}`);
      throw new Error('Not implemented');
    } catch (error) {
      this.logger.error(`Failed to generate download URL for ${key}:`, error);
      throw error;
    }
  }

  async uploadFile(
    key: string,
    fileBuffer: Buffer,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    try {
      // TODO: Upload file directly to S3
      // 1. Create PutObjectCommand with file buffer
      // 2. Send command to S3
      // 3. Return upload result

      this.logger.log(`File uploaded: ${key}`);
      throw new Error('Not implemented');
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}:`, error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      // TODO: Delete file from S3
      // 1. Create DeleteObjectCommand
      // 2. Send command to S3
      // 3. Return success

      this.logger.log(`File deleted: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      return false;
    }
  }

  getFileUrl(key: string): string {
    // TODO: Construct public file URL
    if (this.config.endpoint) {
      return `${this.config.endpoint}/${this.config.bucketName}/${key}`;
    }
    return `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  getFileExtension(contentType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };
    return extensions[contentType] || 'bin';
  }
}
```

**Tasks for Step 2.4:**
- [ ] Install dependencies: `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
- [ ] Implement generateUploadUrl with presigned URLs
- [ ] Implement generateDownloadUrl with expiration
- [ ] Implement uploadFile for direct uploads
- [ ] Implement deleteFile
- [ ] Add file size validation
- [ ] Write integration tests

### Step 2.5: Create S3 Module

**`libs/s3/src/s3.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';
import { s3Config } from './config/s3.config';

@Module({
  imports: [ConfigModule.forFeature(s3Config)],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
```

### Step 2.6: Export Public API

**`libs/s3/src/index.ts`**
```typescript
export * from './s3.module';
export * from './s3.service';
export * from './interfaces/s3.interfaces';
```

### Step 2.7: Usage in Tutor Service

**In tutor service:**
```typescript
import { S3Service } from '@edtech/s3';

@Injectable()
export class TutorDocumentService {
  constructor(private readonly s3Service: S3Service) {}

  async uploadVerificationDocument(
    tutorId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const key = `tutors/${tutorId}/documents/${Date.now()}-${file.originalname}`;

    const result = await this.s3Service.uploadFile(
      key,
      file.buffer,
      { contentType: file.mimetype },
    );

    return result.url;
  }
}
```

---

## Library 3: @edtech/cache

**Purpose:** Redis caching wrapper
**When:** Implement when performance optimization is needed

### Step 3.1: Generate Library

```bash
# Generate library
nest generate library cache

# Create subdirectories
mkdir -p libs/cache/src/{config,interfaces}
```

### Step 3.2: Implement Cache Service

**`libs/cache/src/cache.service.ts`**
```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      // TODO: Implement cache set
      // await this.cacheManager.set(key, value, ttl);

      this.logger.debug(`Cache SET: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // TODO: Implement cache get
      // const value = await this.cacheManager.get<T>(key);
      // return value || null;

      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      // TODO: Implement cache delete
      // await this.cacheManager.del(key);

      this.logger.debug(`Cache DELETE: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      throw error;
    }
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    // TODO: Implement cache-aside pattern
    // 1. Try to get from cache
    // 2. If miss, execute function
    // 3. Store result in cache
    // 4. Return result

    this.logger.debug(`Cache WRAP: ${key}`);
    return fn();
  }
}
```

**Tasks for Step 3.2:**
- [ ] Install dependencies: `pnpm add @nestjs/cache-manager cache-manager`
- [ ] For Redis: `pnpm add cache-manager-redis-store redis`
- [ ] Implement set, get, delete methods
- [ ] Implement wrap method (cache-aside pattern)
- [ ] Add Redis connection configuration
- [ ] Write integration tests

### Step 3.3: Create Cache Module

**`libs/cache/src/cache.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // TODO: Configure Redis store
        // store: redisStore,
        // host: configService.get('REDIS_HOST'),
        // port: configService.get('REDIS_PORT'),
        ttl: 300, // Default TTL: 5 minutes
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
```

### Step 3.4: Export Public API

**`libs/cache/src/index.ts`**
```typescript
export * from './cache.module';
export * from './cache.service';
```

### Step 3.5: Usage Example

```typescript
import { CacheService } from '@edtech/cache';

@Injectable()
export class TutorService {
  constructor(private readonly cacheService: CacheService) {}

  async getTutorProfile(tutorId: string): Promise<TutorProfile> {
    const cacheKey = `tutor:profile:${tutorId}`;

    // Cache-aside pattern
    return this.cacheService.wrap(
      cacheKey,
      async () => {
        // If cache miss, fetch from database
        return this.tutorRepository.findById(tutorId);
      },
      3600, // Cache for 1 hour
    );
  }
}
```

---

## Testing Shared Libraries

### Unit Tests

**Example for `libs/auth/src/auth.service.spec.ts`:**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { CognitoAuthService } from './services/cognito-auth.service';
import { CognitoJwtService } from './services/cognito-jwt.service';

describe('AuthService', () => {
  let service: AuthService;
  let cognitoAuthService: CognitoAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: CognitoAuthService,
          useValue: {
            authenticate: jest.fn(),
          },
        },
        {
          provide: CognitoJwtService,
          useValue: {
            verifyToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    cognitoAuthService = module.get<CognitoAuthService>(CognitoAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should authenticate user', async () => {
    // TODO: Write test
  });
});
```

### Integration Tests

Test with real AWS services or LocalStack:

```typescript
describe('S3Service (Integration)', () => {
  let s3Service: S3Service;

  beforeAll(async () => {
    // Set up test module with real S3 client
  });

  it('should upload file to S3', async () => {
    const buffer = Buffer.from('test content');
    const result = await s3Service.uploadFile('test/file.txt', buffer);

    expect(result.key).toBe('test/file.txt');
    expect(result.url).toContain('s3');
  });
});
```

---

## Summary

### Implementation Order

1. **@edtech/auth** - Implement during Identity Service Phase 4
2. **@edtech/s3** - Implement during Tutor Service document upload
3. **@edtech/cache** - Implement when you need performance optimization

### Key Points

- All libraries use standard NestJS modules
- Export services through module.exports
- Use ConfigModule for configuration
- Write unit tests for business logic
- Write integration tests with AWS services
- Follow the TODO comments in each implementation step
