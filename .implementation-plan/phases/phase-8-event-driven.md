# Phase 8: Event-Driven Architecture
**Sprint 17 | Duration: 1 week**

## Phase Objectives
Implement comprehensive event-driven architecture using Amazon EventBridge to enable loose coupling between microservices, ensure data consistency through the outbox pattern, and create a robust foundation for complex workflows and real-time updates. Follow the patterns established in the [Architectural Patterns Guide](../reference/architectural-patterns-guide.md) for event organization and saga implementation.

## Phase Dependencies
- **Prerequisites**: Phase 1-6 completed (all microservices and GraphQL API operational)
- **Requires**: All microservices deployed, EventBridge setup, database outbox tables
- **Outputs**: Event-driven communication, outbox pattern implementation, cross-service workflows

## Detailed Subphases

### 7.1 EventBridge Configuration & Schema Registry
**Duration: 1 day | Priority: Critical**

#### EventBridge Event Bus Setup
```typescript
// Enhanced EventBridge configuration
const eventBus = new EventBus(this, 'EdTechEventBus', {
  eventBusName: 'edtech-platform-events',
  eventSourceName: 'edtech.platform',
});

// Schema registry for event validation
const schemaRegistry = new SchemaRegistry(this, 'EdTechSchemaRegistry', {
  registryName: 'edtech-event-schemas',
  description: 'Event schemas for EdTech platform microservices',
});
```

#### Event Schema Definitions
```json
{
  "UserEvents": {
    "user.created": {
      "type": "object",
      "properties": {
        "userId": { "type": "string" },
        "email": { "type": "string" },
        "role": { "type": "string", "enum": ["STUDENT", "TUTOR", "ADMIN"] },
        "authMethod": { "type": "string" },
        "timestamp": { "type": "string", "format": "date-time" }
      },
      "required": ["userId", "email", "role", "timestamp"]
    },
    "user.profile.updated": {
      "type": "object",
      "properties": {
        "userId": { "type": "string" },
        "changes": { "type": "object" },
        "timestamp": { "type": "string", "format": "date-time" }
      }
    }
  },
  
  "PaymentEvents": {
    "payment.completed": {
      "type": "object",
      "properties": {
        "paymentId": { "type": "string" },
        "userId": { "type": "string" },
        "tutorId": { "type": "string" },
        "amount": { "type": "number" },
        "paymentType": { "type": "string", "enum": ["LESSON", "COURSE"] },
        "timestamp": { "type": "string", "format": "date-time" }
      }
    }
  },
  
  "LessonEvents": {
    "lesson.scheduled": {
      "type": "object",
      "properties": {
        "lessonId": { "type": "string" },
        "studentId": { "type": "string" },
        "tutorId": { "type": "string" },
        "scheduledTime": { "type": "string", "format": "date-time" },
        "subject": { "type": "string" }
      }
    }
  }
}
```

### 7.2 Event Organization & Classification
**Duration: 1 day | Priority: Critical**

#### Local vs Integration Event Strategy
Following the [Architectural Patterns Guide](../reference/architectural-patterns-guide.md#4-event-organization-local-vs-inter-service-events):

**Local Events (Within Service Boundary):**
- Domain events from aggregates (e.g., `UserCreatedEvent`, `CoursePublishedEvent`)
- Handled by local event handlers within the same service
- Update read models and trigger side effects
- Published to local event bus only

**Integration Events (Between Services):**
- Cross-service communication events (e.g., `UserCreatedIntegrationEvent`)
- Published to EventBridge for other services to consume
- Include correlation IDs for tracing
- Versioned for backward compatibility

#### Event Handler Organization
```typescript
// Example: User Service Event Flow
@EventsHandler(UserCreatedEvent) // Local domain event
export class UserCreatedHandler implements IEventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent): Promise<void> {
    // 1. Local side effects
    await this.emailService.sendWelcomeEmail(event.email);
    await this.auditService.logUserCreation(event.userId);
    
    // 2. Update read models
    await this.updateUserReadModel(event);
    
    // 3. Publish integration event for other services
    const integrationEvent = new UserCreatedIntegrationEvent(
      'user.service',
      event.userId,
      event.email,
      event.role,
      event.occurredOn
    );
    
    await this.integrationEventPublisher.publish(integrationEvent);
  }
}
```

### 7.3 Outbox Pattern Implementation
**Duration: 2 days | Priority: Critical**

#### Outbox Table Schema
```sql
-- Generic outbox table for each service
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(255) NOT NULL,
  event_data JSONB NOT NULL,
  event_version INTEGER NOT NULL DEFAULT 1,
  aggregate_id VARCHAR(255) NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP NULL,
  processing_attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP NULL,
  status VARCHAR(50) DEFAULT 'PENDING' 
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  correlation_id VARCHAR(255),
  causation_id VARCHAR(255)
);

CREATE INDEX idx_outbox_status_created ON outbox_events(status, created_at);
CREATE INDEX idx_outbox_next_retry ON outbox_events(next_retry_at) WHERE status = 'PENDING';
```

#### Outbox Event Publisher
```typescript
// Shared outbox publisher service
export class OutboxEventPublisher {
  constructor(
    private readonly eventBridge: EventBridgeClient,
    private readonly outboxRepository: OutboxRepository
  ) {}

  async publishPendingEvents(): Promise<void> {
    const pendingEvents = await this.outboxRepository.getPendingEvents();
    
    for (const event of pendingEvents) {
      try {
        await this.publishEvent(event);
        await this.outboxRepository.markAsCompleted(event.id);
      } catch (error) {
        await this.handleFailedEvent(event, error);
      }
    }
  }

  private async publishEvent(outboxEvent: OutboxEvent): Promise<void> {
    const eventBridgeEvent = {
      Source: 'edtech.platform',
      DetailType: outboxEvent.eventType,
      Detail: JSON.stringify(outboxEvent.eventData),
      EventBusName: 'edtech-platform-events',
      Time: outboxEvent.createdAt,
    };

    await this.eventBridge.send(new PutEventsCommand({
      Entries: [eventBridgeEvent]
    }));
  }

  private async handleFailedEvent(event: OutboxEvent, error: Error): Promise<void> {
    const newAttempts = event.processingAttempts + 1;
    
    if (newAttempts >= event.maxAttempts) {
      await this.outboxRepository.markAsFailed(event.id, error.message);
      // Send to dead letter queue or alert
    } else {
      const backoffMs = Math.pow(2, newAttempts) * 1000; // Exponential backoff
      const nextRetry = new Date(Date.now() + backoffMs);
      await this.outboxRepository.scheduleRetry(event.id, nextRetry, newAttempts);
    }
  }
}
```

### 7.4 Service Integration Event Handlers
**Duration: 2 days | Priority: Critical**

#### User Service Event Handlers
```typescript
// User service publishes events
export class UserEventPublisher {
  constructor(private readonly outboxRepository: OutboxRepository) {}

  async publishUserCreated(user: User): Promise<void> {
    const event = {
      eventType: 'user.created',
      eventData: {
        userId: user.id.value,
        email: user.email.value,
        role: user.role,
        authMethod: user.authMethod,
        timestamp: new Date().toISOString(),
      },
      aggregateId: user.id.value,
      aggregateType: 'User',
    };

    await this.outboxRepository.saveEvent(event);
  }
}

// Other services handle user events
export class PaymentServiceUserEventHandler {
  @EventHandler('user.created')
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    // Initialize payment account for new user
    await this.paymentAccountService.createAccount({
      userId: event.userId,
      email: event.email,
    });
  }

  @EventHandler('user.profile.updated')
  async handleUserProfileUpdated(event: UserProfileUpdatedEvent): Promise<void> {
    // Update payment account information if needed
    if (event.changes.email) {
      await this.paymentAccountService.updateEmail(event.userId, event.changes.email);
    }
  }
}
```

#### Cross-Service Workflow Events
```typescript
// Course enrollment workflow
export class CourseEnrollmentWorkflow {
  @EventHandler('payment.completed')
  async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    if (event.paymentType === 'COURSE') {
      // Grant course access
      await this.courseService.grantAccess(event.userId, event.courseId);
      
      // Send welcome email
      await this.notificationService.sendCourseWelcome(event.userId, event.courseId);
      
      // Update analytics
      await this.analyticsService.trackEnrollment(event);
    }
  }

  @EventHandler('lesson.completed')
  async handleLessonCompleted(event: LessonCompletedEvent): Promise<void> {
    // Trigger payment for completed lesson
    await this.paymentService.processLessonPayment(event.lessonId);
    
    // Update progress tracking
    await this.progressService.updateProgress(event.studentId, event.lessonId);
    
    // Check if course is completed
    const isCompleted = await this.courseService.checkCompletion(
      event.studentId, 
      event.courseId
    );
    
    if (isCompleted) {
      await this.publishEvent('course.completed', {
        studentId: event.studentId,
        courseId: event.courseId,
        completedAt: new Date(),
      });
    }
  }
}
```

### 7.5 Saga Pattern Implementation
**Duration: 2 days | Priority: High**

#### Booking Saga for Lesson Scheduling
```typescript
export class LessonBookingSaga {
  constructor(
    private readonly tutorService: TutorMatchingService,
    private readonly paymentService: PaymentService,
    private readonly chatService: ChatService,
    private readonly notificationService: NotificationService,
    private readonly sagaRepository: SagaRepository
  ) {}

  @SagaStart('lesson.booking.requested')
  async handleBookingRequested(event: LessonBookingRequestedEvent): Promise<void> {
    const sagaId = event.bookingId;
    
    await this.sagaRepository.createSaga(sagaId, 'LessonBooking', {
      step: 'AVAILABILITY_CHECK',
      data: event,
    });

    // Step 1: Check tutor availability
    try {
      const isAvailable = await this.tutorService.checkAvailability(
        event.tutorId, 
        event.requestedTime
      );

      if (isAvailable) {
        await this.publishSagaEvent(sagaId, 'availability.confirmed', event);
      } else {
        await this.publishSagaEvent(sagaId, 'availability.rejected', {
          ...event,
          reason: 'Tutor not available at requested time'
        });
      }
    } catch (error) {
      await this.handleSagaError(sagaId, 'AVAILABILITY_CHECK', error);
    }
  }

  @SagaStep('availability.confirmed')
  async handleAvailabilityConfirmed(sagaId: string, event: any): Promise<void> {
    await this.sagaRepository.updateSaga(sagaId, { step: 'PAYMENT_AUTHORIZATION' });

    try {
      // Step 2: Authorize payment
      const paymentResult = await this.paymentService.authorizePayment({
        studentId: event.studentId,
        amount: event.lessonPrice,
        description: `Lesson with ${event.tutorName}`,
      });

      if (paymentResult.success) {
        await this.publishSagaEvent(sagaId, 'payment.authorized', {
          ...event,
          paymentId: paymentResult.paymentId,
        });
      } else {
        await this.publishSagaEvent(sagaId, 'payment.failed', {
          ...event,
          reason: paymentResult.error,
        });
      }
    } catch (error) {
      await this.handleSagaError(sagaId, 'PAYMENT_AUTHORIZATION', error);
    }
  }

  @SagaStep('payment.authorized')
  async handlePaymentAuthorized(sagaId: string, event: any): Promise<void> {
    await this.sagaRepository.updateSaga(sagaId, { step: 'LESSON_CREATION' });

    try {
      // Step 3: Create lesson and chat session
      const lesson = await this.tutorService.createLesson({
        studentId: event.studentId,
        tutorId: event.tutorId,
        scheduledTime: event.requestedTime,
        paymentId: event.paymentId,
      });

      const chatSession = await this.chatService.createSession({
        participants: [event.studentId, event.tutorId],
        lessonId: lesson.id,
      });

      await this.publishSagaEvent(sagaId, 'lesson.created', {
        ...event,
        lessonId: lesson.id,
        chatSessionId: chatSession.id,
      });
    } catch (error) {
      // Compensate: release payment authorization
      await this.paymentService.releaseAuthorization(event.paymentId);
      await this.handleSagaError(sagaId, 'LESSON_CREATION', error);
    }
  }

  @SagaEnd('lesson.created')
  async handleLessonCreated(sagaId: string, event: any): Promise<void> {
    // Step 4: Send notifications
    await Promise.all([
      this.notificationService.sendLessonConfirmation(event.studentId, event),
      this.notificationService.sendLessonNotification(event.tutorId, event),
    ]);

    await this.sagaRepository.completeSaga(sagaId);
  }

  // Compensation handlers
  @SagaCompensation('payment.failed')
  async compensatePaymentFailed(sagaId: string, event: any): Promise<void> {
    // Release tutor availability hold if any
    await this.tutorService.releaseAvailabilityHold(event.tutorId, event.requestedTime);
    await this.sagaRepository.failSaga(sagaId, 'Payment authorization failed');
  }
}
```

### 7.6 Event Monitoring & Dead Letter Handling
**Duration: 1 day | Priority: Medium**

#### Event Monitoring Dashboard
```typescript
export class EventMonitoringService {
  async getEventMetrics(timeRange: TimeRange): Promise<EventMetrics> {
    return {
      totalEvents: await this.getEventCount(timeRange),
      successfulEvents: await this.getSuccessfulEventCount(timeRange),
      failedEvents: await this.getFailedEventCount(timeRange),
      averageProcessingTime: await this.getAverageProcessingTime(timeRange),
      eventsByType: await this.getEventCountsByType(timeRange),
      sagaMetrics: await this.getSagaMetrics(timeRange),
    };
  }

  async getUnhealthyEvents(): Promise<UnhealthyEvent[]> {
    return [
      ...(await this.getEventsExceedingRetryLimit()),
      ...(await this.getStuckSagas()),
      ...(await this.getOldPendingEvents()),
    ];
  }
}
```

#### Dead Letter Queue Processing
```typescript
export class DeadLetterProcessor {
  async processDeadLetterEvents(): Promise<void> {
    const deadLetterEvents = await this.getDeadLetterEvents();
    
    for (const event of deadLetterEvents) {
      try {
        // Attempt to reprocess or route to manual handling
        if (this.canReprocess(event)) {
          await this.reprocessEvent(event);
        } else {
          await this.routeToManualProcessing(event);
        }
      } catch (error) {
        await this.logProcessingFailure(event, error);
      }
    }
  }
}
```

## Success Criteria

### Technical Acceptance Criteria
- EventBridge routes events correctly between all services
- Outbox pattern ensures reliable event publishing
- All event handlers process events without data loss
- Saga patterns complete successfully for complex workflows
- Event schema validation prevents malformed events
- Dead letter queues capture and handle failed events

### Integration Acceptance Criteria
- Cross-service workflows execute end-to-end successfully
- Event ordering is maintained where required
- Duplicate events are handled gracefully (idempotency)
- Service failures don't break event processing chains
- Event replay capabilities work for recovery scenarios

### Performance Acceptance Criteria
- Event processing latency < 1 second for 95% of events
- Outbox publisher processes events every 30 seconds
- Saga completion time < 30 seconds for booking workflows
- Event throughput supports 1000+ events per minute
- Dead letter processing completes within 24 hours

## Risk Mitigation

### Technical Risks
- **Event Ordering**: Implement event versioning and dependency tracking
- **Duplicate Processing**: Ensure all handlers are idempotent
- **Schema Evolution**: Version event schemas and maintain backward compatibility
- **Outbox Performance**: Monitor and optimize outbox table size and processing

### Operational Risks
- **Event Loss**: Implement comprehensive monitoring and alerting
- **Cascade Failures**: Use circuit breakers and timeout patterns
- **Dead Letter Buildup**: Regular monitoring and automated processing
- **Saga Timeouts**: Implement saga timeout and compensation logic

## Key Performance Indicators

### Performance Metrics
- Event processing latency: < 1 second (95th percentile)
- Outbox processing frequency: Every 30 seconds
- Saga completion rate: > 95%
- Event delivery success rate: > 99%

### Reliability Metrics
- Event ordering accuracy: 100% for ordered events
- Duplicate event handling: 0% processing errors
- Dead letter queue size: < 100 events at any time
- System recovery time: < 5 minutes after failures

### Business Metrics
- Workflow completion rate: > 95%
- Cross-service operation success: > 98%
- Event-driven feature adoption rate
- User experience impact of async operations

## Phase Timeline

| Subphase | Duration | Dependencies | Critical Path |
|----------|----------|--------------|---------------|
| 7.1 EventBridge Setup | 1 day | Phase 1-6 | Yes |
| 7.2 Event Organization | 1 day | 7.1 | Yes |
| 7.3 Outbox Implementation | 2 days | 7.2 | Yes |
| 7.4 Event Handlers | 2 days | 7.3 | Yes |
| 7.5 Saga Implementation | 2 days | 7.4 | Yes |
| 7.6 Monitoring & DLQ | 1 day | 7.5 | No |

**Total Duration**: 9 days (1.8 weeks)  
**Buffer**: +1 day for testing and optimization

---

**Previous Phase**: [Phase 7: API Gateway & GraphQL Layer](phase-7-api-gateway.md)  
**Next Phase**: [Phase 9: Communication Service (Chat + Video)](phase-9-communication-service.md) 