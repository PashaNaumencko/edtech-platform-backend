# Microservice Development Template

## Overview

This document provides a unified template for developing microservices in our EdTech platform. It ensures consistency across all services while maintaining MVP-focused simplicity.

## Architecture Layers

Our microservices follow Domain-Driven Design (DDD) with these layers:

```
src/
├── domain/              # Business logic & rules
│   ├── entities/        # Aggregate Roots with domain events
│   ├── events/          # Domain events
│   └── repositories/    # Repository interfaces
├── application/         # Use cases & orchestration
│   ├── dto/            # Data Transfer Objects
│   ├── interfaces/     # Repository interfaces
│   ├── use-cases/      # Business use cases
│   └── event-handlers/ # Domain event handlers
├── infrastructure/     # External concerns
│   ├── postgres/       # Database implementation
│   └── event-bridge/   # Event publishing
├── presentation/       # API layer
│   └── graphql/        # GraphQL resolvers & types
├── config/            # Configuration
├── app.module.ts # Application module for MVP
└── main-dev.ts        # Development entry point
```

## 1. Domain Layer

### Entities (Aggregate Roots)

**Purpose**: Encapsulate business logic and maintain data consistency.

```typescript
// domain/entities/example.entity.ts
import { AggregateRoot } from '@nestjs/cqrs';
import { ExampleCreatedEvent, ExampleUpdatedEvent } from '../events';

export enum ExampleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class Example extends AggregateRoot {
  public id: string;
  public name: string;
  public status: ExampleStatus;
  public createdAt: Date;
  public updatedAt: Date;

  constructor() {
    super();
  }

  // Factory method for creating new instances
  public static create(data: {
    name: string;
    status?: ExampleStatus;
  }): Example {
    const example = new Example();
    example.id = `example_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    example.name = data.name;
    example.status = data.status || ExampleStatus.ACTIVE;
    example.createdAt = new Date();
    example.updatedAt = new Date();

    // Emit domain event
    example.apply(new ExampleCreatedEvent(example.id, example.name));
    
    return example;
  }

  // Business logic methods
  public updateName(newName: string): void {
    if (this.name === newName) return;
    
    const oldName = this.name;
    this.name = newName;
    this.updatedAt = new Date();
    
    this.apply(new ExampleUpdatedEvent(this.id, oldName, newName));
  }

  public activate(): void {
    if (this.status === ExampleStatus.ACTIVE) return;
    
    this.status = ExampleStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  // Query methods
  public isActive(): boolean {
    return this.status === ExampleStatus.ACTIVE;
  }
}
```

### Domain Events

**Purpose**: Communicate domain changes across bounded contexts.

```typescript
// domain/events/example-created.event.ts
export class ExampleCreatedEvent {
  constructor(
    public readonly exampleId: string,
    public readonly name: string,
  ) {}
}

// domain/events/example-updated.event.ts
export class ExampleUpdatedEvent {
  constructor(
    public readonly exampleId: string,
    public readonly oldName: string,
    public readonly newName: string,
  ) {}
}

// domain/events/index.ts
export * from './example-created.event';
export * from './example-updated.event';
```

### Repository Interfaces

**Purpose**: Define contracts for data persistence.

```typescript
// domain/repositories/example-repository.interface.ts
import { Example } from '../entities/example.entity';

export interface IExampleRepository {
  save(example: Example): Promise<void>;
  findById(id: string): Promise<Example | null>;
  findAll(offset: number, limit: number): Promise<{ examples: Example[]; total: number }>;
  delete(id: string): Promise<void>;
}
```

## 2. Application Layer

### DTOs (Data Transfer Objects)

**Purpose**: Define data contracts for API boundaries.

```typescript
// application/dto/create-example.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ExampleStatus } from '../../domain/entities/example.entity';

export class CreateExampleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(ExampleStatus)
  status?: ExampleStatus;
}

// application/dto/update-example.dto.ts
export class UpdateExampleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ExampleStatus)
  status?: ExampleStatus;
}
```

### Use Cases

**Purpose**: Orchestrate business operations.

```typescript
// application/use-cases/create-example/create-example.usecase.ts
import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Example } from '../../../domain/entities/example.entity';
import { IExampleRepository } from '../../../domain/repositories/example-repository.interface';
import { CreateExampleDto } from '../../dto/create-example.dto';

@Injectable()
export class CreateExampleUseCase {
  constructor(
    private readonly exampleRepository: IExampleRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: CreateExampleDto): Promise<Example> {
    // Create domain entity
    const example = Example.create({
      name: dto.name,
      status: dto.status,
    });

    // Persist to database
    await this.exampleRepository.save(example);

    // Publish domain events
    example.getUncommittedEvents().forEach(event => {
      this.eventBus.publish(event);
    });
    example.markEventsAsCommitted();

    return example;
  }
}
```

### Event Handlers

**Purpose**: Handle domain events and side effects.

```typescript
// application/event-handlers/example-created.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ExampleCreatedEvent } from '../../domain/events/example-created.event';

@EventsHandler(ExampleCreatedEvent)
export class ExampleCreatedHandler implements IEventHandler<ExampleCreatedEvent> {
  async handle(event: ExampleCreatedEvent): Promise<void> {
    console.log(`Example created: ${event.exampleId} - ${event.name}`);
    
    // Add side effects here:
    // - Send notifications
    // - Update read models
    // - Publish to EventBridge
  }
}
```

## 3. Infrastructure Layer

### Database Entities

**Purpose**: Map domain entities to database schema.

```typescript
// infrastructure/postgres/entities/example.orm-entity.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ExampleStatus } from '../../../domain/entities/example.entity';

@Entity('examples')
export class ExampleOrmEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ExampleStatus,
    default: ExampleStatus.ACTIVE,
  })
  status: ExampleStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Repository Implementation

**Purpose**: Implement data persistence using mergeObjectContext.

```typescript
// infrastructure/postgres/repositories/example.repository.impl.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Example } from '../../../domain/entities/example.entity';
import { IExampleRepository } from '../../../domain/repositories/example-repository.interface';
import { ExampleOrmEntity } from '../entities/example.orm-entity';

@Injectable()
export class ExampleRepositoryImpl implements IExampleRepository {
  constructor(
    @InjectRepository(ExampleOrmEntity)
    private readonly exampleRepository: Repository<ExampleOrmEntity>,
  ) {}

  async save(example: Example): Promise<void> {
    const ormEntity = this.toOrmEntity(example);
    await this.exampleRepository.save(ormEntity);
  }

  async findById(id: string): Promise<Example | null> {
    const ormEntity = await this.exampleRepository.findOne({ where: { id } });
    return ormEntity ? this.toDomainEntity(ormEntity) : null;
  }

  async findAll(offset: number, limit: number): Promise<{ examples: Example[]; total: number }> {
    const [ormEntities, total] = await this.exampleRepository.findAndCount({
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const examples = ormEntities.map(entity => this.toDomainEntity(entity));
    return { examples, total };
  }

  async delete(id: string): Promise<void> {
    await this.exampleRepository.delete(id);
  }

  // Domain to ORM mapping
  private toOrmEntity(example: Example): ExampleOrmEntity {
    const ormEntity = new ExampleOrmEntity();
    ormEntity.id = example.id;
    ormEntity.name = example.name;
    ormEntity.status = example.status;
    ormEntity.createdAt = example.createdAt;
    ormEntity.updatedAt = example.updatedAt;
    return ormEntity;
  }

  // ORM to Domain mapping using mergeObjectContext
  private toDomainEntity(ormEntity: ExampleOrmEntity): Example {
    const example = new Example();
    example.mergeObjectContext({
      id: ormEntity.id,
      name: ormEntity.name,
      status: ormEntity.status,
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
    });
    return example;
  }
}
```

## 4. Presentation Layer

### GraphQL Types

**Purpose**: Define GraphQL schema and types.

```typescript
// presentation/graphql/types/example.types.ts
import { ObjectType, Field, ID, InputType, registerEnumType } from '@nestjs/graphql';
import { ExampleStatus } from '../../../domain/entities/example.entity';

// Register enum for GraphQL
registerEnumType(ExampleStatus, {
  name: 'ExampleStatus',
});

@ObjectType()
export class ExampleType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => ExampleStatus)
  status: ExampleStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@InputType()
export class CreateExampleInput {
  @Field()
  name: string;

  @Field(() => ExampleStatus, { nullable: true })
  status?: ExampleStatus;
}

@ObjectType()
export class CreateExampleResponse {
  @Field(() => ExampleType, { nullable: true })
  example?: ExampleType;

  @Field(() => [String], { nullable: true })
  errors?: string[];
}
```

### GraphQL Resolvers

**Purpose**: Handle GraphQL queries and mutations.

```typescript
// presentation/graphql/resolvers/example.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CreateExampleUseCase } from '../../../application/use-cases/create-example/create-example.usecase';
import { IExampleRepository } from '../../../domain/repositories/example-repository.interface';
import { ExampleType, CreateExampleInput, CreateExampleResponse } from '../types/example.types';

@Resolver(() => ExampleType)
export class ExampleResolver {
  constructor(
    private readonly createExampleUseCase: CreateExampleUseCase,
    private readonly exampleRepository: IExampleRepository,
  ) {}

  @Query(() => [ExampleType])
  async examples(): Promise<ExampleType[]> {
    const { examples } = await this.exampleRepository.findAll(0, 10);
    return examples.map(example => ({
      id: example.id,
      name: example.name,
      status: example.status,
      createdAt: example.createdAt,
      updatedAt: example.updatedAt,
    }));
  }

  @Mutation(() => CreateExampleResponse)
  async createExample(
    @Args('input') input: CreateExampleInput,
  ): Promise<CreateExampleResponse> {
    try {
      const example = await this.createExampleUseCase.execute(input);
      
      return {
        example: {
          id: example.id,
          name: example.name,
          status: example.status,
          createdAt: example.createdAt,
          updatedAt: example.updatedAt,
        },
        errors: [],
      };
    } catch (error) {
      return {
        example: null,
        errors: [error.message],
      };
    }
  }
}
```

## 5. Module Structure

### Simplified Module for MVP

**Purpose**: Wire up all dependencies with minimal complexity.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';

// Domain
import { Example } from './domain/entities/example.entity';

// Application
import { CreateExampleUseCase } from './application/use-cases/create-example/create-example.usecase';
import { ExampleCreatedHandler } from './application/event-handlers/example-created.handler';

// Infrastructure
import { ExampleOrmEntity } from './infrastructure/postgres/entities/example.orm-entity';
import { ExampleRepositoryImpl } from './infrastructure/postgres/repositories/example.repository.impl';

// Presentation
import { ExampleResolver } from './presentation/graphql/resolvers/example.resolver';

// Repository token
import { IExampleRepository } from './domain/repositories/example-repository.interface';

@Module({
  imports: [
    // CQRS for events and commands
    CqrsModule,
    
    // Database connection
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'example_service',
      synchronize: true, // Only for development
      entities: [ExampleOrmEntity],
    }),
    TypeOrmModule.forFeature([ExampleOrmEntity]),
    
    // GraphQL Federation
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      playground: true,
      introspection: true,
    }),
  ],
  providers: [
    // Repository
    {
      provide: 'IExampleRepository',
      useClass: ExampleRepositoryImpl,
    },
    
    // Use Cases
    CreateExampleUseCase,
    
    // Event Handlers
    ExampleCreatedHandler,
    
    // Resolvers
    ExampleResolver,
  ],
})
export class AppSimpleModule {}
```

## 6. Development Entry Point

```typescript
// main-dev.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const SERVICE_NAME = 'ExampleService';
const PORT = 3003;

async function bootstrap() {
  console.log(`🚀 Starting ${SERVICE_NAME}...`);

  try {
    const app = await NestFactory.create(AppSimpleModule);
    
    // Health check endpoint
    app.getHttpAdapter().get('/health', (req, res) => {
      res.status(200).json({ status: 'OK', service: SERVICE_NAME });
    });

    await app.listen(PORT);
    
    console.log(`✅ ${SERVICE_NAME} started successfully!`);
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 GraphQL endpoint: http://localhost:${PORT}/graphql`);
    console.log(`🛠️  GraphQL Playground: http://localhost:${PORT}/graphql`);
  } catch (error) {
    console.error(`❌ Failed to start ${SERVICE_NAME}:`);
    console.error(error);
    process.exit(1);
  }
}

bootstrap();
```

## Key Principles

### MVP-Focused Development

1. **Start Simple**: Use simplified modules with in-memory data if needed
2. **Add Complexity Gradually**: Add database, event handlers, validation as needed
3. **Focus on Business Value**: Implement core use cases first
4. **Avoid Over-Engineering**: Don't add unnecessary abstractions

### Standardized Use Case Pattern

All use cases follow this consistent pattern:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { DI_TOKENS, SERVICE_ERRORS } from '../../constants';

@Injectable()
export class CreateExampleUseCase {
  constructor(
    @Inject(DI_TOKENS.EXAMPLE_REPOSITORY)
    private readonly exampleRepository: IExampleRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: CreateExampleRequestDto): Promise<Example> {
    // 1. Validation & business rules
    const existingExample = await this.exampleRepository.findByName(dto.name);
    if (existingExample) {
      throw new Error(SERVICE_ERRORS.EXAMPLE_ALREADY_EXISTS);
    }

    // 2. Create domain entity
    const example = Example.create({
      name: dto.name,
      description: dto.description,
    });

    // 3. Persist to repository
    await this.exampleRepository.save(example);

    // 4. Publish domain events (standardized pattern)
    example.commit();

    return example;
  }
}
```

### Data Flow Pattern

```
GraphQL Request → Resolver → Use Case → Domain Entity → Repository → Database
                                  ↓
                            Domain Events → Event Handlers → Side Effects
```

### Use Case Standards

1. **Dependency Injection**: Use `DI_TOKENS` from constants
2. **Error Handling**: Use error constants from service constants
3. **Event Publishing**: Always use `entity.commit()` after persistence
4. **Return Types**: Return domain entities, let resolvers handle mapping
5. **Validation**: Include business rule validation in use cases

### Constants Pattern

Each microservice must have a `constants.ts` file with standardized tokens:

```typescript
// constants.ts
export const DI_TOKENS = {
  // Repositories
  EXAMPLE_REPOSITORY: 'IExampleRepository',
  
  // Services
  EXAMPLE_SERVICE: 'ExampleService',
  NOTIFICATION_SERVICE: 'NotificationService',
  
  // Configuration
  SERVICE_CONFIG: 'SERVICE_CONFIG',
  DATABASE_CONFIG: 'DATABASE_CONFIG',
  DRIZZLE_CONFIG: 'DRIZZLE_CONFIG',
} as const;

export const SERVICE_ERRORS = {
  EXAMPLE_NOT_FOUND: 'Example not found',
  EXAMPLE_ALREADY_EXISTS: 'Example already exists',
  UNAUTHORIZED: 'Unauthorized access',
} as const;

export const SERVICE_EVENTS = {
  EXAMPLE_CREATED: 'example.created',
  EXAMPLE_UPDATED: 'example.updated',
} as const;
```

### Consistency Rules

1. **All entities extend AggregateRoot**: Use NestJS CQRS consistently
2. **Use mergeObjectContext**: For repository-to-domain mapping
3. **Domain events for business changes**: Emit events from aggregate roots
4. **Repository pattern**: Abstract data persistence
5. **GraphQL Federation**: Enable service composition
6. **Drizzle ORM**: Use Drizzle for all database operations
7. **Constants-based DI**: Use string tokens from constants.ts

### File Naming Conventions

- **Entities**: `example.entity.ts`
- **Events**: `example-created.event.ts`
- **DTOs**: `create-example.dto.ts`
- **Use Cases**: `create-example.usecase.ts`
- **Repositories**: `example.repository.impl.ts`
- **ORM Entities**: `example.orm-entity.ts`
- **GraphQL Types**: `example.types.ts`
- **Resolvers**: `example.resolver.ts`

## Implementation Checklist

For each new microservice:

- [ ] Create domain entities with business logic
- [ ] Define domain events for business changes
- [ ] Implement repository interfaces and implementations
- [ ] Create use cases for business operations
- [ ] Add event handlers for side effects
- [ ] Build GraphQL resolvers and types
- [ ] Wire up simplified module
- [ ] Add development entry point
- [ ] Test GraphQL federation integration
- [ ] Verify domain events are working

This template ensures consistency across all microservices while maintaining MVP simplicity and following our chosen architecture patterns.