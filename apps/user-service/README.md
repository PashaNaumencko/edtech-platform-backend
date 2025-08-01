# User Service - Internal Microservice

## Overview
The User Service is the core microservice responsible for user management, authentication, and profiles in the EdTech platform.

## Purpose
- **Internal API** for service-to-service communication
- User registration, authentication, and profile management
- Role-based access control (Student, Tutor, Admin)
- Domain events for cross-service integration
- Frontend access through GraphQL Federation

## 📚 Complete Documentation
For comprehensive documentation including domain architecture, business rules, and implementation details, see:
**[User Service Documentation](../../docs/services/user-service.md)**

This README focuses on service-specific configuration and development setup.

## API Endpoints

### Health Check
```
GET /health
```

### User Management (Internal Only)
```
POST   /internal/users              # Create user
GET    /internal/users/:id          # Get user by ID
PUT    /internal/users/:id          # Update user
DELETE /internal/users/:id          # Delete user
GET    /internal/users/email/:email # Find user by email
```

### Profile Management
```
PUT    /internal/users/:id/profile       # Update profile
POST   /internal/users/:id/become-tutor  # Convert to tutor
GET    /internal/users/:id/tutor-profile # Get tutor profile
```

### Authentication (Internal Only)
```
POST   /internal/auth/validate-token    # Validate JWT token
POST   /internal/auth/social-link       # Link social account
GET    /internal/auth/user-permissions  # Get user permissions
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  timezone VARCHAR(50),
  locale VARCHAR(10),
  preferred_language VARCHAR(10),
  video_intro_url VARCHAR(500),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  is_tutor BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tutor Profiles Table
```sql
CREATE TABLE tutor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT FALSE,
  hourly_rate DECIMAL(10,2),
  currency VARCHAR(3),
  subjects TEXT[],
  languages TEXT[],
  experience TEXT,
  education TEXT,
  description TEXT,
  rating DECIMAL(3,2),
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Social Accounts Table
```sql
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL, -- 'google', 'facebook', 'apple'
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255) NOT NULL,
  linked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);
```

## Environment Variables

### Required
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/userservice

# AWS
AWS_REGION=us-east-1
USER_POOL_ID=us-east-1_xxxxxxxxx
EVENT_BUS_ARN=arn:aws:events:us-east-1:123456789012:event-bus/edtech-bus

# Service Configuration
PORT=3001
NODE_ENV=development
SERVICE_NAME=user-service
```

### Optional
```bash
# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
```

## Service Communication

### Calling User Service from Other Services
```typescript
// From Learning Service
import { UserServiceClient } from '@edtech/service-clients';

const userClient = new UserServiceClient({
  baseURL: 'http://user-service:3001',
  timeout: 5000,
});

// Get user profile
const user = await userClient.getUser(userId);

// Validate user exists
const exists = await userClient.validateUserExists(userId);
```

### Event Publishing
```typescript
// User service publishes events to EventBridge
const event = {
  Source: 'user-service',
  DetailType: 'User Created',
  Detail: {
    userId: 'uuid',
    email: 'user@example.com',
    isTutor: false,
  },
};

await eventBridge.putEvents({ Entries: [event] }).promise();
```

## Docker Configuration

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3001
CMD ["node", "dist/main"]
```

### docker-compose.yml (Development)
```yaml
services:
  user-service:
    build: ./apps/user-service
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/userservice
      - NODE_ENV=development
    depends_on:
      - postgres
```

## Development

### Local Development
```bash
# Start the service
pnpm start:dev user-service

# Run tests
pnpm test user-service

# Build for production
pnpm build user-service
```

### Database Migrations
```bash
# Run migrations
pnpm migration:run user-service

# Generate migration
pnpm migration:generate user-service AddTutorProfile

# Revert migration
pnpm migration:revert user-service
```

## Testing

### Unit Tests
```bash
# Run unit tests
pnpm test:unit user-service

# Watch mode
pnpm test:watch user-service
```

### Integration Tests
```bash
# Run integration tests (requires database)
pnpm test:integration user-service
```

### API Testing
```bash
# Test endpoints with curl
curl -X GET http://localhost:3001/health
curl -X POST http://localhost:3001/internal/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"John","lastName":"Doe"}'
```

## Security

### Internal Service Authentication
- Services authenticate with each other using JWT tokens
- No public internet access - runs in private subnets
- Database connections use SSL

### Input Validation
- All inputs validated using class-validator
- SQL injection protection via TypeORM
- Rate limiting on endpoints

## Monitoring

### Health Checks
- `/health` endpoint for load balancer health checks
- Database connectivity check
- Memory and CPU metrics

### Logging
- Structured logging with Winston
- Request/response logging
- Error tracking with stack traces

### Metrics
- Request duration and count
- Database query performance
- Error rates by endpoint 