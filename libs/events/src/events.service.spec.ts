import { Test, TestingModule } from '@nestjs/testing';
import { SharedEventsService } from './shared-events.service';

describe('SharedEventsService', () => {
  let service: SharedEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedEventsService],
    }).compile();

    service = module.get<SharedEventsService>(SharedEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
