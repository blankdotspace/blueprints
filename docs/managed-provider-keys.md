# Managed Provider Keys (MPK) Architecture

The Managed Provider Keys (MPK) system enables the Blueprints platform to provide temporary, pool-based API key access to users. This system co-exists with the traditional Bring Your Own Key (BYOK) model.

## Core Concepts

### 1. Managed Keys
Admins can register API keys (e.g., OpenRouter, Venice) into a central pool. These keys are:
- **Encrypted at rest** using AES-256 via the `cryptoUtils` shared library.
- **Configurable**: Each key can have its own provider, base URL, and default model configuration.
- **Quota Managed**: Admins can set daily and monthly USD limits per key to prevent abuse or unexpected costs.

### 2. Key Leases
When a user selects the "Blueprint (Shared)" provider during agent setup, the system grants them a **Lease**.
- **Least-Used Selection**: The backend automatically selects the managed key with the fewest active leases to ensure load balancing.
- **Time-Limited**: Leases are valid for a fixed duration (e.g., 2 days for Free users).
- **Tier-Aware**: Lease durations and agent limits are tied to the user's tier (FREE, PRO, ENTERPRISE).

## Technical Implementation

### Database Schema
The system uses two primary tables in Supabase:
- `managed_provider_keys`: Stores the registry of shared keys and their configurations.
- `key_leases`: Tracks user access to specific managed keys.

### Lease Lifecycle
1. **Grant**: User requests a lease via `POST /managed-keys/lease`.
2. **Resolution**: The worker's `LeaseResolver` validates the lease status before every agent start.
3. **Synchronization**: The worker injects the managed key and model configuration into the agent's environment at runtime.
4. **Revocation/Expiration**:
   - Admins can manually revoke leases.
   - The `lease-cron` job run by the worker automatically identifies and expires leases that have passed their `expires_at` date.
   - When a lease expires, the associated agent is automatically stopped and its configuration is cleared.

## Admin Management

Admins can manage the MPK system via the **Admin Dashboard**:
- **Key Registry**: Add, update, or disable managed keys.
- **Lease Monitoring**: View all active and historic leases, including usage stats and last-used timestamps.
- **Manual Control**: Extend or revoke user leases directly from the UI.

## Framework Support
MPK is designed to be framework-agnostic. While initially optimized for **OpenClaw**, it supports configuration overrides for other frameworks (like Eliza) via the `config.frameworks` field in the managed key record.
