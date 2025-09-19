import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource, QueryRunner } from "typeorm";

/**
 * Database Connection Service
 *
 * Manages database connections, provides connection utilities,
 * and handles connection lifecycle events.
 */
@Injectable()
export class DatabaseConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseConnectionService.name);
  private isShuttingDown = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService
  ) {}

  /**
   * Initialize database connection on module start
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log("Initializing database connection...");

      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        this.logger.log("Database connection initialized successfully");
      }

      // Log connection info (without sensitive data)
      const config = this.configService.get("postgres");
      this.logger.log(`Connected to PostgreSQL: ${config.host}:${config.port}/${config.database}`);
    } catch (error) {
      this.logger.error("Failed to initialize database connection", error);
      throw error;
    }
  }

  /**
   * Clean up database connection on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    try {
      this.isShuttingDown = true;
      this.logger.log("Closing database connection...");

      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        this.logger.log("Database connection closed successfully");
      }
    } catch (error) {
      this.logger.error("Error closing database connection", error);
    }
  }

  /**
   * Get the data source instance
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.dataSource.isInitialized && !this.isShuttingDown;
  }

  /**
   * Execute a query with transaction support
   */
  async executeInTransaction<T>(operation: (queryRunner: QueryRunner) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const result = await operation(queryRunner);

      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get database statistics
   */
  getDatabaseStats(): {
    connectionCount: number;
    activeConnections: number;
    idleConnections: number;
    uptime: number;
  } {
    try {
      const driver = this.dataSource.driver as any;
      const pool = driver?.pool;
      return {
        connectionCount: pool?.size || 0,
        activeConnections: pool?.active || 0,
        idleConnections: pool?.idle || 0,
        uptime: process.uptime(),
      };
    } catch (error) {
      this.logger.error("Failed to get database stats", error);
      return {
        connectionCount: 0,
        activeConnections: 0,
        idleConnections: 0,
        uptime: process.uptime(),
      };
    }
  }

  /**
   * Test database connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.dataSource.query("SELECT 1");
      return true;
    } catch (error) {
      this.logger.error("Database connection test failed", error);
      return false;
    }
  }

  /**
   * Get database configuration info (without sensitive data)
   */
  getConnectionInfo(): {
    host: string;
    port: number;
    database: string;
    username: string;
    ssl: boolean;
  } {
    const config = this.configService.get("postgres");
    return {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      ssl: !!config.ssl,
    };
  }
}
