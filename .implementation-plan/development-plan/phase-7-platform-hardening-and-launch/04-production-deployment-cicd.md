# Step 4: Production CI/CD Pipeline

**Objective**: To create a fully automated, zero-downtime pipeline for deploying services to production.

We will use **GitHub Actions** for this pipeline. The pipeline will have separate workflows for each microservice.

## Production Deployment Workflow (`deploy-production.yml`)

This workflow triggers on a merge to the `main` branch or a manual dispatch.

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  # This job determines which services have changed since the last deployment
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v3
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            user-service:
              - 'apps/user-service/**'
            payment-service:
              - 'apps/payment-service/**'
            # ... one filter for each service

  # A dynamic matrix of jobs, one for each changed service
  deploy-service:
    needs: detect-changes
    if: ${{ needs.detect-changes.outputs.services != '[]' }}
    strategy:
      matrix:
        service: ${{ fromJson(needs.detect-changes.outputs.services) }}
    
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.PROD_AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.PROD_AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push image to ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/${{ matrix.service }}:$IMAGE_TAG -f apps/${{ matrix.service }}/Dockerfile .
          docker push $ECR_REGISTRY/${{ matrix.service }}:$IMAGE_TAG

      - name: Deploy to ECS with Zero Downtime
        run: |
          # This step uses the AWS CLI to update the ECS service.
          # The key is to deploy the new task definition, which ECS will
          # then handle with a rolling update, ensuring zero downtime.
          aws ecs update-service --cluster prod-cluster --service ${{ matrix.service }}-service --task-definition ... --force-new-deployment
```

### Key Pipeline Stages

1.  **Lint & Test**: Before any deployment, run all linting and unit/integration tests.
2.  **Detect Changes**: The pipeline should be smart enough to only build and deploy services that have actually changed.
3.  **Build & Push Docker Image**: Build the Docker image for the service and push it to the production ECR repository.
4.  **Deploy to ECS**: Update the ECS service to use the new Docker image tag. ECS's rolling update deployment strategy will:
    -   Start a new task with the new image.
    -   Wait for it to become healthy.
    -   Drain and stop an old task.
    -   Repeat until all tasks are running the new version.
    This ensures zero downtime for the service.
