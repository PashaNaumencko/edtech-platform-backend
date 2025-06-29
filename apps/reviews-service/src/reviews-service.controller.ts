import { Controller, Get } from '@nestjs/common';
import { ReviewsServiceService } from './reviews-service.service';

@Controller()
export class ReviewsServiceController {
  constructor(private readonly reviewsServiceService: ReviewsServiceService) {}

  @Get()
  getHello(): string {
    return this.reviewsServiceService.getHello();
  }
}
