import { IEvent } from "@nestjs/cqrs";
import { randomUUID } from "crypto";

/**
 * Simplified Domain Event Base Class
 *
 * Compatible with NestJS/CQRS IEvent interface
 * Contains only essential fields for event tracking and correlation
 */
export abstract class BaseDomainEvent implements IEvent {
  public readonly eventId: string;
  public readonly eventName: string;
  public readonly correlationId: string;
  public readonly causationId?: string;
  public readonly userId?: string;
  public readonly aggregateId: string;
  public readonly occurredAt: Date;
  public readonly payload: Record<string, any>;

  constructor(
    eventName: string,
    aggregateId: string,
    payload: Record<string, any>,
    options: {
      correlationId?: string;
      causationId?: string;
      userId?: string;
    } = {},
  ) {
    this.eventId = randomUUID();
    this.eventName = eventName;
    this.aggregateId = aggregateId;
    this.payload = payload;
    this.correlationId = options.correlationId || randomUUID();
    this.causationId = options.causationId;
    this.userId = options.userId;
    this.occurredAt = new Date();
  }
}
