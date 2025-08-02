import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppSimpleModule } from "./app-simple.module";

async function bootstrap() {
  const logger = new Logger("UserServiceSimple");

  try {
    const app = await NestFactory.create(AppSimpleModule);

    logger.log("🚀 Starting User Service (GraphQL Federation Testing Mode)...");

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
        mode: "graphql-federation-testing",
        graphql: "/graphql",
      });
    });

    // Start server
    const port = process.env.PORT || 3001;
    await app.listen(port);

    logger.log("✅ User Service (Simple) started successfully!");
    logger.log(`🌐 Server running on port ${port}`);
    logger.log(`📋 Health check: http://localhost:${port}/health`);
    logger.log(`🔍 GraphQL endpoint: http://localhost:${port}/graphql`);
    logger.log(`🛠️  GraphQL Playground: http://localhost:${port}/graphql`);
  } catch (error) {
    logger.error("❌ Failed to start User Service (Simple):", error);
    process.exit(1);
  }
}

void bootstrap();