#!/bin/bash
set -e

echo "🚀 Preparing ElizaOS image..."

TARGET_DIR="./external/elizaos"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

# Copy Docker assets
cp ./scripts/eliza.dockerfile "$TARGET_DIR/Dockerfile"
cp ./scripts/eliza.entrypoint.sh "$TARGET_DIR/entrypoint.sh"
chmod +x "$TARGET_DIR/entrypoint.sh"

echo "🐳 Building Docker image eliza:local..."
cd "$TARGET_DIR"
docker build -t eliza:local .

# Extract version from the built image
echo "🔍 Extracting ElizaOS version..."
ELIZA_VERSION=$(docker run --rm eliza:local elizaos --version | tr -d '\r' | head -n 1)
echo "Found version: $ELIZA_VERSION"

cd -

# Sync with database
echo "🔄 Updating database registry..."
bun run scripts/supabase-utils/sync-framework.ts eliza "$ELIZA_VERSION" success "Manual setup-eliza.sh build"

echo "✅ ElizaOS image is ready and registered!"
