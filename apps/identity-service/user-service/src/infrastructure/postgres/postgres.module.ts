import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { UserOrmEntity } from "./entities/user.orm-entity";
import { DatabaseHealthIndicator } from "./health/database.health-indicator";
import { DatabaseConnectionService } from "./services/database-connection.service";

/**
 * PostgreSQL Infrastructure Module
 *
 * Provides database connectivity, health checks, and connection management
 * for the user service. Follows our microservices architecture patterns.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const postgresConfig = configService.get("postgres");

        return {
          ...postgresConfig,
          // Enhanced connection pooling for production
          extra: {
            connectionLimit: 10,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true,
          },
          // Entity registration
          entities: [UserOrmEntity],
          // Migration configuration
          migrations: postgresConfig.migrations,
          migrationsRun: postgresConfig.migrationsRun,
          // Logging configuration
          logging: postgresConfig.logging,
          // SSL configuration for production
          ssl: postgresConfig.ssl,
        };
      },
    }),
    // Register entities for dependency injection
    TypeOrmModule.forFeature([UserOrmEntity]),
  ],
  providers: [DatabaseConnectionService, DatabaseHealthIndicator],
  exports: [TypeOrmModule, DatabaseConnectionService, DatabaseHealthIndicator],
})
export class PostgresModule {}
