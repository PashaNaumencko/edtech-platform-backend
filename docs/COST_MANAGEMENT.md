# Cost Management Guide

**Last Updated:** November 2025
**Project:** EdTech Platform - 1-to-1 Tutor-Student Matching
**Status:** Free Tier Optimized for Development/Demo Phase

---

## Table of Contents

1. [Overview](#overview)
2. [AWS Free Tier Breakdown](#aws-free-tier-breakdown)
3. [Current Cost Structure](#current-cost-structure)
4. [Cost Optimization Strategies](#cost-optimization-strategies)
5. [Cost Monitoring & Commands](#cost-monitoring--commands)
6. [Free Tier Limits & Compliance](#free-tier-limits--compliance)
7. [Budget Alerts Setup](#budget-alerts-setup)
8. [Post-Free-Tier Projections](#post-free-tier-projections)
9. [Scaling Cost Analysis](#scaling-cost-analysis)
10. [Best Practices](#best-practices)

---

## Overview

This platform is architected to **maximize AWS Free Tier usage** during development and demo phases, resulting in near-zero costs (~$2/month). This guide provides actionable strategies, commands, and monitoring techniques to maintain cost efficiency.

### Key Cost Principles

- **On-Demand Infrastructure:** Start/stop services only when needed
- **Free Tier First:** Prioritize services with generous free tiers
- **No NAT Gateway:** Use public subnets to save $32/month
- **Single RDS Instance:** Multiple databases, one instance to save $30/month
- **SSM Over Secrets Manager:** Free parameter storage saves $6/month

**Total Architecture Savings:** $278/month through smart design decisions

---

## AWS Free Tier Breakdown

### Free Tier Categories

AWS offers three types of free tier:

1. **Always Free:** Never expires (e.g., DynamoDB, Lambda limits)
2. **12 Months Free:** From account creation (e.g., RDS, EC2)
3. **Free Trials:** Short-term offers (e.g., 30 days)

### Services We Use

| Service | Configuration | Free Tier Type | Limits | Duration | Post-FT Cost |
|---------|--------------|----------------|--------|----------|--------------|
| **RDS PostgreSQL** | db.t3.micro, 20GB | 12 Months | 750 hrs/month | 12 months | ~$15/month |
| **ECS Fargate** | 0.25 vCPU, 0.5 GB | None | N/A | N/A | $0.01/hr per task |
| **DynamoDB** | On-demand | Always Free | 25 GB + 25 RCU/WCU | Forever | Pay above limits |
| **S3** | Standard | Always Free | 5 GB + 20K GET + 2K PUT | Forever | Pay above limits |
| **Cognito** | User Pool | Always Free | 50,000 MAU | Forever | Pay above limits |
| **EventBridge** | Custom events | Always Free | 1M events/month | Forever | Pay above limits |
| **SSM Parameter Store** | Standard | Always Free | Unlimited | Forever | $0 |
| **CloudWatch Logs** | Log storage | Always Free | 5 GB | Forever | $0.50/GB above |
| **VPC** | Internet Gateway | Always Free | Unlimited | Forever | $0 |
| **Data Transfer** | Outbound | 12 Months | 1 GB/month | 12 months | $0.09/GB |

### Key Free Tier Details

#### RDS PostgreSQL (12 Months)
```
Free Tier Allocation:
- Instance: db.t3.micro (1 vCPU, 1 GB RAM)
- Storage: 20 GB General Purpose (SSD)
- Backups: 20 GB backup storage
- Hours: 750 hours/month (= 1 instance 24/7)
- Duration: 12 months from account creation

Our Usage:
- 1 instance with 3 databases (identity_db, tutor_db, admin_db)
- 720 hours/month (30 days × 24 hours)
- ✅ Fully covered by free tier
```

#### ECS Fargate (No Free Tier)
```
Pricing:
- vCPU: $0.04048/hour
- Memory: $0.004445/GB/hour

Our Configuration per Task:
- 0.25 vCPU = $0.01012/hour
- 0.5 GB RAM = $0.00222/hour
- Total: ~$0.01234/hour per task

3 Services Cost:
- Always-on (24/7): 3 × $0.01234 × 720 = $26.65/month
- On-demand (60 hrs/month): 3 × $0.01234 × 60 = $2.22/month ✅
```

#### DynamoDB (Always Free)
```
Free Tier (Permanent):
- Storage: 25 GB
- Read: 25 RCU (eventually consistent)
- Write: 25 WCU
- On-demand: First 25 GB + baseline throughput

Our Usage (Event Store):
- Estimated: <1 GB/month
- Read/Write: <1,000 operations/day
- ✅ Well within free tier
```

#### S3 (Always Free)
```
Free Tier (Permanent):
- Storage: 5 GB Standard
- GET Requests: 20,000/month
- PUT Requests: 2,000/month
- Data Transfer Out: 100 GB/month (with CloudFront)

Our Usage (Document Storage):
- Tutor verification documents: <500 MB/month
- Profile images: <100 MB/month
- ✅ Well within free tier
```

#### Cognito (Always Free)
```
Free Tier (Permanent):
- Monthly Active Users: 50,000
- No limit on users stored

Our Usage (MVP Phase):
- Expected: <100 MAU
- ✅ Well within free tier
```

---

## Current Cost Structure

### Monthly Cost Breakdown (Free Tier Active)

| Resource | Configuration | Free Tier? | Usage | Cost |
|----------|--------------|-----------|-------|------|
| RDS PostgreSQL | db.t3.micro, 20GB | ✅ Yes | 720 hrs/month | **$0** |
| ECS Fargate (Identity) | 0.25 vCPU, 0.5 GB | ❌ No | 60 hrs/month | **$0.74** |
| ECS Fargate (Tutor) | 0.25 vCPU, 0.5 GB | ❌ No | 60 hrs/month | **$0.74** |
| ECS Fargate (Admin) | 0.25 vCPU, 0.5 GB | ❌ No | 60 hrs/month | **$0.74** |
| DynamoDB | On-demand | ✅ Yes | <1 GB | **$0** |
| S3 | Standard storage | ✅ Yes | <500 MB | **$0** |
| Cognito | User Pool | ✅ Yes | <100 MAU | **$0** |
| EventBridge | Custom events | ✅ Yes | <10K events | **$0** |
| SSM Parameters | Standard tier | ✅ Yes | 20 parameters | **$0** |
| CloudWatch Logs | Log storage | ✅ Yes | <2 GB | **$0** |
| VPC | Internet Gateway | ✅ Yes | 1 IGW | **$0** |
| NAT Gateway | ❌ Not used | N/A | N/A | **$0 saved!** |
| Data Transfer | Outbound | ✅ Yes | <500 MB | **$0** |

**Total Monthly Cost: ~$2.22/month** (with on-demand usage strategy)

### Usage Pattern Comparison

| Usage Pattern | Hours/Month | Monthly Cost | Use Case |
|--------------|-------------|--------------|----------|
| **Always-On (24/7)** | 2,160 (3 services × 720) | **$26.65** | Production |
| **Business Hours (8 hrs/day)** | 720 (3 services × 240) | **$8.88** | Active development |
| **On-Demand (2 hrs/day)** | 180 (3 services × 60) | **$2.22** ✅ | Demos only |
| **Weekly Demos (8 hrs/week)** | 96 (3 services × 32) | **$1.18** | Minimal usage |

**Current Strategy:** On-demand (stop after demos) = **~$2/month** 🎉

---

## Cost Optimization Strategies

### 1. Start/Stop ECS Services (Saves $24/month)

The most impactful optimization is starting services only when needed.

#### Automatic Scripts

**Start Services** (`infrastructure/scripts/start-services.sh`):
```bash
#!/bin/bash
# Start ECS services on-demand

set -e

CLUSTER="edtech-dev"
SERVICES=(
  "identity-service"
  "tutor-service"
  "admin-service"
)

echo "🚀 Starting ECS services..."

for SERVICE in "${SERVICES[@]}"; do
  echo "Starting $SERVICE..."
  aws ecs update-service \
    --cluster $CLUSTER \
    --service $SERVICE \
    --desired-count 1 \
    --region us-east-1 \
    --no-cli-pager
done

echo "✅ All services running!"
echo "Cost: \$0.037/hour (\$0.01234 × 3 services)"
echo "Expected startup time: ~2 minutes"
```

**Stop Services** (`infrastructure/scripts/stop-services.sh`):
```bash
#!/bin/bash
# Stop ECS services to save costs

set -e

CLUSTER="edtech-dev"
SERVICES=(
  "identity-service"
  "tutor-service"
  "admin-service"
)

echo "🛑 Stopping ECS services..."

for SERVICE in "${SERVICES[@]}"; do
  echo "Stopping $SERVICE..."
  aws ecs update-service \
    --cluster $CLUSTER \
    --service $SERVICE \
    --desired-count 0 \
    --region us-east-1 \
    --no-cli-pager
done

echo "✅ All services stopped!"
echo "Cost: \$0/hour (services scaled to 0)"
echo "Data persists in RDS and DynamoDB"
```

#### Usage Workflow

```bash
# Before demo or testing
./infrastructure/scripts/start-services.sh

# Wait for services to be healthy (~2 minutes)
aws ecs wait services-stable \
  --cluster edtech-dev \
  --services identity-service tutor-service admin-service

# Check service URLs (via Application Load Balancer)
aws elbv2 describe-load-balancers \
  --names edtech-dev-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text

# After demo (IMPORTANT: Don't forget!)
./infrastructure/scripts/stop-services.sh
```

**Cost Impact:**
- **Before:** $26.65/month (always-on)
- **After:** $2.22/month (60 hours/month)
- **Savings:** $24.43/month (92% reduction)

---

### 2. No NAT Gateway (Saves $32/month)

#### Decision Rationale

NAT Gateways enable private subnets to access the internet but cost:
- **Hourly:** $0.045/hour
- **Monthly:** $32.40 (720 hours)
- **Data Processing:** $0.045/GB

#### Our Approach: Public Subnets

```hcl
# infrastructure/terraform/environments/dev/vpc.tf

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block             = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true  # Key setting

  tags = {
    Name = "${var.environment}-public-${count.index + 1}"
  }
}

# Internet Gateway (Always Free)
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-igw"
  }
}

# Route table for public subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.environment}-public-rt"
  }
}
```

#### Security via Security Groups

```hcl
# ECS tasks in public subnets, secured by security groups
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.environment}-ecs-tasks"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  # Allow inbound from ALB only
  ingress {
    from_port       = 3000
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow outbound to internet (AWS services, npm, etc.)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-ecs-tasks"
  }
}
```

**Network Flow:**
```
Internet
  ↓
[Internet Gateway] (Free)
  ↓
[Public Subnet]
  ↓
[Security Group] → [ECS Task]
  ↓
[Security Group] → [RDS in Public Subnet]
```

**Trade-offs:**
- ✅ **Pros:** Saves $32/month, simpler architecture, faster internet access
- ⚠️ **Cons:** Services have public IPs (but firewalled), less "secure" perception

**Migration Path:**
When scaling to production (>1K users), add private subnets with NAT Gateway for enhanced security.

**Cost Impact:**
- **NAT Gateway:** $0/month (not used)
- **Savings:** $32.40/month

---

### 3. Single RDS with Multiple Databases (Saves $30/month)

#### Problem: Multiple RDS Instances

Traditional microservices: 1 database instance per service
```
Identity Service → RDS #1 (db.t3.micro) = $15/month
Tutor Service    → RDS #2 (db.t3.micro) = $15/month
Admin Service    → RDS #3 (db.t3.micro) = $15/month
Total: $45/month (after free tier expires)
```

#### Solution: Database-per-Service via Schemas

```hcl
# infrastructure/terraform/modules/rds/main.tf

resource "aws_db_instance" "postgres" {
  identifier             = "${var.environment}-postgres"
  engine                 = "postgres"
  engine_version         = "15.3"
  instance_class         = "db.t3.micro"  # Free tier eligible
  allocated_storage      = 20              # Free tier: 20 GB
  storage_type           = "gp2"

  db_name  = "postgres"  # Default database
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  # Free tier: Single-AZ only
  multi_az = false

  # Backups (Free: 20 GB)
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  # Cost optimization
  skip_final_snapshot       = true
  deletion_protection       = false
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name        = "${var.environment}-postgres"
    Environment = var.environment
  }
}
```

#### Database Isolation Strategy

**Create Separate Databases:**
```bash
# Connect to RDS
psql -h edtech-dev-postgres.xxxxx.us-east-1.rds.amazonaws.com \
     -U admin -d postgres

# Create databases
CREATE DATABASE identity_db;
CREATE DATABASE tutor_db;
CREATE DATABASE admin_db;

# Create service-specific users
CREATE USER identity_user WITH PASSWORD 'secure_password_1';
CREATE USER tutor_user WITH PASSWORD 'secure_password_2';
CREATE USER admin_user WITH PASSWORD 'secure_password_3';

# Grant permissions (database-level isolation)
GRANT ALL PRIVILEGES ON DATABASE identity_db TO identity_user;
GRANT ALL PRIVILEGES ON DATABASE tutor_db TO tutor_user;
GRANT ALL PRIVILEGES ON DATABASE admin_db TO admin_user;

# Revoke cross-database access
REVOKE ALL ON DATABASE tutor_db FROM identity_user;
REVOKE ALL ON DATABASE admin_db FROM identity_user;
-- Repeat for all combinations
```

**Service Configuration:**
```typescript
// apps/identity/src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME,     // identity_user
  password: process.env.DB_PASSWORD,     // from SSM
  database: 'identity_db',               // Dedicated database
  ssl: process.env.NODE_ENV === 'production',
}));
```

**Drizzle Schema per Service:**
```typescript
// apps/identity/src/infrastructure/persistence/schema/users.schema.ts
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  cognitoUserId: varchar('cognito_user_id', { length: 255 }).notNull(),
  isEmailVerified: boolean('is_email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// This table only exists in identity_db
```

**Connection Pooling:**
```typescript
// apps/identity/src/infrastructure/persistence/database.module.ts
import { Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

@Module({
  providers: [
    {
      provide: 'DATABASE_POOL',
      useFactory: () => {
        return new Pool({
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT, 10),
          user: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: 'identity_db',
          max: 20,  // Connection pool size
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
      },
    },
    {
      provide: 'DRIZZLE_DB',
      useFactory: (pool: Pool) => drizzle(pool),
      inject: ['DATABASE_POOL'],
    },
  ],
  exports: ['DRIZZLE_DB'],
})
export class DatabaseModule {}
```

**Pros:**
- ✅ Database-per-service isolation maintained (separate databases)
- ✅ Saves $30/month after free tier expires
- ✅ Free tier covers 750 hours (1 instance = 720 hours/month)
- ✅ Single backup/maintenance window
- ✅ Easier to manage (one instance)

**Cons:**
- ⚠️ Single point of failure (but acceptable for MVP)
- ⚠️ Shared compute resources (20 connections per service)
- ⚠️ Cannot scale databases independently

**Migration Path:**
When scaling to production (>10K users), split into separate instances per service.

**Cost Impact:**
- **3 RDS instances:** $45/month (after free tier)
- **1 RDS instance:** $15/month (after free tier)
- **Savings:** $30/month

---

### 4. SSM Parameter Store vs Secrets Manager (Saves $6/month)

#### Cost Comparison

| Feature | SSM Parameter Store (Standard) | AWS Secrets Manager |
|---------|-------------------------------|---------------------|
| **Storage** | Free | $0.40/secret/month |
| **API Calls** | Free | $0.05/10,000 calls |
| **Rotation** | Manual | Automatic |
| **Versioning** | ✅ Yes | ✅ Yes |
| **Encryption** | ✅ KMS | ✅ KMS |
| **Cross-Region** | Manual | Automatic |

**For 15 secrets:**
- **Secrets Manager:** 15 × $0.40 = $6/month + API costs
- **SSM Parameter Store:** $0/month

#### Our Implementation

**Store Secrets in SSM:**
```bash
# Create parameters with encryption
aws ssm put-parameter \
  --name "/edtech/dev/identity/db-password" \
  --value "secure_password_123" \
  --type "SecureString" \
  --description "Identity service DB password" \
  --tags Key=Service,Value=identity Key=Environment,Value=dev

# Other parameters
aws ssm put-parameter \
  --name "/edtech/dev/identity/jwt-secret" \
  --value "jwt_secret_key_xyz" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/edtech/dev/cognito/user-pool-id" \
  --value "us-east-1_ABC123" \
  --type "String"

aws ssm put-parameter \
  --name "/edtech/dev/cognito/client-id" \
  --value "abcdef123456" \
  --type "String"
```

**Load in NestJS:**
```typescript
// libs/service-auth/src/config/ssm.config.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

@Injectable()
export class SsmConfigService {
  private ssmClient: SSMClient;
  private cache = new Map<string, { value: string; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private configService: ConfigService) {
    this.ssmClient = new SSMClient({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
    });
  }

  async getParameter(name: string, withDecryption = true): Promise<string> {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    // Fetch from SSM
    const command = new GetParameterCommand({
      Name: name,
      WithDecryption: withDecryption,
    });

    const response = await this.ssmClient.send(command);
    const value = response.Parameter?.Value;

    if (!value) {
      throw new Error(`SSM parameter not found: ${name}`);
    }

    // Cache the value
    this.cache.set(name, {
      value,
      expiry: Date.now() + this.CACHE_TTL,
    });

    return value;
  }
}
```

**Usage in Services:**
```typescript
// apps/identity/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SsmConfigService } from '@edtech/service-auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const ssmConfig = app.get(SsmConfigService);

  // Load secrets from SSM
  const dbPassword = await ssmConfig.getParameter(
    '/edtech/dev/identity/db-password'
  );
  const jwtSecret = await ssmConfig.getParameter(
    '/edtech/dev/identity/jwt-secret'
  );

  // Set environment variables (for Drizzle, etc.)
  process.env.DB_PASSWORD = dbPassword;
  process.env.JWT_SECRET = jwtSecret;

  await app.listen(3000);
}
bootstrap();
```

**IAM Permissions:**
```hcl
# infrastructure/terraform/modules/iam/ecs-task-role.tf

resource "aws_iam_role_policy" "ecs_ssm_access" {
  name = "${var.environment}-ecs-ssm-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.region}:${var.account_id}:parameter/edtech/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.ssm.arn
      }
    ]
  })
}
```

**When to Use Secrets Manager:**
- Automatic rotation required (e.g., RDS passwords every 30 days)
- Cross-region replication needed
- Compliance mandates (e.g., PCI DSS)
- Cost is not a concern

**Cost Impact:**
- **Secrets Manager:** $6/month (15 secrets)
- **SSM Parameter Store:** $0/month
- **Savings:** $6/month

---

### 5. Optimize CloudWatch Logs (Saves $1-2/month)

#### Default Behavior: Logs Stored Forever

ECS tasks send logs to CloudWatch by default. Without retention policies:
- Logs accumulate indefinitely
- Cost: $0.50/GB/month
- 3 services × 100 MB/day = 9 GB/month = $4.50/month

#### Set Retention Policies

```hcl
# infrastructure/terraform/modules/ecs/cloudwatch.tf

resource "aws_cloudwatch_log_group" "identity" {
  name              = "/ecs/${var.environment}/identity-service"
  retention_in_days = 7  # Keep logs for 7 days only

  tags = {
    Service     = "identity"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "tutor" {
  name              = "/ecs/${var.environment}/tutor-service"
  retention_in_days = 7

  tags = {
    Service     = "tutor"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "admin" {
  name              = "/ecs/${var.environment}/admin-service"
  retention_in_days = 7

  tags = {
    Service     = "admin"
    Environment = var.environment
  }
}
```

#### Manual Cleanup (for existing logs)

```bash
# List all log groups
aws logs describe-log-groups --query 'logGroups[*].logGroupName' --output table

# Delete old log groups (if needed)
aws logs delete-log-group --log-group-name /ecs/old-service

# Update retention policy for existing groups
aws logs put-retention-policy \
  --log-group-name /ecs/edtech-dev/identity-service \
  --retention-in-days 7
```

#### Recommended Retention by Environment

| Environment | Retention | Rationale |
|-------------|-----------|-----------|
| **Development** | 3-7 days | Debugging recent issues only |
| **Staging** | 14 days | Integration testing period |
| **Production** | 30-90 days | Compliance and incident investigation |

**Cost Impact:**
- **Before:** $4.50/month (9 GB, no retention)
- **After:** $0.50/month (~1 GB with 7-day retention)
- **Savings:** $4/month

---

### 6. Stop RDS During Off-Hours (Optional, Saves $10/month)

#### When to Use

If you're not actively developing or demoing:
- Nights (8 PM - 8 AM): 12 hours × 30 days = 360 hours/month
- Weekends: 48 hours × 4 weekends = 192 hours/month
- Total: 552 hours/month stopped

**Savings:** 552 hours × $0.021/hr = ~$11.59/month (after free tier expires)

#### Important Limitations

- ⚠️ **Startup Time:** 5-10 minutes to start RDS
- ⚠️ **Maximum Stop Duration:** 7 days (AWS auto-starts after 7 days)
- ⚠️ **Backup Windows:** Cannot run backups while stopped
- ⚠️ **Not Suitable for Production:** Use for dev/staging only

#### Automated Stop/Start Scripts

**Stop RDS:**
```bash
#!/bin/bash
# infrastructure/scripts/stop-rds.sh

set -e

DB_IDENTIFIER="edtech-dev-postgres"

echo "🛑 Stopping RDS instance: $DB_IDENTIFIER"

aws rds stop-db-instance \
  --db-instance-identifier $DB_IDENTIFIER \
  --region us-east-1

echo "✅ RDS stop initiated (will take ~5 minutes)"
echo "Note: AWS will auto-start after 7 days"
```

**Start RDS:**
```bash
#!/bin/bash
# infrastructure/scripts/start-rds.sh

set -e

DB_IDENTIFIER="edtech-dev-postgres"

echo "🚀 Starting RDS instance: $DB_IDENTIFIER"

aws rds start-db-instance \
  --db-instance-identifier $DB_IDENTIFIER \
  --region us-east-1

echo "✅ RDS start initiated (will take ~5-10 minutes)"

# Wait for availability
echo "Waiting for RDS to be available..."
aws rds wait db-instance-available \
  --db-instance-identifier $DB_IDENTIFIER \
  --region us-east-1

echo "✅ RDS is now available!"
```

**Combined Workflow:**
```bash
# End of day (stop everything)
./infrastructure/scripts/stop-services.sh  # Stop ECS
./infrastructure/scripts/stop-rds.sh       # Stop RDS

# Start of day (start everything)
./infrastructure/scripts/start-rds.sh      # Start RDS first
./infrastructure/scripts/start-services.sh # Then start ECS
```

**Cost Impact (After Free Tier):**
- **Always-on:** $15/month
- **Business hours only:** $5/month
- **Savings:** $10/month

**During Free Tier:** This optimization doesn't save money (750 free hours covers 1 instance 24/7), but it's good practice for post-free-tier.

---

## Cost Monitoring & Commands

### Check Current Month's Costs

**Official Script** (`infrastructure/scripts/check-costs.sh`):
```bash
#!/bin/bash
# Check AWS costs for current month

set -e

echo "💰 AWS Cost Report - $(date +%Y-%m)"
echo "========================================"

# Get current month dates
START_DATE=$(date -u +%Y-%m-01)
END_DATE=$(date -u +%Y-%m-%d)

# Get cost and usage
aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --output table

echo ""
echo "📊 Summary by Service:"
aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[?Metrics.UnblendedCost.Amount != `0`].[Keys[0], Metrics.UnblendedCost.Amount]' \
  --output table

echo ""
echo "💵 Total Cost:"
aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text
```

**Usage:**
```bash
# Make script executable
chmod +x infrastructure/scripts/check-costs.sh

# Run cost check
./infrastructure/scripts/check-costs.sh
```

---

### Check Running Services (What's Costing Money Now)

**ECS Tasks:**
```bash
# List all running tasks
aws ecs list-tasks \
  --cluster edtech-dev \
  --desired-status RUNNING \
  --output table

# Get detailed task info
aws ecs describe-tasks \
  --cluster edtech-dev \
  --tasks $(aws ecs list-tasks --cluster edtech-dev --desired-status RUNNING --query 'taskArns' --output text) \
  --query 'tasks[*].[taskArn, lastStatus, startedAt]' \
  --output table

# Count running tasks per service
aws ecs describe-services \
  --cluster edtech-dev \
  --services identity-service tutor-service admin-service \
  --query 'services[*].[serviceName, runningCount, desiredCount]' \
  --output table
```

**RDS Status:**
```bash
# Check RDS instance status
aws rds describe-db-instances \
  --db-instance-identifier edtech-dev-postgres \
  --query 'DBInstances[0].[DBInstanceStatus, DBInstanceClass, AllocatedStorage]' \
  --output table

# Is RDS running?
aws rds describe-db-instances \
  --db-instance-identifier edtech-dev-postgres \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text
# Output: "available" (running) or "stopped"
```

**Quick Status Check Script:**
```bash
#!/bin/bash
# infrastructure/scripts/status-check.sh

echo "🔍 Current Infrastructure Status"
echo "================================"

# ECS Services
echo ""
echo "📦 ECS Services:"
aws ecs describe-services \
  --cluster edtech-dev \
  --services identity-service tutor-service admin-service \
  --query 'services[*].[serviceName, runningCount]' \
  --output table

# RDS
echo ""
echo "🗄️  RDS:"
RDS_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier edtech-dev-postgres \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text)

echo "PostgreSQL: $RDS_STATUS"

# Cost estimate
ECS_COUNT=$(aws ecs describe-services \
  --cluster edtech-dev \
  --services identity-service tutor-service admin-service \
  --query 'sum(services[*].runningCount)' \
  --output text)

echo ""
echo "💰 Current Hourly Cost:"
if [ "$ECS_COUNT" -gt 0 ]; then
  HOURLY_COST=$(echo "$ECS_COUNT * 0.01234" | bc)
  echo "ECS: \$$HOURLY_COST/hour ($ECS_COUNT tasks running)"
else
  echo "ECS: \$0/hour (all stopped)"
fi

if [ "$RDS_STATUS" == "available" ]; then
  echo "RDS: \$0/hour (free tier)"
else
  echo "RDS: \$0/hour (stopped)"
fi
```

---

### Monitor Free Tier Usage

**AWS Free Tier Page:**
```bash
# Open AWS Free Tier dashboard
open https://console.aws.amazon.com/billing/home#/freetier
```

**CLI Commands:**

**RDS Free Tier Hours:**
```bash
# Get RDS uptime this month
START_DATE=$(date -u +%Y-%m-01T00:00:00Z)
END_DATE=$(date -u +%Y-%m-%dT23:59:59Z)

aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=edtech-dev-postgres \
  --start-time $START_DATE \
  --end-time $END_DATE \
  --period 3600 \
  --statistics SampleCount \
  --query 'Datapoints[*].[Timestamp]' \
  --output text | wc -l

# Output: Number of hours RDS has been running
# Free tier: 750 hours/month (31 days × 24 hours = 744 hours)
```

**DynamoDB Usage:**
```bash
# Check DynamoDB table size
aws dynamodb describe-table \
  --table-name edtech-dev-events \
  --query 'Table.[TableSizeBytes, ItemCount]' \
  --output table

# Free tier: 25 GB storage (we use <1 GB)
```

**S3 Storage:**
```bash
# Get S3 bucket size
aws s3 ls s3://edtech-dev-documents --recursive --summarize | grep "Total Size"

# Free tier: 5 GB storage
```

**Cognito MAU:**
```bash
# Get Cognito user pool metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Cognito \
  --metric-name SignInSuccesses \
  --dimensions Name=UserPool,Value=us-east-1_ABC123 \
  --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum \
  --output table

# Free tier: 50,000 MAU
```

---

### Forecast Next Month's Costs

```bash
# Get cost forecast for next 30 days
TOMORROW=$(date -u -d tomorrow +%Y-%m-%d)
NEXT_MONTH=$(date -u -d '+30 days' +%Y-%m-%d)

aws ce get-cost-forecast \
  --time-period Start=$TOMORROW,End=$NEXT_MONTH \
  --metric UnblendedCost \
  --granularity MONTHLY \
  --output table

echo ""
echo "📈 Forecast Breakdown:"
aws ce get-cost-forecast \
  --time-period Start=$TOMORROW,End=$NEXT_MONTH \
  --metric UnblendedCost \
  --granularity MONTHLY \
  --query 'Total.[Amount, Unit]' \
  --output text
```

---

### Set Up Cost Anomaly Detection

```bash
# Create cost anomaly monitor
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "EdTech Platform Monitor",
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE"
  }'

# Create notification subscription
MONITOR_ARN="arn:aws:ce::123456789012:anomalymonitor/xxxxx"

aws ce create-anomaly-subscription \
  --anomaly-subscription '{
    "SubscriptionName": "EdTech Cost Alerts",
    "MonitorArnList": ["'$MONITOR_ARN'"],
    "Subscribers": [
      {
        "Type": "EMAIL",
        "Address": "your-email@example.com"
      }
    ],
    "Threshold": 50.0,
    "Frequency": "DAILY"
  }'
```

---

## Free Tier Limits & Compliance

### Critical Limits to Watch

#### 1. RDS PostgreSQL (12 Months Free)

```
Free Tier Allocation:
- Instance Hours: 750/month
- Storage: 20 GB
- Backups: 20 GB
- I/O: Unlimited (gp2 SSD)

Our Usage:
- 1 instance × 720 hours = 720 hours/month ✅
- Storage: 10 GB used ✅
- Backups: 7 days × 1 GB = 7 GB ✅

Status: SAFE (within limits)
```

**What Triggers Charges:**
- Running 2+ instances simultaneously (750 hours shared)
- Using db.t3.small or larger (only db.t3.micro is free)
- Storage >20 GB
- Multi-AZ deployment (counts as 2 instances)

**Monitoring:**
```bash
# Check if multiple instances are running
aws rds describe-db-instances \
  --query 'DBInstances[*].[DBInstanceIdentifier, DBInstanceClass, DBInstanceStatus]' \
  --output table

# Check storage usage
aws rds describe-db-instances \
  --db-instance-identifier edtech-dev-postgres \
  --query 'DBInstances[0].[AllocatedStorage, DBInstanceStatus]' \
  --output table
```

---

#### 2. ECS Fargate (No Free Tier)

```
Pricing:
- vCPU: $0.04048/hour
- Memory: $0.004445/GB/hour

Our Configuration (per task):
- 0.25 vCPU = $0.01012/hour
- 0.5 GB = $0.00222/hour
- Total: $0.01234/hour

Maximum Safe Budget:
- $5/month = 405 hours (135 hours per service)
- $10/month = 810 hours (270 hours per service)
- $20/month = 1,620 hours (540 hours per service)
```

**What Triggers Charges:**
- Every second a task is running
- Cannot be avoided (no free tier)

**Cost Control:**
```bash
# Set up auto-stop with cron (on your local machine)
# Stop services at 8 PM daily
0 20 * * * /path/to/infrastructure/scripts/stop-services.sh

# Start services at 8 AM daily (if needed)
0 8 * * 1-5 /path/to/infrastructure/scripts/start-services.sh
```

---

#### 3. DynamoDB (Always Free)

```
Free Tier (Permanent):
- Storage: 25 GB
- Read: 25 RCU (eventually consistent)
- Write: 25 WCU
- On-demand: Included in limits

Our Usage:
- Event Store: <1 GB
- Read/Write: <1,000/day
- Status: SAFE ✅

Cost Above Free Tier:
- Storage: $0.25/GB/month
- Read: $0.25/million requests
- Write: $1.25/million requests
```

**Monitoring:**
```bash
# Check table size
aws dynamodb describe-table \
  --table-name edtech-dev-events \
  --query 'Table.[TableSizeBytes, ItemCount, BillingModeSummary]' \
  --output table

# Check read/write capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=edtech-dev-events \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --output table
```

---

#### 4. S3 (Always Free)

```
Free Tier (Permanent):
- Storage: 5 GB Standard
- GET: 20,000 requests/month
- PUT: 2,000 requests/month
- Data Transfer Out: 1 GB/month (to internet)

Our Usage:
- Tutor documents: <500 MB
- Profile images: <100 MB
- Uploads: <100/month
- Status: SAFE ✅

Cost Above Free Tier:
- Storage: $0.023/GB/month
- GET: $0.0004/1,000 requests
- PUT: $0.005/1,000 requests
```

**Monitoring:**
```bash
# Get bucket size
aws s3api list-objects-v2 \
  --bucket edtech-dev-documents \
  --query '[sum(Contents[].Size), length(Contents[])]' \
  --output text

# Output: Total bytes, Object count

# Check storage class distribution
aws s3api list-objects-v2 \
  --bucket edtech-dev-documents \
  --query 'Contents[*].[Key, Size, StorageClass]' \
  --output table
```

**Cost Optimization:**
```hcl
# Set lifecycle policy to delete old files
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "delete-old-temp-files"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 30  # Delete temp files after 30 days
    }
  }

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"  # Cheaper storage for old files
    }
  }
}
```

---

#### 5. Cognito (Always Free)

```
Free Tier (Permanent):
- MAU: 50,000
- Storage: Unlimited users
- Advanced Security: First 50K MAU

Our Usage:
- Expected MAU: <100
- Status: SAFE ✅

Cost Above Free Tier:
- 50K-100K MAU: $0.0055/MAU
- >100K MAU: $0.0046/MAU
- SMS MFA: $0.00645/SMS (not using)
```

**Monitoring:**
```bash
# Get user count
aws cognito-idp list-users \
  --user-pool-id us-east-1_ABC123 \
  --query 'length(Users)' \
  --output text

# Get monthly active users (via CloudWatch)
aws cloudwatch get-metric-statistics \
  --namespace AWS/Cognito \
  --metric-name SignInSuccesses \
  --dimensions Name=UserPool,Value=us-east-1_ABC123 \
  --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 2592000 \
  --statistics Sum \
  --output table
```

---

### Free Tier Compliance Checklist

**Weekly Checks:**
```bash
#!/bin/bash
# infrastructure/scripts/free-tier-check.sh

echo "🔍 Free Tier Compliance Check"
echo "=============================="

# 1. RDS - Should be 1 instance, db.t3.micro
echo ""
echo "1️⃣ RDS PostgreSQL:"
RDS_COUNT=$(aws rds describe-db-instances --query 'length(DBInstances)' --output text)
RDS_CLASS=$(aws rds describe-db-instances \
  --db-instance-identifier edtech-dev-postgres \
  --query 'DBInstances[0].DBInstanceClass' \
  --output text)

if [ "$RDS_COUNT" -eq 1 ] && [ "$RDS_CLASS" == "db.t3.micro" ]; then
  echo "✅ PASS: 1 instance, db.t3.micro"
else
  echo "❌ FAIL: $RDS_COUNT instances, class: $RDS_CLASS"
fi

# 2. ECS - Track hours used
echo ""
echo "2️⃣ ECS Fargate:"
TASK_COUNT=$(aws ecs describe-services \
  --cluster edtech-dev \
  --services identity-service tutor-service admin-service \
  --query 'sum(services[*].runningCount)' \
  --output text)

echo "Currently running: $TASK_COUNT tasks"
echo "Cost: \$$(echo "$TASK_COUNT * 0.01234" | bc)/hour"

# 3. DynamoDB - Should be <25 GB
echo ""
echo "3️⃣ DynamoDB:"
DYNAMO_SIZE=$(aws dynamodb describe-table \
  --table-name edtech-dev-events \
  --query 'Table.TableSizeBytes' \
  --output text)

DYNAMO_GB=$(echo "scale=2; $DYNAMO_SIZE / 1073741824" | bc)

if (( $(echo "$DYNAMO_GB < 25" | bc -l) )); then
  echo "✅ PASS: ${DYNAMO_GB} GB (limit: 25 GB)"
else
  echo "❌ FAIL: ${DYNAMO_GB} GB exceeds free tier"
fi

# 4. S3 - Should be <5 GB
echo ""
echo "4️⃣ S3:"
S3_SIZE=$(aws s3 ls s3://edtech-dev-documents --recursive --summarize | grep "Total Size" | awk '{print $3}')
S3_GB=$(echo "scale=2; $S3_SIZE / 1073741824" | bc)

if (( $(echo "$S3_GB < 5" | bc -l) )); then
  echo "✅ PASS: ${S3_GB} GB (limit: 5 GB)"
else
  echo "❌ FAIL: ${S3_GB} GB exceeds free tier"
fi

# 5. Cognito - Should be <50K MAU
echo ""
echo "5️⃣ Cognito:"
USER_COUNT=$(aws cognito-idp list-users \
  --user-pool-id us-east-1_ABC123 \
  --query 'length(Users)' \
  --output text)

if [ "$USER_COUNT" -lt 50000 ]; then
  echo "✅ PASS: $USER_COUNT users (limit: 50K MAU)"
else
  echo "❌ FAIL: $USER_COUNT users exceeds free tier"
fi

echo ""
echo "=============================="
echo "Run this check weekly to stay within free tier limits"
```

---

## Budget Alerts Setup

### 1. Create Budget via AWS CLI

```bash
# Create monthly budget with email alerts
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget-config.json \
  --notifications-with-subscribers file://budget-notifications.json
```

**budget-config.json:**
```json
{
  "BudgetName": "EdTech-Dev-Monthly",
  "BudgetLimit": {
    "Amount": "10",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "TagKeyValue": ["user:Project$EdTech"]
  }
}
```

**budget-notifications.json:**
```json
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "your-email@example.com"
      }
    ]
  },
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 100,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "your-email@example.com"
      }
    ]
  },
  {
    "Notification": {
      "NotificationType": "FORECASTED",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 100,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "your-email@example.com"
      }
    ]
  }
]
```

---

### 2. Create Budget via Terraform

```hcl
# infrastructure/terraform/modules/billing/budgets.tf

resource "aws_budgets_budget" "monthly_cost" {
  name              = "${var.environment}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = "10.00"
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2025-11-01_00:00"

  cost_filter {
    name = "TagKeyValue"
    values = [
      "user:Project$EdTech",
      "user:Environment$${var.environment}"
    ]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = var.alert_emails
  }
}

resource "aws_budgets_budget" "service_specific" {
  for_each = toset(["ECS", "RDS", "DynamoDB"])

  name              = "${var.environment}-${each.key}-budget"
  budget_type       = "COST"
  limit_amount      = each.key == "ECS" ? "5.00" : "2.00"
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2025-11-01_00:00"

  cost_filter {
    name   = "Service"
    values = ["Amazon ${each.key}"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }
}
```

---

### 3. CloudWatch Alarms for Real-Time Alerts

```hcl
# infrastructure/terraform/modules/monitoring/alarms.tf

resource "aws_cloudwatch_metric_alarm" "high_ecs_task_count" {
  alarm_name          = "${var.environment}-high-ecs-task-count"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = "300"
  statistic           = "Average"
  threshold           = "3"
  alarm_description   = "Alert when more than 3 ECS tasks are running"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = "edtech-dev"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_dynamodb_size" {
  alarm_name          = "${var.environment}-high-dynamodb-size"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "TableSize"
  namespace           = "AWS/DynamoDB"
  period              = "3600"
  statistic           = "Average"
  threshold           = "20000000000"  # 20 GB (80% of free tier)
  alarm_description   = "Alert when DynamoDB exceeds 20 GB (80% of free tier)"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    TableName = "edtech-dev-events"
  }
}

resource "aws_sns_topic" "alerts" {
  name = "${var.environment}-cost-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
```

---

### 4. Daily Cost Report Automation

```bash
#!/bin/bash
# infrastructure/scripts/daily-cost-report.sh
# Run via cron: 0 9 * * * /path/to/daily-cost-report.sh

REPORT_EMAIL="your-email@example.com"
REPORT_FILE="/tmp/aws-cost-report-$(date +%Y-%m-%d).txt"

# Generate report
cat > $REPORT_FILE <<EOF
AWS Cost Report - $(date +%Y-%m-%d)
=====================================

CURRENT MONTH COSTS:
$(aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text) USD

YESTERDAY'S COSTS:
$(aws ce get-cost-and-usage \
  --time-period Start=$(date -d yesterday +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics UnblendedCost \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text) USD

RUNNING SERVICES:
$(aws ecs describe-services \
  --cluster edtech-dev \
  --services identity-service tutor-service admin-service \
  --query 'services[*].[serviceName, runningCount]' \
  --output text)

RDS STATUS:
$(aws rds describe-db-instances \
  --db-instance-identifier edtech-dev-postgres \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text)

REMINDER: Stop services if not in use!
./infrastructure/scripts/stop-services.sh
EOF

# Send via AWS SES (if configured)
aws ses send-email \
  --from "noreply@edtech.com" \
  --to "$REPORT_EMAIL" \
  --subject "AWS Cost Report - $(date +%Y-%m-%d)" \
  --text file://$REPORT_FILE

# Cleanup
rm $REPORT_FILE
```

**Set up cron:**
```bash
crontab -e

# Add this line (daily at 9 AM)
0 9 * * * /path/to/infrastructure/scripts/daily-cost-report.sh
```

---

## Post-Free-Tier Projections

### When Does Free Tier Expire?

```bash
# Check AWS account creation date
aws iam get-account-summary --query 'SummaryMap.AccountAccessKeysPresent' --output text

# Or check via Support API
aws support describe-trusted-advisor-checks \
  --language en \
  --query 'checks[?category==`cost_optimizing`]' \
  --output table
```

**Free Tier Timeline:**
- **Month 1-12:** RDS, EC2, Data Transfer = Free
- **Month 13+:** Start paying for RDS, Data Transfer
- **Always Free:** DynamoDB, S3, Cognito, EventBridge, SSM (within limits)

---

### Cost Projection After Free Tier

#### Scenario 1: MVP (1-1K Users)

| Resource | Configuration | Monthly Cost |
|----------|--------------|--------------|
| **RDS PostgreSQL** | db.t3.micro, 20GB, Single-AZ | **$15.00** |
| **ECS Fargate** | 3 services × 100 hrs/month | **$9.00** |
| **DynamoDB** | <5 GB, <100K requests | **$2.00** |
| **S3** | <10 GB storage | **$1.00** |
| **Cognito** | <1K MAU | **$0.00** |
| **EventBridge** | <100K events | **$0.00** |
| **CloudWatch** | Logs + metrics | **$3.00** |
| **Data Transfer** | <10 GB outbound | **$1.00** |
| **Total** | | **~$31/month** |

**Optimization Path:**
```
Without optimizations: $31/month
- Start/stop ECS (-$7): $24/month
- Stop RDS off-hours (-$10): $14/month
- 7-day log retention (-$2): $12/month
Final: ~$12/month
```

---

#### Scenario 2: Growth (1K-10K Users)

| Resource | Configuration | Monthly Cost |
|----------|--------------|--------------|
| **RDS PostgreSQL** | db.t3.small, 100GB, Multi-AZ | **$60.00** |
| **ECS Fargate** | 6 tasks (2 per service), 24/7 | **$213.00** |
| **ElastiCache Redis** | cache.t3.micro | **$12.00** |
| **DynamoDB** | 10 GB, 1M requests | **$5.00** |
| **S3** | 50 GB storage | **$1.50** |
| **Cognito** | <10K MAU | **$0.00** |
| **Application Load Balancer** | 1 ALB | **$16.00** |
| **CloudWatch** | Enhanced monitoring | **$10.00** |
| **Data Transfer** | 100 GB outbound | **$9.00** |
| **Total** | | **~$326/month** |

**Revenue Required:**
- 20% commission model
- Need $1,630 in platform transactions/month
- ~163 lessons @ $10/lesson
- ~55 lessons/month per active tutor
- **Need: 3-5 active tutors**

---

#### Scenario 3: Scale (10K-100K Users)

| Resource | Configuration | Monthly Cost |
|----------|--------------|--------------|
| **RDS Aurora** | db.r5.large, Multi-AZ, 2 read replicas | **$450.00** |
| **ECS Fargate** | 15 tasks, Auto-scaling | **$533.00** |
| **ElastiCache Redis** | cache.r5.large cluster | **$150.00** |
| **DynamoDB** | 100 GB, 10M requests | **$50.00** |
| **S3** | 500 GB + CloudFront CDN | **$50.00** |
| **Cognito** | 50K MAU | **$0.00** |
| **Application Load Balancer** | 2 ALBs | **$32.00** |
| **NAT Gateway** | 2 AZs | **$65.00** |
| **CloudWatch** | Full observability | **$30.00** |
| **Data Transfer** | 1 TB outbound | **$90.00** |
| **X-Ray Tracing** | Distributed tracing | **$10.00** |
| **Total** | | **~$1,460/month** |

**Revenue Required:**
- 20% commission model
- Need $7,300 in platform transactions/month
- ~730 lessons @ $10/lesson
- ~25 lessons/month per active tutor
- **Need: 30 active tutors**

---

### Cost Optimization Roadmap

#### Phase 1 (Months 1-12): Free Tier

**Goal:** Stay at ~$2/month

**Actions:**
- ✅ Use on-demand start/stop scripts
- ✅ Monitor free tier limits weekly
- ✅ Keep logs retention at 7 days
- ✅ No NAT Gateway
- ✅ Single RDS instance

---

#### Phase 2 (Months 13-24): Post-Free-Tier

**Goal:** Keep under $50/month

**Actions:**
- Upgrade RDS to db.t3.small only when needed (monitor CPU)
- Continue on-demand ECS usage (not 24/7)
- Add ElastiCache only when latency issues arise
- Use CloudWatch Logs Insights (not third-party APM)
- Monitor and optimize based on actual usage

**Budget Allocation:**
- RDS: $20/month
- ECS: $15/month
- Other: $15/month
- **Total: $50/month**

---

#### Phase 3 (Scaling): Revenue-Funded

**Goal:** Cost = 5-10% of revenue

**Actions:**
- Enable auto-scaling (ECS, RDS read replicas)
- Add Multi-AZ for high availability
- Implement caching layer (ElastiCache)
- Add CDN (CloudFront)
- Migrate to Aurora Serverless (pay-per-request)
- Consider Reserved Instances (save 30-60%)

**Target Metrics:**
- Cost per active user: $0.50-1.00
- Cost per lesson: $0.10-0.20
- Platform commission: 20% (~$2 per $10 lesson)
- Target margin: 15% net after costs

---

## Scaling Cost Analysis

### Cost Per User Projection

| User Count | Infrastructure | Cost/User | Monthly Cost | Revenue Needed* |
|------------|---------------|-----------|--------------|-----------------|
| **100** | MVP (free tier) | $0.02 | $2 | $10 (2 lessons) |
| **1,000** | Small scale | $0.03 | $30 | $150 (15 lessons) |
| **10,000** | Growth | $0.03 | $300 | $1,500 (150 lessons) |
| **100,000** | Scale | $0.01 | $1,000 | $5,000 (500 lessons) |

_*Revenue needed assumes 20% commission model_

### Break-Even Analysis

**Assumptions:**
- Average lesson price: $10
- Platform commission: 20% ($2 per lesson)
- Costs: Infrastructure only (no salaries, marketing)

**Break-Even Points:**

| Phase | Monthly Cost | Lessons Needed | Tutors Needed* |
|-------|--------------|----------------|----------------|
| **MVP (Free Tier)** | $2 | 1 lesson | 1 tutor |
| **Post-Free-Tier** | $30 | 15 lessons | 1 tutor |
| **Growth** | $300 | 150 lessons | 3-5 tutors |
| **Scale** | $1,000 | 500 lessons | 10-15 tutors |

_*Assuming ~25-50 lessons/month per active tutor_

---

## Best Practices

### Daily Operations

1. **Morning Check (2 minutes):**
```bash
# Check what's running
./infrastructure/scripts/status-check.sh

# If not working today, stop everything
./infrastructure/scripts/stop-services.sh
```

2. **Before Demo/Development:**
```bash
# Start services
./infrastructure/scripts/start-services.sh

# Wait for healthy status
aws ecs wait services-stable --cluster edtech-dev --services identity-service tutor-service admin-service
```

3. **After Demo/Development:**
```bash
# Stop services (CRITICAL!)
./infrastructure/scripts/stop-services.sh

# Verify stopped
aws ecs describe-services \
  --cluster edtech-dev \
  --services identity-service tutor-service admin-service \
  --query 'services[*].[serviceName, runningCount]' \
  --output table
```

---

### Weekly Reviews

**Every Monday (5 minutes):**
```bash
# Check last week's costs
./infrastructure/scripts/check-costs.sh

# Run free tier compliance check
./infrastructure/scripts/free-tier-check.sh

# Review any budget alert emails
```

---

### Monthly Planning

**First day of month (15 minutes):**
1. Review previous month's total cost
2. Check free tier expiration timeline
3. Analyze cost trends (increasing/decreasing)
4. Update budget alerts if needed
5. Plan for upcoming demos/development

```bash
# Get last month's summary
aws ce get-cost-and-usage \
  --time-period Start=$(date -d 'last month' +%Y-%m-01),End=$(date +%Y-%m-01) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --output table

# Check forecasted costs for this month
NEXT_MONTH=$(date -d 'next month' +%Y-%m-01)
aws ce get-cost-forecast \
  --time-period Start=$(date +%Y-%m-%d),End=$NEXT_MONTH \
  --metric UnblendedCost \
  --granularity MONTHLY \
  --output table
```

---

### Cost Reduction Checklist

**Before free tier expires (Month 10-12):**

- [ ] Audit all running resources
- [ ] Delete unused S3 buckets and objects
- [ ] Remove old CloudWatch log groups
- [ ] Delete unused ECR images
- [ ] Stop/delete unused RDS snapshots
- [ ] Review and optimize ECS task sizes
- [ ] Consider Reserved Instances for predictable workloads
- [ ] Evaluate alternative services (e.g., Aurora Serverless)
- [ ] Set up comprehensive budget alerts
- [ ] Document all cost-saving measures

---

### Emergency Cost Reduction

**If you exceed budget:**

```bash
# 1. STOP EVERYTHING immediately
./infrastructure/scripts/stop-services.sh
./infrastructure/scripts/stop-rds.sh

# 2. Check what's costing money
./infrastructure/scripts/check-costs.sh

# 3. Identify expensive resources
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups | sort_by(@, &Metrics.UnblendedCost.Amount) | reverse(@)' \
  --output table

# 4. Delete non-essential resources
# (Be careful with this command!)
# aws ecs delete-service --cluster edtech-dev --service non-essential-service --force
```

---

### Automation Recommendations

**Set up these automations:**

1. **Daily cost alerts via email**
2. **Weekly free tier compliance report**
3. **Auto-stop ECS services after 8 PM (if not in use)**
4. **Monthly cost summary with trend analysis**
5. **Slack/Discord notifications for budget thresholds**

**Example Slack Integration:**
```bash
#!/bin/bash
# Send cost alert to Slack

SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
COST=$(aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text)

curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"AWS Cost Alert\",
    \"blocks\": [
      {
        \"type\": \"section\",
        \"text\": {
          \"type\": \"mrkdwn\",
          \"text\": \"*Current Month Cost:* \$$COST USD\"
        }
      }
    ]
  }"
```

---

## Summary

### Key Takeaways

1. **Free Tier Optimized:** ~$2/month during development
2. **Post-Free-Tier:** ~$30/month with optimizations
3. **Scaling:** Cost grows with revenue (5-10% of platform transactions)
4. **Critical Actions:**
   - Always stop ECS services when not in use
   - Monitor costs weekly
   - Set up budget alerts
   - Use on-demand infrastructure strategy

### Quick Reference

```bash
# Daily commands
./infrastructure/scripts/start-services.sh     # Start work
./infrastructure/scripts/stop-services.sh      # End work
./infrastructure/scripts/status-check.sh       # Check status

# Weekly commands
./infrastructure/scripts/check-costs.sh        # Review costs
./infrastructure/scripts/free-tier-check.sh    # Compliance check

# Emergency
./infrastructure/scripts/stop-services.sh && \
./infrastructure/scripts/stop-rds.sh          # Stop everything
```

### Cost Targets by Phase

| Phase | Timeline | Target Cost | Usage Pattern |
|-------|----------|-------------|---------------|
| **Development** | Months 1-12 | $2/month | On-demand (demos only) |
| **MVP Launch** | Months 13-18 | $30/month | Part-time (8 hrs/day) |
| **Growth** | Months 19-24 | $50-100/month | Business hours (12 hrs/day) |
| **Scale** | 24+ months | $300-1,000/month | 24/7 with auto-scaling |

---

**Document Version:** 1.0
**Last Review:** November 2025
**Next Review:** December 2025

For questions or updates, contact the platform team or refer to [docs/README.md](./README.md).
