import { startElizaOSAgent, stopElizaOSAgent } from './elizaos';
import { startOpenClawAgent, stopOpenClawAgent } from './openclaw';
import { startPicoClawAgent, stopPicoClawAgent } from './picoclaw';

export interface AgentHandler {
    start: (agentId: string, config: any, metadata: any, forceRestart?: boolean) => Promise<void>;
    stop: (agentId: string) => Promise<void>;
}

export const FRAMEWORK_HANDLERS: Record<string, AgentHandler> = {
    'elizaos': {
        start: async (id, config, _metadata, _force) => {
            return startElizaOSAgent(id, config);
        },
        stop: stopElizaOSAgent
    },
    'openclaw': {
        start: async (id, config, metadata, force) => {
            return startOpenClawAgent(id, config, metadata, force);
        },
        stop: stopOpenClawAgent
    },
    'picoclaw': {
        start: async (id, config, metadata, force) => {
            return startPicoClawAgent(id, config, metadata, force);
        },
        stop: stopPicoClawAgent
    }
};

export function getHandler(framework: string): AgentHandler {
    const handler = FRAMEWORK_HANDLERS[framework];
    if (!handler) {
        throw new Error(`No handler found for framework: ${framework}`);
    }
    return handler;
}
