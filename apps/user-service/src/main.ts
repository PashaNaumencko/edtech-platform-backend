import { ErrorDetailDto, ErrorResponseDto } from "@edtech/types";
import { BadRequestException, Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { UserServiceConfigurationService } from "./config/user-service.configuration";

async function bootstrap() {
  const logger = new Logger("UserService");

  try {
    const app = await NestFactory.create(AppModule);

    // Get typed configuration service
    const configService = app.get(UserServiceConfigurationService);

    // Log startup information
    logger.log("🚀 Starting User Service...");
    logger.log(`📍 Environment: ${configService.environment}`);
    logger.log(`🔧 Development mode: ${configService.isDevelopment}`);
    logger.log(`🗄️ Database: ${configService.postgresConnectionInfo}`);
    logger.log(`⚡ Redis: ${configService.redisConnectionInfo}`);
    logger.log(`📧 Email enabled: ${configService.isEmailEnabled}`);
    logger.log(`☁️ S3 enabled: ${configService.isS3Enabled}`);
    logger.log(`🔐 Cognito enabled: ${configService.isCognitoEnabled}`);

    // Set up CORS
    app.enableCors({
      origin: configService.corsOrigins,
      credentials: true,
    });

    // Set up global validation pipe with custom exceptionFactory
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (validationErrors = []) => {
          const details = validationErrors.flatMap((error) => {
            if (error.constraints) {
              return Object.values(error.constraints).map(
                (msg) => new ErrorDetailDto(msg, error.property)
              );
            }
            return [];
          });
          return new BadRequestException(
            ErrorResponseDto.create(
              "Validation failed",
              details.map((d) => d.message)
            )
          );
        },
      })
    );

    // Health check endpoint with detailed configuration info
    app.getHttpAdapter().get("/health", (req: any, res: any) => {
      const config = configService.getServiceConfig();
      res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "user-service",
        version: config.app.version,
        environment: config.app.environment,
        port: config.app.port,
        features: {
          database: "postgres",
          cache: "redis",
          auth: configService.isCognitoEnabled ? "cognito" : "disabled",
          storage: configService.isS3Enabled ? "s3" : "disabled",
          email: configService.isEmailEnabled ? "enabled" : "disabled",
        },
        checks: {
          database: configService.isDevelopment ? "bypassed" : "connected",
          cache: configService.isDevelopment ? "bypassed" : "connected",
        },
      });
    });

    // Start server
    const port = configService.port;
    await app.listen(port);

    logger.log("✅ User Service started successfully!");
    logger.log(`🌐 Server running on port ${port}`);
    logger.log(`📋 Health check: http://localhost:${port}/health`);
  } catch (error) {
    logger.error("❌ Failed to start User Service:", error);
    process.exit(1);
  }
}

void bootstrap();
