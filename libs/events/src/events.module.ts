import { Module } from '@nestjs/common';
import { SharedEventsService } from './shared-events.service';

@Module({
  providers: [SharedEventsService],
  exports: [SharedEventsService],
})
export class SharedEventsModule {}
