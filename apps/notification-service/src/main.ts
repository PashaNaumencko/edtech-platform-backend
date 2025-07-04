import { NestFactory } from "@nestjs/core";
import { NotificationServiceModule } from "./notification-service.module";

void (async () => {
  const app = await NestFactory.create(NotificationServiceModule);
  await app.listen(process.env.port ?? 3000);
})();
