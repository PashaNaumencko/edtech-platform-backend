# CloudWatch Observability - Implementation Guide

**Purpose:** Set up comprehensive observability for microservices using AWS CloudWatch
**Strategy:** Logs + Metrics + Alarms for all services

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: CloudWatch Logs](#phase-1-cloudwatch-logs)
3. [Phase 2: CloudWatch Metrics](#phase-2-cloudwatch-metrics)
4. [Phase 3: CloudWatch Alarms](#phase-3-cloudwatch-alarms)
5. [Phase 4: CloudWatch Dashboards](#phase-4-cloudwatch-dashboards)
6. [Phase 5: AWS X-Ray (Optional)](#phase-5-aws-x-ray-optional)
7. [Cost Optimization](#cost-optimization)

---

## Overview

### Observability Stack

```
┌─────────────────────────────────────────────────────┐
│           CLOUDWATCH OBSERVABILITY                  │
├─────────────────────────────────────────────────────┤
│  1. LOGS        → Application logs, request traces  │
│  2. METRICS     → Performance, health, custom       │
│  3. ALARMS      → Error rate, latency, failures     │
│  4. DASHBOARDS  → Visual monitoring                 │
│  5. X-RAY       → Distributed tracing (optional)    │
└─────────────────────────────────────────────────────┘
```

### What You'll Build

| Component | Purpose | Cost |
|-----------|---------|------|
| **CloudWatch Logs** | Store application logs from ECS | $0.50/GB ingestion + $0.03/GB/month storage |
| **CloudWatch Metrics** | Track service health & performance | First 10 custom metrics free |
| **CloudWatch Alarms** | Alert on errors, high latency | $0.10/alarm/month |
| **CloudWatch Dashboards** | Visual monitoring | $3/dashboard/month |
| **AWS X-Ray** | Distributed tracing | $5/million traces |

**Estimated Cost:** $10-15/month (MVP), $30-50/month (Production)

---

## Phase 1: CloudWatch Logs

### Step 1.1: Update ECS Module with Logging

**Already implemented in `terraform/modules/ecs/main.tf`:**

```hcl
# CloudWatch Log Group (lines 697-704)
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}-${var.environment}"
  retention_in_days = 7 # Free Tier: Keep 7 days, increase for production

  tags = {
    Name = "${var.project_name}-${var.environment}-logs"
  }
}
```

**Log retention options:**
- `1` - 1 day (testing)
- `7` - 7 days (MVP/development)
- `30` - 30 days (staging)
- `90` - 90 days (production)
- `365` - 1 year (compliance)

### Step 1.2: Create Log Groups Per Service

**`terraform/modules/cloudwatch/logs.tf`**

```hcl
# Create separate log groups for each service
resource "aws_cloudwatch_log_group" "identity_service" {
  name              = "/ecs/${var.project_name}-${var.environment}/identity-service"
  retention_in_days = var.log_retention_days

  tags = {
    Name    = "${var.project_name}-${var.environment}-identity-logs"
    Service = "identity-service"
  }
}

resource "aws_cloudwatch_log_group" "tutor_service" {
  name              = "/ecs/${var.project_name}-${var.environment}/tutor-service"
  retention_in_days = var.log_retention_days

  tags = {
    Name    = "${var.project_name}-${var.environment}-tutor-logs"
    Service = "tutor-service"
  }
}

resource "aws_cloudwatch_log_group" "admin_service" {
  name              = "/ecs/${var.project_name}-${var.environment}/admin-service"
  retention_in_days = var.log_retention_days

  tags = {
    Name    = "${var.project_name}-${var.environment}-admin-logs"
    Service = "admin-service"
  }
}
```

### Step 1.3: Update ECS Task Definitions

**Update each service's task definition to use its own log group:**

```hcl
# In terraform/modules/ecs/main.tf, update task definition
resource "aws_ecs_task_definition" "identity" {
  # ... existing config

  container_definitions = jsonencode([{
    name  = "identity-service"
    image = "${var.ecr_repository_url}/identity-service:latest"

    # ... port mappings, environment

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project_name}-${var.environment}/identity-service"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
        "awslogs-create-group"  = "true" # Auto-create if not exists
      }
    }
  }])
}
```

### Step 1.4: View Logs with AWS CLI

```bash
# Tail logs in real-time
aws logs tail /ecs/edtech-platform-dev/identity-service --follow

# Filter logs by level
aws logs tail /ecs/edtech-platform-dev/identity-service \
  --filter-pattern '{ $.level = "error" }' \
  --follow

# Get logs from last hour
aws logs tail /ecs/edtech-platform-dev/identity-service \
  --since 1h

# Export logs to file
aws logs tail /ecs/edtech-platform-dev/identity-service \
  --since 1h > identity-logs.json
```

### Step 1.5: CloudWatch Insights Queries

**Create saved queries for common scenarios:**

**Query 1: All Errors**
```
fields @timestamp, level, service, message, error.message, error.stack
| filter level = "error"
| sort @timestamp desc
| limit 100
```

**Query 2: Slow Requests (>1000ms)**
```
fields @timestamp, service, method, path, duration, statusCode
| filter duration > 1000
| sort duration desc
| limit 50
```

**Query 3: Track Request by Correlation ID**
```
fields @timestamp, message, service, method, path, statusCode, duration
| filter correlationId = "abc-123-def-456"
| sort @timestamp asc
```

**Query 4: Error Rate by Service**
```
stats count(*) as total,
      count(level = "error") as errors
by service
| fields service, errors, total, (errors / total * 100) as error_rate
| sort error_rate desc
```

**Query 5: Top 10 Slowest Endpoints**
```
stats avg(duration) as avg_duration,
      max(duration) as max_duration,
      count(*) as request_count
by path
| sort avg_duration desc
| limit 10
```

---

## Phase 2: CloudWatch Metrics

### Step 2.1: Create Metrics Module

**`terraform/modules/cloudwatch/metrics.tf`**

```hcl
# Metric filter for error count
resource "aws_cloudwatch_log_metric_filter" "errors" {
  name           = "${var.project_name}-${var.environment}-error-count"
  log_group_name = "/ecs/${var.project_name}-${var.environment}/identity-service"
  pattern        = '{ $.level = "error" }'

  metric_transformation {
    name      = "ErrorCount"
    namespace = "EdTech/IdentityService"
    value     = "1"
    unit      = "Count"
  }
}

# Metric filter for 5xx errors
resource "aws_cloudwatch_log_metric_filter" "http_5xx" {
  name           = "${var.project_name}-${var.environment}-http-5xx"
  log_group_name = "/ecs/${var.project_name}-${var.environment}/identity-service"
  pattern        = '{ $.statusCode = 5* }'

  metric_transformation {
    name      = "HTTP5xxCount"
    namespace = "EdTech/IdentityService"
    value     = "1"
    unit      = "Count"
  }
}

# Metric filter for slow requests
resource "aws_cloudwatch_log_metric_filter" "slow_requests" {
  name           = "${var.project_name}-${var.environment}-slow-requests"
  log_group_name = "/ecs/${var.project_name}-${var.environment}/identity-service"
  pattern        = '{ $.duration > 1000 }'

  metric_transformation {
    name      = "SlowRequestCount"
    namespace = "EdTech/IdentityService"
    value     = "1"
    unit      = "Count"
  }
}

# Metric filter for request duration (average)
resource "aws_cloudwatch_log_metric_filter" "request_duration" {
  name           = "${var.project_name}-${var.environment}-request-duration"
  log_group_name = "/ecs/${var.project_name}-${var.environment}/identity-service"
  pattern        = '{ $.duration = * }'

  metric_transformation {
    name      = "RequestDuration"
    namespace = "EdTech/IdentityService"
    value     = "$.duration"
    unit      = "Milliseconds"
  }
}
```

### Step 2.2: Add Custom Application Metrics

**Implement in `libs/shared-kernel/src/metrics/metrics.service.ts`:**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { ConfigService } from '@nestjs/config';

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
    unit: 'Count' | 'Milliseconds' | 'Percent' = 'Count',
  ): Promise<void> {
    // In development, just log
    if (!this.enabled) {
      this.logger.debug(`[METRIC] ${name}: ${value} ${unit}`);
      return;
    }

    try {
      const command = new PutMetricDataCommand({
        Namespace: `EdTech/${this.capitalize(this.serviceName)}`,
        MetricData: [
          {
            MetricName: name,
            Value: value,
            Unit: unit,
            Timestamp: new Date(),
            Dimensions: [
              { Name: 'Service', Value: this.serviceName },
              { Name: 'Environment', Value: this.environment },
            ],
          },
        ],
      });

      await this.cloudwatch.send(command);
    } catch (error) {
      this.logger.error(`Failed to record metric ${name}:`, error);
    }
  }

  async incrementCounter(name: string): Promise<void> {
    await this.recordMetric(name, 1, 'Count');
  }

  async recordDuration(name: string, milliseconds: number): Promise<void> {
    await this.recordMetric(name, milliseconds, 'Milliseconds');
  }

  async recordPercentage(name: string, percentage: number): Promise<void> {
    await this.recordMetric(name, percentage, 'Percent');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
```

**Use in command handlers:**

```typescript
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    private readonly userRepository: IUserAccountRepository,
    private readonly metrics: MetricsService,
  ) {}

  async execute(command: CreateUserCommand): Promise<string> {
    const startTime = Date.now();

    try {
      // Business logic
      const user = UserAccount.create(...);
      await this.userRepository.save(user);

      // Record success metric
      await this.metrics.incrementCounter('UserCreated');

      return user.id.value;
    } catch (error) {
      // Record failure metric
      await this.metrics.incrementCounter('UserCreationFailed');
      throw error;
    } finally {
      // Record duration
      const duration = Date.now() - startTime;
      await this.metrics.recordDuration('CreateUserDuration', duration);
    }
  }
}
```

---

## Phase 3: CloudWatch Alarms

### Step 3.1: Create SNS Topic for Alerts

**`terraform/modules/cloudwatch/sns.tf`**

```hcl
# SNS Topic for CloudWatch Alarms
resource "aws_sns_topic" "cloudwatch_alarms" {
  name = "${var.project_name}-${var.environment}-cloudwatch-alarms"

  tags = {
    Name = "${var.project_name}-${var.environment}-alarms"
  }
}

# Email subscription
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.cloudwatch_alarms.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Optional: Slack webhook subscription
# resource "aws_sns_topic_subscription" "slack" {
#   topic_arn = aws_sns_topic.cloudwatch_alarms.arn
#   protocol  = "https"
#   endpoint  = var.slack_webhook_url
# }
```

### Step 3.2: Create Alarms

**`terraform/modules/cloudwatch/alarms.tf`**

```hcl
# Alarm: High Error Rate
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ErrorCount"
  namespace           = "EdTech/IdentityService"
  period              = 300 # 5 minutes
  statistic           = "Sum"
  threshold           = 10 # More than 10 errors in 5 minutes
  alarm_description   = "Alert when error rate is high"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]
  ok_actions          = [aws_sns_topic.cloudwatch_alarms.arn]

  dimensions = {
    Service     = "identity-service"
    Environment = var.environment
  }

  tags = {
    Name    = "${var.project_name}-${var.environment}-high-error-rate"
    Service = "identity-service"
  }
}

# Alarm: High 5xx Error Rate
resource "aws_cloudwatch_metric_alarm" "high_5xx_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-high-5xx-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTP5xxCount"
  namespace           = "EdTech/IdentityService"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when 5xx errors exceed threshold"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]

  dimensions = {
    Service     = "identity-service"
    Environment = var.environment
  }
}

# Alarm: High Response Time
resource "aws_cloudwatch_metric_alarm" "high_latency" {
  alarm_name          = "${var.project_name}-${var.environment}-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RequestDuration"
  namespace           = "EdTech/IdentityService"
  period              = 300
  statistic           = "Average"
  threshold           = 2000 # Average response time > 2 seconds
  alarm_description   = "Alert when average response time is high"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]

  dimensions = {
    Service     = "identity-service"
    Environment = var.environment
  }
}

# Alarm: ECS Service Unhealthy
resource "aws_cloudwatch_metric_alarm" "ecs_unhealthy" {
  alarm_name          = "${var.project_name}-${var.environment}-ecs-unhealthy"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1 # At least 1 healthy task
  alarm_description   = "Alert when no healthy ECS tasks"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]

  dimensions = {
    TargetGroup  = var.target_group_arn
    LoadBalancer = var.load_balancer_arn
  }
}

# Alarm: RDS High CPU
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80 # CPU > 80%
  alarm_description   = "Alert when RDS CPU is high"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }
}

# Alarm: RDS Low Storage
resource "aws_cloudwatch_metric_alarm" "rds_low_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 2147483648 # Less than 2 GB free
  alarm_description   = "Alert when RDS storage is low"
  alarm_actions       = [aws_sns_topic.cloudwatch_alarms.arn]

  dimensions = {
    DBInstanceIdentifier = var.db_instance_id
  }
}
```

### Step 3.3: Add Variables

**`terraform/modules/cloudwatch/variables.tf`**

```hcl
variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "alert_email" {
  description = "Email for CloudWatch alarms"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch logs retention in days"
  type        = number
  default     = 7
}

variable "target_group_arn" {
  description = "ALB target group ARN"
  type        = string
}

variable "load_balancer_arn" {
  description = "ALB ARN"
  type        = string
}

variable "db_instance_id" {
  description = "RDS instance ID"
  type        = string
}
```

### Step 3.4: Use CloudWatch Module

**Add to `terraform/environments/dev/main.tf`:**

```hcl
module "cloudwatch" {
  source = "../../modules/cloudwatch"

  project_name        = var.project_name
  environment         = var.environment
  alert_email         = var.alert_email
  log_retention_days  = 7
  target_group_arn    = module.alb.identity_target_group_arn
  load_balancer_arn   = module.alb.alb_arn
  db_instance_id      = module.rds.db_instance_id
}
```

---

## Phase 4: CloudWatch Dashboards

### Step 4.1: Create Dashboard Module

**`terraform/modules/cloudwatch/dashboard.tf`**

```hcl
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      # Error Rate Widget
      {
        type = "metric"
        x    = 0
        y    = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            ["EdTech/IdentityService", "ErrorCount", { stat = "Sum", period = 300 }],
            [".", "HTTP5xxCount", { stat = "Sum", period = 300 }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Error Rate"
          period  = 300
        }
      },
      # Response Time Widget
      {
        type = "metric"
        x    = 12
        y    = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            ["EdTech/IdentityService", "RequestDuration", { stat = "Average", period = 300 }],
            ["...", { stat = "p99", period = 300 }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "Response Time (ms)"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      # ECS Service Health
      {
        type = "metric"
        x    = 0
        y    = 6
        width = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average", period = 300 }],
            [".", "MemoryUtilization", { stat = "Average", period = 300 }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "ECS Service Health"
        }
      },
      # RDS Performance
      {
        type = "metric"
        x    = 12
        y    = 6
        width = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", { stat = "Average", period = 300 }],
            [".", "DatabaseConnections", { stat = "Sum", period = 300 }]
          ]
          view   = "timeSeries"
          region = var.aws_region
          title  = "RDS Performance"
        }
      },
      # Log Insights Query Widget
      {
        type = "log"
        x    = 0
        y    = 12
        width = 24
        height = 6
        properties = {
          query   = <<QUERY
SOURCE '/ecs/${var.project_name}-${var.environment}/identity-service'
| fields @timestamp, level, message, statusCode
| filter level = "error"
| sort @timestamp desc
| limit 20
QUERY
          region  = var.aws_region
          title   = "Recent Errors"
        }
      }
    ]
  })
}
```

### Step 4.2: Access Dashboard

```bash
# Get dashboard URL
echo "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=edtech-platform-dev-dashboard"

# Or use AWS CLI
aws cloudwatch get-dashboard --dashboard-name edtech-platform-dev-dashboard
```

---

## Phase 5: AWS X-Ray (Optional)

### Step 5.1: Enable X-Ray on ECS

**Update task definition:**

```hcl
resource "aws_ecs_task_definition" "identity" {
  # ... existing config

  container_definitions = jsonencode([
    {
      name  = "identity-service"
      # ... existing config
    },
    # Add X-Ray daemon sidecar
    {
      name   = "xray-daemon"
      image  = "public.ecr.aws/xray/aws-xray-daemon:latest"
      cpu    = 32
      memory = 256

      portMappings = [{
        containerPort = 2000
        protocol      = "udp"
      }]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}-${var.environment}/xray"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "xray"
        }
      }
    }
  ])
}
```

### Step 5.2: Instrument Application

**Install X-Ray SDK:**

```bash
pnpm add aws-xray-sdk-core aws-xray-sdk-express
```

**Instrument in `main.ts`:**

```typescript
import * as AWSXRay from 'aws-xray-sdk-core';
import * as express from 'express';

// Capture AWS SDK
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

async function bootstrap() {
  const app = await NestFactory.create(IdentityModule);

  // Enable X-Ray for Express
  if (process.env.NODE_ENV === 'production') {
    app.use(AWSXRay.express.openSegment('IdentityService'));
  }

  await app.listen(3000);

  if (process.env.NODE_ENV === 'production') {
    app.use(AWSXRay.express.closeSegment());
  }
}
```

---

## Cost Optimization

### Free Tier Limits

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| **CloudWatch Logs** | 5 GB ingestion, 5 GB storage | $0.50/GB ingestion, $0.03/GB/month storage |
| **CloudWatch Metrics** | 10 custom metrics | $0.30/metric/month |
| **CloudWatch Alarms** | 10 alarms | $0.10/alarm/month |
| **CloudWatch Dashboards** | 3 dashboards | $3/dashboard/month |
| **AWS X-Ray** | 100,000 traces/month | $5/million traces |

### Cost Optimization Tips

**1. Optimize Log Retention:**
```hcl
# Development: 3-7 days
retention_in_days = 7

# Production: 30-90 days
retention_in_days = 30
```

**2. Use Log Sampling (X-Ray):**
```typescript
// Only trace 10% of requests
AWSXRay.middleware.setSamplingRules({
  "version": 2,
  "rules": [{
    "description": "Sample 10% of requests",
    "service_name": "*",
    "http_method": "*",
    "url_path": "*",
    "fixed_target": 1,
    "rate": 0.1
  }],
  "default": {
    "fixed_target": 1,
    "rate": 0.1
  }
});
```

**3. Filter Logs Before Sending:**
```typescript
// Only log errors and warnings in production
if (process.env.NODE_ENV === 'production' && level === 'debug') {
  return; // Skip debug logs
}
```

**4. Use Metric Filters Instead of Custom Metrics:**
```hcl
# Extract metrics from logs (free) instead of sending custom metrics ($0.30/metric)
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  # Parses logs to create metrics at no extra cost
}
```

---

## Monitoring Checklist

### Phase 1: Logs
- [ ] CloudWatch Log Groups created for each service
- [ ] Log retention configured (7 days for dev, 30+ for prod)
- [ ] ECS task definitions configured with awslogs driver
- [ ] CloudWatch Insights saved queries created
- [ ] Tested log viewing with AWS CLI

### Phase 2: Metrics
- [ ] Metric filters created for errors, 5xx, slow requests
- [ ] Custom application metrics implemented (optional)
- [ ] Metrics validated in CloudWatch console

### Phase 3: Alarms
- [ ] SNS topic created for alerts
- [ ] Email subscription confirmed
- [ ] Alarms created for:
  - [ ] High error rate
  - [ ] High 5xx rate
  - [ ] High latency
  - [ ] ECS service unhealthy
  - [ ] RDS high CPU
  - [ ] RDS low storage
- [ ] Test alarms triggered successfully

### Phase 4: Dashboards
- [ ] CloudWatch dashboard created
- [ ] Widgets added for:
  - [ ] Error rate
  - [ ] Response time
  - [ ] ECS health
  - [ ] RDS performance
  - [ ] Recent errors
- [ ] Dashboard shared with team

### Phase 5: X-Ray (Optional)
- [ ] X-Ray daemon added to ECS task definitions
- [ ] Application instrumented with X-Ray SDK
- [ ] Service map visible in X-Ray console
- [ ] Traces viewable for requests

---

## Quick Commands Reference

```bash
# View logs in real-time
aws logs tail /ecs/edtech-platform-dev/identity-service --follow

# Run CloudWatch Insights query
aws logs start-query \
  --log-group-name /ecs/edtech-platform-dev/identity-service \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, level, message | filter level = "error" | sort @timestamp desc'

# List all alarms
aws cloudwatch describe-alarms --alarm-names edtech-platform-dev-high-error-rate

# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace EdTech/IdentityService \
  --metric-name ErrorCount \
  --dimensions Name=Service,Value=identity-service \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --period 300 \
  --statistics Sum

# View X-Ray service map
aws xray get-service-graph --start-time $(date -u -d '1 hour ago' +%s) --end-time $(date -u +%s)
```

---

## Summary

### MVP Setup (Start Here)

**Time:** 2-3 hours
**Cost:** ~$5-10/month

1. ✅ CloudWatch Logs with 7-day retention
2. ✅ Basic metric filters (errors, 5xx)
3. ✅ 3-5 critical alarms (error rate, service health)
4. ✅ Email alerts via SNS

### Production Upgrade

**Time:** 1-2 days
**Cost:** ~$30-50/month

1. ✅ Increase log retention to 30-90 days
2. ✅ Add custom application metrics
3. ✅ Create CloudWatch dashboard
4. ✅ Add AWS X-Ray for distributed tracing
5. ✅ Slack integration for alerts

---

## Next Steps

1. **Add CloudWatch module to infrastructure** (Phase 1)
2. **Update ECS task definitions** with logging configuration
3. **Implement structured logging** in application code (see observability strategy docs)
4. **Create SNS topic and alarms** for critical metrics
5. **Test alarm notifications** by triggering errors
6. **Create CloudWatch dashboard** for visual monitoring
7. **(Optional) Add X-Ray** for distributed tracing

**Remember:** Start simple (logs + basic alarms), then add metrics and dashboards as you scale.
