import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { Inject, Injectable } from '@nestjs/common';
import { UserServiceConfigurationService } from '../../config/user-service.configuration';
import { BaseDomainEvent } from '../../domain/events/base-domain.event';

/**
 * EventBridge Service
 *
 * Handles publishing domain events to AWS EventBridge for external system integration.
 * Extends NestJS CQRS local event handling with external publishing capabilities.
 */
@Injectable()
export class EventBridgeService {
  private readonly source = 'user.service';

  constructor(
    @Inject('EVENTBRIDGE_CLIENT') private readonly eventBridgeClient: EventBridgeClient,
    private readonly configService: UserServiceConfigurationService,
  ) {}

  /**
   * Publishes a domain event to EventBridge
   */
  async publishEvent(event: BaseDomainEvent): Promise<void> {
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: this.source,
          DetailType: event.eventName,
          Detail: JSON.stringify({
            eventId: event.eventId,
            aggregateId: event.aggregateId,
            correlationId: event.correlationId,
            causationId: event.causationId,
            userId: event.userId,
            occurredAt: event.occurredAt.toISOString(),
            payload: event.payload,
          }),
          EventBusName: this.configService.eventBridge.eventBusName,
        },
      ],
    });

    try {
      await this.eventBridgeClient.send(command);
      console.log(`Event published to EventBridge: ${event.eventName}`, {
        eventId: event.eventId,
        aggregateId: event.aggregateId,
      });
    } catch (error) {
      console.error('Failed to publish event to EventBridge:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to publish event ${event.eventName}: ${errorMessage}`);
    }
  }

  /**
   * Publishes multiple domain events to EventBridge
   */
  async publishEvents(events: BaseDomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    const entries = events.map((event) => ({
      Source: this.source,
      DetailType: event.eventName,
      Detail: JSON.stringify({
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        correlationId: event.correlationId,
        causationId: event.causationId,
        userId: event.userId,
        occurredAt: event.occurredAt.toISOString(),
        payload: event.payload,
      }),
      EventBusName: this.configService.eventBridge.eventBusName,
    }));

    const command = new PutEventsCommand({ Entries: entries });

    try {
      await this.eventBridgeClient.send(command);
      console.log(`Published ${events.length} events to EventBridge`);
    } catch (error) {
      console.error('Failed to publish events to EventBridge:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to publish ${events.length} events: ${errorMessage}`);
    }
  }
}
