# Phase 8: Notification Service
**Duration: 6 days | Priority: Medium**

## Phase Overview

This phase implements the Notification Service for email, SMS, and push notifications following our standardized microservice architecture with DDD + Clean Architecture + Use Case Pattern.

### Dependencies
- **Prerequisites**: Phase 7 (Reviews Service) completed
- **Integrates with**: All services for notification triggers
- **Provides**: Multi-channel notification delivery

## Subphase 8.1: Notification Service Implementation (4 days)

### Domain Layer Implementation (1 day)

#### Entities (AggregateRoot)
```typescript
// domain/entities/notification.entity.ts
export class Notification extends AggregateRoot {
  constructor(
    private readonly _id: NotificationId,
    private readonly _userId: UserId,
    private readonly _type: NotificationType,
    private readonly _title: string,
    private readonly _message: string,
    private readonly _channels: NotificationChannel[],
    private _status: NotificationStatus,
    private readonly _data?: Record<string, any>,
    private readonly _createdAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateNotificationData): Notification {
    const notification = new Notification(
      NotificationId.generate(),
      new UserId(data.userId),
      data.type,
      data.title,
      data.message,
      data.channels,
      NotificationStatus.PENDING,
      data.data,
    );

    notification.apply(new NotificationCreatedEvent(notification));
    return notification;
  }

  markAsSent(channel: NotificationChannel): void {
    this._status = NotificationStatus.SENT;
    this.apply(new NotificationSentEvent(this, channel));
  }

  markAsFailed(channel: NotificationChannel, error: string): void {
    this._status = NotificationStatus.FAILED;
    this.apply(new NotificationFailedEvent(this, channel, error));
  }

  // Getters
  get id(): NotificationId { return this._id; }
  get userId(): UserId { return this._userId; }
  get type(): NotificationType { return this._type; }
  get title(): string { return this._title; }
  get message(): string { return this._message; }
  get channels(): NotificationChannel[] { return [...this._channels]; }
  get status(): NotificationStatus { return this._status; }
  get data(): Record<string, any> | undefined { return this._data; }
  get createdAt(): Date { return this._createdAt; }
}
```

### Application Layer Implementation (1 day)

#### Use Cases
```typescript
// application/use-cases/send-notification/send-notification.usecase.ts
@Injectable()
export class SendNotificationUseCase implements IUseCase<SendNotificationRequest, SendNotificationResponse> {
  constructor(
    private notificationRepository: NotificationRepository,
    private emailService: EmailService,
    private smsService: SmsService,
    private pushService: PushNotificationService,
  ) {}

  async execute(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    // 1. Create notification
    const notification = Notification.create({
      userId: request.userId,
      type: request.type,
      title: request.title,
      message: request.message,
      channels: request.channels,
      data: request.data,
    });

    // 2. Persist
    const savedNotification = await this.notificationRepository.save(notification);

    // 3. Send via each channel
    for (const channel of request.channels) {
      try {
        await this.sendViaChannel(savedNotification, channel);
        savedNotification.markAsSent(channel);
      } catch (error) {
        savedNotification.markAsFailed(channel, error.message);
      }
    }

    // 4. Update status
    await this.notificationRepository.save(savedNotification);
    savedNotification.commit();

    return SendNotificationResponse.fromDomain(savedNotification);
  }

  private async sendViaChannel(notification: Notification, channel: NotificationChannel): Promise<void> {
    switch (channel) {
      case NotificationChannel.EMAIL:
        await this.emailService.sendEmail({
          to: notification.userId.getValue(),
          subject: notification.title,
          body: notification.message,
          data: notification.data,
        });
        break;
      case NotificationChannel.SMS:
        await this.smsService.sendSms({
          to: notification.userId.getValue(),
          message: notification.message,
        });
        break;
      case NotificationChannel.PUSH:
        await this.pushService.sendPush({
          userId: notification.userId.getValue(),
          title: notification.title,
          body: notification.message,
          data: notification.data,
        });
        break;
    }
  }
}
```

### Infrastructure Layer Implementation (2 days)

#### Email Service (SES)
```typescript
// infrastructure/email/services/ses-email.service.ts
@Injectable()
export class SESEmailService implements EmailService {
  constructor(
    @Inject('SES_CLIENT') private sesClient: SESClient,
    private configService: ConfigService,
  ) {}

  async sendEmail(data: SendEmailData): Promise<void> {
    const command = new SendEmailCommand({
      Source: this.configService.get('SES_FROM_EMAIL'),
      Destination: {
        ToAddresses: [data.to],
      },
      Message: {
        Subject: {
          Data: data.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: this.renderTemplate(data.template, data.data),
            Charset: 'UTF-8',
          },
        },
      },
    });

    await this.sesClient.send(command);
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    // Template rendering logic
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
  }
}
```

#### SMS Service (SNS)
```typescript
// infrastructure/sms/services/sns-sms.service.ts
@Injectable()
export class SNSSmsService implements SmsService {
  constructor(
    @Inject('SNS_CLIENT') private snsClient: SNSClient,
  ) {}

  async sendSms(data: SendSmsData): Promise<void> {
    const command = new PublishCommand({
      PhoneNumber: data.to,
      Message: data.message,
    });

    await this.snsClient.send(command);
  }
}
```

### Presentation Layer Implementation (1 day)

#### Internal HTTP Controllers
```typescript
// presentation/http/controllers/internal/notifications.internal.controller.ts
@Controller('internal/notifications')
@UseGuards(ServiceAuthGuard)
export class InternalNotificationsController {
  constructor(
    private sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  @Post()
  async sendNotification(@Body() dto: SendNotificationDto): Promise<NotificationDto> {
    const request = new SendNotificationRequest();
    request.userId = dto.userId;
    request.type = dto.type;
    request.title = dto.title;
    request.message = dto.message;
    request.channels = dto.channels;
    request.data = dto.data;
    
    const response = await this.sendNotificationUseCase.execute(request);
    return response.notification;
  }
}
```

## Subphase 8.2: Event Handling & Integration (2 days)

### Event Subscribers (1 day)
- Listen to domain events from all services
- Trigger appropriate notifications
- Handle notification preferences

### Template System (1 day)
- Email templates for different notification types
- SMS message templates
- Push notification formatting

## Success Criteria

### Technical Acceptance Criteria
- ✅ Multi-channel notification delivery working
- ✅ Email, SMS, and push notifications functional
- ✅ Event-driven notification triggers
- ✅ Template system operational
- ✅ Delivery status tracking

### Functional Acceptance Criteria
- ✅ Users receive session reminders
- ✅ Payment confirmations sent
- ✅ Course enrollment notifications
- ✅ Review request notifications
- ✅ System alerts and updates

### Performance Criteria
- ✅ Notification delivery < 10 seconds
- ✅ Email delivery success rate > 95%
- ✅ SMS delivery success rate > 98%
- ✅ Push notification delivery < 2 seconds

## Dependencies & Integration
- **All Services**: Event-driven notification triggers
- **User Service**: User preferences and contact info
- **AWS SES**: Email delivery
- **AWS SNS**: SMS and push notifications

This service handles all notification delivery across the platform! 