#!/bin/bash
set -e

echo "🚀 Preparing ElizaOS image..."

TARGET_DIR="./packages/worker/elizaos"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

# Copy Docker assets
cp ../../../scripts/eliza.dockerfile Dockerfile
cp ../../../scripts/entrypoint.sh entrypoint.sh
chmod +x entrypoint.sh

echo "🐳 Building Docker image eliza:local..."
docker build -t eliza:local .

echo "✅ ElizaOS image is ready!"
