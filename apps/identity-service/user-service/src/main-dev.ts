import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("UserService");

  try {
    const app = await NestFactory.create(AppModule);

    logger.log("🚀 Starting User Service...");

    // Set up CORS for development
    app.enableCors({
      origin: true,
      credentials: true,
    });

    // Health check endpoint
    app.getHttpAdapter().get("/health", (req: any, res: any) => {
      res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "user-service",
        mode: "development",
        graphql: "/graphql",
      });
    });

    // Start server
    const port = process.env.PORT || 3001;
    await app.listen(port);

    logger.log("✅ User Service started successfully!");
    logger.log(`🌐 Server running on port ${port}`);
    logger.log(`📋 Health check: http://localhost:${port}/health`);
    logger.log(`🔍 GraphQL endpoint: http://localhost:${port}/graphql`);
    logger.log(`🛠️  GraphQL Playground: http://localhost:${port}/graphql`);
  } catch (error) {
    logger.error("❌ Failed to start User Service:", error);
    process.exit(1);
  }
}

void bootstrap();