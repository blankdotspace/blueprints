import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { logger } from './lib/logger';
import { startMessageBus } from './message-bus';
import { startReconciler } from './reconciler';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.');
    process.exit(1);
}

// Global process handling for clean exits
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Cleaning up...');
    process.exit(0);
});

startReconciler();
startMessageBus();
// Note: State listener logic is now integrated into reconciler or remains as a separate concern.
// However, the original startStateListener was in index.ts. Let's keep it if reconciler doesn't have it.
// Actually, I'll move startStateListener to reconciler.ts for a truly modular worker.
