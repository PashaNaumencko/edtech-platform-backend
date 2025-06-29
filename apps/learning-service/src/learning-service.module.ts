import { Module } from '@nestjs/common';
import { LearningServiceController } from './learning-service.controller';
import { LearningServiceService } from './learning-service.service';

@Module({
  imports: [],
  controllers: [LearningServiceController],
  providers: [LearningServiceService],
})
export class LearningServiceModule {}
