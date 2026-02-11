import path from 'path';
import fs from 'fs';

// Mock process.env
process.env.AGENTS_DATA_CONTAINER_PATH = '/mnt/agents-data';
process.env.AGENTS_DATA_HOST_PATH = '/var/lib/blueprints/agents-data';

const agentId = 'test-agent-123';

function getPaths() {
    const agentsDataContainerPath = process.env.AGENTS_DATA_CONTAINER_PATH;
    const agentsDataHostPath = process.env.AGENTS_DATA_HOST_PATH;

    if (!agentsDataContainerPath || !agentsDataHostPath) {
        throw new Error("Missing env vars");
    }

    const agentRootPath = path.join(agentsDataContainerPath, agentId);
    const homeDir = path.join(agentRootPath, 'home');

    // Docker bind
    const bindSource = path.join(agentsDataHostPath, agentId, 'home');
    const bindDest = '/agent-home';

    console.log('--- Path Architecture Verification ---');
    console.log(`Worker Storage Path: ${homeDir}`);
    console.log(`Docker Bind: ${bindSource}:${bindDest}`);
    console.log(`Agent HOME: ${bindDest}`);
    console.log('--------------------------------------');
}

getPaths();
