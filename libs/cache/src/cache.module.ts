import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as redisStore from "cache-manager-redis-store";
import { CacheService } from "./cache.service";

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get("REDIS_HOST", "localhost"),
        port: configService.get("REDIS_PORT", 6379),
        password: configService.get("REDIS_PASSWORD"),
        db: configService.get("REDIS_DB", 0),
        ttl: configService.get("REDIS_TTL", 3600),
        max: 100,
        isGlobal: true,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
