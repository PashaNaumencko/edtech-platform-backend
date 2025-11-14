# Infrastructure with Terraform - Step-by-Step Guide

**Purpose:** Deploy EdTech platform microservices to AWS using Infrastructure as Code (Terraform)

**Target:** Free Tier optimized AWS infrastructure for Identity, Tutor, and Admin services

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Phase 1: Terraform Setup](#phase-1-terraform-setup)
5. [Phase 2: Networking](#phase-2-networking-vpc-subnets)
6. [Phase 3: Databases](#phase-3-databases-rds-postgresql)
7. [Phase 4: ECS Fargate](#phase-4-ecs-fargate)
8. [Phase 5: Application Load Balancer](#phase-5-application-load-balancer)
9. [Phase 6: AWS Services](#phase-6-aws-services)
10. [Phase 7: Deployment](#phase-7-deployment)

---

## Overview

### Infrastructure Components

```
AWS Cloud
├── VPC (10.0.0.0/16)
│   ├── Public Subnets (2 AZs)
│   ├── Private Subnets (2 AZs)
│   └── Internet Gateway
├── RDS PostgreSQL (db.t3.micro)
│   ├── identity_db
│   ├── tutor_db
│   └── admin_db
├── ECS Fargate Cluster
│   ├── Identity Service (2 tasks)
│   ├── Tutor Service (2 tasks)
│   └── Admin Service (2 tasks)
├── Application Load Balancer
│   ├── Public Listener (3000, 3002, 3004)
│   └── Internal Listener (3001, 3003, 3005)
├── AWS Cognito (User Pool)
├── AWS S3 (Document Storage)
├── AWS EventBridge (Domain Events)
└── AWS SSM Parameter Store (Secrets)
```

### Cost Optimization

- **RDS**: Single `db.t3.micro` instance (Free Tier: 750 hours/month)
- **ECS Fargate**: 0.25 vCPU, 0.5 GB RAM per task (Free Tier: 20 GB-hours/month)
- **ALB**: Single ALB with multiple listeners (Free Tier: 750 hours/month)
- **S3**: Standard storage (Free Tier: 5 GB)
- **EventBridge**: Pay-per-use (minimal cost)

**Estimated Monthly Cost:** $15-25 (after Free Tier)

---

## Prerequisites

### Required Tools

```bash
# Terraform (v1.5+)
brew install terraform

# AWS CLI (v2+)
brew install awscli

# Docker (for building images)
brew install --cask docker
```

### AWS Account Setup

1. **Create AWS Account** (if you don't have one)
2. **Create IAM User** with programmatic access
3. **Attach Policies:**
   - `AdministratorAccess` (for simplicity, restrict in production)
4. **Configure AWS CLI:**

```bash
aws configure
# AWS Access Key ID: [Your access key]
# AWS Secret Access Key: [Your secret key]
# Default region: us-east-1
# Default output format: json
```

5. **Verify Setup:**

```bash
aws sts get-caller-identity
```

---

## Project Structure

### Create Terraform Directory Structure

```bash
mkdir -p terraform/{modules/{networking,rds,ecs,alb,cognito,s3,eventbridge,ssm},environments/{dev,prod}}
```

**Final structure:**
```
terraform/
├── modules/
│   ├── networking/       # VPC, subnets, security groups
│   ├── rds/             # PostgreSQL databases
│   ├── ecs/             # ECS cluster and services
│   ├── alb/             # Application Load Balancer
│   ├── cognito/         # Cognito User Pool
│   ├── s3/              # S3 buckets
│   ├── eventbridge/     # EventBridge bus
│   └── ssm/             # SSM Parameter Store
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars
└── README.md
```

---

## Phase 1: Terraform Setup

### Step 1.1: Create Provider Configuration

**`terraform/environments/dev/main.tf`**
```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state backend (optional, recommended for teams)
  # backend "s3" {
  #   bucket = "edtech-terraform-state"
  #   key    = "dev/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "edtech-platform"
      ManagedBy   = "terraform"
    }
  }
}
```

### Step 1.2: Create Variables

**`terraform/environments/dev/variables.tf`**
```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "edtech-platform"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}
```

### Step 1.3: Initialize Terraform

```bash
cd terraform/environments/dev
terraform init
```

**Expected output:**
```
Terraform has been successfully initialized!
```

---

## Phase 2: Networking (VPC, Subnets)

### Step 2.1: Create Networking Module

**`terraform/modules/networking/main.tf`**
```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-${var.environment}-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-${var.environment}-public-${count.index + 1}"
    Type = "public"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-${var.environment}-private-${count.index + 1}"
    Type = "private"
  }
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-public-rt"
  }
}

# Associate Public Subnets with Route Table
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-${var.environment}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow HTTP from ALB"
    from_port   = 3000
    to_port     = 3005
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-tasks-sg"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow PostgreSQL from ECS tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  }
}
```

**`terraform/modules/networking/variables.tf`**
```hcl
variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
}
```

**`terraform/modules/networking/outputs.tf`**
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
  description = "ECS security group ID"
  value       = aws_security_group.ecs_tasks.id
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}
```

### Step 2.2: Use Networking Module

**Add to `terraform/environments/dev/main.tf`:**
```hcl
module "networking" {
  source = "../../modules/networking"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}
```

### Step 2.3: Apply Networking

```bash
cd terraform/environments/dev
terraform plan
terraform apply
```

**Verify:**
```bash
# Check VPC created
aws ec2 describe-vpcs --filters "Name=tag:Project,Values=edtech-platform"

# Check subnets created
aws ec2 describe-subnets --filters "Name=tag:Project,Values=edtech-platform"
```

---

## Phase 3: Databases (RDS PostgreSQL)

### Step 3.1: Create RDS Module

**`terraform/modules/rds/main.tf`**
```hcl
# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# RDS Instance (Single instance with multiple databases)
resource "aws_db_instance" "main" {
  identifier           = "${var.project_name}-${var.environment}-db"
  engine               = "postgres"
  engine_version       = "14.10"
  instance_class       = "db.t3.micro" # Free Tier eligible
  allocated_storage    = 20            # Free Tier: 20 GB
  storage_type         = "gp2"

  db_name  = "postgres" # Default database
  username = var.db_master_username
  password = var.db_master_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]

  publicly_accessible = false
  skip_final_snapshot = true # Set to false in production

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }
}

# Create databases for each service using null_resource
# Note: This requires psql to be installed
resource "null_resource" "create_databases" {
  depends_on = [aws_db_instance.main]

  provisioner "local-exec" {
    command = <<EOT
      PGPASSWORD=${var.db_master_password} psql \
        -h ${aws_db_instance.main.address} \
        -U ${var.db_master_username} \
        -d postgres \
        -c "CREATE DATABASE identity_db;"

      PGPASSWORD=${var.db_master_password} psql \
        -h ${aws_db_instance.main.address} \
        -U ${var.db_master_username} \
        -d postgres \
        -c "CREATE DATABASE tutor_db;"

      PGPASSWORD=${var.db_master_password} psql \
        -h ${aws_db_instance.main.address} \
        -U ${var.db_master_username} \
        -d postgres \
        -c "CREATE DATABASE admin_db;"
    EOT
  }
}
```

**`terraform/modules/rds/variables.tf`**
```hcl
variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID for RDS"
  type        = string
}

variable "db_master_username" {
  description = "Master username for RDS"
  type        = string
  sensitive   = true
}

variable "db_master_password" {
  description = "Master password for RDS"
  type        = string
  sensitive   = true
}
```

**`terraform/modules/rds/outputs.tf`**
```hcl
output "db_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "RDS address"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "RDS port"
  value       = aws_db_instance.main.port
}
```

### Step 3.2: Use RDS Module

**Add to `terraform/environments/dev/main.tf`:**
```hcl
module "rds" {
  source = "../../modules/rds"

  project_name       = var.project_name
  environment        = var.environment
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_id  = module.networking.rds_security_group_id
  db_master_username = var.db_master_username
  db_master_password = var.db_master_password
}
```

**Add to `terraform/environments/dev/variables.tf`:**
```hcl
variable "db_master_username" {
  description = "Master username for RDS"
  type        = string
  sensitive   = true
}

variable "db_master_password" {
  description = "Master password for RDS"
  type        = string
  sensitive   = true
}
```

**Add to `terraform/environments/dev/terraform.tfvars`:**
```hcl
db_master_username = "postgres"
db_master_password = "your-secure-password-here" # Change this!
```

### Step 3.3: Apply RDS

```bash
terraform plan
terraform apply
```

**Note:** RDS creation takes 10-15 minutes.

---

## Phase 4: ECS Fargate

### Step 4.1: Create ECS Module

**`terraform/modules/ecs/main.tf`**
```hcl
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cluster"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-${var.environment}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Task (application permissions)
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-${var.environment}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

# Attach policies for AWS services (S3, SSM, EventBridge)
resource "aws_iam_role_policy" "ecs_task_policy" {
  name = "${var.project_name}-${var.environment}-ecs-task-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::${var.s3_bucket_name}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "events:PutEvents"
        ]
        Resource = "arn:aws:events:${var.aws_region}:*:event-bus/*"
      }
    ]
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}-${var.environment}"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-logs"
  }
}

# ECS Task Definition (example for identity-service)
resource "aws_ecs_task_definition" "identity" {
  family                   = "${var.project_name}-${var.environment}-identity"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256" # 0.25 vCPU
  memory                   = "512" # 0.5 GB
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "identity-service"
    image = "${var.ecr_repository_url}/identity-service:latest"

    portMappings = [
      {
        containerPort = 3000
        protocol      = "tcp"
      },
      {
        containerPort = 3001
        protocol      = "tcp"
      }
    ]

    environment = [
      {
        name  = "NODE_ENV"
        value = var.environment
      },
      {
        name  = "DB_HOST"
        value = var.db_address
      },
      {
        name  = "DB_PORT"
        value = tostring(var.db_port)
      },
      {
        name  = "DB_NAME"
        value = "identity_db"
      }
    ]

    secrets = [
      {
        name      = "DB_USER"
        valueFrom = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.environment}/db/username"
      },
      {
        name      = "DB_PASSWORD"
        valueFrom = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.environment}/db/password"
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "identity"
      }
    }
  }])
}

# ECS Service
resource "aws_ecs_service" "identity" {
  name            = "${var.project_name}-${var.environment}-identity"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.identity.arn
  desired_count   = 1 # Start with 1, increase for production
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.target_group_arn_public
    container_name   = "identity-service"
    container_port   = 3000
  }

  load_balancer {
    target_group_arn = var.target_group_arn_internal
    container_name   = "identity-service"
    container_port   = 3001
  }
}
```

**Tasks for Phase 4:**
- [ ] Create ECS cluster
- [ ] Create IAM roles for task execution and task
- [ ] Create task definitions for all three services
- [ ] Create ECS services with load balancer integration
- [ ] Configure auto-scaling (optional)

---

## Phase 5: Application Load Balancer

### Step 5.1: Create ALB Module

**`terraform/modules/alb/main.tf`**
```hcl
# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-alb-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-alb"
  }
}

# Target Groups for each service (public ports)
resource "aws_lb_target_group" "identity_public" {
  name        = "${var.project_name}-${var.environment}-identity-pub"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 10
    timeout             = 60
    interval            = 300
    matcher             = "200"
  }
}

# Listener (HTTP)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}

# Listener Rules for each service
resource "aws_lb_listener_rule" "identity" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.identity_public.arn
  }

  condition {
    path_pattern {
      values = ["/auth/*", "/users/*"]
    }
  }
}
```

**Tasks for Phase 5:**
- [ ] Create ALB
- [ ] Create target groups for all services (public + internal)
- [ ] Create listeners for HTTP (and HTTPS if using SSL)
- [ ] Create listener rules for routing
- [ ] Configure health checks

---

## Phase 6: AWS Services

### Step 6.1: Create Cognito Module

**`terraform/modules/cognito/main.tf`**
```hcl
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = false
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-user-pool"
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-${var.environment}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}
```

### Step 6.2: Create S3 Module

**`terraform/modules/s3/main.tf`**
```hcl
resource "aws_s3_bucket" "documents" {
  bucket = "${var.project_name}-${var.environment}-documents"

  tags = {
    Name = "${var.project_name}-${var.environment}-documents"
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### Step 6.3: Create EventBridge Module

**`terraform/modules/eventbridge/main.tf`**
```hcl
resource "aws_cloudwatch_event_bus" "main" {
  name = "${var.project_name}-${var.environment}-event-bus"

  tags = {
    Name = "${var.project_name}-${var.environment}-event-bus"
  }
}
```

### Step 6.4: Create SSM Module

**`terraform/modules/ssm/main.tf`**
```hcl
resource "aws_ssm_parameter" "db_username" {
  name  = "/${var.environment}/db/username"
  type  = "SecureString"
  value = var.db_master_username

  tags = {
    Name = "${var.project_name}-${var.environment}-db-username"
  }
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.environment}/db/password"
  type  = "SecureString"
  value = var.db_master_password

  tags = {
    Name = "${var.project_name}-${var.environment}-db-password"
  }
}
```

---

## Phase 7: Deployment

### Step 7.1: Build and Push Docker Images

```bash
# Build identity-service image
docker build -t identity-service:latest -f apps/identity-service/Dockerfile .

# Tag for ECR
docker tag identity-service:latest <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com/identity-service:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com
docker push <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com/identity-service:latest
```

### Step 7.2: Deploy with Terraform

```bash
cd terraform/environments/dev

# Plan changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan
```

### Step 7.3: Verify Deployment

```bash
# Get ALB DNS name
terraform output alb_dns_name

# Test public endpoint
curl http://<alb-dns-name>/auth/health

# Check ECS tasks
aws ecs list-tasks --cluster edtech-platform-dev-cluster

# View logs
aws logs tail /ecs/edtech-platform-dev --follow
```

---

## Complete Checklist

### Phase 1: Terraform Setup
- [ ] Install Terraform, AWS CLI, Docker
- [ ] Configure AWS credentials
- [ ] Create Terraform project structure
- [ ] Initialize Terraform

### Phase 2: Networking
- [ ] Create VPC module
- [ ] Create public/private subnets
- [ ] Create security groups
- [ ] Apply networking infrastructure

### Phase 3: Databases
- [ ] Create RDS module
- [ ] Deploy PostgreSQL instance
- [ ] Create service databases
- [ ] Verify database connectivity

### Phase 4: ECS Fargate
- [ ] Create ECS cluster
- [ ] Create IAM roles
- [ ] Create task definitions for all services
- [ ] Deploy ECS services

### Phase 5: ALB
- [ ] Create ALB with security groups
- [ ] Create target groups
- [ ] Configure listeners and rules
- [ ] Set up health checks

### Phase 6: AWS Services
- [ ] Create Cognito User Pool
- [ ] Create S3 buckets
- [ ] Create EventBridge bus
- [ ] Store secrets in SSM Parameter Store

### Phase 7: Deployment
- [ ] Build Docker images
- [ ] Push images to ECR
- [ ] Deploy infrastructure with Terraform
- [ ] Verify all services are running
- [ ] Test API endpoints

---

## Cost Management

### Free Tier Limits
- **RDS**: 750 hours/month (db.t3.micro)
- **ECS Fargate**: 20 GB-hours/month storage + 5 GB/month ephemeral storage
- **ALB**: 750 hours/month + 15 LCU
- **S3**: 5 GB storage, 20,000 GET requests, 2,000 PUT requests
- **Data Transfer**: 100 GB/month outbound

### Monitoring Costs
```bash
# Check current month's estimated charges
aws ce get-cost-and-usage \
  --time-period Start=2025-11-01,End=2025-11-30 \
  --granularity MONTHLY \
  --metrics BlendedCost

# Set up billing alerts
aws cloudwatch put-metric-alarm \
  --alarm-name edtech-billing-alert \
  --alarm-description "Alert when charges exceed $25" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 25 \
  --comparison-operator GreaterThanThreshold
```

---

## Troubleshooting

### Common Issues

**RDS connection timeout:**
- Check security group allows traffic from ECS tasks
- Verify RDS is in private subnets
- Check VPC route tables

**ECS tasks failing to start:**
- Check CloudWatch logs: `/ecs/edtech-platform-dev`
- Verify IAM roles have correct permissions
- Check environment variables and secrets

**ALB health checks failing:**
- Ensure `/health` endpoint exists in services
- Check security group allows traffic from ALB
- Verify target group configuration

**High costs:**
- Stop unused ECS tasks: `aws ecs update-service --desired-count 0`
- Delete RDS snapshots if not needed
- Review CloudWatch log retention

---

## Next Steps

After infrastructure is deployed:
1. Implement services (see service-specific guides)
2. Set up CI/CD pipeline for automated deployments
3. Configure monitoring and alerting
4. Implement backup and disaster recovery
5. Harden security (VPN, WAF, etc.)

---

## References

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS Free Tier](https://aws.amazon.com/free/)
