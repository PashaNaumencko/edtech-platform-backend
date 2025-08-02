import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MatchingRequestCreatedEvent } from '../../domain/entities/matching-request.entity';

@EventsHandler(MatchingRequestCreatedEvent)
export class MatchingRequestCreatedHandler implements IEventHandler<MatchingRequestCreatedEvent> {
  async handle(event: MatchingRequestCreatedEvent): Promise<void> {
    console.log(`Matching request created: ${event.requestId} for student ${event.studentId}`);
    console.log(`Subject: ${event.subject}`);
    
    // Add side effects here:
    // - Start tutor matching algorithm
    // - Send notification to student
    // - Update matching metrics
    // - Publish to EventBridge for other services
  }
}