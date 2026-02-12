#!/bin/bash

set -e

echo "👷 Building worker docker image..."
docker compose up worker --build -d

echo "👷 Worker docker image built successfully!"
