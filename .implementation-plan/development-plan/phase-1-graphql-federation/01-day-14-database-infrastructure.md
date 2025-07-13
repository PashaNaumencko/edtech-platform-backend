# Step 1 (Day 14): Database Infrastructure

**Objective**: Implement PostgreSQL integration using TypeORM, ensuring that the enhanced domain model (especially custom value objects) is correctly persisted and queryable.

## 1. Enhanced TypeORM Entities

The key challenge is mapping rich value objects like `UserProfile` and `UserPreferences` to a relational schema. We will use TypeORM's `Embedded` entities and `Value Transformers`.

### `User` Entity with Embedded VOs

```typescript
// apps/user-service/src/infrastructure/postgres/entities/user.entity.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserProfileTypeOrm } from './user-profile.entity';
import { UserPreferencesTypeOrm } from './user-preferences.entity';

@Entity('users')
export class UserTypeOrm {
    @PrimaryColumn()
    id: string;

    @Column(() => UserProfileTypeOrm)
    profile: UserProfileTypeOrm;

    @Column(() => UserPreferencesTypeOrm)
    preferences: UserPreferencesTypeOrm;
    
    // ... other fields like email, role, status
}
```

### `UserProfile` as an Embeddable

```typescript
// apps/user-service/src/infrastructure/postgres/entities/user-profile.entity.ts
import { Column } from 'typeorm';

export class UserProfileTypeOrm {
    @Column({ nullable: true })
    bio: string;

    @Column('simple-json', { nullable: true })
    skills: string[]; // Store array of skills as JSON

    @Column({ nullable: true })
    dateOfBirth: Date;
    
    // other profile fields
}
```
This approach keeps the related fields grouped in the database schema, mirroring the domain model.

## 2. Repository with Specification Support

The `IUserRepository` implementation will translate domain `Specification` objects into TypeORM `FindOptionsWhere` clauses.

```typescript
// apps/user-service/src/infrastructure/postgres/repositories/user.repository.ts
import { ISpecification } from 'src/domain/specifications/specification.interface';
import { FindOptionsWhere, Repository } from 'typeorm';

export class UserRepository implements IUserRepository {
    constructor(private readonly ormRepo: Repository<UserTypeOrm>) {}

    async find(spec: ISpecification<User>): Promise<User[]> {
        const whereClause = this.convertSpecToQuery(spec);
        const records = await this.ormRepo.find({ where: whereClause });
        return records.map(this.toDomain);
    }

    private convertSpecToQuery(spec: ISpecification<User>): FindOptionsWhere<UserTypeOrm> {
        // This is the core translation logic.
        // For an `ActiveUserSpecification`, it would return: { status: 'ACTIVE' }
        // For a composite spec, it would recursively build a query object.
        // e.g., spec1.and(spec2) -> [ whereClause1, whereClause2 ]
        // This can be complex and may require a dedicated builder class.
    }

    private toDomain(record: UserTypeOrm): User { /* ... mapping logic ... */ }
    private toPersistence(user: User): UserTypeOrm { /* ... mapping logic ... */ }
}
```

## 3. Database Migrations

Use TypeORM's migration tool to manage schema changes.

1.  **Generate Migration**: After defining entities, run the command:
    `npx typeorm migration:generate -d <path-to-data-source> apps/user-service/src/infrastructure/postgres/migrations/InitialSchema`
2.  **Review Migration**: Inspect the generated SQL to ensure it matches expectations.
3.  **Run Migration**: The CI/CD pipeline or a startup script will run `npx typeorm migration:run` to apply migrations.

## 4. Database Seeding

Create seed files to populate the development database with realistic test data. This can be a simple script that uses the repository to create users with different roles and profiles.
