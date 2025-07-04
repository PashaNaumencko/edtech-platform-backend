import { Injectable } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { UserCreatedEvent } from "../../domain/events/user-created.event";
import { EventBridgeService } from "../../infrastructure/event-bridge/event-bridge.service";

/**
 * User Created Event Handler
 *
 * Handles side effects after a user is created.
 * Publishes event to external systems and triggers welcome processes.
 */
@EventsHandler(UserCreatedEvent)
@Injectable()
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  constructor(private readonly eventBridgeService: EventBridgeService) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    try {
      console.log("Handling UserCreatedEvent:", {
        eventId: event.eventId,
        userId: event.userId,
        email: event.email,
        correlationId: event.correlationId,
      });

      // 1. Publish event to external systems via EventBridge
      await this.eventBridgeService.publishEvent(event);

      // 2. Send welcome email (would integrate with email service)
      this.sendWelcomeEmail(event);

      // 3. Initialize user analytics record (would integrate with analytics service)
      this.initializeUserAnalytics(event);

      // 4. Create default user settings (would integrate with settings service)
      this.createDefaultUserSettings(event);

      console.log("UserCreatedEvent handled successfully");
    } catch (error) {
      console.error("Error handling UserCreatedEvent:", error);
      // In a real implementation, you might want to:
      // - Log to monitoring system
      // - Retry failed operations
      // - Send to dead letter queue
      throw error;
    }
  }

  private sendWelcomeEmail(event: UserCreatedEvent): void {
    // TODO: Integrate with email service
    console.log(`Sending welcome email to ${event.email}`);

    // Example email data that would be sent to email service
    // const emailData = {
    //   to: event.email,
    //   template: "welcome",
    //   data: {
    //     firstName: event.payload.firstName,
    //     lastName: event.payload.lastName,
    //     role: event.payload.role,
    //   },
    //   correlationId: event.correlationId,
    // };

    // In real implementation:
    // await this.emailService.sendTemplateEmail(emailData);
  }

  private initializeUserAnalytics(event: UserCreatedEvent): void {
    // TODO: Integrate with analytics service
    console.log(`Initializing analytics for user ${event.userId}`);

    // Example analytics initialization
    // const analyticsData = {
    //   userId: event.userId,
    //   email: event.email,
    //   role: event.payload.role,
    //   status: event.payload.status,
    //   registrationDate: event.occurredAt,
    //   source: "user-service",
    //   correlationId: event.correlationId,
    // };

    // In real implementation:
    // await this.analyticsService.initializeUser(analyticsData);
  }

  private createDefaultUserSettings(event: UserCreatedEvent): void {
    // TODO: Integrate with settings service
    console.log(`Creating default settings for user ${event.userId}`);

    // Example default settings
    // const defaultSettings = {
    //   userId: event.userId,
    //   theme: "light",
    //   dashboard: {
    //     showTutorials: true,
    //     showTips: true,
    //   },
    //   privacy: {
    //     profileVisible: true,
    //     showOnlineStatus: false,
    //   },
    //   correlationId: event.correlationId,
    // };

    // In real implementation:
    // await this.settingsService.createDefaultSettings(defaultSettings);
  }
}
