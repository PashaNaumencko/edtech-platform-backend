#!/bin/bash
# scripts/dev-setup.sh

set -e  # Exit on any error

echo "🚀 Setting up EdTech Platform development environment..."

# Check prerequisites
echo "🔍 Checking prerequisites..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js 18+"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  echo "📦 Installing pnpm..."
  npm install -g pnpm
fi

if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Please install Docker"
  exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start databases first
echo "🗄️ Starting database containers..."
docker-compose up -d postgres-user postgres-payment postgres-reviews postgres-learning redis neo4j

# Wait for databases
echo "⏳ Waiting for databases to be ready..."
./scripts/wait-for-databases.sh

# Start LocalStack
echo "☁️ Starting LocalStack..."
docker-compose up -d localstack

# Initialize LocalStack
echo "🔧 Initializing LocalStack resources..."
./scripts/init-localstack.sh

# Build shared libraries
echo "🏗️ Building shared libraries..."
pnpm build:libs

echo "✅ Development environment ready!"
echo ""
echo "📝 Next steps:"
echo "  - Run 'pnpm start:dev' to start services in development mode"
echo "  - Visit http://localhost:4566 for LocalStack dashboard"
echo "  - Visit http://localhost:7474 for Neo4j Browser (user: neo4j, pass: tutormatching)"
echo "  - Check database connections with 'pnpm test:db-connections'" 