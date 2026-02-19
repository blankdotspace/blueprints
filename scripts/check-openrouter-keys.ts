#!/usr/bin/env bun
/**
 * Script: check-openrouter-keys.ts
 * Description: Syncs OpenRouter key usage and limits to the Supabase database.
 */

import { OpenRouter } from '@openrouter/sdk';
import { createClient } from '@supabase/supabase-js';

const MANAGEMENT_KEY = process.env.OPENROUTER_MANAGEMENT_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MANAGEMENT_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables: OPENROUTER_MANAGEMENT_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const openRouter = new OpenRouter({
    apiKey: MANAGEMENT_KEY,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    try {
        console.log('🚀 Fetching keys from OpenRouter...');
        const orKeys = await openRouter.apiKeys.list();
        console.log(`✅ Found ${orKeys.data.length} keys on OpenRouter.`);

        // 1. Fetch matching managed keys from DB
        const { data: dbKeys, error: dbError } = await supabase
            .from('managed_provider_keys')
            .select('id, label')
            .eq('provider', 'openrouter');

        if (dbError) throw dbError;

        console.log(`📦 Found ${dbKeys.length} matching OpenRouter keys in Database.`);

        for (const dbKey of dbKeys) {
            const orKey = orKeys.data.find(k => k.name === dbKey.label);

            if (orKey) {
                console.log(`\nSyncing [${dbKey.label}]...`);

                // Update Limits
                const limit = orKey.limit || null;
                const { error: limitErr } = await supabase
                    .from('managed_provider_keys')
                    .update({ monthly_limit_usd: limit })
                    .eq('id', dbKey.id);

                if (limitErr) console.error(`Failed to update limits for ${dbKey.label}:`, limitErr.message);
                else console.log(`  - Monthly Limit: $${limit || 'Unlimited'}`);

                // Update Usage for Active Lease
                // OpenRouter SDK Key type doesn't explicitly expose 'usage' in list() usually, 
                // but we can try to find it or use the value provided by user in logic.
                // Actually 'usage' is often per-key in the get() call or list() if supported.
                // Assuming we use the value provided or if it's in orKey.

                const usage = (orKey as any).usage || 0;

                const { data: activeLease } = await supabase
                    .from('key_leases')
                    .select('id')
                    .eq('managed_key_id', dbKey.id)
                    .eq('status', 'active')
                    .single();

                if (activeLease) {
                    const { error: usageErr } = await supabase
                        .from('key_leases')
                        .update({ usage_usd: usage })
                        .eq('id', activeLease.id);

                    if (usageErr) console.error(`Failed to update usage for ${dbKey.label} lease:`, usageErr.message);
                    else console.log(`  - Usage Updated: $${usage}`);
                } else {
                    console.log(`  - No active lease found to update usage.`);
                }
            } else {
                console.log(`\n⚠️ Label [${dbKey.label}] not found in OpenRouter dashboard.`);
            }
        }

        console.log('\n✨ Synchronization complete!');

    } catch (error) {
        console.error('❌ Error during synchronization:', error);
    }
}

main();
