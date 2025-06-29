import { Test, TestingModule } from '@nestjs/testing';
import { SharedCommunicationService } from './shared-communication.service';

describe('SharedCommunicationService', () => {
  let service: SharedCommunicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedCommunicationService],
    }).compile();

    service = module.get<SharedCommunicationService>(SharedCommunicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
