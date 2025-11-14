# @edtech/nestjs-drizzle

Internal NestJS module for Drizzle ORM integration - simplified, powerful, and zero limitations.

## Overview

A lightweight NestJS wrapper for Drizzle ORM that provides dependency injection without hiding Drizzle's capabilities. This is an **internal library** for our EdTech platform monorepo, not a general-purpose npm package.

### Design Philosophy

- **Zero Magic** - Thin wrapper over Drizzle, no abstraction layers that limit functionality
- **Full Drizzle Access** - Direct access to all Drizzle features (transactions, raw SQL, relations, etc.)
- **Minimal Boilerplate** - Convenient DI without repetitive repository setup
- **Type Safety** - Leverage Drizzle's excellent type inference
- **Simple** - No over-engineering, just what we need for our microservices

---

## Quick Start

### 1. Define Schema

```typescript
// libs/database/src/schemas/users.schema.ts
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### 2. Configure Service

```typescript
// apps/identity-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DrizzleModule } from '@edtech/nestjs-drizzle';
import * as schema from '@edtech/database/schemas';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DrizzleModule.forRootAsync<typeof schema>({
      useFactory: (config: ConfigService) => ({
        config: {
          host: config.get('DB_HOST'),
          port: config.get('DB_PORT'),
          user: config.get('DB_USER'),
          password: config.get('DB_PASSWORD'),
          database: config.get('DB_NAME'),
        },
        schema,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 3. Use in Repository

```typescript
// apps/identity-service/src/modules/users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@edtech/nestjs-drizzle';
import { eq, and, sql } from 'drizzle-orm';
import { users, User, NewUser } from '@edtech/database/schemas';
import type { DrizzleDB } from '@edtech/nestjs-drizzle';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB<typeof schema>
  ) {}

  // Simple queries
  async findById(id: number): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  // Complex queries - full Drizzle power
  async findActiveUsersWithStats() {
    return this.db
      .select({
        user: users,
        lessonCount: sql<number>`count(${lessons.id})`,
      })
      .from(users)
      .leftJoin(lessons, eq(users.id, lessons.studentId))
      .where(and(
        eq(users.isActive, true),
        sql`${users.createdAt} > NOW() - INTERVAL '30 days'`
      ))
      .groupBy(users.id);
  }

  // Transactions
  async transferCredits(fromId: number, toId: number, amount: number) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${amount}` })
        .where(eq(users.id, fromId));

      await tx
        .update(users)
        .set({ credits: sql`${users.credits} + ${amount}` })
        .where(eq(users.id, toId));
    });
  }

  // Raw SQL when needed
  async complexAnalytics() {
    return this.db.execute(sql`
      WITH user_stats AS (
        SELECT
          user_id,
          COUNT(*) as total_lessons,
          AVG(rating) as avg_rating
        FROM lessons
        GROUP BY user_id
      )
      SELECT * FROM user_stats WHERE avg_rating > 4.5
    `);
  }
}
```

---

## Module Structure

```
libs/
  nestjs-drizzle/
    src/
      drizzle-core.module.ts       # Connection management
      drizzle.module.ts             # Public API
      decorators/
        inject-drizzle.decorator.ts # @InjectDrizzle()
      types.ts                      # Type exports
      index.ts                      # Public exports
    package.json
    tsconfig.json
```

---

## API

### DrizzleModule

#### `forRootAsync<TSchema>(options)`

Register database connection with async configuration.

```typescript
DrizzleModule.forRootAsync<typeof schema>({
  name?: string,                    // Optional: for multiple DBs
  useFactory: (config: ConfigService) => ({
    config: PoolConfig,             // pg Pool config
    schema: TSchema,                // Your schemas
  }),
  inject: [ConfigService],
  imports?: [ConfigModule],
})
```

#### `forRoot<TSchema>(options)`

Synchronous version (use for tests).

```typescript
DrizzleModule.forRoot<typeof schema>({
  name?: string,
  config: {
    host: 'localhost',
    port: 5432,
    database: 'test_db',
    user: 'postgres',
    password: 'postgres',
  },
  schema,
})
```

### @InjectDrizzle(connectionName?)

Inject the Drizzle database instance.

```typescript
constructor(
  @InjectDrizzle() private db: DrizzleDB<typeof schema>
) {}

// Named connection
constructor(
  @InjectDrizzle('analyticsDb') private analyticsDb: DrizzleDB<typeof analyticsSchema>
) {}
```

### Types

```typescript
import type { DrizzleDB } from '@edtech/nestjs-drizzle';

// Fully typed database connection
type DrizzleDB<TSchema> = NodePgDatabase<TSchema>;
```

---

## Usage Patterns

### Single Service, Single Database

Most common pattern for our microservices.

```typescript
// app.module.ts
@Module({
  imports: [
    DrizzleModule.forRootAsync<typeof schema>({
      useFactory: (config: ConfigService) => ({
        config: { /* db config */ },
        schema,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}

// repository.ts
@Injectable()
export class StudentsRepository {
  constructor(@InjectDrizzle() private db: DrizzleDB<typeof schema>) {}

  async findAll() {
    return this.db.select().from(students);
  }
}
```

### Multiple Databases (Analytics Service)

When you need to access multiple databases.

```typescript
// app.module.ts
@Module({
  imports: [
    DrizzleModule.forRootAsync<typeof userSchema>({
      name: 'userDb',
      useFactory: (config: ConfigService) => ({
        config: { /* user db config */ },
        schema: userSchema,
      }),
      inject: [ConfigService],
    }),
    DrizzleModule.forRootAsync<typeof analyticsSchema>({
      name: 'analyticsDb',
      useFactory: (config: ConfigService) => ({
        config: { /* analytics db config */ },
        schema: analyticsSchema,
      }),
      inject: [ConfigService],
    }),
  ],
})

// service.ts
@Injectable()
export class CrossDbAnalyticsService {
  constructor(
    @InjectDrizzle('userDb') private userDb: DrizzleDB<typeof userSchema>,
    @InjectDrizzle('analyticsDb') private analyticsDb: DrizzleDB<typeof analyticsSchema>,
  ) {}

  async generateReport() {
    const users = await this.userDb.select().from(usersTable);
    const events = await this.analyticsDb.select().from(eventsTable);
    // ... combine data
  }
}
```

### No Abstraction - Use Full Drizzle Power

The key advantage: nothing is hidden.

```typescript
@Injectable()
export class AdvancedRepository {
  constructor(@InjectDrizzle() private db: DrizzleDB<typeof schema>) {}

  // Relations
  async findWithRelations(id: number) {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        lessons: true,
        subscriptions: true,
      },
    });
  }

  // Prepared statements
  private preparedFindById = this.db
    .select()
    .from(users)
    .where(eq(users.id, sql.placeholder('id')))
    .prepare('find_user_by_id');

  async findById(id: number) {
    return this.preparedFindById.execute({ id });
  }

  // Subqueries
  async findTopStudents() {
    const avgRating = this.db
      .select({ userId: lessons.studentId, avg: avg(lessons.rating) })
      .from(lessons)
      .groupBy(lessons.studentId)
      .as('avg_rating');

    return this.db
      .select()
      .from(users)
      .innerJoin(avgRating, eq(users.id, avgRating.userId))
      .where(gt(avgRating.avg, 4.5));
  }

  // CTE (Common Table Expressions)
  async complexQuery() {
    const popularLessons = this.db.$with('popular_lessons').as(
      this.db
        .select()
        .from(lessons)
        .where(gt(lessons.bookingCount, 100))
    );

    return this.db
      .with(popularLessons)
      .select()
      .from(popularLessons);
  }
}
```

---

## What We're NOT Building

To keep it simple and focused:

- ❌ **No Base Repository** - Just inject `db`, write queries directly
- ❌ **No Query Builders** - Drizzle already has this
- ❌ **No Pagination Helpers** - Build when actually needed
- ❌ **No Transaction Decorators** - Use Drizzle's `db.transaction()`
- ❌ **No Caching Layer** - Separate concern
- ❌ **No Migration Tools** - Drizzle Kit handles this
- ❌ **No CLI** - Not needed
- ❌ **No Publishing** - Internal library only

---

## Monorepo Structure

```
apps/
  identity-service/
    src/
      modules/
        users/
          users.repository.ts     # Uses @InjectDrizzle()
          users.service.ts
          users.module.ts
  student-service/
    src/
      modules/
        students/
          students.repository.ts  # Uses @InjectDrizzle()
  tutor-service/
    ...

libs/
  nestjs-drizzle/                 # This module
    src/
      drizzle-core.module.ts
      drizzle.module.ts
      decorators/
        inject-drizzle.decorator.ts
      types.ts
      index.ts
    package.json
    tsconfig.json

  database/                       # Shared schemas
    src/
      schemas/
        users.schema.ts
        students.schema.ts
        lessons.schema.ts
        index.ts
    drizzle.config.ts
    package.json
```

---

## Key Principles

1. **Thin Wrapper** - We're just providing DI, not abstracting Drizzle
2. **Direct Access** - Repository gets `db`, uses full Drizzle API
3. **Type Safety** - Full generic support, IntelliSense works perfectly
4. **No Limitations** - Every Drizzle feature is accessible
5. **Simple** - One decorator, one module, that's it

The goal is to reduce boilerplate while keeping Drizzle's power intact. We're not building a new ORM or abstraction layer - just making Drizzle play nice with NestJS DI.
