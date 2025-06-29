import { NestFactory } from '@nestjs/core';
import { ContentServiceModule } from './content-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ContentServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
