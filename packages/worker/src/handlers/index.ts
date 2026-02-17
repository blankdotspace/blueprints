import { startElizaOSAgent, stopElizaOSAgent, runElizaOSCommand, purgeElizaOSAgent } from './elizaos';
import { startOpenClawAgent, stopOpenClawAgent, runTerminalCommand as runOpenClawCommand, purgeOpenClawAgent } from './openclaw';
import { startPicoClawAgent, stopPicoClawAgent, runTerminalCommand as runPicoClawCommand, purgePicoClawAgent } from './picoclaw';

export interface AgentHandler {
    start: (agentId: string, config: any, metadata: any, forceRestart?: boolean, projectId?: string) => Promise<void>;
    stop: (agentId: string, projectId?: string) => Promise<void>;
    purge: (agentId: string, projectId?: string) => Promise<void>;
    runCommand?: (agentId: string, command: string, projectId?: string) => Promise<string>;
}

export const FRAMEWORK_HANDLERS: Record<string, AgentHandler> = {
    'elizaos': {
        start: async (id, config, metadata, force, projectId) => {
            return startElizaOSAgent(id, config, metadata, force, projectId);
        },
        stop: stopElizaOSAgent,
        purge: purgeElizaOSAgent,
        runCommand: runElizaOSCommand
    },
    'openclaw': {
        start: async (id, config, metadata, force) => {
            return startOpenClawAgent(id, config, metadata, force);
        },
        stop: stopOpenClawAgent,
        purge: purgeOpenClawAgent,
        runCommand: runOpenClawCommand
    },
    'picoclaw': {
        start: async (id, config, metadata, force) => {
            return startPicoClawAgent(id, config, metadata, force);
        },
        stop: stopPicoClawAgent,
        purge: purgePicoClawAgent,
        runCommand: runPicoClawCommand
    }
};

export function getHandler(framework: string): AgentHandler {
    const handler = FRAMEWORK_HANDLERS[framework];
    if (!handler) {
        throw new Error(`No handler found for framework: ${framework}`);
    }
    return handler;
}
