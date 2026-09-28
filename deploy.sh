#!/bin/bash
set -e

echo "🔄 Pulling latest code..."
git pull origin main

echo "🏗️  Building and restarting containers..."
docker compose -f docker-compose.prod.yml up --build --force-recreate -d

echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment complete!"
