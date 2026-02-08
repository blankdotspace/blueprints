FROM oven/bun:1.1.0

WORKDIR /app

# Copy monorepo files needed for build
COPY package.json bun.lock ./
COPY packages ./packages

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y build-essential python3

# Install deps
RUN bun install

# Expose Fastify port
EXPOSE 3000

# Run backend
CMD ["bun", "packages/backend/src/app.ts"]
