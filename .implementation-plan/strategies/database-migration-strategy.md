# Database Migration & Seeding Strategy

## Overview
Comprehensive migration and seeding approach for all database types in the EdTech platform's microservices architecture. Each service owns its data completely through dedicated databases.

## Database Architecture Summary

### Service-Database Mapping
- **User Service**: PostgreSQL (User identity, authentication, roles)
- **Payment Service**: PostgreSQL (Financial transactions, ACID compliance)
- **Reviews Service**: PostgreSQL (Review analytics, aggregations, reporting)
- **Courses Service**: DynamoDB (Course content, flexible document structure)
- **Chat Service**: DynamoDB (High-volume messaging, real-time patterns)
- **Tutor Matching Service**: DynamoDB + Neo4j (Profiles + graph relationships)
- **Video Call Service**: DynamoDB (Call metadata, lightweight tracking)
- **AI Service (Future)**: OpenSearch + DynamoDB (Vector search + conversations)

## PostgreSQL Services Migration Framework

### TypeORM Configuration Template
```typescript
// shared/database/postgres-base.config.ts
import { DataSource, DataSourceOptions } from 'typeorm';

export abstract class PostgreSQLBaseConfig {
  protected createDataSource(serviceName: string, entities: string[]): DataSource {
    const config: DataSourceOptions = {
      type: 'postgres',
      host: process.env[`POSTGRES_${serviceName.toUpperCase()}_HOST`] || 'localhost',
      port: parseInt(process.env[`POSTGRES_${serviceName.toUpperCase()}_PORT`] || '5432'),
      username: process.env[`POSTGRES_${serviceName.toUpperCase()}_USER`] || serviceName,
      password: process.env[`POSTGRES_${serviceName.toUpperCase()}_PASSWORD`] || 'password',
      database: process.env[`POSTGRES_${serviceName.toUpperCase()}_DB`] || serviceName,
      entities: entities,
      migrations: [`src/migrations/*.ts`],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
      migrationsTableName: 'migrations_history',
    };
    return new DataSource(config);
  }
}
```

### Migration Commands Structure
- `npm run migration:generate` - Auto-generate migrations from entity changes
- `npm run migration:run` - Apply pending migrations
- `npm run migration:revert` - Rollback last migration
- `npm run seed:run` - Execute seed scripts

## DynamoDB Services Migration Framework

### CDK-Based Schema Management
```typescript
// cdk/lib/constructs/dynamodb-service-tables.construct.ts
export class DynamoDbServiceTablesConstruct extends Construct {
  public readonly tables: Map<string, Table> = new Map();

  constructor(scope: Construct, id: string, props: DynamoDbServiceTablesProps) {
    super(scope, id);

    props.tables.forEach(tableDefinition => {
      const table = new Table(this, tableDefinition.tableName, {
        tableName: `${props.serviceName}-${tableDefinition.tableName}-${props.environment}`,
        partitionKey: tableDefinition.partitionKey,
        sortKey: tableDefinition.sortKey,
        billingMode: BillingMode.PAY_PER_REQUEST,
        pointInTimeRecovery: props.environment === 'production',
        removalPolicy: props.environment === 'development' 
          ? RemovalPolicy.DESTROY 
          : RemovalPolicy.RETAIN,
      });

      this.tables.set(tableDefinition.tableName, table);
    });
  }
}
```

### Migration Commands Structure
- `npm run cdk:deploy` - Deploy table schema changes
- `npm run seed:dynamodb` - Execute DynamoDB seed scripts
- `npm run migrate:dynamodb` - Run data transformation migrations

## Neo4j Migration Framework

### Cypher Migration System
```typescript
// apps/tutor-matching-service/src/database/neo4j-migrator.ts
export class Neo4jMigrator {
  async runMigrations(): Promise<void> {
    const availableMigrations = this.getAvailableMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = availableMigrations.filter(
      migration => !executedMigrations.includes(migration.version)
    );
    
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
      await this.recordMigration(migration);
    }
  }
}
```

### Migration Commands Structure
- `npm run neo4j:migrate` - Apply Cypher migrations
- `npm run neo4j:seed` - Load seed data
- `npm run neo4j:reset` - Clean and recreate database

## Migration Orchestration

### Development Environment Setup
```bash
#!/bin/bash
# scripts/migrate-all-services.sh

echo "🚀 Running migrations for all services..."

# PostgreSQL Services
POSTGRES_SERVICES=("user-service" "payment-service" "reviews-service")
for service in "${POSTGRES_SERVICES[@]}"; do
  echo "🔄 Migrating PostgreSQL for $service..."
  cd "apps/$service"
  npm run typeorm:migration:run
  npm run seed:run
  cd "../.."
done

# DynamoDB Services
echo "🔄 Creating DynamoDB tables..."
npm run cdk:deploy --profile localstack

# Neo4j Migration
echo "🔄 Migrating Neo4j..."
cd "apps/tutor-matching-service"
npm run neo4j:migrate
npm run neo4j:seed
cd "../.."

echo "✅ All migrations completed successfully!"
```

## Production Migration Strategy

### Rolling Deployment Approach
1. **Schema Changes**: Apply backward-compatible schema changes first
2. **Code Deployment**: Deploy new service versions
3. **Data Migration**: Run data transformation scripts
4. **Cleanup**: Remove deprecated columns/indexes after verification

### Rollback Capabilities
- **PostgreSQL**: TypeORM automatic rollback via migration:revert
- **DynamoDB**: CDK stack rollback with data preservation
- **Neo4j**: Snapshot restoration and manual Cypher rollback scripts

## Data Validation & Integrity

### Cross-Service Data Consistency
```typescript
// shared/validation/data-integrity-checker.ts
export class DataIntegrityChecker {
  async validateUserPaymentConsistency(): Promise<ValidationResult> {
    const userServiceUsers = await this.getUserServiceUserIds();
    const paymentServiceUsers = await this.getPaymentServiceUserIds();
    const orphanUsers = paymentServiceUsers.filter(id => !userServiceUsers.includes(id));
    
    return {
      service: 'user-payment-consistency',
      valid: orphanUsers.length === 0,
      errors: orphanUsers.map(id => `User ${id} exists in payment service but not in user service`),
    };
  }
}
```

## CI/CD Integration

### GitHub Actions Pipeline
```yaml
# .github/workflows/database-migrations.yml
name: Database Migrations

on:
  push:
    branches: [main, develop]
    paths: ['**/migrations/**', '**/seeds/**']

jobs:
  test-migrations:
    runs-on: ubuntu-latest
    services:
      postgres-user:
        image: postgres:15
        env:
          POSTGRES_DB: user_service_test
      # Additional services...

    steps:
      - name: Test PostgreSQL Migrations
        run: npm run test:migrations:postgresql
      - name: Test DynamoDB Schema
        run: npm run test:migrations:dynamodb
      - name: Test Neo4j Migrations
        run: npm run test:migrations:neo4j
```

---

This comprehensive migration strategy ensures proper database management across all microservices while maintaining data integrity, rollback capabilities, and production safety. 