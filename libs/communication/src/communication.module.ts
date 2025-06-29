import { Module } from '@nestjs/common';
import { SharedCommunicationService } from './shared-communication.service';

@Module({
  providers: [SharedCommunicationService],
  exports: [SharedCommunicationService],
})
export class SharedCommunicationModule {}
