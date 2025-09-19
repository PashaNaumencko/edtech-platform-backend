import { Injectable, Logger } from "@nestjs/common";
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { DataSource } from "typeorm";

/**
 * Database Health Indicator
 *
 * Monitors database connectivity, performance, and connection pool status.
 * Used by the health check endpoint to ensure database availability.
 */
@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(private readonly dataSource: DataSource) {
    super();
  }

  /**
   * Check database health
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if database is connected
      if (!this.dataSource.isInitialized) {
        throw new Error("Database not initialized");
      }

      // Test connection with a simple query
      const startTime = Date.now();
      await this.dataSource.query("SELECT 1");
      const responseTime = Date.now() - startTime;

      // Get connection pool status
      const poolStatus = this.getConnectionPoolStatus();

      const isHealthy = responseTime < 1000; // Consider healthy if response < 1s

      const result = this.getStatus(key, isHealthy, {
        responseTime: `${responseTime}ms`,
        connections: poolStatus,
        timestamp: new Date().toISOString(),
      });

      if (!isHealthy) {
        throw new HealthCheckError("Database health check failed", result);
      }

      this.logger.debug(`Database health check passed: ${responseTime}ms`);
      return result;
    } catch (error) {
      this.logger.error("Database health check failed", error);
      return this.getStatus(key, false, {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get connection pool status
   */
  private getConnectionPoolStatus() {
    try {
      const driver = this.dataSource.driver as any;
      if (driver && driver.pool) {
        return {
          total: driver.pool.size,
          idle: driver.pool.idle,
          active: driver.pool.active,
        };
      }
      return { status: "pool_not_available" };
    } catch (error) {
      return { status: "pool_error", error: error.message };
    }
  }

  /**
   * Check database performance metrics
   */
  async checkPerformance(key: string): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();

      // Run a simple performance test query
      await this.dataSource.query("SELECT COUNT(*) FROM users");

      const responseTime = Date.now() - startTime;
      const isHealthy = responseTime < 500; // Consider healthy if response < 500ms

      const result = this.getStatus(key, isHealthy, {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      });

      if (!isHealthy) {
        throw new HealthCheckError("Database performance check failed", result);
      }

      return result;
    } catch (error) {
      return this.getStatus(key, false, {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
