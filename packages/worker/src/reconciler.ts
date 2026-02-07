import { supabase } from './lib/supabase';
import { logger } from './lib/logger';
import { docker } from './lib/docker';
import { getConfigHash, getAgentContainerName } from './lib/utils';
import { startOpenClawAgent, stopOpenClawAgent } from './handlers/openclaw';
import { startElizaAgent, stopElizaAgent } from './handlers/eliza';
import { RECONCILE_INTERVAL_MS } from './lib/constants';

let isReconciling = false;
const configHashes = new Map<string, string>();

export async function reconcile() {
    if (isReconciling) return;
    isReconciling = true;

    try {
        const { data: agents, error } = await supabase
            .from('agents')
            .select(`
                id,
                name,
                framework,
                agent_desired_state (
                    enabled,
                    config,
                    purge_at
                ),
                agent_actual_state (
                    status,
                    runtime_id
                ),
                project_id
            `) as any;

        if (error) {
            logger.error('Error fetching agents:', error);
            return;
        }

        const now = new Date();
        const dockerContainers = await docker.listContainers();
        const runningContainers = new Set(dockerContainers
            .filter((c: any) => (c.State || '').toLowerCase() === 'running')
            .map((c: any) => c.Names[0].replace('/', ''))
        );

        for (const agent of agents) {
            const desired = agent.agent_desired_state;
            const actual = agent.agent_actual_state;

            if (!desired || !actual) continue;

            let isRunning = actual.status === 'running';
            const shouldBeRunning = desired.enabled;

            // Verify Docker state for OpenClaw/Eliza agents
            const containerName = getAgentContainerName(agent.id);
            const containerIsReallyRunning = runningContainers.has(containerName);

            if (isRunning && !containerIsReallyRunning) {
                logger.warn(`Agent ${agent.id} marked as running in DB but container is missing/stopped. Syncing...`);
                await supabase.from('agent_actual_state').upsert({
                    agent_id: agent.id,
                    status: 'stopped',
                    endpoint_url: null,
                    last_sync: new Date().toISOString()
                });
                isRunning = false;
            }

            // Purge Logic
            if (desired.purge_at && now >= new Date(desired.purge_at)) {
                logger.info(`[TERMINATE] Executing final deletion for agent ${agent.id}...`);
                if (agent.framework === 'openclaw') await stopOpenClawAgent(agent.id);
                else await stopElizaAgent(agent.id);

                await supabase.from('agents').delete().eq('id', agent.id);
                continue;
            }

            const currentHash = getConfigHash(desired.config);
            const lastHash = configHashes.get(agent.id);
            const configChanged = lastHash && lastHash !== currentHash;

            if (shouldBeRunning && (!isRunning || configChanged)) {
                if (configChanged && isRunning) {
                    logger.info(`Config changed for agent ${agent.id}. Restarting...`);
                    if (agent.framework === 'openclaw') await stopOpenClawAgent(agent.id);
                    else await stopElizaAgent(agent.id);
                }

                if (agent.framework === 'openclaw') {
                    await startOpenClawAgent(agent.id, desired.config);
                } else {
                    await startElizaAgent(agent.id, desired.config);
                }
                configHashes.set(agent.id, currentHash);
            } else if (!shouldBeRunning && isRunning) {
                if (agent.framework === 'openclaw') await stopOpenClawAgent(agent.id);
                else await stopElizaAgent(agent.id);
                configHashes.delete(agent.id);
            } else if (shouldBeRunning && isRunning && !lastHash) {
                configHashes.set(agent.id, currentHash);
            }
        }
    } catch (err: any) {
        logger.error('Reconciliation error:', err.message);
    } finally {
        isReconciling = false;
    }
}

export function startReconciler() {
    logger.info(`Starting Reconciler (Interval: ${RECONCILE_INTERVAL_MS}ms)...`);
    setInterval(reconcile, RECONCILE_INTERVAL_MS);
    // Initial run
    reconcile();
}
