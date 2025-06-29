import { NestFactory } from '@nestjs/core';
import { CommunicationServiceModule } from './communication-service.module';

async function bootstrap() {
  const app = await NestFactory.create(CommunicationServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
