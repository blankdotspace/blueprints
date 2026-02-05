FROM oven/bun:1.1.0

WORKDIR /app

COPY package.json bun.lock ./
COPY packages ./packages

RUN bun install

CMD ["bun", "run", "--cwd", "packages/worker", "start"]
