# Deployment Guide - EdTech Platform Backend

**Complete deployment procedures for all environments**

Last Updated: November 2025
Platform: EdTech 1-to-1 Tutor-Student Matching Service
Architecture: Microservices on AWS ECS Fargate

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Local Development Environment](#3-local-development-environment)
4. [AWS Development Environment](#4-aws-development-environment)
5. [Docker Build and Push](#5-docker-build-and-push)
6. [Database Migrations](#6-database-migrations)
7. [ECS Service Management](#7-ecs-service-management)
8. [CI/CD Pipeline Setup](#8-cicd-pipeline-setup)
9. [Health Checks and Monitoring](#9-health-checks-and-monitoring)
10. [Rollback Procedures](#10-rollback-procedures)
11. [Emergency Procedures](#11-emergency-procedures)
12. [Cost Management](#12-cost-management)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

### 1.1 Deployment Environments

| Environment | Purpose | Infrastructure | Cost |
|-------------|---------|----------------|------|
| **Local** | Daily development | Docker Compose | $0 (local resources) |
| **Dev** | Integration testing, demos | AWS ECS (on-demand) | ~$2/month (intermittent use) |
| **Staging** | Pre-production testing | AWS ECS (always-on) | ~$100/month |
| **Production** | Live platform | AWS ECS (auto-scaling) | ~$500+/month |

### 1.2 Microservices Architecture

```
┌─────────────────────┬──────────┬──────────┬─────────────────┐
│ Service             │ Port     │ Database │ Status          │
├─────────────────────┼──────────┼──────────┼─────────────────┤
│ identity-service    │ 3000     │ Postgres │ ✅ Implemented  │
│ user-service        │ 3002     │ Postgres │ ✅ Implemented  │
│ tutor-service       │ 3004     │ Postgres │ ✅ Implemented  │
│ matching-service    │ 3006     │ Postgres │ ✅ Implemented  │
│ lesson-service      │ 3008     │ Postgres │ 🚧 In Progress  │
│ payment-service     │ 3010     │ Postgres │ 🚧 In Progress  │
└─────────────────────┴──────────┴──────────┴─────────────────┘
```

---

## 2. Prerequisites

### 2.1 Required Tools

```bash
# Check installed versions
node --version        # Required: v20+
pnpm --version        # Required: v8+
docker --version      # Required: Latest
aws --version         # Required: v2.x
terraform --version   # Required: v1.6+
```

### 2.2 Install Missing Tools

```bash
# Install Node.js 20 (if needed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm

# Install Terraform
brew install terraform  # macOS
# OR
curl -O https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"  # macOS
sudo installer -pkg AWSCLIV2.pkg -target /
```

### 2.3 AWS Account Setup

```bash
# Configure AWS credentials
aws configure

# Enter your credentials:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region name: us-east-1
# Default output format: json

# Verify credentials
aws sts get-caller-identity

# Expected output:
# {
#     "UserId": "AIDAXXXXXXXXXXXXXXXXX",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/your-user"
# }
```

### 2.4 Project Setup

```bash
# Clone repository
git clone <your-repo-url>
cd edtech-platform-backend

# Install dependencies
pnpm install

# Build shared libraries
pnpm build:libs

# Verify setup
pnpm run validate:setup
```

---

## 3. Local Development Environment

### 3.1 Quick Start (Automated Setup)

```bash
# Run automated setup script
./scripts/dev-setup.sh
```

This script will:
- Check prerequisites
- Install dependencies
- Start Docker containers (PostgreSQL, Redis, Neo4j)
- Initialize LocalStack (AWS services emulator)
- Build shared libraries

### 3.2 Manual Setup

#### Step 1: Start Infrastructure

```bash
# Start all database containers
docker-compose up -d

# Verify containers are running
docker-compose ps

# Expected output:
# NAME                       STATUS
# edtech-postgres-user       Up (healthy)
# edtech-postgres-payment    Up (healthy)
# edtech-postgres-reviews    Up (healthy)
# edtech-postgres-learning   Up (healthy)
# edtech-redis               Up (healthy)
# edtech-neo4j               Up (healthy)
# edtech-localstack          Up (healthy)
```

#### Step 2: Wait for Databases

```bash
# Wait for all databases to be ready
./scripts/wait-for-databases.sh

# Or check manually
docker-compose logs postgres-user | grep "ready to accept connections"
```

#### Step 3: Run Database Migrations

```bash
# Run migrations for all services
pnpm run migrate:all

# Or run individual service migrations
pnpm run drizzle:identity:migrate
pnpm run drizzle:user:migrate
pnpm run drizzle:tutor:migrate
pnpm run drizzle:matching:migrate
pnpm run drizzle:lesson:migrate
pnpm run drizzle:payment:migrate
```

#### Step 4: Start Services

```bash
# Start all services in separate terminals
pnpm run start:identity
pnpm run start:user
pnpm run start:tutor
pnpm run start:matching
pnpm run start:lesson
pnpm run start:payment

# Or start a specific service
pnpm run start:dev identity-service
```

### 3.3 Verify Local Deployment

```bash
# Check health endpoints
curl http://localhost:3000/health    # identity-service
curl http://localhost:3002/health    # user-service
curl http://localhost:3004/health    # tutor-service

# Test database connections
pnpm run test:db-connections

# Expected output:
# ✅ PostgreSQL (user-service): Connected
# ✅ PostgreSQL (payment-service): Connected
# ✅ PostgreSQL (reviews-service): Connected
# ✅ PostgreSQL (learning-service): Connected
# ✅ Redis: Connected
# ✅ Neo4j: Connected
```

### 3.4 Stop Local Environment

```bash
# Stop services (Ctrl+C in each terminal)

# Stop Docker containers
docker-compose down

# Or stop and remove all data
docker-compose down -v --remove-orphans
```

---

## 4. AWS Development Environment

### 4.1 Terraform Backend Setup (One-Time)

This creates S3 bucket and DynamoDB table for Terraform state management.

```bash
#!/bin/bash
# infrastructure/scripts/setup-backend.sh

set -e

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="edtech-terraform-state-${AWS_ACCOUNT_ID}"
DYNAMODB_TABLE="edtech-terraform-locks"

echo "🪣 Creating S3 bucket for Terraform state..."
aws s3api create-bucket \
  --bucket ${BUCKET_NAME} \
  --region ${AWS_REGION} 2>/dev/null || echo "Bucket already exists"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket ${BUCKET_NAME} \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket ${BUCKET_NAME} \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

echo "🗄️ Creating DynamoDB table for state locking..."
aws dynamodb create-table \
  --table-name ${DYNAMODB_TABLE} \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ${AWS_REGION} 2>/dev/null || echo "Table already exists"

echo "✅ Terraform backend ready!"
echo "Bucket: ${BUCKET_NAME}"
echo "Table: ${DYNAMODB_TABLE}"
```

Run the script:

```bash
chmod +x infrastructure/scripts/setup-backend.sh
./infrastructure/scripts/setup-backend.sh
```

### 4.2 Deploy Infrastructure (Terraform)

#### Step 1: Initialize Terraform

```bash
cd infrastructure/environments/dev

# Initialize Terraform (downloads providers)
terraform init

# Expected output:
# Terraform has been successfully initialized!
```

#### Step 2: Plan Infrastructure Changes

```bash
# See what will be created
terraform plan

# Save plan to file for review
terraform plan -out=tfplan

# Review the plan
terraform show tfplan
```

#### Step 3: Apply Infrastructure

```bash
# Apply changes
terraform apply

# Or apply saved plan
terraform apply tfplan

# Type 'yes' when prompted
```

This will create:
- VPC with public subnets (no NAT Gateway - saves $32/month)
- Security groups (ALB, ECS tasks, RDS)
- RDS PostgreSQL instance (db.t3.micro - free tier eligible)
- ECS cluster
- ECR repositories for Docker images
- Application Load Balancer
- CloudWatch log groups
- SSM parameters for secrets
- IAM roles and policies

#### Step 4: Verify Infrastructure

```bash
# Check VPC
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=edtech-dev-vpc"

# Check RDS instance
aws rds describe-db-instances --db-instance-identifier edtech-dev-postgres

# Check ECS cluster
aws ecs describe-clusters --clusters edtech-dev

# Check ECR repositories
aws ecr describe-repositories --repository-names \
  identity-service \
  user-service \
  tutor-service \
  matching-service \
  lesson-service \
  payment-service
```

### 4.3 Create SSM Secrets

```bash
#!/bin/bash
# infrastructure/scripts/create-secrets.sh

set -e

ENVIRONMENT="dev"

echo "🔐 Creating SSM secrets for ${ENVIRONMENT}..."

# Database password (auto-generated by Terraform)
# JWT secret
aws ssm put-parameter \
  --name "/${ENVIRONMENT}/auth/jwt-secret" \
  --type "SecureString" \
  --value "$(openssl rand -base64 32)" \
  --overwrite

# Stripe API key (replace with your key)
aws ssm put-parameter \
  --name "/${ENVIRONMENT}/payment/stripe-api-key" \
  --type "SecureString" \
  --value "sk_test_YOUR_STRIPE_KEY" \
  --overwrite

# Twilio credentials (replace with your keys)
aws ssm put-parameter \
  --name "/${ENVIRONMENT}/lesson/twilio-account-sid" \
  --type "SecureString" \
  --value "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  --overwrite

aws ssm put-parameter \
  --name "/${ENVIRONMENT}/lesson/twilio-auth-token" \
  --type "SecureString" \
  --value "your_twilio_auth_token" \
  --overwrite

echo "✅ Secrets created!"
```

### 4.4 Get Infrastructure Outputs

```bash
# Get all outputs
terraform output

# Get specific output
terraform output rds_endpoint
terraform output ecr_repositories

# Example outputs:
# rds_endpoint = "edtech-dev-postgres.xxxxxx.us-east-1.rds.amazonaws.com"
# alb_dns_name = "edtech-dev-alb-xxxxxxxxxx.us-east-1.elb.amazonaws.com"
```

---

## 5. Docker Build and Push

### 5.1 ECR Login

```bash
#!/bin/bash
# infrastructure/scripts/ecr-login.sh

set -e

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🔐 Logging in to ECR..."

aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo "✅ ECR login successful!"
```

### 5.2 Build Docker Images

```bash
#!/bin/bash
# infrastructure/scripts/build-images.sh

set -e

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

SERVICES=(
  "identity-service"
  "user-service"
  "tutor-service"
  "matching-service"
  "lesson-service"
  "payment-service"
)

echo "🏗️ Building Docker images..."

for SERVICE in "${SERVICES[@]}"; do
  echo "Building ${SERVICE}..."

  docker build \
    -t ${SERVICE}:latest \
    -t ${ECR_BASE}/${SERVICE}:latest \
    -t ${ECR_BASE}/${SERVICE}:$(git rev-parse --short HEAD) \
    -f apps/${SERVICE}/Dockerfile \
    .

  echo "✅ ${SERVICE} built successfully!"
done

echo "✅ All images built!"
```

### 5.3 Dockerfile Template

Each service should have a Dockerfile at `apps/{service-name}/Dockerfile`:

```dockerfile
# apps/identity-service/Dockerfile

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build identity-service

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/apps/identity-service ./apps/identity-service

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/apps/identity-service/main"]
```

### 5.4 Push to ECR

```bash
#!/bin/bash
# infrastructure/scripts/push-images.sh

set -e

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

SERVICES=(
  "identity-service"
  "user-service"
  "tutor-service"
  "matching-service"
  "lesson-service"
  "payment-service"
)

echo "📤 Pushing Docker images to ECR..."

for SERVICE in "${SERVICES[@]}"; do
  echo "Pushing ${SERVICE}..."

  # Push latest tag
  docker push ${ECR_BASE}/${SERVICE}:latest

  # Push git commit tag
  docker push ${ECR_BASE}/${SERVICE}:$(git rev-parse --short HEAD)

  echo "✅ ${SERVICE} pushed successfully!"
done

echo "✅ All images pushed to ECR!"
```

### 5.5 Complete Build and Push Script

```bash
#!/bin/bash
# infrastructure/scripts/build-and-push.sh

set -e

echo "🚀 Building and pushing all services..."

# Login to ECR
./infrastructure/scripts/ecr-login.sh

# Build images
./infrastructure/scripts/build-images.sh

# Push images
./infrastructure/scripts/push-images.sh

echo "✅ Build and push complete!"
```

Usage:

```bash
chmod +x infrastructure/scripts/*.sh
./infrastructure/scripts/build-and-push.sh
```

---

## 6. Database Migrations

### 6.1 Local Migrations

```bash
# Generate migration from schema changes
pnpm run drizzle:identity:generate

# Review generated migration
cat apps/identity-service/drizzle/0001_migration.sql

# Apply migration
pnpm run drizzle:identity:migrate

# Run all service migrations
pnpm run migrate:all
```

### 6.2 AWS Migrations

```bash
#!/bin/bash
# infrastructure/scripts/run-migrations.sh

set -e

ENVIRONMENT="dev"
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
DB_PASSWORD=$(aws ssm get-parameter \
  --name "/${ENVIRONMENT}/database/password" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

SERVICES=(
  "identity"
  "user"
  "tutor"
  "matching"
  "lesson"
  "payment"
)

echo "🗄️ Running database migrations on AWS..."

for SERVICE in "${SERVICES[@]}"; do
  echo "Migrating ${SERVICE}_db..."

  DATABASE_URL="postgresql://edtech_admin:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/${SERVICE}_db"

  # Run Drizzle migration
  cd apps/${SERVICE}-service
  DATABASE_URL=${DATABASE_URL} npx drizzle-kit migrate
  cd ../..

  echo "✅ ${SERVICE}_db migrated!"
done

echo "✅ All migrations complete!"
```

### 6.3 Migration Rollback

```bash
#!/bin/bash
# Rollback last migration for a service

SERVICE=$1  # e.g., "identity"

if [ -z "$SERVICE" ]; then
  echo "Usage: ./rollback-migration.sh <service-name>"
  exit 1
fi

echo "⚠️ Rolling back last migration for ${SERVICE}-service..."

ENVIRONMENT="dev"
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
DB_PASSWORD=$(aws ssm get-parameter \
  --name "/${ENVIRONMENT}/database/password" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

DATABASE_URL="postgresql://edtech_admin:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/${SERVICE}_db"

# Find the last migration
LAST_MIGRATION=$(ls -1 apps/${SERVICE}-service/drizzle/*.sql | tail -n 1)

echo "Last migration: ${LAST_MIGRATION}"
echo "⚠️ This will DROP tables/columns created by this migration!"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

# Manual rollback (Drizzle doesn't support automatic rollback)
echo "Please manually write a rollback migration in:"
echo "apps/${SERVICE}-service/drizzle/rollback_$(date +%s).sql"
```

---

## 7. ECS Service Management

### 7.1 Start Services

```bash
#!/bin/bash
# infrastructure/scripts/start-services.sh

set -e

CLUSTER="edtech-dev"
SERVICES=(
  "identity-service"
  "user-service"
  "tutor-service"
  "matching-service"
  "lesson-service"
  "payment-service"
)

echo "🚀 Starting ECS services..."

for SERVICE in "${SERVICES[@]}"; do
  echo "Starting ${SERVICE}..."

  aws ecs update-service \
    --cluster ${CLUSTER} \
    --service ${SERVICE} \
    --desired-count 1 \
    --no-cli-pager

  echo "✅ ${SERVICE} starting..."
done

echo "⏳ Waiting for services to be healthy..."

aws ecs wait services-stable \
  --cluster ${CLUSTER} \
  --services "${SERVICES[@]}"

echo "✅ All services running!"
echo ""
echo "📊 Service URLs:"
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names edtech-dev-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "  Identity Service: http://${ALB_DNS}:3000"
echo "  User Service: http://${ALB_DNS}:3002"
echo "  Tutor Service: http://${ALB_DNS}:3004"
echo ""
echo "💰 Cost: \$0.01/hour per service (6 services = \$0.06/hour)"
```

### 7.2 Stop Services

```bash
#!/bin/bash
# infrastructure/scripts/stop-services.sh

set -e

CLUSTER="edtech-dev"
SERVICES=(
  "identity-service"
  "user-service"
  "tutor-service"
  "matching-service"
  "lesson-service"
  "payment-service"
)

echo "🛑 Stopping ECS services..."

for SERVICE in "${SERVICES[@]}"; do
  echo "Stopping ${SERVICE}..."

  aws ecs update-service \
    --cluster ${CLUSTER} \
    --service ${SERVICE} \
    --desired-count 0 \
    --no-cli-pager

  echo "✅ ${SERVICE} stopped"
done

echo "✅ All services stopped!"
echo "💰 Cost: \$0/hour"
```

### 7.3 Update Service (Deploy New Version)

```bash
#!/bin/bash
# infrastructure/scripts/update-service.sh

set -e

SERVICE_NAME=$1  # e.g., "identity-service"
IMAGE_TAG=${2:-latest}  # Default to "latest"

if [ -z "$SERVICE_NAME" ]; then
  echo "Usage: ./update-service.sh <service-name> [image-tag]"
  exit 1
fi

CLUSTER="edtech-dev"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"
IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${SERVICE_NAME}:${IMAGE_TAG}"

echo "🚀 Deploying ${SERVICE_NAME} with image: ${IMAGE}"

# Get current task definition
TASK_DEFINITION=$(aws ecs describe-services \
  --cluster ${CLUSTER} \
  --services ${SERVICE_NAME} \
  --query 'services[0].taskDefinition' \
  --output text)

# Create new task definition with new image
NEW_TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition ${TASK_DEFINITION} \
  --query 'taskDefinition' | \
  jq --arg IMAGE "$IMAGE" \
    '.containerDefinitions[0].image = $IMAGE |
     del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

# Register new task definition
NEW_REVISION=$(echo ${NEW_TASK_DEF} | \
  aws ecs register-task-definition --cli-input-json file:///dev/stdin | \
  jq -r '.taskDefinition.taskDefinitionArn')

echo "✅ New task definition registered: ${NEW_REVISION}"

# Update service with new task definition
aws ecs update-service \
  --cluster ${CLUSTER} \
  --service ${SERVICE_NAME} \
  --task-definition ${NEW_REVISION} \
  --force-new-deployment \
  --no-cli-pager

echo "⏳ Waiting for deployment to complete..."

aws ecs wait services-stable \
  --cluster ${CLUSTER} \
  --services ${SERVICE_NAME}

echo "✅ ${SERVICE_NAME} deployed successfully!"
```

Usage:

```bash
# Deploy with latest tag
./infrastructure/scripts/update-service.sh identity-service

# Deploy with specific git commit
./infrastructure/scripts/update-service.sh identity-service a1b2c3d
```

### 7.4 Scale Services

```bash
#!/bin/bash
# infrastructure/scripts/scale-service.sh

set -e

SERVICE_NAME=$1
DESIRED_COUNT=$2

if [ -z "$SERVICE_NAME" ] || [ -z "$DESIRED_COUNT" ]; then
  echo "Usage: ./scale-service.sh <service-name> <desired-count>"
  exit 1
fi

CLUSTER="edtech-dev"

echo "📊 Scaling ${SERVICE_NAME} to ${DESIRED_COUNT} tasks..."

aws ecs update-service \
  --cluster ${CLUSTER} \
  --service ${SERVICE_NAME} \
  --desired-count ${DESIRED_COUNT} \
  --no-cli-pager

echo "✅ ${SERVICE_NAME} scaling to ${DESIRED_COUNT} tasks"
```

Usage:

```bash
# Scale up to 3 instances
./infrastructure/scripts/scale-service.sh identity-service 3

# Scale down to 0 (stop service)
./infrastructure/scripts/scale-service.sh identity-service 0
```

---

## 8. CI/CD Pipeline Setup

### 8.1 GitHub Actions Workflow

Create `.github/workflows/deploy-dev.yml`:

```yaml
name: Deploy to Dev

on:
  push:
    branches:
      - develop
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  ECS_CLUSTER: edtech-dev

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        service:
          - identity-service
          - user-service
          - tutor-service
          - matching-service
          - lesson-service
          - payment-service

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build \
            -t $ECR_REGISTRY/${{ matrix.service }}:$IMAGE_TAG \
            -t $ECR_REGISTRY/${{ matrix.service }}:latest \
            -f apps/${{ matrix.service }}/Dockerfile \
            .

          docker push $ECR_REGISTRY/${{ matrix.service }}:$IMAGE_TAG
          docker push $ECR_REGISTRY/${{ matrix.service }}:latest

      - name: Update ECS service
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          # Get current task definition
          TASK_DEFINITION=$(aws ecs describe-services \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ matrix.service }} \
            --query 'services[0].taskDefinition' \
            --output text)

          # Create new task definition
          NEW_TASK_DEF=$(aws ecs describe-task-definition \
            --task-definition ${TASK_DEFINITION} \
            --query 'taskDefinition' | \
            jq --arg IMAGE "$ECR_REGISTRY/${{ matrix.service }}:$IMAGE_TAG" \
              '.containerDefinitions[0].image = $IMAGE |
               del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

          # Register new task definition
          NEW_REVISION=$(echo ${NEW_TASK_DEF} | \
            aws ecs register-task-definition --cli-input-json file:///dev/stdin | \
            jq -r '.taskDefinition.taskDefinitionArn')

          # Update service
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ matrix.service }} \
            --task-definition ${NEW_REVISION} \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ matrix.service }}

      - name: Notify deployment
        if: always()
        run: |
          echo "Deployment status: ${{ job.status }}"
          echo "Service: ${{ matrix.service }}"
          echo "Image tag: ${{ github.sha }}"
```

### 8.2 GitHub Secrets

Add these secrets to your GitHub repository:

```bash
# Settings > Secrets and variables > Actions > New repository secret

AWS_ACCESS_KEY_ID: <your-aws-access-key>
AWS_SECRET_ACCESS_KEY: <your-aws-secret-key>
```

### 8.3 Manual Trigger Workflow

```bash
# Trigger deployment via GitHub CLI
gh workflow run deploy-dev.yml

# Or via API
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/your-org/edtech-platform/actions/workflows/deploy-dev.yml/dispatches \
  -d '{"ref":"develop"}'
```

---

## 9. Health Checks and Monitoring

### 9.1 Service Health Checks

Each service must implement `/health` endpoint:

```typescript
// apps/identity-service/src/health/health.controller.ts

import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
    ]);
  }
}
```

### 9.2 ECS Health Check Script

```bash
#!/bin/bash
# infrastructure/scripts/check-health.sh

set -e

CLUSTER="edtech-dev"
SERVICES=(
  "identity-service"
  "user-service"
  "tutor-service"
  "matching-service"
  "lesson-service"
  "payment-service"
)

echo "🏥 Checking service health..."

for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "Checking ${SERVICE}..."

  # Get running tasks
  TASK_ARNS=$(aws ecs list-tasks \
    --cluster ${CLUSTER} \
    --service-name ${SERVICE} \
    --desired-status RUNNING \
    --query 'taskArns' \
    --output text)

  if [ -z "$TASK_ARNS" ]; then
    echo "❌ No running tasks for ${SERVICE}"
    continue
  fi

  # Get task details
  aws ecs describe-tasks \
    --cluster ${CLUSTER} \
    --tasks ${TASK_ARNS} \
    --query 'tasks[0].{Status:lastStatus,Health:healthStatus,Started:startedAt}' \
    --output table

  # Get load balancer target health
  TARGET_GROUP=$(aws ecs describe-services \
    --cluster ${CLUSTER} \
    --services ${SERVICE} \
    --query 'services[0].loadBalancers[0].targetGroupArn' \
    --output text)

  if [ "$TARGET_GROUP" != "None" ]; then
    echo "Target Group Health:"
    aws elbv2 describe-target-health \
      --target-group-arn ${TARGET_GROUP} \
      --query 'TargetHealthDescriptions[0].{State:TargetHealth.State,Reason:TargetHealth.Reason}' \
      --output table
  fi
done

echo ""
echo "✅ Health check complete!"
```

### 9.3 CloudWatch Alarms

```bash
#!/bin/bash
# infrastructure/scripts/create-alarms.sh

set -e

CLUSTER="edtech-dev"
SERVICES=(
  "identity-service"
  "user-service"
  "tutor-service"
  "matching-service"
  "lesson-service"
  "payment-service"
)

SNS_TOPIC_ARN="arn:aws:sns:us-east-1:123456789012:edtech-alerts"

for SERVICE in "${SERVICES[@]}"; do
  echo "Creating alarms for ${SERVICE}..."

  # CPU Utilization Alarm
  aws cloudwatch put-metric-alarm \
    --alarm-name "${SERVICE}-high-cpu" \
    --alarm-description "High CPU usage for ${SERVICE}" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=ServiceName,Value=${SERVICE} Name=ClusterName,Value=${CLUSTER} \
    --alarm-actions ${SNS_TOPIC_ARN}

  # Memory Utilization Alarm
  aws cloudwatch put-metric-alarm \
    --alarm-name "${SERVICE}-high-memory" \
    --alarm-description "High memory usage for ${SERVICE}" \
    --metric-name MemoryUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=ServiceName,Value=${SERVICE} Name=ClusterName,Value=${CLUSTER} \
    --alarm-actions ${SNS_TOPIC_ARN}

  # Task Count Alarm
  aws cloudwatch put-metric-alarm \
    --alarm-name "${SERVICE}-no-tasks" \
    --alarm-description "No running tasks for ${SERVICE}" \
    --metric-name RunningTaskCount \
    --namespace ECS/ContainerInsights \
    --statistic Average \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator LessThanThreshold \
    --dimensions Name=ServiceName,Value=${SERVICE} Name=ClusterName,Value=${CLUSTER} \
    --alarm-actions ${SNS_TOPIC_ARN}
done

echo "✅ Alarms created!"
```

### 9.4 View Logs

```bash
# Tail logs for a service
aws logs tail /ecs/identity-service --follow

# Get logs from last hour
aws logs tail /ecs/identity-service --since 1h

# Filter logs by pattern
aws logs tail /ecs/identity-service --filter-pattern "ERROR"

# Get logs from specific task
TASK_ID="abc123"
aws logs tail /ecs/identity-service --follow --filter-pattern "[task_id=${TASK_ID}]"
```

---

## 10. Rollback Procedures

### 10.1 Rollback to Previous Task Definition

```bash
#!/bin/bash
# infrastructure/scripts/rollback-service.sh

set -e

SERVICE_NAME=$1

if [ -z "$SERVICE_NAME" ]; then
  echo "Usage: ./rollback-service.sh <service-name>"
  exit 1
fi

CLUSTER="edtech-dev"

echo "⏮️ Rolling back ${SERVICE_NAME}..."

# Get current task definition
CURRENT_TASK_DEF=$(aws ecs describe-services \
  --cluster ${CLUSTER} \
  --services ${SERVICE_NAME} \
  --query 'services[0].taskDefinition' \
  --output text)

echo "Current task definition: ${CURRENT_TASK_DEF}"

# Extract family and revision
FAMILY=$(echo ${CURRENT_TASK_DEF} | cut -d'/' -f2 | cut -d':' -f1)
CURRENT_REVISION=$(echo ${CURRENT_TASK_DEF} | cut -d':' -f2)
PREVIOUS_REVISION=$((CURRENT_REVISION - 1))

if [ ${PREVIOUS_REVISION} -lt 1 ]; then
  echo "❌ No previous revision to rollback to!"
  exit 1
fi

PREVIOUS_TASK_DEF="${FAMILY}:${PREVIOUS_REVISION}"

echo "Rolling back to: ${PREVIOUS_TASK_DEF}"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

# Update service with previous task definition
aws ecs update-service \
  --cluster ${CLUSTER} \
  --service ${SERVICE_NAME} \
  --task-definition ${PREVIOUS_TASK_DEF} \
  --force-new-deployment \
  --no-cli-pager

echo "⏳ Waiting for rollback to complete..."

aws ecs wait services-stable \
  --cluster ${CLUSTER} \
  --services ${SERVICE_NAME}

echo "✅ Rollback complete!"
```

### 10.2 Database Rollback

```bash
#!/bin/bash
# Manual database rollback

SERVICE=$1  # e.g., "identity"

echo "⚠️ Database rollback for ${SERVICE}-service"
echo "This requires manual SQL execution."

ENVIRONMENT="dev"
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)

echo ""
echo "Connect to database:"
echo "psql -h ${RDS_ENDPOINT} -U edtech_admin -d ${SERVICE}_db"
echo ""
echo "Review migration files:"
echo "ls -la apps/${SERVICE}-service/drizzle/"
echo ""
echo "Execute rollback SQL manually."
```

---

## 11. Emergency Procedures

### 11.1 Emergency Stop All Services

```bash
#!/bin/bash
# infrastructure/scripts/emergency-stop.sh

set -e

echo "🚨 EMERGENCY: Stopping all ECS services immediately!"

CLUSTER="edtech-dev"
SERVICES=$(aws ecs list-services --cluster ${CLUSTER} --query 'serviceArns' --output text)

for SERVICE_ARN in ${SERVICES}; do
  SERVICE_NAME=$(echo ${SERVICE_ARN} | rev | cut -d'/' -f1 | rev)

  echo "Stopping ${SERVICE_NAME}..."

  aws ecs update-service \
    --cluster ${CLUSTER} \
    --service ${SERVICE_NAME} \
    --desired-count 0 \
    --no-cli-pager &
done

wait

echo "✅ All services stopped!"
echo "💰 ECS costs: \$0/hour"
```

### 11.2 Emergency Database Shutdown

```bash
#!/bin/bash
# infrastructure/scripts/emergency-db-stop.sh

set -e

echo "🚨 EMERGENCY: Stopping RDS database!"
echo "⚠️ This will take ~5 minutes to stop"
echo "⚠️ This will take ~5 minutes to start again"

read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

aws rds stop-db-instance \
  --db-instance-identifier edtech-dev-postgres

echo "✅ Database stopping..."
echo "Check status: aws rds describe-db-instances --db-instance-identifier edtech-dev-postgres"
```

### 11.3 Emergency Infrastructure Destroy

```bash
#!/bin/bash
# infrastructure/scripts/destroy-all.sh

set -e

echo "🚨 EMERGENCY: Destroying all infrastructure!"
echo "⚠️ This will DELETE:"
echo "  - All ECS services and tasks"
echo "  - RDS database (with all data)"
echo "  - Load balancers"
echo "  - VPC and networking"
echo "  - ECR images"
echo "  - CloudWatch logs"
echo ""
echo "⚠️ THIS CANNOT BE UNDONE!"
echo ""

read -p "Type 'DESTROY' to confirm: " CONFIRM

if [ "$CONFIRM" != "DESTROY" ]; then
  echo "Cancelled."
  exit 0
fi

# Stop all ECS services first
./infrastructure/scripts/emergency-stop.sh

# Destroy Terraform infrastructure
cd infrastructure/environments/dev

terraform destroy -auto-approve

echo "✅ All infrastructure destroyed!"
echo "💰 AWS costs: \$0/hour"
```

### 11.4 Emergency Contact Procedure

```bash
# Create emergency runbook
cat > /tmp/emergency-runbook.md << 'EOF'
# Emergency Runbook - EdTech Platform

## Incident Response Team

- **On-Call Engineer**: [Your Name] - [Phone] - [Email]
- **DevOps Lead**: [Name] - [Phone] - [Email]
- **CTO**: [Name] - [Phone] - [Email]

## Emergency Procedures

### 1. Service Outage (All Services Down)

```bash
# Check ECS service health
./infrastructure/scripts/check-health.sh

# Check RDS status
aws rds describe-db-instances --db-instance-identifier edtech-dev-postgres

# Restart all services
./infrastructure/scripts/stop-services.sh
sleep 30
./infrastructure/scripts/start-services.sh
```

### 2. Database Connection Issues

```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier edtech-dev-postgres \
  --query 'DBInstances[0].DBInstanceStatus'

# Check security group rules
aws ec2 describe-security-groups \
  --group-ids sg-xxxxxxxxx

# Test connection from ECS task
aws ecs execute-command \
  --cluster edtech-dev \
  --task <task-id> \
  --command "nc -zv <rds-endpoint> 5432" \
  --interactive
```

### 3. High Costs Alert

```bash
# Check current costs
./infrastructure/scripts/check-costs.sh

# Stop all services immediately
./infrastructure/scripts/emergency-stop.sh

# Check running resources
aws ecs list-tasks --cluster edtech-dev --desired-status RUNNING
```

### 4. Security Breach

```bash
# Rotate all secrets immediately
./infrastructure/scripts/rotate-secrets.sh

# Stop all services
./infrastructure/scripts/emergency-stop.sh

# Review CloudTrail logs
aws cloudtrail lookup-events --max-results 50

# Block suspicious IPs in security groups
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr <suspicious-ip>/32
```

## Escalation Path

1. **Level 1**: On-call engineer investigates (0-15 min)
2. **Level 2**: DevOps lead involved (15-30 min)
3. **Level 3**: CTO and management notified (30+ min)

## Communication Channels

- **Slack**: #incidents channel
- **PagerDuty**: [Account URL]
- **Status Page**: [Status page URL]

EOF

echo "Emergency runbook created: /tmp/emergency-runbook.md"
```

---

## 12. Cost Management

### 12.1 Check Current Costs

```bash
#!/bin/bash
# infrastructure/scripts/check-costs.sh

set -e

echo "💰 Checking AWS costs..."

# Get current month costs
START_DATE=$(date -u -d "$(date +%Y-%m-01)" '+%Y-%m-%d')
END_DATE=$(date -u -d "$(date +%Y-%m-%d) + 1 day" '+%Y-%m-%d')

aws ce get-cost-and-usage \
  --time-period Start=${START_DATE},End=${END_DATE} \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=SERVICE \
  --query 'ResultsByTime[0].Groups[].[Keys[0],Metrics.UnblendedCost.Amount]' \
  --output table

echo ""
echo "📊 ECS Service Status:"

CLUSTER="edtech-dev"
RUNNING_TASKS=$(aws ecs list-tasks \
  --cluster ${CLUSTER} \
  --desired-status RUNNING \
  --query 'taskArns' \
  --output text | wc -w)

echo "Running tasks: ${RUNNING_TASKS}"
echo "Cost rate: \$$(echo "$RUNNING_TASKS * 0.01" | bc)/hour"

echo ""
echo "🗄️ RDS Status:"

RDS_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier edtech-dev-postgres \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text)

echo "RDS status: ${RDS_STATUS}"

if [ "$RDS_STATUS" == "available" ]; then
  echo "⚠️ RDS is running (eligible for free tier: 750 hrs/month)"
fi
```

### 12.2 Free Tier Usage

```bash
#!/bin/bash
# infrastructure/scripts/check-free-tier.sh

set -e

echo "📊 Free Tier Usage Report"
echo "=========================="

# RDS Free Tier (750 hours/month)
MONTH_START=$(date -u -d "$(date +%Y-%m-01)" '+%Y-%m-%d')
CURRENT_DATE=$(date -u '+%Y-%m-%d')

RDS_UPTIME_HOURS=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=edtech-dev-postgres \
  --start-time ${MONTH_START}T00:00:00Z \
  --end-time ${CURRENT_DATE}T23:59:59Z \
  --period 3600 \
  --statistics SampleCount \
  --query 'length(Datapoints)')

echo "RDS Usage: ${RDS_UPTIME_HOURS} hours / 750 hours (free tier)"

# S3 Free Tier (5 GB storage, 20K GET, 2K PUT)
BUCKET="edtech-dev-documents"

S3_SIZE=$(aws s3 ls s3://${BUCKET} --recursive --summarize | \
  grep "Total Size" | \
  awk '{print $3}')

S3_SIZE_GB=$(echo "scale=2; ${S3_SIZE} / 1073741824" | bc)

echo "S3 Storage: ${S3_SIZE_GB} GB / 5 GB (free tier)"

# DynamoDB Free Tier (25 GB, 25 RCU/WCU)
TABLE="edtech-dev-event-store"

TABLE_SIZE=$(aws dynamodb describe-table \
  --table-name ${TABLE} \
  --query 'Table.TableSizeBytes' \
  --output text)

TABLE_SIZE_GB=$(echo "scale=2; ${TABLE_SIZE} / 1073741824" | bc)

echo "DynamoDB Storage: ${TABLE_SIZE_GB} GB / 25 GB (free tier)"

echo ""
echo "✅ Free tier usage check complete!"
```

### 12.3 Cost Optimization

```bash
# Stop services when not in use
./infrastructure/scripts/stop-services.sh

# Stop RDS database (takes 5 min to restart)
aws rds stop-db-instance --db-instance-identifier edtech-dev-postgres

# Delete old CloudWatch logs (saves storage costs)
aws logs describe-log-groups --query 'logGroups[*].logGroupName' --output text | \
while read LOG_GROUP; do
  echo "Deleting old logs from ${LOG_GROUP}..."
  aws logs delete-retention-policy --log-group-name ${LOG_GROUP} || true
  aws logs put-retention-policy --log-group-name ${LOG_GROUP} --retention-in-days 7
done

# Delete old ECR images
aws ecr list-images \
  --repository-name identity-service \
  --filter tagStatus=UNTAGGED \
  --query 'imageIds[*]' \
  --output json | \
  jq -r '.[] | "--image-ids imageDigest=\(.imageDigest)"' | \
  xargs -I {} aws ecr batch-delete-image --repository-name identity-service {}
```

---

## 13. Troubleshooting

### 13.1 Service Won't Start

```bash
# Check ECS service events
aws ecs describe-services \
  --cluster edtech-dev \
  --services identity-service \
  --query 'services[0].events[0:10]' \
  --output table

# Check task logs
aws logs tail /ecs/identity-service --follow

# Check task stopped reason
aws ecs describe-tasks \
  --cluster edtech-dev \
  --tasks <task-arn> \
  --query 'tasks[0].{StoppedReason:stoppedReason,Containers:containers[*].{Name:name,Reason:reason}}'
```

### 13.2 Database Connection Failed

```bash
# Test database connectivity from local
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
DB_PASSWORD=$(aws ssm get-parameter \
  --name "/dev/database/password" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)

psql -h ${RDS_ENDPOINT} -U edtech_admin -d identity_db -c "SELECT 1;"

# Check security group rules
aws ec2 describe-security-groups \
  --group-ids <rds-security-group-id> \
  --query 'SecurityGroups[0].IpPermissions'
```

### 13.3 High Memory Usage

```bash
# Check memory metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=identity-service Name=ClusterName,Value=edtech-dev \
  --start-time $(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%S') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%S') \
  --period 300 \
  --statistics Average \
  --query 'Datapoints' \
  --output table

# Increase task memory in task definition
# Edit: apps/identity-service/task-definition.json
# Change: "memory": "512" to "memory": "1024"
```

### 13.4 ECR Push Failed

```bash
# Re-login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Check ECR repository exists
aws ecr describe-repositories --repository-names identity-service

# Check disk space
docker system df
docker system prune -a  # Clean up unused images
```

---

## Summary

This deployment guide covers:

- ✅ Local development setup with Docker Compose
- ✅ AWS infrastructure deployment with Terraform
- ✅ Docker image build and push to ECR
- ✅ ECS service management (start/stop/scale/update)
- ✅ Database migrations (local and AWS)
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Health checks and monitoring
- ✅ Rollback procedures
- ✅ Emergency procedures
- ✅ Cost management and optimization
- ✅ Comprehensive troubleshooting

**Key Commands Quick Reference:**

```bash
# Local Development
docker-compose up -d
pnpm run migrate:all
pnpm run start:dev

# AWS Deployment
./infrastructure/scripts/setup-backend.sh
terraform apply
./infrastructure/scripts/build-and-push.sh
./infrastructure/scripts/start-services.sh

# Monitoring
./infrastructure/scripts/check-health.sh
./infrastructure/scripts/check-costs.sh
aws logs tail /ecs/identity-service --follow

# Emergency
./infrastructure/scripts/emergency-stop.sh
./infrastructure/scripts/rollback-service.sh identity-service
```

**Cost Optimization Strategy:**

- Local development: $0/month
- Dev environment (on-demand): ~$2/month
- Stop services after demos: `./infrastructure/scripts/stop-services.sh`
- Monitor costs weekly: `./infrastructure/scripts/check-costs.sh`

For additional help, refer to:
- [ARCHITECTURE.md](/Users/pavlonaumenko/Documents/Projects/edtech-platform-backend/docs/ARCHITECTURE.md) - System architecture
- [INFRASTRUCTURE.md](/Users/pavlonaumenko/Documents/Projects/edtech-platform-backend/docs/INFRASTRUCTURE.md) - Terraform details
- [README.md](/Users/pavlonaumenko/Documents/Projects/edtech-platform-backend/docs/README.md) - Project overview
