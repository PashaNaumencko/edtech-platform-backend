import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserServiceConfigurationService } from '../../config/user-service.configuration';
import { EventBridgeService } from './event-bridge.service';

/**
 * EventBridge Infrastructure Module
 *
 * Provides AWS EventBridge integration for publishing events to external systems.
 * Extends NestJS CQRS for local event handling while adding external publishing capabilities.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    UserServiceConfigurationService,
    {
      provide: 'EVENTBRIDGE_CLIENT',
      useFactory: (configService: UserServiceConfigurationService) => {
        return new EventBridgeClient({
          region: configService.eventBridge.region,
        });
      },
      inject: [UserServiceConfigurationService],
    },
    EventBridgeService,
  ],
  exports: [EventBridgeService],
})
export class EventBridgeModule {}
