import { Injectable } from '@nestjs/common';

@Injectable()
export class ContentServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
