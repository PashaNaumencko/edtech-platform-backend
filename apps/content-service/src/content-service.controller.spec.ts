import { Test, TestingModule } from '@nestjs/testing';
import { ContentServiceController } from './content-service.controller';
import { ContentServiceService } from './content-service.service';

describe('ContentServiceController', () => {
  let contentServiceController: ContentServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ContentServiceController],
      providers: [ContentServiceService],
    }).compile();

    contentServiceController = app.get<ContentServiceController>(ContentServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(contentServiceController.getHello()).toBe('Hello World!');
    });
  });
});
