import { Module } from '@nestjs/common';
import { HttpModule } from './http/http.module';

/**
 * Presentation Module
 * 
 * Combines all presentation layer modules for REST API endpoints.
 * This module provides both client-facing APIs (port 3000) and internal service-to-service APIs (port 3001).
 */
@Module({
  imports: [
    HttpModule, // REST controllers for dual-port architecture
  ],
  exports: [
    HttpModule,
  ],
})
export class PresentationModule {}