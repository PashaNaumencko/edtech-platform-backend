import { Test, TestingModule } from '@nestjs/testing';
import { SharedDatabaseService } from './shared-database.service';

describe('SharedDatabaseService', () => {
  let service: SharedDatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedDatabaseService],
    }).compile();

    service = module.get<SharedDatabaseService>(SharedDatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
