import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('TutorMatchingService');
  
  try {
    logger.log('🚀 Starting Tutor Matching Service...');
    
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS for development
    app.enableCors({
      origin: true,
      credentials: true,
    });

    // Health check endpoint
    app.getHttpAdapter().get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        service: 'tutor-matching-service',
        mode: 'development',
        timestamp: new Date().toISOString() 
      });
    });

    const port = process.env.PORT || 3002;
    await app.listen(port);
    
    logger.log('✅ Tutor Matching Service started successfully!');
    logger.log(`🌐 Server running on port ${port}`);
    logger.log(`📋 Health check: http://localhost:${port}/health`);
    logger.log(`🔍 GraphQL endpoint: http://localhost:${port}/graphql`);
    logger.log(`🛠️  GraphQL Playground: http://localhost:${port}/graphql`);
  } catch (error) {
    logger.error('❌ Failed to start Tutor Matching Service:', error);
    process.exit(1);
  }
}

bootstrap();