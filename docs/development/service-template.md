# Service Implementation Template

This template provides a standardized approach for implementing new services in the EdTech platform.

## 📁 Service Structure

```
apps/[service-name]/
├── src/
│   ├── domain/                 # Domain layer
│   │   ├── entities/          # Domain entities
│   │   ├── value-objects/     # Value objects
│   │   ├── events/            # Domain events
│   │   └── services/          # Domain services
│   ├── application/           # Application layer
│   │   ├── use-cases/         # Business use cases
│   │   ├── dto/               # Data transfer objects
│   │   └── event-handlers/    # Event handlers
│   ├── infrastructure/        # Infrastructure layer
│   │   ├── persistence/       # Database repositories
│   │   ├── event-bridge/      # Event publishing
│   │   └── external/          # External service clients
│   ├── presentation/          # Presentation layer
│   │   ├── http/              # REST controllers
│   │   └── graphql/           # GraphQL resolvers
│   ├── config/                # Service configuration
│   └── main.ts                # Application entry point
├── test/                      # Tests
└── README.md                  # Service documentation
```

## 🏗️ Implementation Steps

### Step 1: Setup Service Structure

```bash
# Create service directory
mkdir apps/[service-name]
cd apps/[service-name]

# Copy template structure from user-service
cp -r ../user-service/src ./
cp -r ../user-service/test ./
cp ../user-service/tsconfig.app.json ./
```

### Step 2: Domain Layer

#### Entities
```typescript
// src/domain/entities/[entity].entity.ts
export class EntityName {
  constructor(
    public readonly id: EntityId,
    public readonly name: string,
    // ... other properties
  ) {}

  // Business methods
  public updateName(newName: string): void {
    // Business logic
    this.apply(new EntityNameUpdatedEvent(this.id, newName));
  }

  // Static factory methods
  static create(data: CreateEntityData): EntityName {
    const entity = new EntityName(/* ... */);
    entity.apply(new EntityCreatedEvent(/* ... */));
    return entity;
  }
}
```

#### Value Objects
```typescript
// src/domain/value-objects/[value-object].value-object.ts
export class ValueObjectName {
  constructor(private readonly value: string) {
    this.validate(value);
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Value cannot be empty');
    }
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: ValueObjectName): boolean {
    return this.value === other.value;
  }
}
```

#### Domain Events
```typescript
// src/domain/events/[event].event.ts
export class EntityCreatedEvent extends Event {
  constructor(
    public readonly entityId: string,
    public readonly entityData: any,
  ) {
    super();
  }
}
```

### Step 3: Application Layer

#### Use Cases
```typescript
// src/application/use-cases/create-entity/create-entity.usecase.ts
@Injectable()
export class CreateEntityUseCase {
  constructor(
    private readonly entityRepository: EntityRepositoryInterface,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: CreateEntityDto): Promise<EntityDto> {
    // 1. Create domain entity
    const entity = EntityName.create(dto);

    // 2. Save to repository
    await this.entityRepository.save(entity);

    // 3. Publish events
    entity.commit();

    // 4. Return DTO
    return EntityDto.fromDomain(entity);
  }
}
```

#### DTOs
```typescript
// src/application/dto/create-entity.dto.ts
export class CreateEntityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class EntityDto {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(entity: EntityName): EntityDto {
    return {
      id: entity.id.getValue(),
      name: entity.name,
      // ... map other properties
    };
  }
}
```

### Step 4: Infrastructure Layer

#### Repository Implementation
```typescript
// src/infrastructure/persistence/repositories/entity.repository.impl.ts
@Injectable()
export class EntityRepository implements EntityRepositoryInterface {
  constructor(
    @InjectRepository(EntityOrmEntity)
    private readonly ormRepository: Repository<EntityOrmEntity>,
  ) {}

  async save(entity: EntityName): Promise<void> {
    const ormEntity = this.toOrmEntity(entity);
    await this.ormRepository.save(ormEntity);
    entity.commit(); // Publish events
  }

  async findById(id: EntityId): Promise<EntityName | null> {
    const ormEntity = await this.ormRepository.findOne({
      where: { id: id.getValue() }
    });
    
    if (!ormEntity) return null;
    return this.toDomainEntity(ormEntity);
  }

  private toDomainEntity(ormEntity: EntityOrmEntity): EntityName {
    return EntityName.fromPersistence({
      id: ormEntity.id,
      name: ormEntity.name,
      // ... other properties
    });
  }

  private toOrmEntity(entity: EntityName): EntityOrmEntity {
    return {
      id: entity.id.getValue(),
      name: entity.name,
      // ... other properties
    };
  }
}
```

### Step 5: Presentation Layer

#### GraphQL Schema
```graphql
# src/presentation/graphql/schemas/entity.graphql
extend type Query {
  entity(id: ID!): Entity
  entities(limit: Int = 20, offset: Int = 0): [Entity!]!
}

extend type Mutation {
  createEntity(input: CreateEntityInput!): Entity!
  updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
}

type Entity @key(fields: "id") {
  id: ID!
  name: String!
  description: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateEntityInput {
  name: String!
  description: String
}

input UpdateEntityInput {
  name: String
  description: String
}
```

#### GraphQL Resolver
```typescript
// src/presentation/graphql/resolvers/entity.resolver.ts
@Resolver(() => Entity)
@UseGuards(ServiceAuthGuard)
export class EntityResolver {
  constructor(
    private readonly createEntityUseCase: CreateEntityUseCase,
    private readonly getEntityUseCase: GetEntityUseCase,
  ) {}

  @Query(() => Entity, { nullable: true })
  entity(@Args('id') id: string): Promise<Entity | null> {
    return this.getEntityUseCase.execute({ id });
  }

  @Mutation(() => Entity)
  createEntity(@Args('input') input: CreateEntityInput): Promise<Entity> {
    return this.createEntityUseCase.execute(input);
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }): Promise<Entity | null> {
    return this.entity(reference.id);
  }
}
```

### Step 6: Configuration

#### Module Setup
```typescript
// src/[service-name].module.ts
@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    EventBridgeModule,
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      typePaths: ['**/*.graphql'],
      federation: {
        version: 2,
      },
    }),
  ],
  controllers: [HealthController],
  providers: [
    // Use cases
    CreateEntityUseCase,
    GetEntityUseCase,
    
    // Repositories
    EntityRepository,
    
    // Resolvers
    EntityResolver,
  ],
})
export class ServiceNameModule {}
```

#### Environment Configuration
```typescript
// src/config/[service-name].environment.schema.ts
export const serviceEnvironmentSchema = z.object({
  PORT: z.coerce.number().default(3002),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string(),
  AWS_REGION: z.string().default('us-east-1'),
  EVENT_BUS_ARN: z.string(),
});

export type ServiceEnvironment = z.infer<typeof serviceEnvironmentSchema>;
```

## 📝 Service README Template

```markdown
# [Service Name] Service

## Overview
Brief description of what this service does.

## API Endpoints

### GraphQL
- Query: `entity(id: ID!): Entity`
- Mutation: `createEntity(input: CreateEntityInput!): Entity!`

### Health Check
- `GET /health`

## Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `EVENT_BUS_ARN`: AWS EventBridge ARN
- `PORT`: Service port (default: 300X)

## Development
```bash
# Start service
pnpm start:dev [service-name]

# Run tests
pnpm test [service-name]

# Run migrations
pnpm migrate:[service-name]
```

## Domain Events Published
- `EntityCreated`: When entity is created
- `EntityUpdated`: When entity is updated

## Domain Events Consumed
- `UserCreated`: React to user registration
```

## 🧪 Testing Template

```typescript
// test/[entity].e2e-spec.ts
describe('[Service] (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200);
  });

  // Add more tests
});
```

## 📦 Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 300X
CMD ["node", "dist/apps/[service-name]/main"]
```

### CDK Stack
```typescript
// cdk/lib/stacks/[service-name]-stack.ts
export class ServiceNameStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    
    // ECS Service
    // RDS Database
    // EventBridge rules
  }
}
```

This template ensures consistency across all services while maintaining the MVP focus.