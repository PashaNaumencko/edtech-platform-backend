import { Module } from '@nestjs/common';
import { ReviewsServiceController } from './reviews-service.controller';
import { ReviewsServiceService } from './reviews-service.service';

@Module({
  imports: [],
  controllers: [ReviewsServiceController],
  providers: [ReviewsServiceService],
})
export class ReviewsServiceModule {}
