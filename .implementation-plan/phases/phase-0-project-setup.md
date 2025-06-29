# Phase 0: Project Setup & Foundation
**Sprint 1 | Duration: 10 days (2 weeks)**

## 🎯 Phase Objectives
Establish the foundational project structure, development environment, and database migration infrastructure required for all subsequent phases. This phase creates the scaffolding that enables efficient microservices development with proper database per service architecture.

## 📋 Phase Dependencies
- **Prerequisites**: None (starting point)
- **Outputs**: Complete development environment, project structure, migration infrastructure

## 🔧 Enhanced Subphases (12 Total)

### 0.1 Prerequisites & Basic Setup
**Duration: 1 day | Priority: Critical**

#### 0.1.1 Development Environment Setup
**Detailed Tasks:**
- [ ] **Install Required Tools**
  ```bash
  # Check Node.js version (should be 18+)
  node --version
  
  # Install pnpm globally if not installed
  npm install -g pnpm
  
  # Install NestJS CLI globally
  pnpm add -g @nestjs/cli
  
  # Install Docker and Docker Compose
  # Verify Docker installation
  docker --version
  docker-compose --version
  ```

- [ ] **Version Control Setup**
  ```bash
  # Create .nvmrc for Node.js version consistency
  echo "18" > .nvmrc
  
  # Initialize Git repository
  git init
  
  # Configure Git user (if not already done)
  git config user.name "Your Name"
  git config user.email "your.email@example.com"
  ```

### 0.2 NestJS Monorepo Initialization
**Duration: 1 day | Priority: Critical**

#### 0.2.1 Create Base Project Structure
**Detailed Tasks:**
- [ ] **Initialize NestJS Project**
  ```bash
  # Create initial NestJS project with pnpm
  nest new edtech-platform-backend --package-manager pnpm
  cd edtech-platform-backend
  
  # Remove default app (we'll use microservices)
  rm -rf src/
  ```

- [ ] **Create Microservice Applications**
  ```bash
  # Generate all microservice applications
  nest generate app user-service
  nest generate app learning-service
  nest generate app tutor-matching-service
  nest generate app payment-service
  nest generate app reviews-service
  nest generate app communication-service
  nest generate app content-service
  nest generate app notification-service
  nest generate app analytics-service
  nest generate app ai-service
  ```

### 0.3 Shared Libraries Creation
**Duration: 1 day | Priority: High**

#### 0.3.1 Core Shared Libraries
**Detailed Tasks:**
- [ ] **Generate Core Libraries**
  ```bash
  # Generate foundational shared libraries
  nest generate lib shared-types
  nest generate lib shared-utils
  nest generate lib shared-events
  nest generate lib shared-database
  nest generate lib shared-domain
  ```

#### 0.3.2 Specialized Shared Libraries
**Detailed Tasks:**
- [ ] **Generate Specialized Libraries**
  ```bash
  # Generate domain-specific shared libraries
  nest generate lib shared-security
  nest generate lib shared-communication
  nest generate lib shared-validation
  nest generate lib shared-notifications
  nest generate lib shared-analytics
  ```

### 0.4 Project Structure & Documentation
**Duration: 1 day | Priority: High**

#### 0.4.1 Directory Structure Creation
**Detailed Tasks:**
- [ ] **Create Infrastructure Directories**
  ```bash
  # CDK infrastructure
  mkdir -p cdk/{lib/{constructs,stacks},bin}
  
  # Documentation structure
  mkdir -p docs/{api-specifications,architecture-decisions,deployment-guides,troubleshooting}
  
  # Scripts organization
  mkdir -p scripts/{development,deployment,migration,seed}
  
  # Testing structure
  mkdir -p tests/{integration,e2e,performance}
  ```

#### 0.4.2 Git Configuration
**Detailed Tasks:**
- [ ] **Create .gitignore**
  ```gitignore
  # Dependencies
  node_modules/
  
  # pnpm
  .pnpm-store/
  .pnpm-debug.log*
  
  # Build outputs
  dist/
  build/
  
  # Environment files
  .env*
  !.env.example
  
  # AWS patterns
  cdk.out/
  *.pem
  .aws/
  
  # Database patterns
  *.db
  *.sqlite
  postgres-data/
  
  # IDE patterns
  .vscode/
  .idea/
  *.swp
  *.swo
  
  # LocalStack patterns
  localstack-data/
  .localstack/
  
  # Logs
  *.log
  npm-debug.log*
  yarn-debug.log*
  yarn-error.log*
  
  # OS
  .DS_Store
  Thumbs.db
  ```

- [ ] **Create pnpm-workspace.yaml**
  ```yaml
  packages:
    - 'apps/*'
    - 'libs/*'
    - 'cdk'
  ```

### 0.5 Package Management Configuration
**Duration: 1 day | Priority: Critical**

#### 0.5.1 Root Package.json Setup
**Detailed Tasks:**
- [ ] **Configure Monorepo Package.json**
  ```json
  {
    "name": "edtech-platform-backend",
    "version": "1.0.0",
    "private": true,
    "scripts": {
      "build": "nest build",
      "format": "prettier --write \"apps/**/*.ts\" \"libs/**/*.ts\"",
      "start": "nest start",
      "start:dev": "nest start --watch",
      "start:debug": "nest start --debug --watch",
      "start:prod": "node dist/apps/main/main",
      "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
      "test": "jest",
      "test:watch": "jest --watch",
      "test:cov": "jest --coverage",
      "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
      "test:e2e": "jest --config ./apps/user-service/test/jest-e2e.json",
      "dev:setup": "./scripts/dev-setup.sh",
      "dev:reset": "./scripts/dev-reset.sh",
      "docker:up": "docker-compose up -d",
      "docker:down": "docker-compose down",
      "migrate:all": "pnpm migrate:user && pnpm migrate:payment && pnpm migrate:reviews && pnpm migrate:learning",
      "migrate:user": "cd apps/user-service && pnpm typeorm:migration:run",
      "migrate:payment": "cd apps/payment-service && pnpm typeorm:migration:run",
      "migrate:reviews": "cd apps/reviews-service && pnpm typeorm:migration:run",
      "migrate:learning": "cd apps/learning-service && pnpm typeorm:migration:run",
      "seed:all": "pnpm seed:user && pnpm seed:payment && pnpm seed:reviews && pnpm seed:learning"
    }
  }
  ```

#### 0.5.2 Core Dependencies Installation
**Detailed Tasks:**
- [ ] **Install NestJS Core Dependencies**
  ```bash
  # Core NestJS packages
  pnpm add @nestjs/common @nestjs/core @nestjs/platform-express
  pnpm add @nestjs/config @nestjs/typeorm @nestjs/cqrs
  pnpm add @nestjs/microservices @nestjs/websockets
  pnpm add reflect-metadata rxjs
  
  # Development dependencies
  pnpm add -D @nestjs/cli @nestjs/schematics @nestjs/testing
  pnpm add -D typescript ts-node ts-loader
  pnpm add -D jest @types/jest supertest @types/supertest
  ```

### 0.6 TypeScript Configuration
**Duration: 1 day | Priority: High**

#### 0.6.1 Root TypeScript Configuration
**Detailed Tasks:**
- [ ] **Create Root tsconfig.json**
  ```json
  {
    "compilerOptions": {
      "module": "commonjs",
      "declaration": true,
      "removeComments": true,
      "emitDecoratorMetadata": true,
      "experimentalDecorators": true,
      "allowSyntheticDefaultImports": true,
      "target": "ES2021",
      "sourceMap": true,
      "outDir": "./dist",
      "baseUrl": "./",
      "incremental": true,
      "skipLibCheck": true,
      "strictNullChecks": false,
      "noImplicitAny": false,
      "strictBindCallApply": false,
      "forceConsistentCasingInFileNames": false,
      "noFallthroughCasesInSwitch": false,
      "paths": {
        "@app/shared-types": ["libs/shared-types/src"],
        "@app/shared-types/*": ["libs/shared-types/src/*"],
        "@app/shared-utils": ["libs/shared-utils/src"],
        "@app/shared-utils/*": ["libs/shared-utils/src/*"],
        "@app/shared-events": ["libs/shared-events/src"],
        "@app/shared-events/*": ["libs/shared-events/src/*"],
        "@app/shared-database": ["libs/shared-database/src"],
        "@app/shared-database/*": ["libs/shared-database/src/*"],
        "@app/shared-domain": ["libs/shared-domain/src"],
        "@app/shared-domain/*": ["libs/shared-domain/src/*"],
        "@app/shared-security": ["libs/shared-security/src"],
        "@app/shared-security/*": ["libs/shared-security/src/*"],
        "@app/shared-communication": ["libs/shared-communication/src"],
        "@app/shared-communication/*": ["libs/shared-communication/src/*"],
        "@app/shared-validation": ["libs/shared-validation/src"],
        "@app/shared-validation/*": ["libs/shared-validation/src/*"],
        "@app/shared-notifications": ["libs/shared-notifications/src"],
        "@app/shared-notifications/*": ["libs/shared-notifications/src/*"],
        "@app/shared-analytics": ["libs/shared-analytics/src"],
        "@app/shared-analytics/*": ["libs/shared-analytics/src/*"]
      }
    }
  }
  ```

### 0.7 Code Quality & Standards
**Duration: 1 day | Priority: High**

#### 0.7.1 ESLint Configuration
**Detailed Tasks:**
- [ ] **Install ESLint Dependencies**
  ```bash
  pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
  pnpm add -D eslint-config-prettier eslint-plugin-prettier
  ```

- [ ] **Create .eslintrc.js**
  ```javascript
  module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: [
      'eslint:recommended',
      '@typescript-eslint/recommended',
      'prettier'
    ],
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error'
    }
  };
  ```

#### 0.7.2 Prettier Configuration
**Detailed Tasks:**
- [ ] **Install Prettier**
  ```bash
  pnpm add -D prettier
  ```

- [ ] **Create .prettierrc**
  ```json
  {
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 100,
    "tabWidth": 2,
    "useTabs": false
  }
  ```

### 0.8 Docker Base Configuration
**Duration: 1 day | Priority: Critical**

#### 0.8.1 PostgreSQL Databases Setup
**Detailed Tasks:**
- [ ] **Create docker-compose.yml (Databases)**
  ```yaml
  version: '3.8'
  services:
    # PostgreSQL for User Service
    postgres-user:
      container_name: edtech-postgres-user
      image: postgres:15
      environment:
        POSTGRES_DB: user_service
        POSTGRES_USER: user_service
        POSTGRES_PASSWORD: user_password
      ports:
        - "5432:5432"
      volumes:
        - postgres-user-data:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U user_service"]
        interval: 30s
        timeout: 10s
        retries: 5

    # PostgreSQL for Payment Service
    postgres-payment:
      container_name: edtech-postgres-payment
      image: postgres:15
      environment:
        POSTGRES_DB: payment_service
        POSTGRES_USER: payment_service
        POSTGRES_PASSWORD: payment_password
      ports:
        - "5433:5432"
      volumes:
        - postgres-payment-data:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U payment_service"]
        interval: 30s
        timeout: 10s
        retries: 5

    # PostgreSQL for Reviews Service
    postgres-reviews:
      container_name: edtech-postgres-reviews
      image: postgres:15
      environment:
        POSTGRES_DB: reviews_service
        POSTGRES_USER: reviews_service
        POSTGRES_PASSWORD: reviews_password
      ports:
        - "5434:5432"
      volumes:
        - postgres-reviews-data:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U reviews_service"]
        interval: 30s
        timeout: 10s
        retries: 5

    # PostgreSQL for Learning Service
    postgres-learning:
      container_name: edtech-postgres-learning
      image: postgres:15
      environment:
        POSTGRES_DB: learning_service
        POSTGRES_USER: learning_service
        POSTGRES_PASSWORD: learning_password
      ports:
        - "5435:5432"
      volumes:
        - postgres-learning-data:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U learning_service"]
        interval: 30s
        timeout: 10s
        retries: 5

  volumes:
    postgres-user-data:
    postgres-payment-data:
    postgres-reviews-data:
    postgres-learning-data:
  ```

### 0.9 NoSQL & Specialized Databases
**Duration: 1 day | Priority: Critical**

#### 0.9.1 Add NoSQL Databases to Docker Compose
**Detailed Tasks:**
- [ ] **Extend docker-compose.yml (NoSQL)**
  ```yaml
  # Add to existing docker-compose.yml services:
  
    # Redis for Communication Service and Caching
    redis:
      container_name: edtech-redis
      image: redis:7-alpine
      ports:
        - "6379:6379"
      volumes:
        - redis-data:/data
      command: redis-server --appendonly yes
      healthcheck:
        test: ["CMD", "redis-cli", "ping"]
        interval: 30s
        timeout: 10s
        retries: 5

    # Neo4j for Tutor Matching Service
    neo4j:
      container_name: edtech-neo4j
      image: neo4j:5.11
      environment:
        NEO4J_AUTH: neo4j/tutormatching
        NEO4J_PLUGINS: '["apoc"]'
      ports:
        - "7474:7474"
        - "7687:7687"
      volumes:
        - neo4j-data:/data
      healthcheck:
        test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "tutormatching", "RETURN 1"]
        interval: 30s
        timeout: 10s
        retries: 5

  # Add to volumes:
  volumes:
    redis-data:
    neo4j-data:
  ```

### 0.10 LocalStack & AWS Services
**Duration: 1 day | Priority: Critical**

#### 0.10.1 LocalStack Configuration
**Detailed Tasks:**
- [ ] **Add LocalStack to Docker Compose**
  ```yaml
  # Add to existing docker-compose.yml services:
  
    # LocalStack for AWS services
    localstack:
      container_name: edtech-localstack
      image: localstack/localstack:latest
      ports:
        - "4566:4566"
      environment:
        - SERVICES=dynamodb,s3,lambda,eventbridge,cognito-idp,opensearch,rds
        - DEBUG=1
        - DATA_DIR=/tmp/localstack/data
        - LAMBDA_EXECUTOR=docker
        - DOCKER_HOST=unix:///var/run/docker.sock
      volumes:
        - "./localstack-data:/tmp/localstack"
        - "/var/run/docker.sock:/var/run/docker.sock"
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:4566/_localstack/health"]
        interval: 30s
        timeout: 10s
        retries: 5
  ```

#### 0.10.2 LocalStack Initialization Script
**Detailed Tasks:**
- [ ] **Create LocalStack Init Script**
  ```bash
  #!/bin/bash
  # scripts/init-localstack.sh
  
  echo "🚀 Waiting for LocalStack to be ready..."
  while ! curl -s http://localhost:4566/_localstack/health > /dev/null; do
    echo "   ⏳ LocalStack not ready yet, waiting..."
    sleep 3
  done
  
  echo "✅ LocalStack is ready! Initializing AWS resources..."
  
  # Set AWS CLI to use LocalStack
  export AWS_ACCESS_KEY_ID=test
  export AWS_SECRET_ACCESS_KEY=test
  export AWS_DEFAULT_REGION=us-east-1
  export AWS_ENDPOINT_URL=http://localhost:4566
  
  # Create DynamoDB tables
  echo "📊 Creating DynamoDB tables..."
  
  # Communication Service - Messages table
  aws dynamodb create-table \
    --endpoint-url=http://localhost:4566 \
    --table-name Messages \
    --attribute-definitions \
      AttributeName=conversationId,AttributeType=S \
      AttributeName=timestamp,AttributeType=N \
    --key-schema \
      AttributeName=conversationId,KeyType=HASH \
      AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST
  
  # Content Service - Files metadata table
  aws dynamodb create-table \
    --endpoint-url=http://localhost:4566 \
    --table-name FileMetadata \
    --attribute-definitions AttributeName=fileId,AttributeType=S \
    --key-schema AttributeName=fileId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST
  
  # Create S3 buckets
  echo "🪣 Creating S3 buckets..."
  aws s3 mb s3://edtech-content-dev --endpoint-url=http://localhost:4566
  aws s3 mb s3://edtech-uploads-dev --endpoint-url=http://localhost:4566
  
  echo "✅ LocalStack initialization complete!"
  ```

### 0.11 Development Automation Scripts
**Duration: 1 day | Priority: High**

#### 0.11.1 Development Setup Scripts
**Detailed Tasks:**
- [ ] **Create Master Setup Script**
  ```bash
  #!/bin/bash
  # scripts/dev-setup.sh
  
  set -e  # Exit on any error
  
  echo "🚀 Setting up EdTech Platform development environment..."
  
  # Check prerequisites
  echo "🔍 Checking prerequisites..."
  if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
  fi
  
  if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
  fi
  
  if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker"
    exit 1
  fi
  
  # Install dependencies
  echo "📦 Installing dependencies..."
  pnpm install
  
  # Start databases first
  echo "🗄️ Starting database containers..."
  docker-compose up -d postgres-user postgres-payment postgres-reviews postgres-learning redis neo4j
  
  # Wait for databases
  echo "⏳ Waiting for databases to be ready..."
  ./scripts/wait-for-databases.sh
  
  # Start LocalStack
  echo "☁️ Starting LocalStack..."
  docker-compose up -d localstack
  
  # Initialize LocalStack
  echo "🔧 Initializing LocalStack resources..."
  ./scripts/init-localstack.sh
  
  # Build shared libraries
  echo "🏗️ Building shared libraries..."
  pnpm build:libs
  
  echo "✅ Development environment ready!"
  echo ""
  echo "📝 Next steps:"
  echo "  - Run 'pnpm start:dev' to start services in development mode"
  echo "  - Visit http://localhost:4566 for LocalStack dashboard"
  echo "  - Visit http://localhost:7474 for Neo4j Browser (user: neo4j, pass: tutormatching)"
  echo "  - Check database connections with 'pnpm test:db'"
  ```

#### 0.11.2 Database Utilities
**Detailed Tasks:**
- [ ] **Create Database Wait Script**
  ```bash
  #!/bin/bash
  # scripts/wait-for-databases.sh
  
  wait_for_postgres() {
    local port=$1
    local service=$2
    local max_attempts=30
    local attempt=1
    
    echo "   🔄 Waiting for PostgreSQL ($service) on port $port..."
    while ! nc -z localhost $port; do
      if [ $attempt -eq $max_attempts ]; then
        echo "   ❌ PostgreSQL ($service) failed to start after $max_attempts attempts"
        exit 1
      fi
      echo "   ⏳ Attempt $attempt/$max_attempts - PostgreSQL ($service) not ready..."
      sleep 2
      ((attempt++))
    done
    echo "   ✅ PostgreSQL ($service) is ready!"
  }
  
  wait_for_service() {
    local host=$1
    local port=$2
    local service=$3
    local max_attempts=30
    local attempt=1
    
    echo "   🔄 Waiting for $service on $host:$port..."
    while ! nc -z $host $port; do
      if [ $attempt -eq $max_attempts ]; then
        echo "   ❌ $service failed to start after $max_attempts attempts"
        exit 1
      fi
      echo "   ⏳ Attempt $attempt/$max_attempts - $service not ready..."
      sleep 2
      ((attempt++))
    done
    echo "   ✅ $service is ready!"
  }
  
  # Wait for all PostgreSQL instances
  wait_for_postgres 5432 "user-service"
  wait_for_postgres 5433 "payment-service"
  wait_for_postgres 5434 "reviews-service"
  wait_for_postgres 5435 "learning-service"
  
  # Wait for Redis
  wait_for_service localhost 6379 "Redis"
  
  # Wait for Neo4j
  wait_for_service localhost 7687 "Neo4j"
  
  echo "🎉 All databases are ready!"
  ```

### 0.12 Environment Configuration & Final Setup
**Duration: 1 day | Priority: High**

#### 0.12.1 Environment Variables Configuration
**Detailed Tasks:**
- [ ] **Create .env.example**
  ```bash
  # ===========================================
  # EdTech Platform Backend Environment Config
  # ===========================================
  
  # Node.js Environment
  NODE_ENV=development
  LOG_LEVEL=debug
  
  # ===========================================
  # Database Configuration - PostgreSQL
  # ===========================================
  
  # User Service Database
  POSTGRES_USER_HOST=localhost
  POSTGRES_USER_PORT=5432
  POSTGRES_USER_DB=user_service
  POSTGRES_USER_USER=user_service
  POSTGRES_USER_PASSWORD=user_password
  
  # Payment Service Database
  POSTGRES_PAYMENT_HOST=localhost
  POSTGRES_PAYMENT_PORT=5433
  POSTGRES_PAYMENT_DB=payment_service
  POSTGRES_PAYMENT_USER=payment_service
  POSTGRES_PAYMENT_PASSWORD=payment_password
  
  # Reviews Service Database
  POSTGRES_REVIEWS_HOST=localhost
  POSTGRES_REVIEWS_PORT=5434
  POSTGRES_REVIEWS_DB=reviews_service
  POSTGRES_REVIEWS_USER=reviews_service
  POSTGRES_REVIEWS_PASSWORD=reviews_password
  
  # Learning Service Database
  POSTGRES_LEARNING_HOST=localhost
  POSTGRES_LEARNING_PORT=5435
  POSTGRES_LEARNING_DB=learning_service
  POSTGRES_LEARNING_USER=learning_service
  POSTGRES_LEARNING_PASSWORD=learning_password
  
  # ===========================================
  # NoSQL Database Configuration
  # ===========================================
  
  # Redis Configuration
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD=
  
  # Neo4j Configuration
  NEO4J_URI=bolt://localhost:7687
  NEO4J_USER=neo4j
  NEO4J_PASSWORD=tutormatching
  
  # ===========================================
  # AWS / LocalStack Configuration
  # ===========================================
  
  # LocalStack Configuration
  LOCALSTACK_ENDPOINT=http://localhost:4566
  AWS_REGION=us-east-1
  AWS_ACCESS_KEY_ID=test
  AWS_SECRET_ACCESS_KEY=test
  
  # S3 Buckets
  S3_BUCKET_CONTENT=edtech-content-dev
  S3_BUCKET_UPLOADS=edtech-uploads-dev
  
  # DynamoDB Tables
  DYNAMODB_MESSAGES_TABLE=Messages
  DYNAMODB_FILES_TABLE=FileMetadata
  DYNAMODB_NOTIFICATIONS_TABLE=Notifications
  DYNAMODB_ANALYTICS_TABLE=Analytics
  
  # ===========================================
  # Social Authentication (To be configured)
  # ===========================================
  
  # Google OAuth
  GOOGLE_CLIENT_ID=your_google_client_id
  GOOGLE_CLIENT_SECRET=your_google_client_secret
  
  # Facebook OAuth
  FACEBOOK_APP_ID=your_facebook_app_id
  FACEBOOK_APP_SECRET=your_facebook_app_secret
  
  # Apple OAuth
  APPLE_CLIENT_ID=your_apple_client_id
  APPLE_PRIVATE_KEY_PATH=path_to_apple_private_key
  
  # ===========================================
  # Payment Configuration (To be configured)
  # ===========================================
  
  # Stripe Configuration
  STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
  STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
  STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
  
  # Platform Commission (20%)
  PLATFORM_COMMISSION_RATE=0.20
  
  # ===========================================
  # Service Ports
  # ===========================================
  
  USER_SERVICE_PORT=3001
  LEARNING_SERVICE_PORT=3002
  TUTOR_MATCHING_SERVICE_PORT=3003
  PAYMENT_SERVICE_PORT=3004
  REVIEWS_SERVICE_PORT=3005
  COMMUNICATION_SERVICE_PORT=3006
  CONTENT_SERVICE_PORT=3007
  NOTIFICATION_SERVICE_PORT=3008
  ANALYTICS_SERVICE_PORT=3009
  AI_SERVICE_PORT=3010
  
  # ===========================================
  # Security Configuration
  # ===========================================
  
  # JWT Configuration
  JWT_SECRET=your_jwt_secret_here_min_32_characters
  JWT_EXPIRES_IN=24h
  JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
  JWT_REFRESH_EXPIRES_IN=7d
  
  # Encryption
  ENCRYPTION_KEY=your_encryption_key_32_chars_min
  
  # ===========================================
  # External Services (To be configured)
  # ===========================================
  
  # Video Calling (Agora.io)
  AGORA_APP_ID=your_agora_app_id
  AGORA_APP_CERTIFICATE=your_agora_certificate
  
  # Email Service (SendGrid/SES)
  EMAIL_PROVIDER=sendgrid
  SENDGRID_API_KEY=your_sendgrid_api_key
  EMAIL_FROM=noreply@edtech-platform.com
  
  # SMS Service (Twilio)
  TWILIO_ACCOUNT_SID=your_twilio_account_sid
  TWILIO_AUTH_TOKEN=your_twilio_auth_token
  TWILIO_PHONE_NUMBER=your_twilio_phone_number
  ```

#### 0.12.2 Final Validation & Testing
**Detailed Tasks:**
- [ ] **Create Validation Scripts**
  ```bash
  #!/bin/bash
  # scripts/validate-setup.sh
  
  echo "🔍 Validating development environment setup..."
  
  # Test TypeScript compilation
  echo "📝 Testing TypeScript compilation..."
  if pnpm build:check; then
    echo "   ✅ TypeScript compilation successful"
  else
    echo "   ❌ TypeScript compilation failed"
    exit 1
  fi
  
  # Test linting
  echo "🧹 Testing ESLint..."
  if pnpm lint:check; then
    echo "   ✅ ESLint validation successful"
  else
    echo "   ❌ ESLint validation failed"
    exit 1
  fi
  
  # Test database connections
  echo "🗄️ Testing database connections..."
  if pnpm test:db-connections; then
    echo "   ✅ Database connections successful"
  else
    echo "   ❌ Database connections failed"
    exit 1
  fi
  
  # Test LocalStack services
  echo "☁️ Testing LocalStack services..."
  if curl -s http://localhost:4566/_localstack/health | grep -q "running"; then
    echo "   ✅ LocalStack services running"
  else
    echo "   ❌ LocalStack services not running"
    exit 1
  fi
  
  echo "🎉 All validations passed! Environment is ready for development."
  ```

## ✅ Enhanced Success Criteria

### Technical Acceptance Criteria
- [ ] **Project Structure**: Complete NestJS monorepo with all 10 microservices
- [ ] **Shared Libraries**: All 10 shared libraries created and properly configured
- [ ] **Databases**: All PostgreSQL, Redis, and Neo4j containers running with health checks
- [ ] **LocalStack**: AWS services (DynamoDB, S3, EventBridge) properly initialized
- [ ] **Build System**: TypeScript compilation works across all services
- [ ] **Code Quality**: ESLint and Prettier configured with no errors
- [ ] **Environment**: All environment variables properly configured and validated
- [ ] **Scripts**: Development automation scripts working correctly
- [ ] **Git**: Repository initialized with proper .gitignore and workspace configuration
- [ ] **Documentation**: Basic README with setup instructions

### Operational Readiness
- [ ] **Single Command Setup**: `pnpm dev:setup` completes successfully
- [ ] **Health Checks**: All database and service health checks pass
- [ ] **Fast Development**: Hot reload working for all services
- [ ] **Database Reset**: Can reset and reseed all databases
- [ ] **Service Communication**: Basic inter-service communication established
- [ ] **Error Handling**: Proper error handling and logging in place

### Performance Benchmarks
- [ ] **Setup Time**: Complete environment setup < 5 minutes
- [ ] **Build Time**: Full TypeScript build < 2 minutes
- [ ] **Container Startup**: All containers start < 60 seconds
- [ ] **Hot Reload**: Code changes reflect < 3 seconds

## 📅 Enhanced Phase Timeline

| Subphase | Duration | Priority | Deliverables |
|----------|----------|----------|--------------|
| 0.1 Prerequisites & Basic Setup | 1 day | Critical | Dev environment, Git |
| 0.2 NestJS Monorepo Initialization | 1 day | Critical | Base project structure |
| 0.3 Shared Libraries Creation | 1 day | High | All shared libraries |
| 0.4 Project Structure & Documentation | 1 day | High | Directory structure, Git config |
| 0.5 Package Management Configuration | 1 day | Critical | Dependencies, scripts |
| 0.6 TypeScript Configuration | 1 day | High | TS config, path mappings |
| 0.7 Code Quality & Standards | 1 day | High | ESLint, Prettier |
| 0.8 Docker Base Configuration | 1 day | Critical | PostgreSQL databases |
| 0.9 NoSQL & Specialized Databases | 1 day | Critical | Redis, Neo4j |
| 0.10 LocalStack & AWS Services | 1 day | Critical | LocalStack, AWS resources |
| 0.11 Development Automation Scripts | 1 day | High | Setup, migration scripts |
| 0.12 Environment Configuration & Final Setup | 1 day | High | Environment vars, validation |

**Total Duration**: 12 days (2.4 weeks)  
**Buffer**: +2 days for integration issues and documentation

---

**Next Phase**: [Phase 1: Core Infrastructure & User Service](phase-1-user-service.md) 