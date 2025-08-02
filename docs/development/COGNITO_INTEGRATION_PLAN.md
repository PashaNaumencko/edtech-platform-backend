# AWS Cognito Integration Plan for Identity Service

## Current State Analysis

Our current Identity Service has basic user management but lacks production-ready authentication features:

### ✅ **What We Have:**
- Basic user CRUD operations
- User profiles and preferences
- Simple session management
- Role-based access (STUDENT, TUTOR, ADMIN)

### ❌ **What We're Missing:**
- Secure password management
- Email/SMS verification
- Social login (Google, Facebook, Apple)
- Multi-factor authentication (MFA)
- Password reset flows
- JWT token management
- OAuth 2.0 compliance
- Account security features

## AWS Cognito Integration Architecture

### **Hybrid Authentication Flow**

#### **Frontend ↔ Cognito (Auth) + Frontend ↔ GraphQL API (Business Logic)**
- Frontend uses Cognito client SDK for authentication flows
- Frontend calls GraphQL API for all business operations
- Backend validates Cognito JWT tokens and handles business logic
- Clean separation: Cognito = Auth, GraphQL = Business

#### **AWS Cognito Handles (Frontend + Backend):**
- 🔐 **Authentication flows** (login/logout/signup)
- 📧 **Email/SMS verification**
- 🔑 **JWT token generation and validation**
- 🛡️ **Multi-factor authentication**
- 🔗 **Social login providers** (Google, Facebook, Apple)
- 🔄 **Password reset flows**
- 🛡️ **Account security** (lockouts, breach detection)

#### **PostgreSQL Handles:**
- 👤 **User profile data** (bio, skills, preferences, learning history)
- 🎯 **Business logic** (roles, status, tutoring relationships)
- 📊 **Application-specific data** (usage metrics, relationships)
- 🔗 **Service integration** (references to other microservices)

#### **GraphQL API Handles:**
- 🌐 **Business operations interface**
- 🔍 **Cognito JWT token validation**
- 👤 **User profile management**
- 🎓 **Learning platform business logic**

## Implementation Plan

### **Phase 1: Cognito User Pool Setup**

#### 1. User Pool Configuration
```typescript
// infrastructure/aws/cognito-user-pool.ts
import { CognitoIdentityProviderClient, CreateUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';

export const createUserPool = async () => {
  const userPoolConfig = {
    PoolName: 'edtech-platform-users',
    Policies: {
      PasswordPolicy: {
        MinimumLength: 8,
        RequireUppercase: true,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: false,
        TemporaryPasswordValidityDays: 7,
      },
    },
    AutoVerifiedAttributes: ['email'],
    VerificationMessageTemplate: {
      DefaultEmailOption: 'CONFIRM_WITH_CODE',
      EmailSubject: 'Welcome to EdTech Platform - Verify your email',
      EmailMessage: 'Your verification code is {####}',
    },
    Schema: [
      {
        AttributeDataType: 'String',
        Name: 'email',
        Required: true,
        Mutable: true,
      },
      {
        AttributeDataType: 'String',
        Name: 'given_name',
        Required: true,
        Mutable: true,
      },
      {
        AttributeDataType: 'String',
        Name: 'family_name',
        Required: true,
        Mutable: true,
      },
      {
        AttributeDataType: 'String',
        Name: 'custom:user_role',
        Required: false,
        Mutable: true,
      },
      {
        AttributeDataType: 'String',
        Name: 'custom:internal_user_id',
        Required: false,
        Mutable: true,
      },
    ],
    MfaConfiguration: 'OPTIONAL',
    EnabledMfas: ['SMS_MFA', 'SOFTWARE_TOKEN_MFA'],
    UserPoolTags: {
      Environment: process.env.NODE_ENV || 'development',
      Service: 'identity-service',
    },
  };

  const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });
  return await client.send(new CreateUserPoolCommand(userPoolConfig));
};
```

#### 2. User Pool Client Configuration
```typescript
// infrastructure/aws/cognito-client.ts
export const createUserPoolClient = async (userPoolId: string) => {
  const clientConfig = {
    UserPoolId: userPoolId,
    ClientName: 'edtech-web-app',
    GenerateSecret: false, // Frontend web applications don't use secrets
    RefreshTokenValidity: 30, // 30 days
    AccessTokenValidity: 1, // 1 hour
    IdTokenValidity: 1, // 1 hour
    TokenValidityUnits: {
      RefreshToken: 'days',
      AccessToken: 'hours',
      IdToken: 'hours',
    },
    ReadAttributes: [
      'email',
      'email_verified',
      'given_name',
      'family_name',
      'custom:user_role',
    ],
    WriteAttributes: [
      'given_name',
      'family_name',
    ],
    ExplicitAuthFlows: [
      'ALLOW_USER_SRP_AUTH', // Frontend authentication
      'ALLOW_REFRESH_TOKEN_AUTH',
    ],
    SupportedIdentityProviders: ['COGNITO', 'Google', 'Facebook'],
    CallbackURLs: [
      'http://localhost:3000/auth/callback',
      'https://app.edtech.com/auth/callback',
    ],
    LogoutURLs: [
      'http://localhost:3000/',
      'https://app.edtech.com/',
    ],
    AllowedOAuthFlows: ['code'],
    AllowedOAuthScopes: ['openid', 'email', 'profile'],
    AllowedOAuthFlowsUserPoolClient: true,
  };

  return await client.send(new CreateUserPoolClientCommand(clientConfig));
};
```

### **Phase 2: Updated Database Schema**

#### Enhanced User Schema with Cognito Integration
```typescript
// apps/identity-service/src/infrastructure/database/schemas/user.schema.ts
import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum, boolean } from 'drizzle-orm/pg-core';

// Enhanced user table with Cognito integration
export const users = pgTable('users', {
  // Internal ID (primary key for our system)
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Cognito integration
  cognitoUserId: varchar('cognito_user_id', { length: 128 }).unique(), // Cognito Sub
  cognitoUsername: varchar('cognito_username', { length: 128 }).unique(),
  
  // Basic user info (synced from Cognito)
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  
  // Application-specific data (not in Cognito)
  role: userRoleEnum('role').notNull().default('STUDENT'),
  status: userStatusEnum('status').notNull().default('PENDING_VERIFICATION'),
  bio: text('bio'),
  skills: jsonb('skills').default([]),
  
  // Sync tracking
  cognitoSyncedAt: timestamp('cognito_synced_at'),
  lastLoginAt: timestamp('last_login_at'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Social login providers
export const socialLogins = pgTable('social_logins', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  provider: varchar('provider', { length: 50 }).notNull(), // 'Google', 'Facebook', 'Apple'
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  providerEmail: varchar('provider_email', { length: 255 }),
  isVerified: boolean('is_verified').default(false),
  connectedAt: timestamp('connected_at').defaultNow(),
});

// Authentication events for security monitoring
export const authEvents = pgTable('auth_events', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  cognitoUserId: varchar('cognito_user_id', { length: 128 }),
  eventType: varchar('event_type', { length: 50 }).notNull(), // LOGIN, LOGOUT, PASSWORD_RESET, MFA_CHALLENGE
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 1000 }),
  location: jsonb('location'), // Country, city from IP
  success: boolean('success').notNull(),
  failureReason: varchar('failure_reason', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### **Phase 3: Backend Cognito JWT Validation**

#### Cognito JWT Verification Service
```typescript
// apps/identity-service/src/infrastructure/auth/cognito-jwt.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export interface CognitoTokenPayload {
  sub: string; // Cognito User ID
  email: string;
  email_verified: boolean;
  given_name: string;
  family_name: string;
  'custom:user_role'?: string;
  token_use: 'access' | 'id';
  aud: string; // Client ID
  iss: string; // User Pool ID
  exp: number;
  iat: number;
}

@Injectable()
export class CognitoJwtService {
  private accessTokenVerifier: CognitoJwtVerifier;
  private idTokenVerifier: CognitoJwtVerifier;
  
  constructor() {
    // Verify access tokens
    this.accessTokenVerifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      tokenUse: 'access',
      clientId: process.env.COGNITO_CLIENT_ID!,
    });
    
    // Verify ID tokens (contains user attributes)
    this.idTokenVerifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      tokenUse: 'id',
      clientId: process.env.COGNITO_CLIENT_ID!,
    });
  }

  async verifyAccessToken(token: string): Promise<CognitoTokenPayload> {
    try {
      const payload = await this.accessTokenVerifier.verify(token);
      return payload as CognitoTokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async verifyIdToken(token: string): Promise<CognitoTokenPayload> {
    try {
      const payload = await this.idTokenVerifier.verify(token);
      return payload as CognitoTokenPayload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired ID token');
    }
  }

  extractCognitoUserData(tokenPayload: CognitoTokenPayload) {
    return {
      cognitoUserId: tokenPayload.sub,
      email: tokenPayload.email,
      emailVerified: tokenPayload.email_verified,
      firstName: tokenPayload.given_name,
      lastName: tokenPayload.family_name,
      role: tokenPayload['custom:user_role'] || 'STUDENT',
    };
  }
}
```

### **Phase 4: Authentication Guards and Middleware**

#### Cognito JWT Authentication Guard
```typescript
// apps/identity-service/src/presentation/guards/cognito-jwt-auth.guard.ts
@Injectable()
export class CognitoJwtAuthGuard implements CanActivate {
  constructor(
    private cognitoJwtService: CognitoJwtService,
    @Inject(DI_TOKENS.USER_REPOSITORY)
    private userRepository: IUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token required');
    }

    try {
      // Verify Cognito JWT token
      const cognitoPayload = await this.cognitoJwtService.verifyAccessToken(token);
      
      // Get or create user in our database
      let user = await this.userRepository.findByCognitoUserId(cognitoPayload.sub);
      
      if (!user) {
        // First time user - create profile from Cognito data
        const userData = this.cognitoJwtService.extractCognitoUserData(cognitoPayload);
        user = await this.createUserFromCognito(userData);
      }
      
      // Attach user to request for GraphQL context
      request.user = user;
      request.cognitoPayload = cognitoPayload;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async createUserFromCognito(cognitoData: any): Promise<User> {
    // Create user entity from Cognito data
    const user = User.createFromCognito(cognitoData);
    return await this.userRepository.save(user);
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// Role-based authorization guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.some(role => user.role === role);
  }
}
```

### **Phase 5: GraphQL Business Logic Integration**

#### User Profile Resolvers
```typescript
// apps/identity-service/src/presentation/graphql/resolvers/user.resolver.ts
@Resolver(() => User)
export class UserResolver {
  constructor(
    @Inject(DI_TOKENS.USER_REPOSITORY)
    private userRepository: IUserRepository,
    @Inject(DI_TOKENS.UPDATE_USER_PROFILE_USE_CASE)
    private updateUserProfileUseCase: UpdateUserProfileUseCase,
  ) {}

  @Query(() => User)
  @UseGuards(CognitoJwtAuthGuard)
  async me(@Context() context: any): Promise<User> {
    // User is automatically created/synced in the guard
    return context.req.user;
  }

  @Query(() => User, { nullable: true })
  @UseGuards(CognitoJwtAuthGuard)
  async user(@Args('id') id: string): Promise<User | null> {
    return await this.userRepository.findById(id);
  }

  @Mutation(() => User)
  @UseGuards(CognitoJwtAuthGuard)
  async updateProfile(
    @Context() context: any,
    @Args('input') input: UpdateUserProfileInput,
  ): Promise<User> {
    const currentUser = context.req.user;
    
    return await this.updateUserProfileUseCase.execute({
      userId: currentUser.id,
      ...input,
    });
  }

  @Mutation(() => User)
  @UseGuards(CognitoJwtAuthGuard, RolesGuard)
  @Roles('STUDENT')
  async becomeTutor(
    @Context() context: any,
    @Args('input') input: BecomeTutorInput,
  ): Promise<User> {
    const currentUser = context.req.user;
    
    // Update user role to TUTOR
    currentUser.changeRole('TUTOR');
    currentUser.updateTutorProfile(input);
    
    return await this.userRepository.save(currentUser);
  }

  // Field resolvers for related data
  @ResolveField(() => UserProfile)
  async profile(@Parent() user: User): Promise<UserProfile> {
    return await this.userRepository.findUserProfile(user.id);
  }

  @ResolveField(() => [TutorReview])
  async reviews(@Parent() user: User): Promise<TutorReview[]> {
    if (user.role !== 'TUTOR') return [];
    // This would call another service via GraphQL federation
    return [];
  }
}
```

#### Authentication Flow Example (Frontend)
```typescript
// Frontend flow with AWS Amplify + GraphQL
import { Auth } from '@aws-amplify/auth';
import { GraphQLClient } from 'graphql-request';

// 1. Configure Amplify with Cognito
Auth.configure({
  userPoolId: 'us-east-1_ABC123DEF',
  userPoolWebClientId: 'abcdef123456789',
  region: 'us-east-1',
});

// 2. Sign up with Cognito (frontend handles this)
const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
  try {
    const result = await Auth.signUp({
      username: email,
      password,
      attributes: {
        email,
        given_name: firstName,
        family_name: lastName,
        'custom:user_role': 'STUDENT',
      },
    });
    return result;
  } catch (error) {
    console.error('Sign up error:', error);
  }
};

// 3. Sign in with Cognito (frontend handles this)
const signIn = async (email: string, password: string) => {
  try {
    const user = await Auth.signIn(email, password);
    
    // Get the JWT token
    const session = await Auth.currentSession();
    const accessToken = session.getAccessToken().getJwtToken();
    
    // Now call GraphQL API with token for business operations
    const client = new GraphQLClient('http://localhost:3001/graphql', {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    
    // First GraphQL call will create user profile if needed
    const profile = await client.request(`
      query Me {
        me {
          id
          email
          firstName
          lastName
          role
          status
          profile {
            bio
            skills
            timezone
          }
        }
      }
    `);
    
    return { user, profile };
  } catch (error) {
    console.error('Sign in error:', error);
  }
};

// 4. Business operations via GraphQL (with Cognito token)
const updateProfile = async (bio: string, skills: string[]) => {
  const session = await Auth.currentSession();
  const accessToken = session.getAccessToken().getJwtToken();
  
  const client = new GraphQLClient('http://localhost:3001/graphql', {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  
  return await client.request(`
    mutation UpdateProfile($input: UpdateUserProfileInput!) {
      updateProfile(input: $input) {
        id
        profile {
          bio
          skills
        }
      }
    }
  `, {
    input: { bio, skills },
  });
};
```

## Environment Variables

```bash
# AWS Cognito Configuration (Backend validation only)
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_ABC123DEF
COGNITO_CLIENT_ID=abcdef123456789

# Database
IDENTITY_DB_HOST=localhost
IDENTITY_DB_PORT=5432
IDENTITY_DB_NAME=edtech_identity_db
IDENTITY_DB_USER=postgres
IDENTITY_DB_PASSWORD=password

# Frontend Environment (for Amplify configuration)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_ABC123DEF
NEXT_PUBLIC_COGNITO_CLIENT_ID=abcdef123456789
NEXT_PUBLIC_COGNITO_REGION=us-east-1
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:3001/graphql
```

## Authentication Flow Summary

### **1. Frontend Authentication (Cognito)**
- User signs up/in via AWS Amplify Cognito SDK
- Frontend handles password reset, email verification, MFA
- Social login (Google, Facebook, Apple) via Cognito
- Frontend receives Cognito JWT tokens

### **2. Business Operations (GraphQL)**
- Frontend calls GraphQL API with Cognito access token
- Backend validates token and extracts user info
- First API call automatically creates user profile
- All business logic handled via GraphQL mutations/queries

### **3. Benefits of Hybrid Approach**
- ✅ **Cognito expertise**: Authentication, security, compliance
- ✅ **GraphQL flexibility**: Business logic, relationships, federation
- ✅ **Clean separation**: Auth vs Business concerns
- ✅ **Frontend simplicity**: Standard AWS Amplify patterns
- ✅ **Backend control**: User profiles, business rules, data integrity

## Benefits of Cognito Integration

### **Security Features**
- ✅ **Enterprise-grade security** with AWS compliance
- ✅ **Multi-factor authentication** (SMS, TOTP)
- ✅ **Breach detection** and account lockouts
- ✅ **Password policies** and strength requirements

### **Developer Experience**
- ✅ **OAuth 2.0 compliance** out of the box
- ✅ **Social login providers** pre-integrated
- ✅ **JWT token management** handled by AWS
- ✅ **Email/SMS verification** flows included

### **Scalability & Reliability**
- ✅ **AWS managed service** with 99.9% uptime SLA
- ✅ **Global availability** with edge locations
- ✅ **Auto-scaling** for authentication load
- ✅ **GDPR compliance** and data residency options

### **Cost Efficiency**
- ✅ **Free tier**: 50,000 MAUs (Monthly Active Users)
- ✅ **Pay-per-use** pricing model
- ✅ **No infrastructure** management overhead

This implementation provides production-ready authentication while maintaining our microservices architecture and allowing for future scaling.