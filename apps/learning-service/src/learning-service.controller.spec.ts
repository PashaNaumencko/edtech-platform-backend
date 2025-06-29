import { Test, TestingModule } from '@nestjs/testing';
import { LearningServiceController } from './learning-service.controller';
import { LearningServiceService } from './learning-service.service';

describe('LearningServiceController', () => {
  let learningServiceController: LearningServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [LearningServiceController],
      providers: [LearningServiceService],
    }).compile();

    learningServiceController = app.get<LearningServiceController>(LearningServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(learningServiceController.getHello()).toBe('Hello World!');
    });
  });
});
