import { NestFactory } from "@nestjs/core";
import { ReviewsServiceModule } from "./reviews-service.module";

void (async () => {
  const app = await NestFactory.create(ReviewsServiceModule);
  await app.listen(process.env.port ?? 3000);
})();
