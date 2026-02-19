#!/bin/bash

# Quick build script for OpenClaw with Pairing API

set -e

echo "🐳 Building OpenClaw with Pairing API..."

# Get registry from user
read -p "Enter your registry (e.g., ghcr.io/username or dockerhub-username): " REGISTRY

if [ -z "$REGISTRY" ]; then
  echo "❌ Registry cannot be empty"
  exit 1
fi

IMAGE_NAME="$REGISTRY/openclaw-with-api:latest"

echo "📦 Building image: $IMAGE_NAME"
docker build -f Dockerfile.openclaw -t $IMAGE_NAME .

echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "1. Push image: docker push $IMAGE_NAME"
echo "2. Update .env: OPENCLAW_IMAGE=\"$IMAGE_NAME\""
echo "3. Deploy to Railway"
echo ""
echo "Or test locally:"
echo "docker run -p 18789:18789 -p 18800:18800 $IMAGE_NAME"
