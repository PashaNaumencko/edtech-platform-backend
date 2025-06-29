# Saga Pattern Implementation Guide

## 🎯 Overview

This guide shows how to implement sagas using our existing EdTech platform codebase with:
- NestJS/CQRS saga decorators
- Shared saga components from `@edtech/saga`
- Event patterns from `@edtech/patterns`
- Inter-service communication via EventBridge

## 🏗️ Complete Course Enrollment Saga Example

### 1. Saga Class Implementation

```typescript
// apps/learning-service/src/sagas/course-enrollment.saga.ts
import { Injectable } from '@nestjs/common';
import { Saga, ICommand, ofType } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { map, switchMap, catchError, delay } from 'rxjs/operators';
import { BaseSaga, TrackSagaCommand } from '@edtech/saga';
import { InterServiceClient } from '@edtech/shared';
import { PAYMENT_PATTERNS, COURSE_PATTERNS, USER_PATTERNS } from '@edtech/patterns';

@Injectable()
export class CourseEnrollmentSaga extends BaseSaga {
  constructor(private readonly interServiceClient: InterServiceClient) {
    super();
  }

  // Step 1: Course enrollment requested → Start payment
  @Saga()
  enrollmentRequested = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(CourseEnrollmentRequestedEvent),
      switchMap(async (event) => {
        const sagaId = this.generateSagaId();
        
        // Track saga start
        await this.trackSagaStep(sagaId, 'STARTED', {
          courseId: event.courseId,
          studentId: event.studentId,
          amount: event.amount,
        });

        // Request payment processing
        await this.interServiceClient.publishEvent(
          'payment-service',
          PAYMENT_PATTERNS.EVENTS.PAYMENT_INITIATED,
          {
            sagaId,
            studentId: event.studentId,
            amount: event.amount,
            courseId: event.courseId,
            description: `Course enrollment: ${event.courseName}`,
          }
        );

        return this.createSagaTrackingCommand(sagaId, 'PAYMENT_PENDING');
      }),
      catchError((error, caught) => {
        console.error('Enrollment saga failed:', error);
        return this.handleSagaError('unknown', error);
      })
    );
  };

  // Step 2: Payment completed → Enroll student
  @Saga()
  paymentCompleted = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PaymentCompletedEvent),
      map((event) => {
        if (event.sagaId) {
          return new EnrollStudentCommand(
            event.sagaId,
            event.metadata.courseId,
            event.studentId,
            event.paymentId
          );
        }
        return null;
      }),
      // Filter out null values
      switchMap((command) => command ? [command] : [])
    );
  };

  // Step 3: Student enrolled → Send notifications
  @Saga()
  studentEnrolled = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(StudentEnrolledEvent),
      switchMap(async (event) => {
        if (event.sagaId) {
          // Send notification to student
          await this.interServiceClient.publishEvent(
            'notification-service',
            'notification.send',
            {
              userId: event.studentId,
              type: 'ENROLLMENT_SUCCESS',
              data: {
                courseId: event.courseId,
                courseName: event.courseName,
              },
            }
          );

          // Send notification to tutor
          await this.interServiceClient.publishEvent(
            'notification-service',
            'notification.send',
            {
              userId: event.tutorId,
              type: 'NEW_STUDENT',
              data: {
                courseId: event.courseId,
                studentId: event.studentId,
              },
            }
          );

          return this.createSagaTrackingCommand(event.sagaId, 'COMPLETED');
        }
        return null;
      }),
      // Filter out null values
      switchMap((command) => command ? [command] : [])
    );
  };

  // Compensation: Payment failed → Cancel enrollment
  @Saga()
  paymentFailed = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(PaymentFailedEvent),
      switchMap(async (event) => {
        if (event.sagaId) {
          // Notify student of failure
          await this.interServiceClient.publishEvent(
            'notification-service',
            'notification.send',
            {
              userId: event.studentId,
              type: 'ENROLLMENT_FAILED',
              data: {
                courseId: event.metadata.courseId,
                reason: event.reason,
              },
            }
          );

          return this.createSagaTrackingCommand(event.sagaId, 'FAILED', {
            reason: event.reason,
            failedAt: new Date(),
          });
        }
        return null;
      }),
      // Filter out null values
      switchMap((command) => command ? [command] : [])
    );
  };

  // Timeout handler for stuck sagas
  @Saga()
  handleTimeouts = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(SagaTimeoutEvent),
      map((event) => {
        console.warn(`Saga ${event.sagaId} timed out in status: ${event.status}`);
        return this.createSagaTrackingCommand(event.sagaId, 'TIMED_OUT', {
          timeoutReason: `Stuck in ${event.status} for too long`,
        });
      })
    );
  };

  private async trackSagaStep(sagaId: string, status: string, data?: any): Promise<void> {
    await this.interServiceClient.publishEvent(
      'learning-service',
      'saga.track',
      { sagaId, status, data }
    );
  }
}
```

### 2. Saga Commands

```typescript
// apps/learning-service/src/commands/enroll-student.command.ts
export class EnrollStudentCommand {
  constructor(
    public readonly sagaId: string,
    public readonly courseId: string,
    public readonly studentId: string,
    public readonly paymentId: string
  ) {}
}

// apps/learning-service/src/commands/enroll-student.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackSagaCommand } from '@edtech/saga';

@CommandHandler(EnrollStudentCommand)
export class EnrollStudentHandler implements ICommandHandler<EnrollStudentCommand> {
  constructor(
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    private readonly commandBus: CommandBus
  ) {}

  async execute(command: EnrollStudentCommand): Promise<void> {
    try {
      // Fetch course entity
      const courseEntity = await this.courseRepository.findOne({
        where: { id: command.courseId }
      });

      if (!courseEntity) {
        throw new Error('Course not found');
      }

      // Load domain object and merge context
      const course = this.mergeObjectContext(Course.fromEntity(courseEntity));

      // Perform enrollment
      course.enrollStudent(command.studentId, command.paymentId);

      // Save changes
      await this.courseRepository.save(course.toEntity());

      // Update saga state
      await this.commandBus.execute(
        new TrackSagaCommand(command.sagaId, 'STUDENT_ENROLLED', {
          courseId: command.courseId,
          studentId: command.studentId,
          enrolledAt: new Date(),
        })
      );

      // Commit domain events
      course.commit();

    } catch (error) {
      // Track saga failure
      await this.commandBus.execute(
        new TrackSagaCommand(command.sagaId, 'ENROLLMENT_FAILED', {
          error: error.message,
          failedAt: new Date(),
        })
      );
      throw error;
    }
  }
}
```

### 3. Saga State Management

```typescript
// apps/learning-service/src/commands/track-saga.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackSagaCommand, SagaState } from '@edtech/saga';
import { SagaEntity } from '../infrastructure/postgres/entities/saga.entity';

@CommandHandler(TrackSagaCommand)
export class TrackSagaHandler implements ICommandHandler<TrackSagaCommand> {
  constructor(
    @InjectRepository(SagaEntity)
    private readonly sagaRepository: Repository<SagaEntity>
  ) {}

  async execute(command: TrackSagaCommand): Promise<void> {
    // Find existing saga or create new one
    let sagaEntity = await this.sagaRepository.findOne({
      where: { sagaId: command.sagaId }
    });

    if (!sagaEntity) {
      // Create new saga state
      const sagaState = new SagaState(
        command.sagaId,
        'course-enrollment',
        command.status,
        command.data || {}
      );

      sagaEntity = this.createSagaEntity(sagaState);
    } else {
      // Update existing saga
      const sagaState = SagaState.fromEntity(sagaEntity);
      sagaState.updateStatus(command.status);
      
      if (command.data) {
        Object.assign(sagaState.data, command.data);
      }

      // Update steps based on status
      this.updateSagaSteps(sagaState, command.status);
      
      sagaEntity = this.updateSagaEntity(sagaEntity, sagaState);
    }

    await this.sagaRepository.save(sagaEntity);
  }

  private updateSagaSteps(sagaState: SagaState, status: string): void {
    switch (status) {
      case 'PAYMENT_PENDING':
        sagaState.updateStep('payment_initiated', true);
        break;
      case 'STUDENT_ENROLLED':
        sagaState.updateStep('payment_completed', true);
        sagaState.updateStep('student_enrolled', true);
        break;
      case 'COMPLETED':
        sagaState.updateStep('notifications_sent', true);
        sagaState.markAsCompleted();
        break;
      case 'FAILED':
      case 'TIMED_OUT':
        sagaState.markAsFailed(sagaState.data.reason || 'Unknown error');
        break;
    }
  }

  private createSagaEntity(sagaState: SagaState): SagaEntity {
    const entity = new SagaEntity();
    entity.sagaId = sagaState.sagaId;
    entity.sagaType = sagaState.sagaType;
    entity.status = sagaState.status;
    entity.data = sagaState.data;
    entity.steps = sagaState.steps;
    entity.createdAt = sagaState.createdAt;
    entity.updatedAt = sagaState.updatedAt;
    entity.timeoutAt = sagaState.timeoutAt;
    return entity;
  }

  private updateSagaEntity(entity: SagaEntity, sagaState: SagaState): SagaEntity {
    entity.status = sagaState.status;
    entity.data = sagaState.data;
    entity.steps = sagaState.steps;
    entity.updatedAt = sagaState.updatedAt;
    entity.errorMessage = sagaState.errorMessage;
    return entity;
  }
}
```

### 4. Event Definitions

```typescript
// apps/learning-service/src/events/course-enrollment.events.ts
export class CourseEnrollmentRequestedEvent {
  constructor(public readonly data: {
    courseId: string;
    courseName: string;
    studentId: string;
    amount: number;
    requestedAt: Date;
  }) {}
}

export class PaymentCompletedEvent {
  constructor(public readonly data: {
    sagaId?: string;
    paymentId: string;
    studentId: string;
    amount: number;
    metadata: {
      courseId: string;
    };
    completedAt: Date;
  }) {}
}

export class PaymentFailedEvent {
  constructor(public readonly data: {
    sagaId?: string;
    studentId: string;
    reason: string;
    metadata: {
      courseId: string;
    };
    failedAt: Date;
  }) {}
}

export class StudentEnrolledEvent {
  constructor(public readonly data: {
    sagaId?: string;
    courseId: string;
    courseName: string;
    studentId: string;
    tutorId: string;
    paymentId: string;
    enrolledAt: Date;
  }) {}
}

export class SagaTimeoutEvent {
  constructor(public readonly data: {
    sagaId: string;
    status: string;
    timeoutAt: Date;
  }) {}
}
```

### 5. Module Configuration

```typescript
// apps/learning-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseEnrollmentSaga } from './sagas/course-enrollment.saga';
import { EnrollStudentHandler } from './commands/enroll-student.handler';
import { TrackSagaHandler } from './commands/track-saga.handler';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([CourseEntity, SagaEntity]),
  ],
  providers: [
    // Sagas
    CourseEnrollmentSaga,
    
    // Command handlers
    EnrollStudentHandler,
    TrackSagaHandler,
    
    // Event handlers
    CourseEnrollmentRequestedHandler,
    
    // Services
    InterServiceClient,
  ],
})
export class AppModule {}
```

### 6. Triggering the Saga

```typescript
// apps/learning-service/src/controllers/enrollment.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';

@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly eventBus: EventBus) {}

  @Post()
  async enrollInCourse(@Body() enrollmentData: any): Promise<{ message: string }> {
    // Validate enrollment data
    // Check course availability
    // Check user permissions
    
    // Trigger the saga by publishing the initial event
    this.eventBus.publish(new CourseEnrollmentRequestedEvent({
      courseId: enrollmentData.courseId,
      courseName: enrollmentData.courseName,
      studentId: enrollmentData.studentId,
      amount: enrollmentData.amount,
      requestedAt: new Date(),
    }));

    return { message: 'Enrollment process started' };
  }
}
```

### 7. Saga Monitoring and Cleanup

```typescript
// apps/learning-service/src/services/saga-monitor.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EventBus } from '@nestjs/cqrs';

@Injectable()
export class SagaMonitorService {
  constructor(
    @InjectRepository(SagaEntity)
    private readonly sagaRepository: Repository<SagaEntity>,
    private readonly eventBus: EventBus
  ) {}

  // Check for timed out sagas every minute
  @Cron('0 * * * * *')
  async checkTimeouts(): Promise<void> {
    const timedOutSagas = await this.sagaRepository.find({
      where: {
        status: 'PAYMENT_PENDING',
        createdAt: LessThan(new Date(Date.now() - 5 * 60 * 1000)), // 5 minutes ago
      },
    });

    for (const saga of timedOutSagas) {
      this.eventBus.publish(new SagaTimeoutEvent({
        sagaId: saga.sagaId,
        status: saga.status,
        timeoutAt: new Date(),
      }));
    }
  }

  // Clean up completed sagas older than 30 days
  @Cron('0 0 2 * * *') // 2 AM daily
  async cleanupOldSagas(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    await this.sagaRepository.delete({
      status: 'COMPLETED',
      updatedAt: LessThan(thirtyDaysAgo),
    });
  }
}
```

## 🔍 How It All Works Together

1. **User enrolls** → `EnrollmentController` publishes `CourseEnrollmentRequestedEvent`
2. **Saga starts** → `CourseEnrollmentSaga.enrollmentRequested` generates sagaId and requests payment
3. **Payment completes** → External payment service publishes `PaymentCompletedEvent` with sagaId
4. **Saga continues** → `CourseEnrollmentSaga.paymentCompleted` triggers `EnrollStudentCommand`
5. **Student enrolled** → Command handler enrolls student and publishes `StudentEnrolledEvent`
6. **Saga finishes** → `CourseEnrollmentSaga.studentEnrolled` sends notifications and marks complete

## 🛡️ Error Handling & Compensation

- **Payment fails** → Saga publishes failure notification
- **Enrollment fails** → Saga can trigger refund process
- **Timeout occurs** → Monitor service detects and handles stuck sagas
- **State tracking** → Every step is persisted for debugging and recovery

This pattern ensures **reliable, observable, and maintainable** distributed transactions across your microservices! 