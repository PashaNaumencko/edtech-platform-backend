import { Module } from '@nestjs/common';
import { TutorMatchingServiceController } from './tutor-matching-service.controller';
import { TutorMatchingServiceService } from './tutor-matching-service.service';

@Module({
  imports: [],
  controllers: [TutorMatchingServiceController],
  providers: [TutorMatchingServiceService],
})
export class TutorMatchingServiceModule {}
