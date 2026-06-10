#!/bin/bash
# Deployment script for SURNA Sports Social Platform

set -e

# Configuration
ENVIRONMENT=${1:-staging}
REGISTRY="ghcr.io/surna/surna"
TAG=${2:-latest}

echo "🚀 Starting deployment to ${ENVIRONMENT} environment..."

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
  echo "❌ Error: Environment must be 'staging' or 'production'"
  exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running"
  exit 1
fi

# Check if required environment variables are set
if [ "$ENVIRONMENT" = "production" ]; then
  required_vars=(
    "DATABASE_URL"
    "SESSION_SECRET"
    "STRIPE_SECRET_KEY"
    "VITE_STRIPE_PUBLIC_KEY"
  )
  
  for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
      echo "❌ Error: Required environment variable $var is not set"
      exit 1
    fi
  done
fi

# Create backup before deployment (production only)
if [ "$ENVIRONMENT" = "production" ]; then
  echo "📦 Creating database backup..."
  docker-compose -f docker-compose.production.yml exec -T backup /backup.sh
fi

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker pull "${REGISTRY}:${TAG}"

# Stop current containers gracefully
echo "⏹️  Stopping current containers..."
docker-compose -f "docker-compose.${ENVIRONMENT}.yml" down --remove-orphans

# Start new containers
echo "▶️  Starting new containers..."
docker-compose -f "docker-compose.${ENVIRONMENT}.yml" up -d

# Wait for services to be healthy
echo "🔍 Waiting for services to be healthy..."
sleep 30

# Run health checks
echo "🏥 Running health checks..."
for i in {1..30}; do
  if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Health check passed"
    break
  fi
  
  if [ $i -eq 30 ]; then
    echo "❌ Health check failed after 30 attempts"
    
    # Show container logs for debugging
    echo "📋 Container logs:"
    docker-compose -f "docker-compose.${ENVIRONMENT}.yml" logs --tail=50
    
    # Rollback if production
    if [ "$ENVIRONMENT" = "production" ]; then
      echo "🔄 Rolling back deployment..."
      docker-compose -f "docker-compose.${ENVIRONMENT}.yml" down
      # You would restore from backup here
    fi
    
    exit 1
  fi
  
  echo "⏳ Waiting for health check... ($i/30)"
  sleep 10
done

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f "docker-compose.${ENVIRONMENT}.yml" exec -T app npm run db:push

# Run smoke tests
echo "🧪 Running smoke tests..."
if ! curl -f http://localhost/api/health > /dev/null 2>&1; then
  echo "❌ API health check failed"
  exit 1
fi

# Clear application caches
echo "🧹 Clearing application caches..."
docker-compose -f "docker-compose.${ENVIRONMENT}.yml" exec -T redis redis-cli FLUSHALL

# Send deployment notification
if [ -n "$SLACK_WEBHOOK" ]; then
  echo "📢 Sending deployment notification..."
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚀 SURNA successfully deployed to ${ENVIRONMENT} environment with tag ${TAG}\"}" \
    "$SLACK_WEBHOOK"
fi

echo "✅ Deployment to ${ENVIRONMENT} completed successfully!"

# Show running containers
echo "📊 Running containers:"
docker-compose -f "docker-compose.${ENVIRONMENT}.yml" ps

# Show useful URLs
echo ""
echo "🔗 Useful URLs:"
echo "   Application: https://surna.app"
echo "   Monitoring: https://surna.app:3001"
echo "   Logs: https://surna.app:5601"
echo ""