# Observability Library - Implementation Guide

**Purpose:** Create a unified, reusable observability library for logging, metrics, and tracing
**Strategy:** Single `@edtech/observability` library with CloudWatch integration

---

## Table of Contents

1. [Overview](#overview)
2. [Library Structure](#library-structure)
3. [Implementation](#implementation)
4. [Usage Examples](#usage-examples)

---

## Overview

### Unified Observability Architecture

```
┌──────────────────────────────────────────────────────┐
│         @edtech/observability                         │
├──────────────────────────────────────────────────────┤
│  Logger Module                                       │
│    ├─ StructuredLogger                              │
│    ├─ CloudWatch integration (ECS awslogs)          │
│    └─ Pretty console output (development)           │
│                                                      │
│  Metrics Module                                      │
│    ├─ MetricsService                                │
│    ├─ CloudWatch Metrics integration                │
│    └─ Custom metrics tracking                       │
│                                                      │
│  Tracing Module                                      │
│    ├─ CorrelationIdMiddleware                       │
│    ├─ Request tracking across services              │
│    └─ X-Ray integration (optional)                  │
│                                                      │
│  HTTP Observability Module                           │
│    ├─ LoggingInterceptor                            │
│    ├─ MetricsInterceptor                            │
│    └─ Automatic request/response logging            │
└──────────────────────────────────────────────────────┘
```

### Why Single Library?

**Benefits:**
- ✅ **Unified API** - Single import for all observability needs
- ✅ **Consistent versioning** - Update all components together
- ✅ **Shared configuration** - One config module for all features
- ✅ **Easier maintenance** - Single library to maintain
- ✅ **Better integration** - Components work seamlessly together
- ✅ **Simpler imports** - One package instead of four

---

## Library Structure

### Generate Library with NestJS CLI

```bash
# Generate observability library
nest generate library observability

# Create directory structure
mkdir -p libs/observability/src/{logger,metrics,tracing,http-observability}/{services,middleware,interceptors,interfaces}
```

**Expected structure:**
```
libs/observability/
├── src/
│   ├── observability.module.ts      # Main module
│   ├── index.ts                     # Public API
│   │
│   ├── logger/                      # Logger components
│   │   ├── services/
│   │   │   └── structured-logger.service.ts
│   │   ├── interfaces/
│   │   │   └── logger.interface.ts
│   │   └── logger.module.ts
│   │
│   ├── metrics/                     # Metrics components
│   │   ├── services/
│   │   │   └── metrics.service.ts
│   │   └── metrics.module.ts
│   │
│   ├── tracing/                     # Tracing components
│   │   ├── middleware/
│   │   │   └── correlation-id.middleware.ts
│   │   └── tracing.module.ts
│   │
│   └── http-observability/          # HTTP interceptors
│       ├── interceptors/
│       │   ├── logging.interceptor.ts
│       │   └── metrics.interceptor.ts
│       └── http-observability.module.ts
│
└── tsconfig.lib.json
```

---

## Implementation

### Step 1: Logger Module

#### 1.1 Define Logger Interfaces

**`libs/observability/src/logger/interfaces/logger.interface.ts`**

```typescript
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  service?: string;
  method?: string;
  path?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

export interface ILogger {
  log(message: string, context?: LogContext): void;
  error(message: string, trace?: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  setContext(context: string): void;
}
```

#### 1.2 Implement Structured Logger

**`libs/observability/src/logger/services/structured-logger.service.ts`**

```typescript
import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogLevel, LogContext, ILogger } from '../interfaces/logger.interface';

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements ILogger, LoggerService {
  private context?: string;
  private readonly serviceName: string;
  private readonly environment: string;

  constructor(private readonly configService: ConfigService) {
    this.serviceName = this.configService.get('SERVICE_NAME', 'unknown');
    this.environment = this.configService.get('NODE_ENV', 'development');
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: LogContext) {
    this.writeLog(LogLevel.INFO, message, context);
  }

  error(message: string, trace?: string, context?: LogContext) {
    this.writeLog(LogLevel.ERROR, message, { ...context, error: trace });
  }

  warn(message: string, context?: LogContext) {
    this.writeLog(LogLevel.WARN, message, context);
  }

  debug(message: string, context?: LogContext) {
    if (this.environment === 'production') {
      return; // Skip debug logs in production
    }
    this.writeLog(LogLevel.DEBUG, message, context);
  }

  private writeLog(level: LogLevel, message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: context?.service || this.serviceName,
      context: this.context,
      message,
      ...context,
    };

    if (this.environment === 'development') {
      // Development: Pretty print
      console.log(this.prettyFormat(logEntry));
    } else {
      // Production: JSON to stdout (captured by ECS awslogs)
      console.log(JSON.stringify(logEntry));
    }
  }

  private prettyFormat(logEntry: any): string {
    const colors = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[90m',
      reset: '\x1b[0m',
    };

    const color = colors[logEntry.level] || colors.reset;
    const contextStr = logEntry.context ? `[${logEntry.context}]` : '';

    return `${color}[${logEntry.timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.service}]${contextStr}${colors.reset} ${logEntry.message}`;
  }
}
```

#### 1.3 Create Logger Module

**`libs/observability/src/logger/logger.module.ts`**

```typescript
import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StructuredLogger } from './services/structured-logger.service';

@Global()
@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
      imports: [ConfigModule],
      providers: [StructuredLogger],
      exports: [StructuredLogger],
    };
  }
}
```

---

### Step 2: Metrics Module

#### 2.1 Implement Metrics Service

**`libs/observability/src/metrics/services/metrics.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

export type MetricUnit = 'Count' | 'Milliseconds' | 'Percent' | 'Bytes';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly cloudwatch: CloudWatchClient;
  private readonly environment: string;
  private readonly serviceName: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.environment = this.configService.get('NODE_ENV', 'development');
    this.serviceName = this.configService.get('SERVICE_NAME', 'unknown');
    this.enabled = this.environment === 'production' || this.environment === 'staging';

    if (this.enabled) {
      this.cloudwatch = new CloudWatchClient({
        region: this.configService.get('AWS_REGION', 'us-east-1'),
      });
    }
  }

  async recordMetric(
    name: string,
    value: number,
    unit: MetricUnit = 'Count',
    dimensions?: Record<string, string>,
  ): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`[METRIC] ${name}: ${value} ${unit}`);
      return;
    }

    try {
      const metricDimensions = [
        { Name: 'Service', Value: this.serviceName },
        { Name: 'Environment', Value: this.environment },
        ...Object.entries(dimensions || {}).map(([key, value]) => ({
          Name: key,
          Value: value,
        })),
      ];

      const command = new PutMetricDataCommand({
        Namespace: `EdTech/${this.capitalize(this.serviceName)}`,
        MetricData: [
          {
            MetricName: name,
            Value: value,
            Unit: unit,
            Timestamp: new Date(),
            Dimensions: metricDimensions,
          },
        ],
      });

      await this.cloudwatch.send(command);
    } catch (error) {
      this.logger.error(`Failed to record metric ${name}:`, error);
    }
  }

  async incrementCounter(name: string, dimensions?: Record<string, string>): Promise<void> {
    await this.recordMetric(name, 1, 'Count', dimensions);
  }

  async recordDuration(name: string, milliseconds: number, dimensions?: Record<string, string>): Promise<void> {
    await this.recordMetric(name, milliseconds, 'Milliseconds', dimensions);
  }

  async recordPercentage(name: string, percentage: number, dimensions?: Record<string, string>): Promise<void> {
    await this.recordMetric(name, percentage, 'Percent', dimensions);
  }

  async recordBytes(name: string, bytes: number, dimensions?: Record<string, string>): Promise<void> {
    await this.recordMetric(name, bytes, 'Bytes', dimensions);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
```

#### 2.2 Create Metrics Module

**`libs/observability/src/metrics/metrics.module.ts`**

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetricsService } from './services/metrics.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
```

---

### Step 3: Tracing Module

#### 3.1 Implement Correlation ID Middleware

**`libs/observability/src/tracing/middleware/correlation-id.middleware.ts`**

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract or generate correlation ID
    const correlationId = req.headers[CORRELATION_ID_HEADER] as string || uuidv4();

    // Attach to request
    req['correlationId'] = correlationId;

    // Add to response headers
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
  }
}
```

#### 3.2 Create Tracing Module

**`libs/observability/src/tracing/tracing.module.ts`**

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';

@Module({
  providers: [CorrelationIdMiddleware],
  exports: [CorrelationIdMiddleware],
})
export class TracingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

---

### Step 4: HTTP Observability Module

#### 4.1 Implement Logging Interceptor

**`libs/observability/src/http-observability/interceptors/logging.interceptor.ts`**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StructuredLogger } from '../../logger/services/structured-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLogger) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const correlationId = request['correlationId'];
    const startTime = Date.now();

    this.logger.log(`Incoming request: ${method} ${url}`, {
      method,
      path: url,
      correlationId,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;

          this.logger.log(`Request completed: ${method} ${url}`, {
            method,
            path: url,
            correlationId,
            duration,
            statusCode,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.logger.error(`Request failed: ${method} ${url}`, error.stack, {
            method,
            path: url,
            correlationId,
            duration,
            statusCode: error.status || 500,
          });
        },
      }),
    );
  }
}
```

#### 4.2 Implement Metrics Interceptor

**`libs/observability/src/http-observability/interceptors/metrics.interceptor.ts`**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../metrics/services/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async () => {
          const duration = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;

          // Record request count
          await this.metrics.incrementCounter('HttpRequests', {
            Method: method,
            Path: url,
            StatusCode: statusCode.toString(),
          });

          // Record request duration
          await this.metrics.recordDuration('HttpRequestDuration', duration, {
            Method: method,
            Path: url,
          });
        },
        error: async (error) => {
          const duration = Date.now() - startTime;

          // Record error
          await this.metrics.incrementCounter('HttpErrors', {
            Method: method,
            Path: url,
            StatusCode: (error.status || 500).toString(),
          });

          // Record duration even for errors
          await this.metrics.recordDuration('HttpRequestDuration', duration, {
            Method: method,
            Path: url,
          });
        },
      }),
    );
  }
}
```

#### 4.3 Create HTTP Observability Module

**`libs/observability/src/http-observability/http-observability.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { MetricsModule } from '../metrics/metrics.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';

@Module({
  imports: [LoggerModule, MetricsModule],
  providers: [LoggingInterceptor, MetricsInterceptor],
  exports: [LoggingInterceptor, MetricsInterceptor],
})
export class HttpObservabilityModule {}
```

---

### Step 5: Main Observability Module

#### 5.1 Create Main Module

**`libs/observability/src/observability.module.ts`**

```typescript
import { Module, DynamicModule } from '@nestjs/common';
import { LoggerModule } from './logger/logger.module';
import { MetricsModule } from './metrics/metrics.module';
import { TracingModule } from './tracing/tracing.module';
import { HttpObservabilityModule } from './http-observability/http-observability.module';

@Module({})
export class ObservabilityModule {
  static forRoot(): DynamicModule {
    return {
      module: ObservabilityModule,
      imports: [
        LoggerModule.forRoot(),
        MetricsModule,
        TracingModule,
        HttpObservabilityModule,
      ],
      exports: [
        LoggerModule,
        MetricsModule,
        TracingModule,
        HttpObservabilityModule,
      ],
    };
  }
}
```

#### 5.2 Export Public API

**`libs/observability/src/index.ts`**

```typescript
// Main module
export * from './observability.module';

// Logger
export * from './logger/logger.module';
export * from './logger/services/structured-logger.service';
export * from './logger/interfaces/logger.interface';

// Metrics
export * from './metrics/metrics.module';
export * from './metrics/services/metrics.service';

// Tracing
export * from './tracing/tracing.module';
export * from './tracing/middleware/correlation-id.middleware';

// HTTP Observability
export * from './http-observability/http-observability.module';
export * from './http-observability/interceptors/logging.interceptor';
export * from './http-observability/interceptors/metrics.interceptor';
```

---

## Usage Examples

### Example 1: Identity Service Setup

**`apps/identity-service/src/identity.module.ts`**

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  ObservabilityModule,
  CorrelationIdMiddleware,
  LoggingInterceptor,
  MetricsInterceptor,
} from '@edtech/observability';

@Module({
  imports: [
    ObservabilityModule.forRoot(),
    // ... other modules
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class IdentityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

### Example 2: Using Logger and Metrics in Use Case

**`apps/identity-service/src/application/use-cases/register-user.usecase.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { StructuredLogger, MetricsService } from '@edtech/observability';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly logger: StructuredLogger,
    private readonly metrics: MetricsService,
  ) {
    this.logger.setContext('RegisterUserUseCase');
  }

  async execute(dto: RegisterUserDto): Promise<string> {
    const startTime = Date.now();

    try {
      this.logger.log('Registering new user', { email: dto.email });

      // Business logic
      const userId = await this.registerUser(dto);

      this.logger.log('User registered successfully', { userId });
      await this.metrics.incrementCounter('UserRegistered');

      return userId;
    } catch (error) {
      this.logger.error('Failed to register user', error.stack, { email: dto.email });
      await this.metrics.incrementCounter('UserRegistrationFailed');
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      await this.metrics.recordDuration('UserRegistrationDuration', duration);
    }
  }

  private async registerUser(dto: RegisterUserDto): Promise<string> {
    // Implementation
    return 'user-id';
  }
}
```

### Example 3: Environment Configuration

**`.env.local`:**
```bash
# Service info
SERVICE_NAME=identity-service
NODE_ENV=development
AWS_REGION=us-east-1
```

**`.env.production`:**
```bash
SERVICE_NAME=identity-service
NODE_ENV=production
AWS_REGION=us-east-1
```

### Example 4: Using in Controllers

**`apps/identity-service/src/presentation/http/controllers/auth.controller.ts`**

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { StructuredLogger } from '@edtech/observability';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly logger: StructuredLogger,
    private readonly registerUserUseCase: RegisterUserUseCase,
  ) {
    this.logger.setContext('AuthController');
  }

  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    this.logger.log('Registration endpoint called', { email: dto.email });
    return this.registerUserUseCase.execute(dto);
  }
}
```

---

## Summary

### Single Library Structure

**@edtech/observability** contains:
- **Logger**: Structured logging with CloudWatch (no console.log)
- **Metrics**: CloudWatch Metrics integration
- **Tracing**: Correlation ID middleware
- **HTTP Observability**: Request/response interceptors

### Benefits

- ✅ **Unified import** - `import { ... } from '@edtech/observability'`
- ✅ **Consistent versioning** - Single library version
- ✅ **Easier maintenance** - One library to maintain
- ✅ **Better integration** - Components work seamlessly together
- ✅ **CloudWatch ready** - JSON logs captured by ECS awslogs driver
- ✅ **No console.log** - All logs use structured logger
- ✅ **Automatic metrics** - Track all HTTP requests
- ✅ **Request tracking** - Correlation IDs across services

### Next Steps

1. ✅ Generate library: `nest generate library observability`
2. ✅ Implement all modules following code above
3. ✅ Import into Identity Service
4. ✅ Configure global interceptors and middleware
5. ✅ Test locally with pretty console output
6. ✅ Deploy to ECS - logs automatically sent to CloudWatch

### Import Pattern

```typescript
// Single import for all observability features
import {
  ObservabilityModule,
  StructuredLogger,
  MetricsService,
  CorrelationIdMiddleware,
  LoggingInterceptor,
  MetricsInterceptor,
} from '@edtech/observability';
```
