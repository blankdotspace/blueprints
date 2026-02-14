#!/bin/bash

# WARNING:
# This script is for FIRST VPS SETUP ONLY.
# Not used in production runtime.

set -e

PICOCLAW_REPO="https://github.com/sipeed/picoclaw.git"
PICOCLAW_BRANCH="main"
TARGET_DIR="./external/picoclaw"
DOCKERFILE="./scripts/picoclaw.dockerfile"

echo "🚀 Setting up PicoClaw Framework..."

# 1. Clean up existing target
if [ -d "$TARGET_DIR" ]; then
    echo "⚠️ Removing existing PicoClaw source directory..."
    rm -rf "$TARGET_DIR"
fi

# 2. Clone PicoClaw
echo "📥 Cloning PicoClaw ($PICOCLAW_BRANCH)..."
git clone --depth 1 -b $PICOCLAW_BRANCH $PICOCLAW_REPO "$TARGET_DIR"

# 3. Build Docker Image
echo "🐳 Building Docker image picoclaw:local..."
# Copy Dockerfile to target directory for build context
cp "$DOCKERFILE" "$TARGET_DIR/Dockerfile"

cd "$TARGET_DIR"
docker build -t picoclaw:local .

# Extract version (naive approach or check binary)
echo "🔍 Extracting PicoClaw version..."
# Assuming we can run --version, if not we fall back to short commit or '0.0.1'
PICOCLAW_VERSION=$(docker run --rm picoclaw:local picoclaw --version 2>/dev/null || echo "0.1.0-dev")
echo "Found version: $PICOCLAW_VERSION"

# 4. Sync with database
echo "🔄 Updating database registry..."
cd ../..
bun run scripts/supabase-utils/sync-framework.ts picoclaw "$PICOCLAW_VERSION" success "Modular setup-frameworks build"

# 5. Clean up
echo "🧹 Cleaning up..."
rm -rf "$TARGET_DIR"

echo "✅ PicoClaw image is ready and registered!"
