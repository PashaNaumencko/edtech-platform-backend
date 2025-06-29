import { Test, TestingModule } from '@nestjs/testing';
import { TutorMatchingServiceController } from './tutor-matching-service.controller';
import { TutorMatchingServiceService } from './tutor-matching-service.service';

describe('TutorMatchingServiceController', () => {
  let tutorMatchingServiceController: TutorMatchingServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TutorMatchingServiceController],
      providers: [TutorMatchingServiceService],
    }).compile();

    tutorMatchingServiceController = app.get<TutorMatchingServiceController>(
      TutorMatchingServiceController
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(tutorMatchingServiceController.getHello()).toBe('Hello World!');
    });
  });
});
