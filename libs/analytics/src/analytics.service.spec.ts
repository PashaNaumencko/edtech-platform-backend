import { Test, TestingModule } from '@nestjs/testing';
import { SharedAnalyticsService } from './shared-analytics.service';

describe('SharedAnalyticsService', () => {
  let service: SharedAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedAnalyticsService],
    }).compile();

    service = module.get<SharedAnalyticsService>(SharedAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
