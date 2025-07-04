import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { USER_SERVICE_TOKENS } from "../constants";
import { EventBridgeModule } from "./event-bridge/event-bridge.module";
import { UserOrmEntity } from "./postgres/entities/user.orm-entity";
import { PostgresModule } from "./postgres/postgres.module";
import { UserRepositoryImpl } from "./postgres/repositories/user.repository.impl";

/**
 * Infrastructure Module
 *
 * Provides all infrastructure layer components:
 * - Database connections and entities
 * - Repository implementations
 * - External service integrations
 * - Event publishing infrastructure
 */
@Module({
  imports: [PostgresModule, TypeOrmModule.forFeature([UserOrmEntity]), EventBridgeModule],
  providers: [
    {
      provide: USER_SERVICE_TOKENS.USER_REPOSITORY,
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [USER_SERVICE_TOKENS.USER_REPOSITORY, EventBridgeModule],
})
export class InfrastructureModule {}
