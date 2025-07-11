import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cache } from "cache-manager";

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== null && value !== undefined) {
        this.logger.debug(`Cache HIT: ${key}`);
        return value;
      }
      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DELETE: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    try {
      // Note: cache-manager doesn't have a reset() method
      // This would need to be implemented based on the specific store
      // For now, we'll log that this operation is not supported
      this.logger.warn("Cache CLEAR: Clear all operation not supported by cache-manager");
      // In a real implementation, you might need to:
      // 1. Get all keys and delete them individually
      // 2. Use store-specific methods (e.g., redis.flushdb())
      // 3. Or implement a custom clear method
    } catch (error) {
      this.logger.error("Failed to clear cache:", error);
      throw error;
    }
  }
}
