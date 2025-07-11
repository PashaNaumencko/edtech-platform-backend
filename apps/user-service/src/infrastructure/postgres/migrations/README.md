# Database Migrations

This folder contains TypeORM migration scripts for the user-service PostgreSQL database.

## How to Create a Migration

1. Make sure your entities are up to date.
2. Run:
   ```sh
   npx typeorm migration:generate -d ./apps/user-service/src/infrastructure/postgres/migrations -n <MigrationName>
   ```

## How to Run Migrations

1. Run:
   ```sh
   npx typeorm migration:run -d ./apps/user-service/src/infrastructure/postgres/migrations
   ```

## Notes

- Migrations are auto-discovered from this directory by the TypeORM config.
- Use migrations for all schema changes in production environments.
