import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module';

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule);
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🔧 User Service (Internal API) running on: http://localhost:${port}`);
}

bootstrap();
