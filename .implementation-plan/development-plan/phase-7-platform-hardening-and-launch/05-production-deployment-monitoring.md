# Step 5: Monitoring & Alerting

**Objective**: To gain deep visibility into the health and performance of the production system and be notified proactively of issues.

We will primarily use **Amazon CloudWatch**.

## 1. Monitoring Dashboards

-   **[ ] Create a Main CloudWatch Dashboard**:
    -   **Global Metrics**:
        -   AppSync/GraphQL API: 4xx/5xx error rates, latency, request count.
        -   ALB: Healthy/unhealthy host count, target connection errors.
    -   **Per-Service Widgets**: For each microservice, create a widget showing:
        -   ECS Service: CPU and Memory Utilization (average and maximum).
        -   ECS Tasks: Running task count vs. desired count.
        -   RDS Database: CPU Utilization, DB Connections, Freeable Memory.

## 2. Key Alarms to Configure

Create CloudWatch Alarms for the following conditions. Alarms should trigger notifications to an **SNS topic** which, in turn, can send emails or post messages to a Slack channel.

### Critical (Wake-up-the-on-call-engineer) Alarms

-   **[ ] API 5xx Error Rate**:
    -   **Metric**: AppSync `5XXError` (or ALB `HTTPCode_Target_5XX_Count`).
    -   **Threshold**: `> 1%` over a 5-minute period.
-   **[ ] Unhealthy Host Count**:
    -   **Metric**: ALB `UnHealthyHostCount`.
    -   **Threshold**: `> 0` for 3 consecutive minutes.
-   **[ ] Database CPU High**:
    -   **Metric**: RDS `CPUUtilization`.
    -   **Threshold**: `> 90%` for 15 minutes.
-   **[ ] ECS Service Not at Desired Count**:
    -   **Metric**: ECS `RunningTaskCount` vs `DesiredTaskCount`.
    -   **Logic**: Create an alarm if `RunningTaskCount` is less than `DesiredTaskCount` for more than 10 minutes.

### Warning (Investigate-when-possible) Alarms

-   **[ ] API Latency High**:
    -   **Metric**: AppSync `Latency` (p95).
    -   **Threshold**: `> 1000ms` over a 10-minute period.
-   **[ ] Database Connections High**:
    -   **Metric**: RDS `DatabaseConnections`.
    -   **Threshold**: `> 80%` of the maximum allowed connections.
-   **[ ] ECS CPU High (Pre-scaling)**:
    -   **Metric**: ECS Service `CPUUtilization`.
    -   **Threshold**: `> 60%` (This is a warning before the auto-scaling trigger at 75%).

## 3. Centralized Logging

-   **[ ] Configure Centralized Logging**:
    -   Ensure all ECS tasks are configured with the `awslogs` log driver.
    -   All application and system logs will be sent to **CloudWatch Logs**.
-   **[ ] Log Insights Queries**:
    -   Prepare and save a library of common CloudWatch Log Insights queries to quickly debug issues.
    -   Example: `fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc`
    -   Example: `fields @timestamp, @message | filter metadata.correlationId = "some-id-to-trace"`
