import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TutorCreatedEvent } from '../../domain/entities/tutor.entity';

@EventsHandler(TutorCreatedEvent)
export class TutorCreatedHandler implements IEventHandler<TutorCreatedEvent> {
  async handle(event: TutorCreatedEvent): Promise<void> {
    console.log(`Tutor created: ${event.tutorId} for user ${event.userId}`);
    console.log(`Subjects: ${event.subjects.join(', ')}`);
    
    // Add side effects here:
    // - Send welcome email to tutor
    // - Notify admin about new tutor registration
    // - Update analytics
    // - Publish to EventBridge for other services
  }
}