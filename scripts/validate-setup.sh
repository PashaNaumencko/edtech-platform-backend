#!/bin/bash
# scripts/validate-setup.sh

echo "🔍 Validating development environment setup..."

# Test TypeScript compilation
echo "📝 Testing TypeScript compilation..."
if pnpm build:check; then
  echo "   ✅ TypeScript compilation successful"
else
  echo "   ❌ TypeScript compilation failed"
  exit 1
fi

# Test linting
echo "🧹 Testing ESLint..."
if pnpm lint:check; then
  echo "   ✅ ESLint validation successful"
else
  echo "   ❌ ESLint validation failed"
  exit 1
fi

# Test LocalStack services
echo "☁️ Testing LocalStack services..."
if curl -s http://localhost:4566/_localstack/health | grep -q "running"; then
  echo "   ✅ LocalStack services running"
else
  echo "   ❌ LocalStack services not running"
  exit 1
fi

# Test database connections
echo "🗄️ Testing database connections..."
echo "   🔍 Testing PostgreSQL connections..."
for port in 5432 5433 5434 5435; do
  if nc -z localhost $port; then
    echo "   ✅ PostgreSQL on port $port is accessible"
  else
    echo "   ❌ PostgreSQL on port $port is not accessible"
    exit 1
  fi
done

echo "   🔍 Testing Redis connection..."
if nc -z localhost 6379; then
  echo "   ✅ Redis is accessible"
else
  echo "   ❌ Redis is not accessible"
  exit 1
fi

echo "   🔍 Testing Neo4j connection..."
if nc -z localhost 7687; then
  echo "   ✅ Neo4j is accessible"
else
  echo "   ❌ Neo4j is not accessible"
  exit 1
fi

echo "🎉 All validations passed! Environment is ready for development." 