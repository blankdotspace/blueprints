# Blueprints

**Blueprints** is the alpha version of an **Agents Launchpad**. While it currently starts with support for `elizaos`, the vision is to support multiple agent frameworks in the near future.

This monorepo manages the deployment, state, and configuration of these AI Agents.

## Project Structure

This project is organized as a monorepo with the following packages:

- **`packages/frontend`**: A [Next.js](https://nextjs.org/) application providing the UI for managing projects and agents.
  - **Tech Stack**: React, Tailwind CSS, Supabase
- **`packages/backend`**: A [Fastify](https://fastify.dev/) server providing the REST API.
  - **Tech Stack**: Fastify, Supabase
- **`packages/worker`**: A worker process for handling background tasks and state synchronization.
- **`packages/shared`**: Shared code, type definitions, and [Zod](https://zod.dev/) validation schemas used across the monorepo.
- **`external/`**: External dependencies and agent frameworks.

## Key Features

### 🖥️ Integrated Agent Terminal
Blueprints features a professional-grade terminal integrated directly into the agent's chat interface. This allows for:
- **Direct Container Control**: Execute shell commands directly inside the agent's isolated environment.
- **Dual Routing System**: Seamlessly toggle between **Chat Mode** (Natural Language) and **Terminal Mode** (Shell Commands).
- **Advanced Diagnostics**: Access logs, file systems, and environment variables without leaving the dashboard.
- **Slash Commands**: Power users can use the `/terminal <command>` prefix to trigger shell execution even while in Chat Mode.

## Prerequisites

- [Bun](https://bun.sh/) (Runtime & Package Manager)
- [Supabase](https://supabase.com/) (Database & Auth)

## Getting Started

1.  **Install dependencies:**

    ```bash
    bun install
    ```

2.  **Environment Setup:**

    Ensure you have the necessary environment variables set up for Supabase and other services. Check each package's directory for `env.sample` files if available.

    - The database schema is located in `schema.sql`.

## Running the Application

You can run each service individually using the following commands:

### Frontend

Start the Next.js development server:

```bash
bun run dev:frontend
# Runs: bun run --cwd packages/frontend dev
```

### Backend

Start the Fastify backend server:

```bash
bun run dev:backend
# Runs: bun run --cwd packages/backend dev
```

### Worker

Start the background worker process:

```bash
bun run dev:worker
# Runs: bun run --cwd packages/worker dev
```

## Building

To build all packages in the workspace:

```bash
bun run build
# Runs: bun run build --workspaces
```

## Linting

To run linting across all packages:

```bash
bun run lint
# Runs: bun run lint --workspaces
```
## Documentation

- [OpenClaw Integration Walkthrough](docs/openclaw-integration.md)
