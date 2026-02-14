'use client';

import React, { useState } from 'react';
import { Cpu, Bot, Zap, Globe, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Provider Definitions ─────────────────────────────────────────────────────

interface ElizaProvider {
    id: string;
    name: string;
    desc: string;
    plugin: string;
    Icon: React.ElementType;
    color: string;
    capabilities: { text: boolean; embeddings: boolean; structured: boolean };
    envKey: string;
    local?: boolean;
    modelEnvVars?: { small: string; large: string; embedding?: string };
}

const ELIZA_PROVIDERS: ElizaProvider[] = [
    {
        id: 'openai', name: 'OpenAI', desc: 'Full-featured, all model types',
        plugin: '@elizaos/plugin-openai', Icon: Zap, color: 'text-green-400',
        capabilities: { text: true, embeddings: true, structured: true },
        envKey: 'OPENAI_API_KEY',
        modelEnvVars: { small: 'OPENAI_SMALL_MODEL', large: 'OPENAI_LARGE_MODEL' },
    },
    {
        id: 'anthropic', name: 'Anthropic', desc: 'Reasoning & Coding specialist',
        plugin: '@elizaos/plugin-anthropic', Icon: Bot, color: 'text-orange-400',
        capabilities: { text: true, embeddings: false, structured: true },
        envKey: 'ANTHROPIC_API_KEY',
        modelEnvVars: { small: 'ANTHROPIC_SMALL_MODEL', large: 'ANTHROPIC_LARGE_MODEL' },
    },
    {
        id: 'google', name: 'Google GenAI', desc: 'Gemini models, full-featured',
        plugin: '@elizaos/plugin-google-genai', Icon: Globe, color: 'text-blue-400',
        capabilities: { text: true, embeddings: true, structured: true },
        envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
        modelEnvVars: { small: 'GOOGLE_SMALL_MODEL', large: 'GOOGLE_LARGE_MODEL' },
    },
    {
        id: 'openrouter', name: 'OpenRouter', desc: 'Multi-provider access',
        plugin: '@elizaos/plugin-openrouter', Icon: Zap, color: 'text-purple-400',
        capabilities: { text: true, embeddings: true, structured: true },
        envKey: 'OPENROUTER_API_KEY',
        modelEnvVars: { small: 'OPENROUTER_SMALL_MODEL', large: 'OPENROUTER_LARGE_MODEL' },
    },
];

// Providers that can act as embedding fallbacks
const EMBEDDING_PROVIDERS = ELIZA_PROVIDERS.filter(p => p.capabilities.embeddings);

// ─── Component ────────────────────────────────────────────────────────────────

interface ElizaLLMConfigProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateField: (field: string, value: any) => void;
}

export default function ElizaLLMConfig({ config, updateField }: ElizaLLMConfigProps) {
    const [showModelOverrides, setShowModelOverrides] = useState(false);

    // Track the user's selected primary & embedding provider via a custom field in settings
    const primaryProviderId = config.settings?.llmProvider || '';
    const embeddingProviderId = config.settings?.embeddingProvider || '';

    const primaryProvider = ELIZA_PROVIDERS.find(p => p.id === primaryProviderId);
    const needsEmbeddingFallback = primaryProvider && !primaryProvider.capabilities.embeddings;

    // ── Plugin Management ──────────────────────────────────────────────────

    const addPlugin = (pluginId: string) => {
        const current = config.plugins || [];
        if (!current.includes(pluginId)) {
            updateField('plugins', [...current, pluginId]);
        }
    };

    const removeProviderPlugin = (providerId: string) => {
        const provider = ELIZA_PROVIDERS.find(p => p.id === providerId);
        if (!provider) return;
        const current = config.plugins || [];
        // Only remove if it's not also the embedding provider
        if (embeddingProviderId !== providerId) {
            updateField('plugins', current.filter((p: string) => p !== provider.plugin));
        }
    };

    // ── Handlers ───────────────────────────────────────────────────────────

    const selectPrimary = (providerId: string) => {
        const provider = ELIZA_PROVIDERS.find(p => p.id === providerId);
        if (!provider) return;

        // Remove old primary provider plugin (if different and not used as embedding)
        if (primaryProviderId && primaryProviderId !== providerId) {
            removeProviderPlugin(primaryProviderId);
        }

        // Update primary
        updateField('settings', {
            ...config.settings,
            llmProvider: providerId,
            // Clear embedding provider if new primary supports embeddings
            ...(provider.capabilities.embeddings && embeddingProviderId ? { embeddingProvider: '' } : {}),
        });

        // Add provider plugin
        addPlugin(provider.plugin);
    };

    const selectEmbeddingFallback = (providerId: string) => {
        const provider = ELIZA_PROVIDERS.find(p => p.id === providerId);
        if (!provider) return;

        // Remove old embedding provider plugin (if different and not the primary)
        if (embeddingProviderId && embeddingProviderId !== providerId && embeddingProviderId !== primaryProviderId) {
            const oldProvider = ELIZA_PROVIDERS.find(p => p.id === embeddingProviderId);
            if (oldProvider) {
                const current = config.plugins || [];
                updateField('plugins', current.filter((p: string) => p !== oldProvider.plugin));
            }
        }

        updateField('settings', { ...config.settings, embeddingProvider: providerId });
        addPlugin(provider.plugin);
    };

    const updateModelOverride = (envVar: string, value: string) => {
        const secrets = { ...config.settings?.secrets, [envVar]: value };
        updateField('settings', { ...config.settings, secrets });
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-8">
            {/* ── Primary LLM Provider ────────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Cpu size={16} className="text-primary" />
                    </div>
                    <h3 className="font-black uppercase tracking-widest text-xs">LLM Provider</h3>
                </div>
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed ml-1">
                    Select the primary AI provider for text generation. The corresponding plugin will be auto-managed.
                </p>

                <div className="flex overflow-x-auto gap-4 pb-4 pt-2 snap-x custom-scrollbar">
                    {ELIZA_PROVIDERS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => selectPrimary(p.id)}
                            className={`shrink-0 w-52 p-6 rounded-[2.5rem] border text-center transition-all flex flex-col items-center gap-4 snap-center relative ${primaryProviderId === p.id ? 'border-primary bg-primary/10 ring-4 ring-primary/10' : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/[0.08]'}`}
                        >
                            <div className={`size-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 transition-transform ${primaryProviderId === p.id ? 'scale-110' : ''}`}>
                                <p.Icon className={p.color} size={28} />
                            </div>
                            <div>
                                <h4 className="font-black text-xs uppercase tracking-widest mb-1">{p.name}</h4>
                                <p className="text-[10px] text-muted-foreground font-medium line-clamp-2">{p.desc}</p>
                            </div>
                            {/* Capability badges */}
                            <div className="flex gap-1.5 flex-wrap justify-center">
                                <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Text</span>
                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${p.capabilities.embeddings ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                    Embed {p.capabilities.embeddings ? '✓' : '✗'}
                                </span>
                                {p.local && (
                                    <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Local</span>
                                )}
                            </div>
                            {primaryProviderId === p.id && (
                                <div className="absolute top-4 right-4 size-6 rounded-full bg-primary flex items-center justify-center text-white">
                                    <Check size={14} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </section>

            {/* ── Embedding Fallback ──────────────────────────────────── */}
            {needsEmbeddingFallback && (
                <section className="space-y-4 p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-400" />
                        <h3 className="font-black uppercase tracking-widest text-xs text-amber-400">Embedding Fallback Required</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        <strong>{primaryProvider?.name}</strong> does not support embeddings (needed for memory & search).
                        Select a secondary provider to handle embedding operations.
                    </p>

                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x custom-scrollbar">
                        {EMBEDDING_PROVIDERS
                            .filter(p => p.id !== primaryProviderId)
                            .map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => selectEmbeddingFallback(p.id)}
                                    className={`shrink-0 px-5 py-3 rounded-2xl border transition-all flex items-center gap-3 snap-center ${embeddingProviderId === p.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                                >
                                    <p.Icon className={p.color} size={18} />
                                    <span className="font-black text-[10px] uppercase tracking-widest">{p.name}</span>
                                    {embeddingProviderId === p.id && <Check size={14} className="text-amber-400" />}
                                </button>
                            ))}
                    </div>

                    {!embeddingProviderId && (
                        <p className="text-[10px] text-red-400 font-bold">
                            ⚠ No embedding provider selected. The agent will not be able to store memories.
                        </p>
                    )}
                </section>
            )}

            {/* ── Model Overrides (collapsed) ──────────────────────────── */}
            {primaryProvider && (
                <section className="space-y-4">
                    <button
                        onClick={() => setShowModelOverrides(!showModelOverrides)}
                        className="flex items-center gap-2 text-muted-foreground/60 hover:text-white transition-colors w-full"
                    >
                        {showModelOverrides ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">Model Overrides</span>
                        <span className="text-[9px] text-muted-foreground/40 ml-1">(Optional)</span>
                    </button>

                    {showModelOverrides && (
                        <div className="space-y-4 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 animate-in slide-in-from-top-2 duration-300">
                            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                                Override the default model names for the selected provider. Leave blank to use defaults.
                            </p>
                            {primaryProvider.modelEnvVars && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Small Model</label>
                                        <input
                                            value={config.settings?.secrets?.[primaryProvider.modelEnvVars.small] || ''}
                                            onChange={(e) => updateModelOverride(primaryProvider.modelEnvVars!.small, e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs focus:border-primary/50 outline-none transition-all"
                                            placeholder={`e.g. gpt-4o-mini`}
                                        />
                                        <span className="text-[9px] text-muted-foreground/40 ml-1">{primaryProvider.modelEnvVars.small}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Large Model</label>
                                        <input
                                            value={config.settings?.secrets?.[primaryProvider.modelEnvVars.large] || ''}
                                            onChange={(e) => updateModelOverride(primaryProvider.modelEnvVars!.large, e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs focus:border-primary/50 outline-none transition-all"
                                            placeholder={`e.g. gpt-4o`}
                                        />
                                        <span className="text-[9px] text-muted-foreground/40 ml-1">{primaryProvider.modelEnvVars.large}</span>
                                    </div>
                                    {primaryProvider.modelEnvVars.embedding && (
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Embedding Model</label>
                                            <input
                                                value={config.settings?.secrets?.[primaryProvider.modelEnvVars.embedding] || ''}
                                                onChange={(e) => updateModelOverride(primaryProvider.modelEnvVars!.embedding!, e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs focus:border-primary/50 outline-none transition-all"
                                                placeholder={`e.g. nomic-embed-text`}
                                            />
                                            <span className="text-[9px] text-muted-foreground/40 ml-1">{primaryProvider.modelEnvVars.embedding}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
