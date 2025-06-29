import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsServiceController } from './reviews-service.controller';
import { ReviewsServiceService } from './reviews-service.service';

describe('ReviewsServiceController', () => {
  let reviewsServiceController: ReviewsServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsServiceController],
      providers: [ReviewsServiceService],
    }).compile();

    reviewsServiceController = app.get<ReviewsServiceController>(ReviewsServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(reviewsServiceController.getHello()).toBe('Hello World!');
    });
  });
});
