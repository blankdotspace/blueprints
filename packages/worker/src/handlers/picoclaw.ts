
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../lib/logger';
import { docker } from '../lib/docker';
import { getAgentContainerName } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { UserTier, SecurityLevel, resolveSecurityLevel } from '@eliza-manager/shared';
import { mkdirSync } from 'fs';
const PICOCLAW_IMAGE = 'picoclaw:local';

function ensureAgentDirectorySync(agentId: string) {
    const agentsDataContainerPath = process.env.AGENTS_DATA_CONTAINER_PATH || './workspaces';

    // Resolve absolute path
    const absolutePath = path.isAbsolute(agentsDataContainerPath)
        ? agentsDataContainerPath
        : path.resolve(process.cwd(), agentsDataContainerPath);

    const agentDir = path.join(absolutePath, agentId, 'home', '.picoclaw');

    // Create directory
    mkdirSync(agentDir, { recursive: true });

    // Ensure workspace exists
    mkdirSync(path.join(agentDir, 'workspace'), { recursive: true });

    return agentDir;
}

export async function startPicoClawAgent(
    agentId: string,
    config: any,
    metadata: any = {},
    forceRestart = false
) {
    try {
        await supabase.from('agent_actual_state').upsert({
            agent_id: agentId,
            status: 'starting',
            last_sync: new Date().toISOString()
        });

        const containerName = getAgentContainerName(agentId, 'picoclaw');
        const agentDir = ensureAgentDirectorySync(agentId);

        // 1. Prepare Config
        let picoConfig: any;

        if (config.agents && config.providers) {
            // Assume full nested config (new schema)
            picoConfig = { ...config };

            // Enforce workspace path override
            if (!picoConfig.agents) picoConfig.agents = {};
            if (!picoConfig.agents.defaults) picoConfig.agents.defaults = {};

            picoConfig.agents.defaults.workspace = "/agent-home/.picoclaw/workspace";
            picoConfig.agents.defaults.restrict_to_workspace = true;

        } else {
            // Legacy/Flat config fallback
            picoConfig = {
                agents: {
                    defaults: {
                        workspace: "/agent-home/.picoclaw/workspace",
                        restrict_to_workspace: true,
                        model: config.model || "openrouter/auto",
                        ...config
                    }
                },
                providers: config.providers || {},
                tools: config.tools || {}
            };
        }

        // Ensure the agent (running as 1000:1000) can write to these volumes
        try {
            const { execSync } = require('child_process');
            execSync(`chown -R 1000:1000 "${agentDir}"`);
        } catch (e: any) {
            logger.warn(`Failed to chown agent directory ${agentDir}: ${e.message}`);
        }

        const configPath = path.join(agentDir, 'config.json');
        await fs.writeFile(configPath, JSON.stringify(picoConfig, null, 2));

        // Write identity/metadata if needed
        if (metadata.character) {
            await fs.writeFile(
                path.join(agentDir, 'IDENTITY.md'),
                JSON.stringify(metadata.character, null, 2)
            );
        }

        // 2. Check if container exists
        const existing = await docker.listContainers(); // Logic in docker.ts enforces all=true
        const container = existing.find((c: any) => c.Names.includes(`/${containerName}`));

        if (container) {
            if (container.State === 'running' && !forceRestart) {
                await supabase.from('agent_actual_state').upsert({
                    agent_id: agentId,
                    status: 'running',
                    last_sync: new Date().toISOString()
                });
                return; // Already running
            }
            // Stop and remove if forcing restart or stopped
            await stopPicoClawAgent(agentId);
        }

        // 3. Start Container
        logger.info(`Starting PicoClaw agent ${agentId}...`);

        const { data } = await supabase
            .from('agents')
            .select(`projects ( tier )`)
            .eq('id', agentId)
            .single();

        const userTier = (data?.projects as any)?.tier ?? UserTier.FREE;
        const requestedLevel = metadata?.security_level || SecurityLevel.STANDARD;
        const effectiveLevel = resolveSecurityLevel(userTier, requestedLevel);

        let capAdd: string[] = [];
        let readonlyRoot = true;
        let user = '1000:1000'; // Default non-root user

        switch (effectiveLevel) {
            case SecurityLevel.STANDARD:
                readonlyRoot = true;
                capAdd = [];
                break;

            case SecurityLevel.PRO:
                readonlyRoot = true;
                capAdd = ['SYS_ADMIN'];
                break;

            case SecurityLevel.ADVANCED:
                readonlyRoot = false; // Allow writing to root if needed (though discouraged)
                capAdd = ['SYS_ADMIN', 'NET_ADMIN'];
                break;

            case SecurityLevel.ROOT:
                readonlyRoot = false;
                capAdd = ['SYS_ADMIN', 'NET_ADMIN'];
                user = 'root'; // Explicitly run as root if requested and allowed
                break;
        }

        // Ensure image exists
        try {
            await docker.inspectImage(PICOCLAW_IMAGE);
        } catch {
            logger.warn(`Image ${PICOCLAW_IMAGE} not found.`);
            // Attempting pull/build logic would go here, assuming pre-built for now
        }

        const createdContainer = await docker.createContainer({
            Image: PICOCLAW_IMAGE,
            name: containerName,
            Env: [
                `PICOCLAW_HOME=/agent-home/.picoclaw`,
                `AGENT_ID=${agentId}`,
                `HOME=/agent-home`
            ],
            HostConfig: {
                Binds: [
                    `${path.join(agentDir, 'config.json')}:/agent-home/.picoclaw/config.json`,
                    `${path.join(agentDir, 'workspace')}:/agent-home/.picoclaw/workspace`,
                    // Mount home for persistence if needed, but above mounts cover config/workspace
                    // For full persistence we might want `${agentDir}:/agent-home/.picoclaw`
                ],
                NetworkMode: 'blueprints-network',
                RestartPolicy: { Name: 'unless-stopped' },

                CapAdd: capAdd,
                CapDrop: effectiveLevel === SecurityLevel.STANDARD ? ['ALL'] : undefined,

                ReadonlyRootfs: readonlyRoot,
                User: user,

                SecurityOpt: effectiveLevel === SecurityLevel.STANDARD
                    ? ['no-new-privileges']
                    : undefined,

                Tmpfs: effectiveLevel === SecurityLevel.STANDARD
                    ? { '/tmp': 'rw,noexec,nosuid,size=64m' }
                    : undefined
            },
            Cmd: ['picoclaw', 'gateway'] // Running in gateway mode
        });

        await createdContainer.start();

        // Detect version from container
        let detectedVersion = 'unknown';
        try {
            // Wait a moment for the container to be ready
            await new Promise(r => setTimeout(r, 2000));

            const execInfo = await docker.createExec(containerName, {
                Cmd: ['picoclaw', '--version'],
                AttachStdout: true,
                AttachStderr: true,
                Tty: true
            });
            const output = await docker.startExec(execInfo.Id, { Detach: false, Tty: true });

            // Output example: "🦞 picoclaw dev (git: dev)\n  Build: 2026-02-14T18:06:10+0000\n  Go: go1.26.0"
            const outputStr = typeof output === 'string' ? output : JSON.stringify(output);

            // Extract date from "Build: YYYY-MM-DDT..." line
            const buildMatch = outputStr.match(/Build:\s*(\d{4}-\d{2}-\d{2})/);
            detectedVersion = buildMatch ? buildMatch[1] : 'unknown';

            logger.info(`Detected PicoClaw version ${detectedVersion} for agent ${agentId}`);
        } catch (vErr: any) {
            logger.warn(`Could not detect version for PicoClaw agent ${agentId}: ${vErr.message}`);
        }

        await supabase.from('agent_actual_state').upsert({
            agent_id: agentId,
            status: 'running',
            last_sync: new Date().toISOString(),
            error_message: null,
            version: detectedVersion
        });

        logger.info(`PicoClaw agent ${agentId} started.`);

    } catch (error: any) {
        logger.error(`Failed to start PicoClaw agent ${agentId}:`, error);
        await supabase.from('agent_actual_state').upsert({
            agent_id: agentId,
            status: 'error',
            error_message: error.message,
            last_sync: new Date().toISOString()
        });
        throw error;
    }
}

export async function stopPicoClawAgent(agentId: string) {
    const containerName = getAgentContainerName(agentId, 'picoclaw');
    logger.info(`Stopping PicoClaw agent ${agentId}...`);
    try {
        const container = await docker.getContainer(containerName);
        await container.stop().catch(() => { }); // Ignore if already stopped
        await container.remove();
        logger.info(`PicoClaw agent ${agentId} stopped and removed.`);
    } catch (err: any) {
        if (err.message.includes('no such container') || err.message.includes('404')) {
            // Ignore 404 (already gone)
            logger.error(`Error stopping PicoClaw agent ${agentId}:`, err);
        }
    }
}

export async function runTerminalCommand(agentId: string, command: string): Promise<string> {
    const containerName = getAgentContainerName(agentId, 'picoclaw');

    try {
        const exec = await docker.createExec(containerName, {
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
            WorkingDir: '/agent-home/.picoclaw',
            Cmd: ['sh', '-c', command]
        });

        const result = await docker.startExec(exec.Id, { Detach: false, Tty: true });
        return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (err: any) {
        logger.error(`PicoClaw terminal error for ${agentId}:`, err.message);
        return `Error: ${err.message}`;
    }
}

export async function purgePicoClawAgent(agentId: string) {
    try {
        await stopPicoClawAgent(agentId);

        const agentsDataContainerPath = process.env.AGENTS_DATA_CONTAINER_PATH || './workspaces';
        const absoluteContainerPath = path.isAbsolute(agentsDataContainerPath)
            ? agentsDataContainerPath
            : path.resolve(process.cwd(), agentsDataContainerPath);

        const agentRootPath = path.join(absoluteContainerPath, agentId);

        const fsSync = require('fs');
        if (fsSync.existsSync(agentRootPath)) {
            logger.info(`Purging host directory for PicoClaw agent ${agentId}: ${agentRootPath}`);
            fsSync.rmSync(agentRootPath, { recursive: true, force: true });
        }
    } catch (err: any) {
        logger.error(`Failed to purge PicoClaw agent ${agentId}:`, err.message);
        throw err;
    }
}
