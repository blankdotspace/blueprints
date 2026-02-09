FROM oven/bun:1.1.0

WORKDIR /app

COPY package.json bun.lock ./
COPY packages ./packages

# Install deps (skip optional native modules like cpu-features)
RUN bun install --ignore-scripts

CMD ["bun", "packages/worker/src/index.ts"]
