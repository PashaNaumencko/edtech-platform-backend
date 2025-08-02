# Polyglot Database Architecture Plan

## Overview

Our EdTech platform will use different database technologies optimized for each service's specific data patterns and requirements. This polyglot persistence approach maximizes performance and scalability for each domain.

## Database Technology Mapping

### 1. Identity Service → PostgreSQL (Relational)
**Why**: Strong ACID properties, user authentication, referential integrity
**Use Case**: User management, authentication, profiles, sessions

```typescript
// PostgreSQL with Drizzle ORM
// apps/identity-service/src/infrastructure/database/schemas/user.schema.ts
import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Strong consistency for critical user data
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  sessionToken: varchar('session_token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 1000 }),
});
```

### 2. Learning Management Service → PostgreSQL (Relational)
**Why**: Complex relationships, ACID transactions, structured lesson data
**Use Case**: Tutors, courses, lessons, scheduling, matching

```typescript
// PostgreSQL with Drizzle ORM
// apps/learning-management-service/src/infrastructure/database/schemas/learning.schema.ts
import { pgTable, uuid, varchar, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const tutors = pgTable('tutors', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(), // Reference to Identity Service
  subjects: jsonb('subjects').notNull(), // ['math', 'physics']
  hourlyRate: integer('hourly_rate').notNull(), // in cents
  availability: jsonb('availability').notNull(), // Complex schedule data
  isVerified: boolean('is_verified').default(false),
  rating: decimal('rating', { precision: 3, scale: 2 }),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey(),
  tutorId: uuid('tutor_id').references(() => tutors.id),
  studentUserId: uuid('student_user_id').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  price: integer('price').notNull(),
});
```

### 3. Payment Service → PostgreSQL (Relational)
**Why**: Financial data requires ACID compliance, audit trails, regulatory compliance
**Use Case**: Payments, transactions, invoices, financial records

```typescript
// PostgreSQL with Drizzle ORM - Financial data needs ACID compliance
// apps/payment-service/src/infrastructure/database/schemas/payment.schema.ts
import { pgTable, uuid, varchar, integer, timestamp, decimal } from 'drizzle-orm/pg-core';

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey(),
  lessonId: uuid('lesson_id').notNull(),
  studentUserId: uuid('student_user_id').notNull(),
  tutorUserId: uuid('tutor_user_id').notNull(),
  amount: integer('amount').notNull(), // in cents for precision
  platformFee: integer('platform_fee').notNull(), // 20% commission
  currency: varchar('currency', { length: 3 }).default('USD'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Audit trail for financial compliance
export const paymentAuditLog = pgTable('payment_audit_log', {
  id: uuid('id').primaryKey(),
  paymentId: uuid('payment_id').references(() => payments.id),
  action: varchar('action', { length: 100 }).notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  changedBy: uuid('changed_by').notNull(),
  changedAt: timestamp('changed_at').defaultNow(),
});
```

### 4. Communication Service → DynamoDB (NoSQL)
**Why**: High-volume messages, real-time requirements, horizontal scaling
**Use Case**: Chat messages, notifications, real-time communication

```typescript
// DynamoDB with AWS SDK
// apps/communication-service/src/infrastructure/database/dynamodb/message.repository.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

export interface Message {
  conversationId: string; // Partition Key
  timestamp: string; // Sort Key (ISO string for sorting)
  messageId: string; // Unique message ID
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  isEdited: boolean;
  editedAt?: string;
  reactions?: Record<string, string[]>; // emoji -> userIds
  ttl?: number; // Auto-delete old messages
}

export interface Notification {
  userId: string; // Partition Key
  notificationId: string; // Sort Key
  type: 'lesson_reminder' | 'payment_received' | 'message_received';
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  expiresAt?: number; // TTL for auto-cleanup
  metadata: Record<string, any>;
}

@Injectable()
export class DynamoDBMessageRepository {
  private client: DynamoDBDocumentClient;

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
  }

  async saveMessage(message: Message): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: 'edtech-messages',
      Item: message,
    }));
  }

  async getConversationMessages(
    conversationId: string, 
    limit: number = 50,
    lastTimestamp?: string
  ): Promise<Message[]> {
    const params: any = {
      TableName: 'edtech-messages',
      KeyConditionExpression: 'conversationId = :conversationId',
      ExpressionAttributeValues: {
        ':conversationId': conversationId,
      },
      ScanIndexForward: false, // Latest messages first
      Limit: limit,
    };

    if (lastTimestamp) {
      params.ExclusiveStartKey = {
        conversationId,
        timestamp: lastTimestamp,
      };
    }

    const result = await this.client.send(new QueryCommand(params));
    return result.Items as Message[];
  }
}

// DynamoDB Table Schema (via CDK/Terraform)
const messagesTable = {
  TableName: 'edtech-messages',
  KeySchema: [
    { AttributeName: 'conversationId', KeyType: 'HASH' }, // Partition key
    { AttributeName: 'timestamp', KeyType: 'RANGE' }, // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: 'conversationId', AttributeType: 'S' },
    { AttributeName: 'timestamp', AttributeType: 'S' },
  ],
  BillingMode: 'PAY_PER_REQUEST', // Auto-scaling
  StreamSpecification: {
    StreamEnabled: true,
    StreamViewType: 'NEW_AND_OLD_IMAGES', // For real-time features
  },
  TimeToLiveSpecification: {
    AttributeName: 'ttl',
    Enabled: true, // Auto-delete old messages
  },
};
```

### 5. AI Service → Vector Database + DynamoDB
**Why**: AI embeddings, similarity search, content recommendations
**Use Case**: Content embeddings, learning recommendations, AI interactions

```typescript
// Vector Database (Pinecone) + DynamoDB for metadata
// apps/ai-service/src/infrastructure/database/vector/pinecone.service.ts
import { Pinecone } from '@pinecone-database/pinecone';

export interface ContentEmbedding {
  id: string;
  contentId: string;
  embeddings: number[]; // 1536 dimensions for OpenAI embeddings
  metadata: {
    title: string;
    subject: string;
    difficulty: string;
    contentType: 'lesson' | 'quiz' | 'article' | 'video';
    createdAt: string;
    tutorId?: string;
  };
}

@Injectable()
export class PineconeVectorService {
  private pinecone: Pinecone;
  private index: any;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    this.index = this.pinecone.index('edtech-content-embeddings');
  }

  async upsertContentEmbedding(embedding: ContentEmbedding): Promise<void> {
    await this.index.upsert([
      {
        id: embedding.id,
        values: embedding.embeddings,
        metadata: embedding.metadata,
      },
    ]);
  }

  async findSimilarContent(
    queryEmbedding: number[],
    subject?: string,
    topK: number = 10
  ): Promise<ContentEmbedding[]> {
    const filter: any = {};
    if (subject) {
      filter.subject = subject;
    }

    const result = await this.index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter,
    });

    return result.matches.map(match => ({
      id: match.id,
      contentId: match.metadata.contentId,
      embeddings: [], // Not returned in search
      metadata: match.metadata,
      score: match.score,
    }));
  }
}

// DynamoDB for AI interaction history
export interface AIInteraction {
  userId: string; // Partition Key
  sessionId: string; // Sort Key
  interactionId: string;
  query: string;
  response: string;
  responseTime: number;
  model: string; // 'gpt-4', 'claude-3', etc.
  tokens: number;
  cost: number; // in cents
  feedback?: 'helpful' | 'not_helpful';
  createdAt: string;
}

@Injectable()
export class AIInteractionRepository {
  async saveInteraction(interaction: AIInteraction): Promise<void> {
    await this.dynamoClient.send(new PutCommand({
      TableName: 'edtech-ai-interactions',
      Item: interaction,
    }));
  }

  async getUserInteractionHistory(
    userId: string,
    limit: number = 20
  ): Promise<AIInteraction[]> {
    const result = await this.dynamoClient.send(new QueryCommand({
      TableName: 'edtech-ai-interactions',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false,
      Limit: limit,
    }));

    return result.Items as AIInteraction[];
  }
}
```

### 6. Analytics Service → Time-Series Database (Amazon Timestream)
**Why**: Time-series analytics, metrics aggregation, performance insights
**Use Case**: Learning analytics, platform metrics, business intelligence

```typescript
// Amazon Timestream for time-series analytics
// apps/analytics-service/src/infrastructure/database/timestream/analytics.repository.ts
import { TimestreamWriteClient, WriteRecordsCommand } from '@aws-sdk/client-timestream-write';
import { TimestreamQueryClient, QueryCommand } from '@aws-sdk/client-timestream-query';

export interface LearningMetric {
  userId: string;
  metricType: 'lesson_completed' | 'lesson_missed' | 'payment_made' | 'login' | 'search';
  value: number;
  dimensions: Record<string, string>; // subject, tutorId, lessonType, etc.
  timestamp: Date;
}

export interface PlatformMetric {
  metricName: string;
  value: number;
  unit: string;
  dimensions: Record<string, string>;
  timestamp: Date;
}

@Injectable()
export class TimestreamAnalyticsRepository {
  private writeClient: TimestreamWriteClient;
  private queryClient: TimestreamQueryClient;

  constructor() {
    this.writeClient = new TimestreamWriteClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.queryClient = new TimestreamQueryClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async recordLearningMetric(metric: LearningMetric): Promise<void> {
    const records = [
      {
        Dimensions: [
          { Name: 'userId', Value: metric.userId },
          { Name: 'metricType', Value: metric.metricType },
          ...Object.entries(metric.dimensions).map(([key, value]) => ({
            Name: key,
            Value: value,
          })),
        ],
        MeasureName: 'learning_metrics',
        MeasureValue: metric.value.toString(),
        MeasureValueType: 'DOUBLE',
        Time: metric.timestamp.getTime().toString(),
        TimeUnit: 'MILLISECONDS',
      },
    ];

    await this.writeClient.send(new WriteRecordsCommand({
      DatabaseName: 'edtech_analytics',
      TableName: 'learning_metrics',
      Records: records,
    }));
  }

  async getLearningProgress(
    userId: string,
    subject: string,
    fromDate: Date,
    toDate: Date
  ): Promise<any[]> {
    const query = `
      SELECT 
        bin(time, 1d) as day,
        COUNT(*) as lessons_completed,
        AVG(CASE WHEN metricType = 'lesson_completed' THEN measure_value::double END) as avg_performance
      FROM "edtech_analytics"."learning_metrics"
      WHERE userId = '${userId}'
        AND subject = '${subject}'
        AND time BETWEEN '${fromDate.toISOString()}' AND '${toDate.toISOString()}'
        AND metricType = 'lesson_completed'
      GROUP BY bin(time, 1d)
      ORDER BY day
    `;

    const result = await this.queryClient.send(new QueryCommand({
      QueryString: query,
    }));

    return result.Rows?.map(row => ({
      day: row.Data?.[0]?.ScalarValue,
      lessonsCompleted: parseInt(row.Data?.[1]?.ScalarValue || '0'),
      avgPerformance: parseFloat(row.Data?.[2]?.ScalarValue || '0'),
    })) || [];
  }

  async getPlatformMetrics(timeRange: string): Promise<any> {
    const query = `
      SELECT 
        metricType,
        COUNT(*) as event_count,
        bin(time, ${timeRange}) as time_bucket
      FROM "edtech_analytics"."platform_metrics"
      WHERE time > ago(30d)
      GROUP BY metricType, bin(time, ${timeRange})
      ORDER BY time_bucket
    `;

    const result = await this.queryClient.send(new QueryCommand({
      QueryString: query,
    }));

    return result.Rows;
  }
}

// PostgreSQL for reviews and structured analytics
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey(),
  reviewerUserId: uuid('reviewer_user_id').notNull(),
  targetUserId: uuid('target_user_id').notNull(),
  lessonId: uuid('lesson_id'),
  rating: integer('rating').notNull(), // 1-5 stars
  comment: text('comment'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
```

## Database Infrastructure Configuration

### Development Environment
```yaml
# docker-compose.yml
version: '3.8'
services:
  # PostgreSQL for Identity, Learning, Payment services
  postgres-identity:
    image: postgres:15
    environment:
      POSTGRES_DB: edtech_identity_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_identity_data:/var/lib/postgresql/data

  postgres-learning:
    image: postgres:15
    environment:
      POSTGRES_DB: edtech_learning_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5433:5432"
    volumes:
      - postgres_learning_data:/var/lib/postgresql/data

  postgres-payment:
    image: postgres:15
    environment:
      POSTGRES_DB: edtech_payment_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5434:5432"
    volumes:
      - postgres_payment_data:/var/lib/postgresql/data

  # DynamoDB Local for Communication service
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    ports:
      - "8000:8000"
    command: ["-jar", "DynamoDBLocal.jar", "-sharedDb", "-dbPath", "./data"]
    volumes:
      - dynamodb_data:/home/dynamodblocal/data

  # Redis for caching and real-time features
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_identity_data:
  postgres_learning_data:
  postgres_payment_data:
  dynamodb_data:
  redis_data:
```

### Production Environment Variables
```bash
# Identity Service - PostgreSQL
IDENTITY_DB_HOST=identity-db.cluster-xxx.rds.amazonaws.com
IDENTITY_DB_PORT=5432
IDENTITY_DB_NAME=edtech_identity_db
IDENTITY_DB_USER=identity_user
IDENTITY_DB_PASSWORD=secure_password

# Learning Management Service - PostgreSQL
LEARNING_DB_HOST=learning-db.cluster-xxx.rds.amazonaws.com
LEARNING_DB_PORT=5432
LEARNING_DB_NAME=edtech_learning_db

# Payment Service - PostgreSQL
PAYMENT_DB_HOST=payment-db.cluster-xxx.rds.amazonaws.com
PAYMENT_DB_PORT=5432
PAYMENT_DB_NAME=edtech_payment_db

# Communication Service - DynamoDB
AWS_REGION=us-east-1
DYNAMODB_MESSAGES_TABLE=edtech-messages-prod
DYNAMODB_NOTIFICATIONS_TABLE=edtech-notifications-prod

# AI Service - Vector Database + DynamoDB
PINECONE_API_KEY=xxx
PINECONE_INDEX_NAME=edtech-content-embeddings-prod
AI_INTERACTIONS_TABLE=edtech-ai-interactions-prod

# Analytics Service - Timestream + PostgreSQL
TIMESTREAM_DATABASE=edtech_analytics_prod
TIMESTREAM_TABLE=learning_metrics_prod
ANALYTICS_DB_HOST=analytics-db.cluster-xxx.rds.amazonaws.com
```

## Benefits of Polyglot Architecture

### Performance Optimization
- **PostgreSQL**: ACID compliance for critical data
- **DynamoDB**: Millisecond latency for real-time features
- **Vector DB**: Fast similarity search for AI recommendations
- **Timestream**: Optimized time-series analytics

### Scalability
- **Horizontal scaling** for high-volume services (DynamoDB)
- **Vertical scaling** for complex queries (PostgreSQL)
- **Specialized scaling** for analytics workloads

### Cost Optimization
- **Pay-per-request** for variable workloads (DynamoDB)
- **Reserved instances** for predictable workloads (RDS)
- **Serverless** for analytics queries (Timestream)

This polyglot approach ensures each service uses the optimal database technology for its specific requirements while maintaining proper microservices boundaries.