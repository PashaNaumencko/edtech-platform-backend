import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BaseConfigurationService,
  UserServiceConfiguration,
  PostgresConfiguration,
  RedisConfiguration,
  CognitoConfiguration,
  S3Configuration,
  EmailConfiguration,
  EventBridgeConfiguration,
} from '@edtech/config';

@Injectable()
export class UserServiceConfigurationService extends BaseConfigurationService<UserServiceConfiguration> {
  constructor(configService: ConfigService) {
    super(configService);
  }

  getServiceConfig(): UserServiceConfiguration {
    return {
      app: this.app,
      postgres: this.postgres,
      redis: this.redis,
      cognito: this.cognito,
      s3: this.s3,
      email: this.email,
      eventBridge: this.eventBridge,
    };
  }

  get postgres(): PostgresConfiguration {
    return this.configService.get<PostgresConfiguration>('postgres')!;
  }

  get redis(): RedisConfiguration {
    return this.configService.get<RedisConfiguration>('redis')!;
  }

  get cognito(): CognitoConfiguration {
    return this.configService.get<CognitoConfiguration>('cognito')!;
  }

  get s3(): S3Configuration {
    return this.configService.get<S3Configuration>('s3')!;
  }

  get email(): EmailConfiguration {
    return this.configService.get<EmailConfiguration>('email')!;
  }

  get eventBridge(): EventBridgeConfiguration {
    return this.configService.get<EventBridgeConfiguration>('eventBridge')!;
  }

  get isEmailEnabled(): boolean {
    return Boolean(this.email.from);
  }

  get isS3Enabled(): boolean {
    return Boolean(this.s3.bucketName);
  }

  get isCognitoEnabled(): boolean {
    return Boolean(this.cognito.userPoolId && this.cognito.clientId);
  }

  get postgresConnectionInfo(): string {
    return `postgres://${this.postgres.username}:***@${this.postgres.host}:${this.postgres.port}/${this.postgres.database}`;
  }

  get redisConnectionInfo(): string {
    const auth = this.redis.password ? `:${this.redis.password}@` : '';
    return `redis://${auth}${this.redis.host}:${this.redis.port}/${this.redis.db}`;
  }
}
