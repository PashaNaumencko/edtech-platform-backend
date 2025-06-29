# Phase 1: GraphQL Federation Foundation & User Service
**Duration: 14 days | Priority: Critical**

## Phase Overview

This phase establishes the **GraphQL Federation** architecture foundation and implements the User Service as the first subgraph. It demonstrates the pattern that all subsequent services will follow.

### Architecture Pattern
- **Supergraph**: AWS AppSync (unified GraphQL API)
- **Subgraphs**: Each microservice defines its domain schema
- **Resolvers**: Lambda functions call internal microservice APIs
- **Internal APIs**: HTTP REST with `/internal` prefix

## Subphase 1.1: GraphQL Federation Setup (3 days)

### GraphQL Composition Tooling
- Set up Apollo Federation composition tools
- Create schema composition CI/CD pipeline
- Implement subgraph validation and testing
- Set up schema registry for versioning

### AppSync Infrastructure (CDK)
```typescript
// cdk/lib/stacks/graphql-api-stack.ts
export class GraphQLApiStack extends Stack {
  public readonly graphqlApi: GraphqlApi;
  
  constructor(scope: Construct, id: string, props: GraphQLApiStackProps) {
    // Create AppSync API with Cognito auth
    this.graphqlApi = new GraphqlApi(this, 'EdTechGraphQLApi', {
      name: 'EdTech-Platform-API',
      schema: SchemaFile.fromAsset(path.join(__dirname, '../graphql/supergraph.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: { userPool: props.userPool },
        },
      },
    });
  }
}
```

## Subphase 1.2: User Service Subgraph Implementation (4 days)

### User Service Folder Structure Implementation
Following our standardized microservice architecture:

```typescript
apps/user-service/
├── src/
│   ├── domain/                           # 🔵 DOMAIN LAYER
│   │   ├── entities/
│   │   │   ├── user.entity.ts            # AggregateRoot from @nestjs/cqrs
│   │   │   ├── tutor-profile.entity.ts
│   │   │   ├── social-account.entity.ts
│   │   │   └── index.ts
│   │   ├── value-objects/
│   │   │   ├── email.vo.ts
│   │   │   ├── user-id.vo.ts
│   │   │   └── index.ts
│   │   ├── events/                       # Domain events
│   │   │   ├── user-created.event.ts
│   │   │   ├── user-became-tutor.event.ts
│   │   │   └── index.ts
│   │   ├── repositories/                 # Repository interfaces
│   │   │   ├── user.repository.ts
│   │   │   └── index.ts
│   │   └── exceptions/
│   │       ├── user-not-found.exception.ts
│   │       └── index.ts
│   │
│   ├── application/                      # 🟡 APPLICATION LAYER
│   │   ├── use-cases/                    # 🎯 USE CASES (business flows)
│   │   │   ├── create-user/
│   │   │   │   ├── create-user.usecase.ts
│   │   │   │   ├── create-user.request.ts
│   │   │   │   └── create-user.response.ts
│   │   │   ├── update-profile/
│   │   │   │   ├── update-profile.usecase.ts
│   │   │   │   ├── update-profile.request.ts
│   │   │   │   └── update-profile.response.ts
│   │   │   ├── become-tutor/
│   │   │   │   ├── become-tutor.usecase.ts
│   │   │   │   ├── become-tutor.request.ts
│   │   │   │   └── become-tutor.response.ts
│   │   │   └── search-users/
│   │   │       ├── search-users.usecase.ts
│   │   │       ├── search-users.request.ts
│   │   │       └── search-users.response.ts
│   │   ├── event-handlers/               # Local event handlers
│   │   │   ├── user-created.handler.ts
│   │   │   └── user-became-tutor.handler.ts
│   │   ├── dto/
│   │   │   ├── user.dto.ts
│   │   │   └── index.ts
│   │   └── ports/                        # External service interfaces
│   │       ├── email.port.ts
│   │       └── event-bus.port.ts
│   │
│   ├── infrastructure/                   # 🔴 INFRASTRUCTURE LAYER
│   │   ├── database/
│   │   │   ├── entities/                 # TypeORM entities
│   │   │   │   ├── user.orm-entity.ts
│   │   │   │   ├── tutor-profile.orm-entity.ts
│   │   │   │   └── social-account.orm-entity.ts
│   │   │   ├── repositories/             # Repository implementations
│   │   │   │   ├── user.repository.impl.ts
│   │   │   │   └── index.ts
│   │   │   ├── migrations/
│   │   │   │   ├── 001-create-users.ts
│   │   │   │   ├── 002-create-tutor-profiles.ts
│   │   │   │   └── 003-create-social-accounts.ts
│   │   │   └── mappers/                  # Domain ↔ ORM mappers
│   │   │       ├── user.mapper.ts
│   │   │       └── index.ts
│   │   ├── postgres/                     # PostgreSQL specific
│   │   │   ├── connection/
│   │   │   │   ├── postgres.config.ts
│   │   │   │   └── postgres.module.ts
│   │   │   └── repositories/
│   │   │       └── postgres-user.repository.ts
│   │   ├── redis/                        # Redis caching & sessions
│   │   │   ├── connection/
│   │   │   │   ├── redis.config.ts
│   │   │   │   └── redis.module.ts
│   │   │   └── cache/
│   │   │       └── user.cache.ts
│   │   ├── cognito-auth/                 # AWS Cognito authentication
│   │   │   ├── connection/
│   │   │   │   ├── cognito.config.ts
│   │   │   │   └── cognito.module.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── jwt.service.ts
│   │   │   └── guards/
│   │   │       └── cognito-auth.guard.ts
│   │   ├── s3/                           # S3 for profile images
│   │   │   ├── connection/
│   │   │   │   ├── s3.config.ts
│   │   │   │   └── s3.module.ts
│   │   │   └── services/
│   │   │       └── profile-image.service.ts
│   │   ├── email/                        # Email service
│   │   │   ├── connection/
│   │   │   │   ├── email.config.ts
│   │   │   │   └── email.module.ts
│   │   │   ├── services/
│   │   │   │   └── email.service.ts
│   │   │   └── templates/
│   │   │       └── welcome.template.ts
│   │   └── event-bridge/                 # EventBridge messaging
│   │       ├── connection/
│   │       │   ├── event-bridge.config.ts
│   │       │   └── event-bridge.module.ts
│   │       ├── publishers/
│   │       │   └── user-event.publisher.ts
│   │       └── mappers/
│   │           └── event.mapper.ts
│   │
│   ├── presentation/                     # 🟢 PRESENTATION LAYER
│   │   ├── http/
│   │   │   ├── controllers/
│   │   │   │   ├── internal/             # Internal APIs for Lambda resolvers
│   │   │   │   │   ├── users.internal.controller.ts
│   │   │   │   │   └── auth.internal.controller.ts
│   │   │   │   └── public/               # Public APIs
│   │   │   │       └── health.controller.ts
│   │   │   ├── guards/
│   │   │   │   └── service-auth.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   └── transform.interceptor.ts
│   │   │   └── filters/
│   │   │       └── http-exception.filter.ts
│   │   ├── graphql/
│   │   │   ├── schemas/
│   │   │   │   └── user.subgraph.graphql
│   │   │   ├── federation/
│   │   │   │   └── schema-export.ts
│   │   │   └── scalars/
│   │   │       └── date-time.scalar.ts
│   │   └── events/
│   │       └── handlers/
│   │           └── external-user.handler.ts
│   │
│   ├── shared/
│   │   ├── constants/
│   │   │   └── user.constants.ts
│   │   ├── enums/
│   │   │   ├── user-status.enum.ts
│   │   │   └── tutor-status.enum.ts
│   │   └── types/
│   │       └── user.types.ts
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── aws.config.ts
│   │
│   ├── main.ts
│   └── app.module.ts
```

### Use Case Implementation Examples

```typescript
// application/use-cases/create-user/create-user.usecase.ts
import { IUseCase } from '@edtech/types';

@Injectable()
export class CreateUserUseCase implements IUseCase<CreateUserRequest, CreateUserResponse> {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus,
    private emailService: EmailPort,
  ) {}

  async execute(request: CreateUserRequest): Promise<CreateUserResponse> {
    // 1. Create domain entity
    const user = User.create({
      email: new Email(request.email),
      profile: UserProfile.create(request.profile),
    });

    // 2. Persist to database
    const savedUser = await this.userRepository.save(user);

    // 3. Commit domain events (triggers event handlers)
    savedUser.commit();

    // 4. Return response
    return CreateUserResponse.fromDomain(savedUser);
  }
}

// application/use-cases/create-user/create-user.request.ts
export class CreateUserRequest {
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    timezone?: string;
    locale?: string;
  };
}

// application/use-cases/create-user/create-user.response.ts
export class CreateUserResponse {
  id: string;
  email: string;
  profile: UserProfileDto;
  createdAt: Date;

  static fromDomain(user: User): CreateUserResponse {
    return {
      id: user.id.value,
      email: user.email.value,
      profile: UserProfileDto.fromDomain(user.profile),
      createdAt: user.createdAt,
    };
  }
}
```

### Domain Entity with AggregateRoot

```typescript
// domain/entities/user.entity.ts
import { AggregateRoot } from '@nestjs/cqrs';
import { UserCreatedEvent, UserBecameTutorEvent } from '../events';

export class User extends AggregateRoot {
  constructor(
    private readonly _id: UserId,
    private readonly _email: Email,
    private _profile: UserProfile,
    private _isTutor: boolean = false,
    private _tutorProfile?: TutorProfile,
    private readonly _createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateUserData): User {
    const user = new User(
      UserId.generate(),
      new Email(data.email),
      UserProfile.create(data.profile),
    );

    // Apply domain event
    user.apply(new UserCreatedEvent(user));
    return user;
  }

  becomeTutor(tutorData: BecomeTutorData): void {
    if (this._isTutor) {
      throw new UserAlreadyTutorException();
    }

    this._isTutor = true;
    this._tutorProfile = TutorProfile.create(tutorData);

    // Apply domain event
    this.apply(new UserBecameTutorEvent(this));
  }

  updateProfile(profileData: UpdateProfileData): void {
    this._profile = this._profile.update(profileData);
    this.apply(new UserProfileUpdatedEvent(this));
  }

  // Getters
  get id(): UserId { return this._id; }
  get email(): Email { return this._email; }
  get profile(): UserProfile { return this._profile; }
  get isTutor(): boolean { return this._isTutor; }
  get tutorProfile(): TutorProfile | undefined { return this._tutorProfile; }
  get createdAt(): Date { return this._createdAt; }
}
```

### Event Handler Implementation

```typescript
// application/event-handlers/user-created.handler.ts
@EventsHandler(UserCreatedEvent)
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  constructor(
    private emailService: EmailPort,
    private analyticsService: AnalyticsPort,
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    // Side effects triggered by user creation
    await Promise.all([
      this.emailService.sendWelcomeEmail(event.user.email.value),
      this.analyticsService.trackUserCreated(event.user.id.value),
    ]);
  }
}
```

### User Subgraph Schema
```graphql
# apps/user-service/src/graphql/user.subgraph.graphql
extend type Query {
  me: User
  user(id: ID!): User @auth(requires: USER)
  searchUsers(query: String!, limit: Int = 20): [User!]!
}

extend type Mutation {
  updateProfile(input: UpdateProfileInput!): User! @auth(requires: USER)
  becomeTutor(input: BecomeTutorInput!): User! @auth(requires: USER)
  linkSocialAccount(input: SocialAuthInput!): User! @auth(requires: USER)
}

type User @key(fields: "id") {
  id: ID!
  email: String!
  profile: UserProfile!
  isTutor: Boolean!
  tutorProfile: TutorProfile
  socialAccounts: [SocialAccount!]!
  isActive: Boolean!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type UserProfile {
  firstName: String!
  lastName: String!
  fullName: String!
  timezone: String
  locale: String
  preferredLanguage: String
  videoIntroUrl: String
  onboardingCompleted: Boolean!
}

type TutorProfile {
  isActive: Boolean!
  hourlyRate: Float
  currency: String
  subjects: [String!]!
  languages: [String!]!
  experience: String
  education: String
  description: String
  rating: Float
  totalReviews: Int!
}

# Federation relationships
extend type Course @key(fields: "id") {
  id: ID! @external
  tutorId: ID! @external
  tutor: User @requires(fields: "tutorId")
}

extend type Booking @key(fields: "id") {
  id: ID! @external
  studentId: ID! @external
  tutorId: ID! @external
  student: User @requires(fields: "studentId")
  tutor: User @requires(fields: "tutorId")
}
```

### Internal HTTP API Controllers
```typescript
// presentation/http/controllers/internal/users.internal.controller.ts
@Controller('internal/users')
@UseGuards(ServiceAuthGuard) // Service-to-service auth
export class InternalUsersController {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private updateProfileUseCase: UpdateProfileUseCase,
    private becomeEutorUseCase: BecomeTutorUseCase,
    private searchUsersUseCase: SearchUsersUseCase,
  ) {}
  
  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserDto> {
    const request = new GetUserRequest();
    request.id = id;
    
    const response = await this.getUserUseCase.execute(request);
    return response.user;
  }
  
  @Get()
  async searchUsers(@Query() query: SearchUsersDto): Promise<UserDto[]> {
    const request = new SearchUsersRequest();
    request.query = query.query;
    request.limit = query.limit;
    
    const response = await this.searchUsersUseCase.execute(request);
    return response.users;
  }
  
  @Post()
  async createUser(@Body() dto: CreateUserDto): Promise<UserDto> {
    const request = new CreateUserRequest();
    request.email = dto.email;
    request.profile = dto.profile;
    
    const response = await this.createUserUseCase.execute(request);
    return response.user;
  }
  
  @Put(':id/profile')
  async updateProfile(
    @Param('id') id: string, 
    @Body() dto: UpdateProfileDto
  ): Promise<UserDto> {
    const request = new UpdateProfileRequest();
    request.id = id;
    request.profile = dto.profile;
    
    const response = await this.updateProfileUseCase.execute(request);
    return response.user;
  }
  
  @Post(':id/become-tutor')
  async becomeTutor(
    @Param('id') id: string,
    @Body() dto: BecomeTutorDto
  ): Promise<UserDto> {
    const request = new BecomeTutorRequest();
    request.userId = id;
    request.tutorProfile = dto.tutorProfile;
    
    const response = await this.becomeTutorUseCase.execute(request);
    return response.user;
  }
}

// presentation/http/controllers/internal/auth.internal.controller.ts
@Controller('internal/auth')
@UseGuards(ServiceAuthGuard)
export class InternalAuthController {
  
  @Post('validate-token')
  async validateToken(@Body() { token }: { token: string }) {
    const request = new ValidateTokenRequest();
    request.token = token;
    
    const response = await this.validateTokenUseCase.execute(request);
    return response.user;
  }
  
  @Post('social-link')
  async linkSocialAccount(@Body() dto: LinkSocialAccountDto) {
    const request = new LinkSocialAccountRequest();
    request.userId = dto.userId;
    request.provider = dto.provider;
    request.providerAccountId = dto.providerAccountId;
    
    const response = await this.linkSocialAccountUseCase.execute(request);
    return response.user;
  }
}
```

### GraphQL Subgraph Schema
```graphql
# presentation/graphql/schemas/user.subgraph.graphql
extend type Query {
  me: User
  user(id: ID!): User @auth(requires: USER)
  searchUsers(query: String!, limit: Int = 20): [User!]!
}

extend type Mutation {
  updateProfile(input: UpdateProfileInput!): User! @auth(requires: USER)
  becomeTutor(input: BecomeTutorInput!): User! @auth(requires: USER)
  linkSocialAccount(input: SocialAuthInput!): User! @auth(requires: USER)
}

type User @key(fields: "id") {
  id: ID!
  email: String!
  profile: UserProfile!
  isTutor: Boolean!
  tutorProfile: TutorProfile
  socialAccounts: [SocialAccount!]!
  isActive: Boolean!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type UserProfile {
  firstName: String!
  lastName: String!
  fullName: String!
  timezone: String
  locale: String
  preferredLanguage: String
  videoIntroUrl: String
  onboardingCompleted: Boolean!
}

type TutorProfile {
  isActive: Boolean!
  hourlyRate: Float
  currency: String
  subjects: [String!]!
  languages: [String!]!
  experience: String
  education: String
  description: String
  rating: Float
  totalReviews: Int!
}

# Federation relationships
extend type Course @key(fields: "id") {
  id: ID! @external
  tutorId: ID! @external
  tutor: User @requires(fields: "tutorId")
}

extend type Booking @key(fields: "id") {
  id: ID! @external
  studentId: ID! @external
  tutorId: ID! @external
  student: User @requires(fields: "studentId")
  tutor: User @requires(fields: "tutorId")
}
```

### Lambda Resolvers (Central GraphQL API)
```typescript
// graphql-api/resolvers/user-resolvers.ts
import { AppSyncResolverHandler } from 'aws-lambda';
import { UserServiceClient } from '../clients/user-service-client';

const userServiceClient = new UserServiceClient({
  baseURL: process.env.USER_SERVICE_URL,
});

export const getUserResolver: AppSyncResolverHandler<any, any> = async (event) => {
  const { id } = event.arguments;
  
  try {
    // Calls internal API, returns UserDto
    const user = await userServiceClient.getUser(id);
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('User not found');
  }
};

export const meResolver: AppSyncResolverHandler<any, any> = async (event) => {
  const userId = event.identity.sub; // From Cognito
  
  try {
    // Calls internal API, returns UserDto
    const user = await userServiceClient.getUser(userId);
    return user;
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    throw new Error('Failed to fetch user profile');
  }
};

export const updateProfileResolver: AppSyncResolverHandler<any, any> = async (event) => {
  const { input } = event.arguments;
  const userId = event.identity.sub;
  
  try {
    // Calls internal API, returns UserDto
    const user = await userServiceClient.updateProfile(userId, input);
    return user;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw new Error('Failed to update profile');
  }
};

// Federation resolver for Course.tutor field
export const courseTutorResolver: AppSyncResolverHandler<any, any> = async (event) => {
  const { tutorId } = event.source;
  
  try {
    // Calls internal API, returns UserDto
    const tutor = await userServiceClient.getUser(tutorId);
    return tutor;
  } catch (error) {
    console.error('Failed to fetch course tutor:', error);
    return null;
  }
};
```

## Subphase 1.3: Database & Domain Logic (4 days)

### PostgreSQL Schema
```sql
-- Database migration for user service
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  timezone VARCHAR(50),
  locale VARCHAR(10),
  preferred_language VARCHAR(10),
  video_intro_url VARCHAR(500),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  is_tutor BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tutor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT FALSE,
  hourly_rate DECIMAL(10,2),
  currency VARCHAR(3),
  subjects TEXT[],
  languages TEXT[],
  experience TEXT,
  education TEXT,
  description TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255) NOT NULL,
  linked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_tutor ON users(is_tutor);
CREATE INDEX idx_tutor_profiles_user_id ON tutor_profiles(user_id);
CREATE INDEX idx_tutor_profiles_subjects ON tutor_profiles USING GIN(subjects);
CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);
```

### Service Implementation
```typescript
// apps/user-service/src/services/user.service.ts
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TutorProfile)
    private tutorProfileRepository: Repository<TutorProfile>,
    private eventBus: EventBusService,
  ) {}

  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
      relations: ['tutorProfile', 'socialAccounts'],
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);
    
    // Publish domain event
    await this.eventBus.publish({
      source: 'user-service',
      detailType: 'User Created',
      detail: {
        userId: savedUser.id,
        email: savedUser.email,
        isTutor: savedUser.isTutor,
      },
    });
    
    return savedUser;
  }

  async updateProfile(id: string, updateDto: UpdateProfileDto): Promise<User> {
    await this.userRepository.update(id, updateDto);
    const updatedUser = await this.findById(id);
    
    // Publish domain event
    await this.eventBus.publish({
      source: 'user-service',
      detailType: 'User Profile Updated',
      detail: {
        userId: id,
        changes: updateDto,
      },
    });
    
    return updatedUser;
  }

  async becomeTutor(id: string, tutorDto: BecomeTutorDto): Promise<User> {
    // Update user to be tutor
    await this.userRepository.update(id, { isTutor: true });
    
    // Create tutor profile
    const tutorProfile = this.tutorProfileRepository.create({
      userId: id,
      ...tutorDto,
    });
    await this.tutorProfileRepository.save(tutorProfile);
    
    const updatedUser = await this.findById(id);
    
    // Publish domain event
    await this.eventBus.publish({
      source: 'user-service',
      detailType: 'User Became Tutor',
      detail: {
        userId: id,
        tutorProfile: tutorDto,
      },
    });
    
    return updatedUser;
  }
}
```

## Subphase 1.4: Service-to-Service Authentication (3 days)

### Service JWT Authentication
```typescript
// libs/auth/src/service-auth.guard.ts
@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('Service token required');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.SERVICE_JWT_SECRET,
      });
      
      // Verify this is a service token
      if (payload.type !== 'service') {
        throw new UnauthorizedException('Invalid token type');
      }
      
      request.serviceContext = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid service token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// Service client for inter-service communication
export class UserServiceClient {
  constructor(private config: { baseURL: string }) {}

  private async getServiceToken(): Promise<string> {
    return this.jwtService.sign(
      { 
        service: 'lambda-resolver',
        type: 'service',
        permissions: ['user:read', 'user:write']
      },
      { 
        secret: process.env.SERVICE_JWT_SECRET,
        expiresIn: '1h'
      }
    );
  }

  async getUser(id: string): Promise<UserDto> {
    const token = await this.getServiceToken();
    const response = await axios.get(`${this.config.baseURL}/internal/users/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }
}
```

## Schema Composition Process

### Automated Schema Composition
```typescript
// graphql-api/composition/compose-schema.ts
import { composeServices } from '@apollo/composition';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface SubgraphConfig {
  name: string;
  schemaPath: string;
  serviceUrl: string;
}

const subgraphs: SubgraphConfig[] = [
  {
    name: 'user',
    schemaPath: '../apps/user-service/src/graphql/user.subgraph.graphql',
    serviceUrl: 'http://user-service:3001',
  },
  {
    name: 'learning',
    schemaPath: '../apps/learning-service/src/graphql/learning.subgraph.graphql',
    serviceUrl: 'http://learning-service:3002',
  },
  // Add more subgraphs as they're implemented
];

export async function composeSupergraph(): Promise<string> {
  const serviceList = subgraphs.map(subgraph => ({
    name: subgraph.name,
    typeDefs: readFileSync(join(__dirname, subgraph.schemaPath), 'utf8'),
    url: subgraph.serviceUrl,
  }));

  const { schema, errors } = composeServices(serviceList);

  if (errors && errors.length > 0) {
    console.error('Schema composition errors:', errors);
    throw new Error(`Schema composition failed: ${errors.map(e => e.message).join(', ')}`);
  }

  // Write composed schema for AppSync
  const supergraphPath = join(__dirname, '../schemas/supergraph.graphql');
  writeFileSync(supergraphPath, schema);

  console.log('✅ Supergraph composed successfully');
  return schema;
}

// CLI script for composition
if (require.main === module) {
  composeSupergraph()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Composition failed:', error);
      process.exit(1);
    });
}
```

### CI/CD Integration
```yaml
# .github/workflows/schema-composition.yml
name: GraphQL Schema Composition

on:
  push:
    paths:
      - 'apps/*/src/graphql/**'
      - 'graphql-api/**'

jobs:
  compose-schema:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Validate subgraph schemas
        run: pnpm validate:subgraphs
        
      - name: Compose supergraph
        run: pnpm compose:schema
        
      - name: Deploy to AppSync (if main branch)
        if: github.ref == 'refs/heads/main'
        run: pnpm cdk deploy GraphQLApiStack
```

## Success Criteria for Phase 1

### Technical Acceptance Criteria
- ✅ User subgraph schema validates and composes successfully
- ✅ AppSync API deployed with user operations working
- ✅ Lambda resolvers successfully call user service internal APIs
- ✅ User service internal APIs respond correctly with authentication
- ✅ Database operations (CRUD) working for users and tutor profiles
- ✅ Service-to-service authentication implemented and tested

### Functional Acceptance Criteria
- ✅ Users can be queried via GraphQL API
- ✅ User profiles can be updated via GraphQL mutations
- ✅ Users can become tutors via GraphQL mutation
- ✅ Social account linking works
- ✅ Federation resolvers work for User references in other types
- ✅ Real-time subscriptions working for user updates

### Performance Criteria
- ✅ GraphQL query response time < 200ms for simple queries
- ✅ Database queries optimized with proper indexing
- ✅ Lambda cold start time < 1 second
- ✅ Service-to-service calls < 100ms within VPC

## Phase Dependencies
- **Prerequisites**: Phase 0 (Project Setup & Foundation) completed
- **Requires**: CDK infrastructure, user service basic structure
- **Outputs**: Working GraphQL Federation foundation, User Service subgraph

## Next Phase
This foundation sets up the entire GraphQL Federation architecture and demonstrates the pattern for all subsequent services. Phase 2 will implement the Learning Service following the same pattern. 