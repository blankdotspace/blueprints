import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';

// Load env from backend
dotenv.config({ path: path.resolve(process.cwd(), 'packages/backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const framework = process.argv[2]; // 'openclaw' or 'eliza'
    const version = process.argv[3];
    const status = process.argv[4] || 'success';
    const message = process.argv[5] || `Build for ${framework} ${version}`;

    if (!framework || !version) {
        console.log('Usage: bun run scripts/supabase-utils/sync-framework.ts <framework> <version> [status] [message]');
        return;
    }

    const runtimeName = `${framework}`;

    console.log(`🔄 Syncing ${runtimeName} to version ${version}...`);

    // 1. Update Runtimes table
    const { error: runtimeError } = await supabase
        .from('runtimes')
        .upsert({
            name: runtimeName,
            version: version,
            eliza_api_url: framework === 'elizaos' ? 'http://localhost:3000' : 'http://localhost:18789',
            auth_token: 'local-token'
        }, { onConflict: 'name' });

    if (runtimeError) {
        console.error('❌ Failed to update runtimes table:', runtimeError.message);
    } else {
        console.log('✅ Runtimes table updated.');
    }

    // 2. Log to Deployments table
    let commitHash = 'unknown';
    let branch = 'unknown';
    try {
        commitHash = execSync('git rev-parse HEAD').toString().trim();
        branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    } catch (e) {
        console.warn('⚠️  Could not determine git info for deployment log');
    }

    const { error: deployError } = await supabase
        .from('deployments')
        .insert({
            commit_hash: commitHash,
            branch: branch,
            status: status,
            message: message,
            finished_at: new Date().toISOString()
        });

    if (deployError) {
        console.error('❌ Failed to log deployment:', deployError.message);
    } else {
        console.log('✅ Deployment logged.');
    }
}

main();
