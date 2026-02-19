import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LeaseStatus } from '@eliza-manager/shared';
import { OpenRouter } from '@openrouter/sdk';

let supabase: SupabaseClient;

function getSupabase(): SupabaseClient {
    if (!supabase) {
        supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return supabase;
}

const CRON_INTERVAL_MS = 60 * 1000; // 60 seconds
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let leaseIntervalId: ReturnType<typeof setInterval> | null = null;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Expire stale leases and stop their attached agents.
 */
async function expireLeases(): Promise<void> {
    const sb = getSupabase();

    try {
        // 1. Find active leases that have expired
        const { data: expiredLeases, error } = await sb
            .from('key_leases')
            .select('id')
            .eq('status', LeaseStatus.ACTIVE)
            .lt('expires_at', new Date().toISOString());

        if (error) {
            console.error('[lease-cron] Error querying expired leases:', error.message);
            return;
        }

        if (!expiredLeases?.length) return;

        const leaseIds = expiredLeases.map((l: any) => l.id);

        // 2. Mark them expired
        const { error: updateError } = await sb
            .from('key_leases')
            .update({ status: LeaseStatus.EXPIRED })
            .in('id', leaseIds);

        if (updateError) {
            console.error('[lease-cron] Error expiring leases:', updateError.message);
            return;
        }

        console.log(`[lease-cron] Expired ${leaseIds.length} lease(s): ${leaseIds.join(', ')}`);

        // 3. Find agents using these leases and stop them
        for (const leaseId of leaseIds) {
            const { data: agents } = await sb
                .from('agent_desired_state')
                .select('agent_id')
                .contains('metadata', { lease_id: leaseId })
                .eq('enabled', true);

            if (agents?.length) {
                for (const agent of agents) {
                    console.log(`[lease-cron] Stopping agent ${agent.agent_id} (lease ${leaseId} expired)`);

                    await sb
                        .from('agent_actual_state')
                        .upsert({
                            agent_id: agent.agent_id,
                            status: 'error',
                            error_message: 'Shared API key lease has expired. Agent stopped automatically.',
                            updated_at: new Date().toISOString(),
                        });

                    await sb
                        .from('agent_desired_state')
                        .update({ enabled: false, updated_at: new Date().toISOString() })
                        .eq('agent_id', agent.agent_id);
                }
            }
        }
    } catch (err) {
        console.error('[lease-cron] Unexpected error:', err);
    }
}

/**
 * Synchronize OpenRouter key usage and limits.
 */
async function syncOpenRouterUsage(): Promise<void> {
    const MANAGEMENT_KEY = process.env.OPENROUTER_MANAGEMENT_KEY;
    if (!MANAGEMENT_KEY) {
        console.warn('[lease-cron] OPENROUTER_MANAGEMENT_KEY not set, skipping usage sync.');
        return;
    }

    const sb = getSupabase();
    const openRouter = new OpenRouter({ apiKey: MANAGEMENT_KEY });

    try {
        console.log('[lease-cron] Starting OpenRouter usage sync...');
        const orKeys = await openRouter.apiKeys.list();

        const { data: dbKeys, error: dbError } = await sb
            .from('managed_provider_keys')
            .select('id, label')
            .eq('provider', 'openrouter');

        if (dbError) throw dbError;

        for (const dbKey of dbKeys) {
            const orKey = orKeys.data.find(k => k.name === dbKey.label);
            if (!orKey) continue;

            // 1. Update Limits
            const limit = orKey.limit || null;
            await sb
                .from('managed_provider_keys')
                .update({ monthly_limit_usd: limit })
                .eq('id', dbKey.id);

            // 2. Update Usage for Active Lease
            const usage = (orKey as any).usage || 0;
            const { data: activeLease } = await sb
                .from('key_leases')
                .select('id')
                .eq('managed_key_id', dbKey.id)
                .eq('status', LeaseStatus.ACTIVE)
                .single();

            if (activeLease) {
                await sb
                    .from('key_leases')
                    .update({ usage_usd: usage })
                    .eq('id', activeLease.id);
            }
        }
        console.log('[lease-cron] OpenRouter usage sync completed.');
    } catch (err) {
        console.error('[lease-cron] Error syncing OpenRouter usage:', err);
    }
}

/**
 * Start the lease expiration cron job.
 */
export function startLeaseCron(): void {
    if (leaseIntervalId) return; // Already running

    console.log('[lease-cron] Starting lease expiration cron (every 60s)');
    leaseIntervalId = setInterval(expireLeases, CRON_INTERVAL_MS);

    console.log('[lease-cron] Starting OpenRouter usage sync cron (every 1h)');
    syncIntervalId = setInterval(syncOpenRouterUsage, SYNC_INTERVAL_MS);

    // Run once immediately
    expireLeases();
    syncOpenRouterUsage();
}

/**
 * Stop the lease expiration cron job.
 */
export function stopLeaseCron(): void {
    if (leaseIntervalId) {
        clearInterval(leaseIntervalId);
        leaseIntervalId = null;
        console.log('[lease-cron] Stopped lease expiration cron');
    }
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
        console.log('[lease-cron] Stopped OpenRouter sync cron');
    }
}
