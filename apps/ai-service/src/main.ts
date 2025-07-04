import { NestFactory } from "@nestjs/core";
import { AiServiceModule } from "./ai-service.module";

void (async () => {
  const app = await NestFactory.create(AiServiceModule);
  await app.listen(process.env.port ?? 3000);
})();
