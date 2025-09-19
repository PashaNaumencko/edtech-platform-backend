// import { AuthModule } from "@edtech/auth";
// import { RedisModule } from "@edtech/redis";
// import { S3Module } from "@edtech/s3";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PostgresModule } from "./postgres/postgres.module";

/**
 * Infrastructure Module
 *
 * Provides all infrastructure layer components:
 * - Database connections and entities
 * - Repository implementations
 * - External service integrations
 * - Event publishing infrastructure
 * - Shared authentication, Redis, and S3 services
 */
@Module({
  imports: [ConfigModule, PostgresModule],
  exports: [PostgresModule],
})
export class InfrastructureModule {}
