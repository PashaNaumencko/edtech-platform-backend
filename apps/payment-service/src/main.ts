import { NestFactory } from "@nestjs/core";
import { PaymentServiceModule } from "./payment-service.module";

void (async () => {
  const app = await NestFactory.create(PaymentServiceModule);
  await app.listen(process.env.port ?? 3000);
})();
