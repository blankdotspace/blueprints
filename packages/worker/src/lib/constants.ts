export const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 3;
export const RECONCILE_INTERVAL_MS = Number(process.env.RECONCILE_INTERVAL_MS) || 10000;
export const DOCKER_NETWORK_NAME = process.env.DOCKER_NETWORK_NAME || 'blueprints-network';
export const VPS_PUBLIC_IP = process.env.VPS_PUBLIC_IP || '127.0.0.1';
export const OPENCLAW_IMAGE = process.env.OPENCLAW_IMAGE || 'openclaw:local';
export const ELIZAOS_IMAGE_BASE = process.env.ELIZAOS_IMAGE_BASE || 'elizaos:local';
