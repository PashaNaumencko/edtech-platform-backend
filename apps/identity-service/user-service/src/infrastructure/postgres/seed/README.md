# Database Seeding

This folder is for database seed scripts for local development and testing.

## How to Seed the Database

1. Add your seed scripts here (e.g., `seed-users.ts`).
2. Run your seed script with ts-node or node:
   ```sh
   npx ts-node ./apps/user-service/src/infrastructure/postgres/seed/seed-users.ts
   ```

## Notes

- Seed scripts should only be used in development or test environments.
- Do not run seed scripts in production.
