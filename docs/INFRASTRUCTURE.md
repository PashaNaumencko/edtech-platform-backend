# Infrastructure Guide

Complete Terraform infrastructure guide for deploying the EdTech Platform on AWS with free-tier optimization, including VPC, ECS Fargate, RDS, DynamoDB, and EventBridge.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Module Structure](#module-structure)
- [Networking Module](#networking-module)
- [Data Module](#data-module)
- [Secrets Module](#secrets-module)
- [Auth Module](#auth-module)
- [ECS Service Module](#ecs-service-module)
- [EventBridge Module](#eventbridge-module)
- [Environment Configuration](#environment-configuration)
- [Deployment Steps](#deployment-steps)
- [Cost Optimization](#cost-optimization)
- [Monitoring and Logging](#monitoring-and-logging)

## Architecture Overview

### High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│                     AWS Cloud                          │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  VPC (10.0.0.0/16)                           │    │
│  │                                               │    │
│  │  ┌────────────────────────────────────┐     │    │
│  │  │  Public Subnets (No NAT Gateway)   │     │    │
│  │  │                                     │     │    │
│  │  │  ┌──────────┐  ┌──────────┐       │     │    │
│  │  │  │   ECS    │  │   ECS    │       │     │    │
│  │  │  │ Service 1│  │ Service 2│       │     │    │
│  │  │  └──────────┘  └──────────┘       │     │    │
│  │  │                                     │     │    │
│  │  └────────────────────────────────────┘     │    │
│  │                                               │    │
│  │  ┌────────────────────────────────────┐     │    │
│  │  │  Private Subnets                    │     │    │
│  │  │                                     │     │    │
│  │  │  ┌──────────┐                      │     │    │
│  │  │  │   RDS    │                      │     │    │
│  │  │  │ Postgres │                      │     │    │
│  │  │  └──────────┘                      │     │    │
│  │  │                                     │     │    │
│  │  └────────────────────────────────────┘     │    │
│  │                                               │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐      │
│  │ Cognito  │  │ DynamoDB  │  │ EventBridge  │      │
│  │User Pool │  │           │  │              │      │
│  └──────────┘  └───────────┘  └──────────────┘      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Directory Structure

```
infrastructure/
├── modules/
│   ├── shared/
│   │   ├── networking/         # VPC, Subnets, Security Groups
│   │   ├── data/               # RDS, DynamoDB
│   │   ├── secrets/            # SSM Parameter Store
│   │   ├── auth/               # Cognito User Pools
│   │   └── event-bridge/       # EventBridge Bus & Rules
│   └── services/
│       └── ecs-service/        # Reusable ECS Fargate service
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── backend.tf
│   │   └── terraform.tfvars
│   ├── staging/                # Future
│   └── prod/                   # Future
└── scripts/
    ├── setup-backend.sh        # Create S3 + DynamoDB for state
    ├── deploy-infra.sh         # Deploy infrastructure
    ├── start-services.sh       # Start ECS tasks
    ├── stop-services.sh        # Stop ECS tasks
    ├── check-costs.sh          # Check AWS costs
    └── destroy-all.sh          # Destroy everything
```

## Module Structure

### Shared Modules

Shared infrastructure components used across all environments.

#### Module: networking
- VPC with public and private subnets
- Internet Gateway (no NAT Gateway for cost savings)
- Security Groups for services
- Route tables

#### Module: data
- RDS PostgreSQL (db.t3.micro)
- DynamoDB tables (on-demand pricing)
- Database parameter groups
- Subnet groups

#### Module: secrets
- SSM Parameter Store for secrets
- Parameter hierarchies
- KMS encryption

#### Module: auth
- Cognito User Pools
- User Pool Clients
- Identity Pools
- User groups

#### Module: event-bridge
- EventBridge custom event bus
- Event rules
- Event targets
- IAM roles for EventBridge

### Service Modules

Reusable module for deploying ECS Fargate services.

#### Module: ecs-service
- ECS Cluster
- ECS Task Definition
- ECS Service
- Application Load Balancer
- Target Groups
- Auto Scaling (optional)
- CloudWatch Log Groups

## Networking Module

### Module Configuration

**File**: `infrastructure/modules/shared/networking/main.tf`

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

# Internet Gateway (Free)
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.environment}-igw"
    Environment = var.environment
  }
}

# Public Subnets (ECS Fargate with public IPs)
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.environment}-public-subnet-${count.index + 1}"
    Environment = var.environment
    Type        = "public"
  }
}

# Private Subnets (RDS only - no internet access)
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + length(var.availability_zones))
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.environment}-private-subnet-${count.index + 1}"
    Environment = var.environment
    Type        = "private"
  }
}

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "${var.environment}-public-rt"
    Environment = var.environment
  }
}

# Associate Public Subnets with Route Table
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Group: ECS Services
resource "aws_security_group" "ecs_services" {
  name        = "${var.environment}-ecs-services-sg"
  description = "Security group for ECS services"
  vpc_id      = aws_vpc.main.id

  # Allow inbound from ALB
  ingress {
    from_port       = 3000
    to_port         = 3005
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow all outbound (for internet access)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-ecs-services-sg"
    Environment = var.environment
  }
}

# Security Group: Application Load Balancer
resource "aws_security_group" "alb" {
  name        = "${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  # Allow HTTP from anywhere
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTPS from anywhere
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-alb-sg"
    Environment = var.environment
  }
}

# Security Group: RDS
resource "aws_security_group" "rds" {
  name        = "${var.environment}-rds-sg"
  description = "Security group for RDS database"
  vpc_id      = aws_vpc.main.id

  # Allow PostgreSQL from ECS services
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_services.id]
  }

  tags = {
    Name        = "${var.environment}-rds-sg"
    Environment = var.environment
  }
}
```

**File**: `infrastructure/modules/shared/networking/variables.tf`

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}
```

**File**: `infrastructure/modules/shared/networking/outputs.tf`

```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "ecs_security_group_id" {
  description = "ECS services security group ID"
  value       = aws_security_group.ecs_services.id
}

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}
```

## Data Module

### RDS PostgreSQL Configuration

**File**: `infrastructure/modules/shared/data/main.tf`

```hcl
# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "${var.environment}-db-subnet-group"
    Environment = var.environment
  }
}

# RDS PostgreSQL (Free Tier: db.t3.micro)
resource "aws_db_instance" "postgres" {
  identifier = "${var.environment}-postgres"

  # Free tier eligible
  engine               = "postgres"
  engine_version       = "16.1"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  storage_type         = "gp2"
  storage_encrypted    = false  # Free tier doesn't support encryption

  # Database configuration
  db_name  = var.database_name
  username = var.database_username
  password = var.database_password  # Should be from SSM/Secrets Manager in production

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group_id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  # Free tier optimization
  multi_az               = false  # Multi-AZ costs extra
  deletion_protection    = false  # For dev/test environments
  skip_final_snapshot    = true   # For dev/test environments

  tags = {
    Name        = "${var.environment}-postgres"
    Environment = var.environment
  }
}

# DynamoDB Table: Event Store (On-Demand Pricing)
resource "aws_dynamodb_table" "event_store" {
  name         = "${var.environment}-event-store"
  billing_mode = "PAY_PER_REQUEST"  # Free tier: 25 GB storage + 25 RCU/WCU

  hash_key  = "PK"   # Partition Key: AGGREGATE_TYPE#aggregate-id
  range_key = "SK"   # Sort Key: EVENT#timestamp#event-id

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # Global Secondary Index: Query by event type
  attribute {
    name = "eventName"
    type = "S"
  }

  attribute {
    name = "occurredAt"
    type = "S"
  }

  global_secondary_index {
    name            = "EventTypeIndex"
    hash_key        = "eventName"
    range_key       = "occurredAt"
    projection_type = "ALL"
  }

  # TTL for automatic event cleanup (optional)
  ttl {
    attribute_name = "TTL"
    enabled        = true
  }

  # Point-in-time recovery (optional, costs extra)
  point_in_time_recovery {
    enabled = false
  }

  tags = {
    Name        = "${var.environment}-event-store"
    Environment = var.environment
  }
}

# DynamoDB Table: User Sessions (On-Demand)
resource "aws_dynamodb_table" "user_sessions" {
  name         = "${var.environment}-user-sessions"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "sessionId"

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = {
    Name        = "${var.environment}-user-sessions"
    Environment = var.environment
  }
}
```

**File**: `infrastructure/modules/shared/data/variables.tf`

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for RDS"
  type        = list(string)
}

variable "rds_security_group_id" {
  description = "Security group ID for RDS"
  type        = string
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "edtech"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "edtech_admin"
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}
```

**File**: `infrastructure/modules/shared/data/outputs.tf`

```hcl
output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.postgres.db_name
}

output "event_store_table_name" {
  description = "DynamoDB event store table name"
  value       = aws_dynamodb_table.event_store.name
}

output "user_sessions_table_name" {
  description = "DynamoDB user sessions table name"
  value       = aws_dynamodb_table.user_sessions.name
}
```

## Secrets Module

### SSM Parameter Store

**File**: `infrastructure/modules/shared/secrets/main.tf`

```hcl
# Database Password
resource "aws_ssm_parameter" "database_password" {
  name        = "/${var.environment}/database/password"
  description = "RDS database password"
  type        = "SecureString"
  value       = var.database_password

  tags = {
    Name        = "${var.environment}-database-password"
    Environment = var.environment
  }
}

# JWT Secret for Service Authentication
resource "aws_ssm_parameter" "service_jwt_secret" {
  name        = "/${var.environment}/auth/service-jwt-secret"
  description = "JWT secret for inter-service authentication"
  type        = "SecureString"
  value       = var.service_jwt_secret

  tags = {
    Name        = "${var.environment}-service-jwt-secret"
    Environment = var.environment
  }
}

# AWS Region
resource "aws_ssm_parameter" "aws_region" {
  name        = "/${var.environment}/aws/region"
  description = "AWS region"
  type        = "String"
  value       = var.aws_region

  tags = {
    Name        = "${var.environment}-aws-region"
    Environment = var.environment
  }
}

# Database Connection String
resource "aws_ssm_parameter" "database_url" {
  name        = "/${var.environment}/database/url"
  description = "Database connection URL"
  type        = "SecureString"
  value       = "postgresql://${var.database_username}:${var.database_password}@${var.rds_endpoint}/${var.database_name}"

  tags = {
    Name        = "${var.environment}-database-url"
    Environment = var.environment
  }
}

# EventBridge Bus Name
resource "aws_ssm_parameter" "event_bus_name" {
  name        = "/${var.environment}/eventbridge/bus-name"
  description = "EventBridge bus name"
  type        = "String"
  value       = var.event_bus_name

  tags = {
    Name        = "${var.environment}-event-bus-name"
    Environment = var.environment
  }
}
```

**File**: `infrastructure/modules/shared/secrets/variables.tf`

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "service_jwt_secret" {
  description = "JWT secret for service authentication"
  type        = string
  sensitive   = true
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "rds_endpoint" {
  description = "RDS endpoint"
  type        = string
}

variable "database_name" {
  description = "Database name"
  type        = string
}

variable "database_username" {
  description = "Database username"
  type        = string
}

variable "event_bus_name" {
  description = "EventBridge bus name"
  type        = string
}
```

## Auth Module

### Cognito User Pool

**File**: `infrastructure/modules/shared/auth/main.tf`

```hcl
# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.environment}-user-pool"

  # Username and attributes
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"  # Free tier
  }

  # User account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Schema attributes
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = false
  }

  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
  }

  tags = {
    Name        = "${var.environment}-user-pool"
    Environment = var.environment
  }
}

# User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.environment}-user-pool-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Authentication flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Token validity
  access_token_validity  = 1   # 1 hour
  id_token_validity      = 1   # 1 hour
  refresh_token_validity = 30  # 30 days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Prevent secret generation (not needed for public clients)
  generate_secret = false
}

# User Pool Groups
resource "aws_cognito_user_pool_group" "students" {
  name         = "students"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Student users"
}

resource "aws_cognito_user_pool_group" "tutors" {
  name         = "tutors"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Tutor users"
}

resource "aws_cognito_user_pool_group" "admins" {
  name         = "admins"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Admin users"
}
```

**File**: `infrastructure/modules/shared/auth/outputs.tf`

```hcl
output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.main.id
}
```

## ECS Service Module

### Reusable ECS Fargate Service

**File**: `infrastructure/modules/services/ecs-service/main.tf`

```hcl
# ECS Cluster (shared across services)
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.environment}-cluster"
    Environment = var.environment
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "service" {
  name              = "/ecs/${var.environment}/${var.service_name}"
  retention_in_days = 7

  tags = {
    Name        = "${var.environment}-${var.service_name}-logs"
    Environment = var.environment
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.environment}-${var.service_name}-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-${var.service_name}-execution-role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role (for service permissions)
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.environment}-${var.service_name}-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-${var.service_name}-task-role"
    Environment = var.environment
  }
}

# Task Role Policy: SSM Parameter Access
resource "aws_iam_role_policy" "ssm_parameters" {
  name = "${var.environment}-${var.service_name}-ssm-policy"
  role = aws_iam_role.ecs_task_role.id

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
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.environment}/*"
      }
    ]
  })
}

# Task Role Policy: EventBridge
resource "aws_iam_role_policy" "eventbridge" {
  name = "${var.environment}-${var.service_name}-eventbridge-policy"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "events:PutEvents"
        ]
        Resource = var.event_bus_arn
      }
    ]
  })
}

# ECS Task Definition
resource "aws_ecs_task_definition" "service" {
  family                   = "${var.environment}-${var.service_name}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = var.service_name
      image     = var.docker_image
      essential = true

      portMappings = [
        {
          containerPort = var.public_port
          protocol      = "tcp"
        },
        {
          containerPort = var.internal_port
          protocol      = "tcp"
        }
      ]

      environment = var.environment_variables

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.service.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${var.public_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${var.environment}-${var.service_name}-task"
    Environment = var.environment
  }
}

# ECS Service
resource "aws_ecs_service" "service" {
  name            = "${var.service_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.service.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = true  # Required for public subnets without NAT Gateway
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.public.arn
    container_name   = var.service_name
    container_port   = var.public_port
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.internal.arn
    container_name   = var.service_name
    container_port   = var.internal_port
  }

  depends_on = [aws_lb_listener.public, aws_lb_listener.internal]

  tags = {
    Name        = "${var.environment}-${var.service_name}-service"
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.environment}-${var.service_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.subnet_ids

  tags = {
    Name        = "${var.environment}-${var.service_name}-alb"
    Environment = var.environment
  }
}

# Target Group: Public Port
resource "aws_lb_target_group" "public" {
  name        = "${var.environment}-${var.service_name}-public-tg"
  port        = var.public_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name        = "${var.environment}-${var.service_name}-public-tg"
    Environment = var.environment
  }
}

# Target Group: Internal Port
resource "aws_lb_target_group" "internal" {
  name        = "${var.environment}-${var.service_name}-internal-tg"
  port        = var.internal_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name        = "${var.environment}-${var.service_name}-internal-tg"
    Environment = var.environment
  }
}

# Listener: Public Port
resource "aws_lb_listener" "public" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.public.arn
  }
}

# Listener: Internal Port (not exposed externally)
resource "aws_lb_listener" "internal" {
  load_balancer_arn = aws_lb.main.arn
  port              = var.internal_port
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.internal.arn
  }
}
```

## EventBridge Module

**File**: `infrastructure/modules/shared/event-bridge/main.tf`

```hcl
# EventBridge Custom Event Bus
resource "aws_cloudwatch_event_bus" "main" {
  name = "${var.environment}-event-bus"

  tags = {
    Name        = "${var.environment}-event-bus"
    Environment = var.environment
  }
}

# Event Rule: User Created
resource "aws_cloudwatch_event_rule" "user_created" {
  name           = "${var.environment}-user-created-rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name
  description    = "Forward user.created events to Tutor Service"

  event_pattern = jsonencode({
    source      = ["user-service"]
    detail-type = ["user.created"]
  })

  tags = {
    Name        = "${var.environment}-user-created-rule"
    Environment = var.environment
  }
}

# Event Target: User Created -> Tutor Service
resource "aws_cloudwatch_event_target" "user_created_to_tutor" {
  rule           = aws_cloudwatch_event_rule.user_created.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  arn            = var.tutor_service_target_arn
  role_arn       = aws_iam_role.eventbridge_role.arn
}

# IAM Role for EventBridge
resource "aws_iam_role" "eventbridge_role" {
  name = "${var.environment}-eventbridge-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-eventbridge-role"
    Environment = var.environment
  }
}
```

## Environment Configuration

### Development Environment

**File**: `infrastructure/environments/dev/main.tf`

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "edtech-terraform-state-dev"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "edtech-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# Networking
module "networking" {
  source = "../../modules/shared/networking"

  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# Data (RDS + DynamoDB)
module "data" {
  source = "../../modules/shared/data"

  environment            = var.environment
  private_subnet_ids     = module.networking.private_subnet_ids
  rds_security_group_id  = module.networking.rds_security_group_id
  database_name          = var.database_name
  database_username      = var.database_username
  database_password      = var.database_password
}

# Secrets
module "secrets" {
  source = "../../modules/shared/secrets"

  environment         = var.environment
  database_password   = var.database_password
  service_jwt_secret  = var.service_jwt_secret
  aws_region          = var.aws_region
  rds_endpoint        = module.data.rds_endpoint
  database_name       = var.database_name
  database_username   = var.database_username
  event_bus_name      = "${var.environment}-event-bus"
}

# Auth (Cognito)
module "auth" {
  source = "../../modules/shared/auth"

  environment = var.environment
}

# EventBridge
module "event_bridge" {
  source = "../../modules/shared/event-bridge"

  environment              = var.environment
  tutor_service_target_arn = module.tutor_service.service_arn
}

# User Service
module "user_service" {
  source = "../../modules/services/ecs-service"

  environment           = var.environment
  service_name          = "user-service"
  docker_image          = "${var.ecr_repository_url}/user-service:latest"
  public_port           = 3000
  internal_port         = 3001
  task_cpu              = "256"
  task_memory           = "512"
  desired_count         = 0  # Start with 0 to save costs
  vpc_id                = module.networking.vpc_id
  subnet_ids            = module.networking.public_subnet_ids
  security_group_id     = module.networking.ecs_security_group_id
  alb_security_group_id = module.networking.alb_security_group_id
  aws_region            = var.aws_region
  event_bus_arn         = module.event_bridge.event_bus_arn

  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "AWS_REGION", value = var.aws_region },
    { name = "DATABASE_URL", value = "postgresql://${var.database_username}:${var.database_password}@${module.data.rds_endpoint}/${var.database_name}" },
    { name = "EVENT_BUS_NAME", value = "${var.environment}-event-bus" },
  ]
}

# Tutor Service
module "tutor_service" {
  source = "../../modules/services/ecs-service"

  environment           = var.environment
  service_name          = "tutor-service"
  docker_image          = "${var.ecr_repository_url}/tutor-service:latest"
  public_port           = 3002
  internal_port         = 3003
  task_cpu              = "256"
  task_memory           = "512"
  desired_count         = 0
  vpc_id                = module.networking.vpc_id
  subnet_ids            = module.networking.public_subnet_ids
  security_group_id     = module.networking.ecs_security_group_id
  alb_security_group_id = module.networking.alb_security_group_id
  aws_region            = var.aws_region
  event_bus_arn         = module.event_bridge.event_bus_arn

  environment_variables = [
    { name = "NODE_ENV", value = "production" },
    { name = "AWS_REGION", value = var.aws_region },
    { name = "DATABASE_URL", value = "postgresql://${var.database_username}:${var.database_password}@${module.data.rds_endpoint}/${var.database_name}" },
    { name = "EVENT_BUS_NAME", value = "${var.environment}-event-bus" },
  ]
}
```

**File**: `infrastructure/environments/dev/terraform.tfvars`

```hcl
# Environment
environment = "dev"
aws_region  = "us-east-1"

# Networking
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# Database
database_name     = "edtech"
database_username = "edtech_admin"

# ECR
ecr_repository_url = "123456789012.dkr.ecr.us-east-1.amazonaws.com"
```

## Deployment Steps

### 1. Setup Backend (One-Time)

```bash
# Create S3 bucket for Terraform state
./infrastructure/scripts/setup-backend.sh

# Script contents:
#!/bin/bash
aws s3api create-bucket \
  --bucket edtech-terraform-state-dev \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket edtech-terraform-state-dev \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name edtech-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Deploy Infrastructure

```bash
cd infrastructure/environments/dev

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply infrastructure
terraform apply

# Output important values
terraform output
```

### 3. Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build images
docker build -t user-service -f apps/user-service/Dockerfile .
docker build -t tutor-service -f apps/tutor-service/Dockerfile .

# Tag images
docker tag user-service:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/user-service:latest
docker tag tutor-service:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/tutor-service:latest

# Push images
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/user-service:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/tutor-service:latest
```

### 4. Start Services

```bash
# Start ECS services (set desired_count = 1)
./infrastructure/scripts/start-services.sh

# Script contents:
#!/bin/bash
aws ecs update-service \
  --cluster dev-cluster \
  --service user-service-service \
  --desired-count 1

aws ecs update-service \
  --cluster dev-cluster \
  --service tutor-service-service \
  --desired-count 1

# Wait for services to be stable
aws ecs wait services-stable \
  --cluster dev-cluster \
  --services user-service-service tutor-service-service
```

### 5. Stop Services (Save Costs)

```bash
# Stop ECS services (set desired_count = 0)
./infrastructure/scripts/stop-services.sh

# Script contents:
#!/bin/bash
aws ecs update-service \
  --cluster dev-cluster \
  --service user-service-service \
  --desired-count 0

aws ecs update-service \
  --cluster dev-cluster \
  --service tutor-service-service \
  --desired-count 0
```

## Cost Optimization

### Free Tier Resources

```
Resource              Free Tier Limit              Monthly Cost (if exceeded)
─────────────────────────────────────────────────────────────────────────────
RDS db.t3.micro       750 hours/month (12 months) $0.017/hour after
ECS Fargate           None                         $0.04048/vCPU-hour
DynamoDB              25 GB + 25 RCU/WCU          $0.25/GB-month
S3                    5 GB + 20K GET + 2K PUT     $0.023/GB-month
Cognito               50,000 MAU                  $0.0055/MAU after
EventBridge           Free                        $0
SSM Parameters        Free (Standard tier)        $0
VPC                   Free                        $0
NAT Gateway           N/A (not using)             $0.045/hour (AVOIDED!)
```

### Monthly Cost Estimates

```bash
# Always running (24/7)
RDS: $0 (free tier)
Total: ~$0/month (within free tier)

# Services on-demand (2 hours/day for demos)
ECS Fargate: 2 services × $0.01/hour × 2 hrs × 30 days = $1.20/month
Total: ~$1.20/month
```

### Cost Monitoring Script

**File**: `infrastructure/scripts/check-costs.sh`

```bash
#!/bin/bash

# Check current month's AWS costs
aws ce get-cost-and-usage \
  --time-period Start=$(date +%Y-%m-01),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=SERVICE

# Check running ECS tasks
echo "Running ECS Tasks:"
aws ecs list-tasks \
  --cluster dev-cluster \
  --desired-status RUNNING

# Check RDS status
echo "RDS Status:"
aws rds describe-db-instances \
  --db-instance-identifier dev-postgres \
  --query 'DBInstances[0].DBInstanceStatus'
```

## Monitoring and Logging

### CloudWatch Dashboards

```hcl
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.environment}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            [".", "MemoryUtilization", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Resource Utilization"
        }
      }
    ]
  })
}
```

### Log Insights Queries

```bash
# Query application logs
aws logs start-query \
  --log-group-name "/ecs/dev/user-service" \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20'
```

## Summary

This infrastructure guide provides:

- **Complete Terraform modules** for all AWS resources
- **Free-tier optimized** architecture ($0-2/month)
- **Networking setup** without NAT Gateway (cost savings)
- **RDS PostgreSQL** (db.t3.micro) and DynamoDB (on-demand)
- **ECS Fargate** services with dual-port pattern
- **Cognito** authentication
- **EventBridge** for event-driven architecture
- **Deployment scripts** for automation
- **Cost monitoring** and optimization strategies

Use this infrastructure to deploy the EdTech Platform to AWS with minimal costs during development and the ability to scale for production.
