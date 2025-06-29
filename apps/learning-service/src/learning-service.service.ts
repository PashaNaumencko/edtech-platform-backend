import { Injectable } from '@nestjs/common';

@Injectable()
export class LearningServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
