import { NestFactory } from "@nestjs/core";
import { LearningServiceModule } from "./learning-service.module";

void (async () => {
  const app = await NestFactory.create(LearningServiceModule);
  await app.listen(process.env.port ?? 3000);
})();
