# Terraform - Local Development Environment

This Terraform configuration creates AWS resources needed for local development.

## Resources Created

- **AWS Cognito User Pool**: Real Cognito for authentication (free tier)
- **SSM Parameters**: Store Cognito credentials for easy retrieval

## Why Real AWS for Local Development?

1. **No LocalStack limitations**: Real AWS behavior, no mocking issues
2. **Free Tier**: Cognito is free for up to 50,000 monthly active users
3. **Same code**: Use identical code for local dev and production
4. **Easy testing**: Test real OAuth flows, email verification, etc.

## Prerequisites

1. AWS CLI configured with credentials:
   ```bash
   aws configure
   ```

2. Terraform installed (>= 1.6.0):
   ```bash
   terraform version
   ```

## Usage

### 1. Initialize Terraform

```bash
cd terraform/environments/local
terraform init
```

### 2. Plan Changes

```bash
terraform plan
```

### 3. Apply Configuration

```bash
terraform apply
```

When prompted, type `yes` to create the resources.

### 4. Get Cognito Credentials

After `terraform apply` completes, you'll see outputs:

```bash
terraform output
```

Copy the values to your `.env.local` file:

```bash
# Copy the env_file_template output
terraform output -raw env_file_template >> ../../.env.local
```

Or manually copy from terraform output:
```bash
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1
```

### 5. Start Local Development

```bash
cd ../../..
docker-compose up postgres redis
pnpm run start:identity
```

## Costs

**Monthly Cost: $0** (within free tier)

- Cognito: Free for up to 50,000 MAU
- SSM Parameters: Free for standard parameters

## Cleanup

To destroy resources when done:

```bash
terraform destroy
```

**Warning**: This will delete your Cognito User Pool and all users!

## Troubleshooting

### Issue: "Error creating Cognito User Pool"

**Solution**: Check AWS credentials:
```bash
aws sts get-caller-identity
```

### Issue: "Region not available"

**Solution**: Change region in `variables.tf` or pass via command:
```bash
terraform apply -var="aws_region=us-west-2"
```

### Issue: "Access Denied"

**Solution**: Ensure your AWS user has Cognito permissions:
- `cognito-idp:CreateUserPool`
- `cognito-idp:CreateUserPoolClient`
- `ssm:PutParameter`

## Next Steps

1. ✅ Terraform apply completed
2. ✅ Copied Cognito credentials to `.env.local`
3. 🔜 Implement @edtech/auth library (when needed)
4. 🔜 Start developing Identity Service locally
