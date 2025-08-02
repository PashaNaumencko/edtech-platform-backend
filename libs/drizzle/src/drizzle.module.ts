import { Module, DynamicModule } from '@nestjs/common';
import { DrizzleService } from './drizzle.service';
import { DrizzleConfig } from './config/drizzle.config';

@Module({})
export class DrizzleModule {
  static forRoot(config: DrizzleConfig): DynamicModule {
    return {
      module: DrizzleModule,
      providers: [
        {
          provide: 'DRIZZLE_CONFIG',
          useValue: config,
        },
        DrizzleService,
      ],
      exports: [DrizzleService],
      global: true,
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: DrizzleModule,
      providers: [DrizzleService],
      exports: [DrizzleService],
    };
  }
}