// ─── Plugin Ordering Utility ──────────────────────────────────────────────────

const PLUGIN_ORDER: Record<string, number> = {
    '@elizaos/plugin-sql': 0,           // Core — always first
    '@elizaos/plugin-bootstrap': 1,     // Core — always early
    '@elizaos/plugin-anthropic': 10,    // Text-only (no embeddings) — priority for text
    '@elizaos/plugin-openrouter': 20,   // Embedding-capable
    '@elizaos/plugin-openai': 21,       // Embedding-capable
    '@elizaos/plugin-google-genai': 22, // Embedding-capable
    '@elizaos/plugin-ollama': 30,       // Local fallback — last
};

/**
 * Sort plugins according to ElizaOS recommended loading order.
 * Core → Text-only → Embedding-capable → Fallback → Others (alphabetical)
 */
export function sortElizaPlugins(plugins: string[]): string[] {
    return [...plugins].sort((a, b) => {
        const orderA = PLUGIN_ORDER[a] ?? 50;
        const orderB = PLUGIN_ORDER[b] ?? 50;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
    });
}
