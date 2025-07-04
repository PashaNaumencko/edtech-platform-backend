import { NestFactory } from "@nestjs/core";
import { AnalyticsServiceModule } from "./analytics-service.module";

void (async () => {
  const app = await NestFactory.create(AnalyticsServiceModule);
  await app.listen(process.env.port ?? 3000);
})();
