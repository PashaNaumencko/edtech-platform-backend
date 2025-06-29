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

# Notification Service - Notifications table
aws dynamodb create-table \
  --endpoint-url=http://localhost:4566 \
  --table-name Notifications \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Analytics Service - Events table
aws dynamodb create-table \
  --endpoint-url=http://localhost:4566 \
  --table-name AnalyticsEvents \
  --attribute-definitions \
    AttributeName=eventId,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=eventId,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Tutor Matching Service - TutorProfiles table
aws dynamodb create-table \
  --endpoint-url=http://localhost:4566 \
  --table-name TutorProfiles \
  --attribute-definitions AttributeName=tutorId,AttributeType=S \
  --key-schema AttributeName=tutorId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create S3 buckets
echo "🪣 Creating S3 buckets..."
aws s3 mb s3://edtech-content-dev --endpoint-url=http://localhost:4566
aws s3 mb s3://edtech-uploads-dev --endpoint-url=http://localhost:4566
aws s3 mb s3://edtech-media-dev --endpoint-url=http://localhost:4566

# Create EventBridge custom event bus
echo "🚌 Creating EventBridge custom event bus..."
aws events create-event-bus \
  --endpoint-url=http://localhost:4566 \
  --name edtech-platform-events

echo "✅ LocalStack initialization complete!" 