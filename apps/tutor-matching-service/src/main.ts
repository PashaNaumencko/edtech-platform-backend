import { NestFactory } from '@nestjs/core';
import { TutorMatchingServiceModule } from './tutor-matching-service.module';

async function bootstrap() {
  const app = await NestFactory.create(TutorMatchingServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
