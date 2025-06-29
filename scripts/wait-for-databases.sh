#!/bin/bash
# scripts/wait-for-databases.sh

wait_for_postgres() {
  local port=$1
  local service=$2
  local max_attempts=30
  local attempt=1
  
  echo "   🔄 Waiting for PostgreSQL ($service) on port $port..."
  while ! nc -z localhost $port; do
    if [ $attempt -eq $max_attempts ]; then
      echo "   ❌ PostgreSQL ($service) failed to start after $max_attempts attempts"
      exit 1
    fi
    echo "   ⏳ Attempt $attempt/$max_attempts - PostgreSQL ($service) not ready..."
    sleep 2
    ((attempt++))
  done
  echo "   ✅ PostgreSQL ($service) is ready!"
}

wait_for_service() {
  local host=$1
  local port=$2
  local service=$3
  local max_attempts=30
  local attempt=1
  
  echo "   🔄 Waiting for $service on $host:$port..."
  while ! nc -z $host $port; do
    if [ $attempt -eq $max_attempts ]; then
      echo "   ❌ $service failed to start after $max_attempts attempts"
      exit 1
    fi
    echo "   ⏳ Attempt $attempt/$max_attempts - $service not ready..."
    sleep 2
    ((attempt++))
  done
  echo "   ✅ $service is ready!"
}

# Wait for all PostgreSQL instances
wait_for_postgres 5432 "user-service"
wait_for_postgres 5433 "payment-service"
wait_for_postgres 5434 "reviews-service"
wait_for_postgres 5435 "learning-service"

# Wait for Redis
wait_for_service localhost 6379 "Redis"

# Wait for Neo4j
wait_for_service localhost 7687 "Neo4j"

echo "🎉 All databases are ready!" 