# Step 6: Go-Live Checklist

**Objective**: A final checklist to ensure all steps have been completed before making the platform public.

## Pre-Launch (1 week before)

-   [ ] **Configuration Freeze**: No new features or major changes are allowed. Only critical bug fixes are deployed.
-   [ ] **Final Security Review**:
    -   [ ] All findings from the penetration test have been remediated.
    -   [ ] All secrets have been moved to AWS Secrets Manager.
-   [ ] **Final Performance Test**:
    -   [ ] Run the full load test suite one last time against the production-like environment.
-   [ ] **Data Migration Plan**:
    -   [ ] Finalize the script for any data migrations needed (e.g., seeding initial data).
    -   [ ] Rehearse the data migration script on the staging environment.
-   [ ] **DNS & Domain Setup**:
    -   [ ] The production domain name is registered in Route 53.
    -   [ ] The TTL (Time to Live) for the current DNS records is lowered to a small value (e.g., 60 seconds) to allow for a quick cutover.
-   [ ] **Communication Plan**:
    -   [ ] Prepare announcements for the launch (social media, email list, etc.).
    -   [ ] Prepare a "war room" communication channel (e.g., Slack or Teams) for the launch day team.

## Launch Day

-   [ ] **Team Assembled**: All key personnel (dev, ops, QA) are present in the war room.
-   [ ] **Monitoring Up**: The main CloudWatch monitoring dashboard is open and visible to the entire team.
-   [ ] **Execute Data Migration**:
    -   [ ] Run the final data migration scripts against the production databases.
-   [ ] **Final Deployment**:
    -   [ ] Deploy the latest `main` branch code to all production services.
-   [ ] **DNS Cutover**:
    -   [ ] **This is the "Go Live" moment.**
    -   [ ] Update the DNS A-record in Route 53 to point the public domain name to the production CloudFront distribution / ALB.
-   [ ] **Smoke Testing**:
    -   [ ] The QA team immediately begins smoke testing the live production site.
    -   [ ] Key user flows to test:
        -   [ ] User registration and login.
        -   [ ] Tutor profile creation.
        -   [ ] Search for a tutor.
        -   [ ] Book and pay for a session (using a real credit card with a small amount).
-   [ ] **Monitor System Health**:
    -   [ ] The entire team watches the monitoring dashboards and log streams for any anomalies or errors.
    -   [ ] Stay in the war room for at least 2-3 hours post-launch to ensure stability.

## Post-Launch

-   [ ] **Communicate Launch**: Send out the public announcements.
-   [ ] **Triage Feedback**: Monitor incoming user feedback and bug reports.
-   [ ] **Review & Retrospective**:
    -   [ ] A few days after the launch, hold a retrospective meeting to discuss what went well and what could be improved for future launches.
