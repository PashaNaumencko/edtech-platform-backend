import { DataSource } from "typeorm";
import { UserOrmEntity } from "../entities/user.orm-entity";

// Example seed script for users
async function seed() {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
    username: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
    database: process.env.POSTGRES_DB || "edtech_user_service",
    entities: [UserOrmEntity],
    synchronize: false,
  });
  await dataSource.initialize();

  const userRepo = dataSource.getRepository(UserOrmEntity);
  await userRepo.save({
    email: "seed@example.com",
    firstName: "Seed",
    lastName: "User",
    role: "student",
    status: "active",
    bio: "Seeded user",
    skills: ["typescript", "nestjs"],
    lastLoginAt: new Date(),
  });

  await dataSource.destroy();
  console.log("Seeded user created!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
