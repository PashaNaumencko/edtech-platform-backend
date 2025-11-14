import { Module } from "@nestjs/common";
import { ApplicationModule } from "./application/application.module";
import { DomainModule } from "./domain/domain.module";
import { InfrastructureModule } from "./infrastructure/infrastructure.module";
import { PresentationModule } from "./presentation/presentation.module";

@Module({
  imports: [DomainModule, ApplicationModule, InfrastructureModule, PresentationModule],
  controllers: [],
  providers: [],
})
export class IdentityServiceModule {}
