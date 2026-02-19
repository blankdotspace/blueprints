import React from 'react';
import { Key, Loader2, Zap, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CollapsibleCard } from './collapsible-card';
import { Model } from '../view';

export interface TabKeysProps {
    apiKeyStatus: 'configured' | 'missing';
    provider: string;
    setProvider: (provider: string) => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    modelId: string;
    setModelId: (modelId: string) => void;
    fetchModels: (provider: string, token: string, currentModelId?: string) => Promise<void>;
    fetchingModels: boolean;
    modelError: string | null;
    availableModels: Model[];
    handleSaveApiKey: () => Promise<void>;
    saving: boolean;
}

export function TabKeys({
    apiKeyStatus,
    provider,
    setProvider,
    apiKey,
    setApiKey,
    modelId,
    setModelId,
    fetchModels,
    fetchingModels,
    modelError,
    availableModels,
    handleSaveApiKey,
    saving
}: TabKeysProps) {
    return (
        <div className="space-y-4">
            <CollapsibleCard title="Personal API Keys" icon={<Key size={18} />} badge="Advanced" defaultOpen>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                        <div className={cn(
                            'w-2.5 h-2.5 rounded-full',
                            apiKeyStatus === 'configured'
                                ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]'
                                : 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                        )} />
                        <span className="text-sm font-medium text-white/90">
                            {apiKeyStatus === 'configured' ? 'Key configured' : 'Using Shared Infrastructure'}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Provider</label>
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm appearance-none font-bold"
                        >
                            <option value="openrouter" className="bg-slate-900">OpenRouter</option>
                            <option value="anthropic" className="bg-slate-900">Anthropic</option>
                            <option value="openai" className="bg-slate-900">OpenAI</option>
                            <option value="groq" className="bg-slate-900">Groq</option>
                            <option value="venice" className="bg-slate-900">Venice AI</option>
                            <option value="deepseek" className="bg-slate-900">DeepSeek</option>
                            <option value="mistral" className="bg-slate-900">Mistral</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => {
                                setApiKey(e.target.value);
                                if (e.target.value && e.target.value.length > 20) {
                                    fetchModels(provider, e.target.value, modelId);
                                }
                            }}
                            placeholder="sk-..."
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground leading-relaxed flex justify-between items-center">
                            <span>Providing your own key bypasses platform limits.</span>
                            <button
                                onClick={() => fetchModels(provider, apiKey, modelId)}
                                disabled={!apiKey}
                                className="text-primary hover:text-primary/80 font-bold uppercase tracking-widest transition-colors flex items-center gap-1 disabled:opacity-30"
                            >
                                <Zap size={12} /> Sync Models
                            </button>
                        </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Model Selection</label>
                        </div>
                        {fetchingModels ? (
                            <div className="h-[100px] flex flex-col items-center justify-center gap-3 bg-white/5 rounded-xl border border-white/5">
                                <Loader2 size={20} className="animate-spin text-primary" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fetching models...</p>
                            </div>
                        ) : modelError ? (
                            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">{modelError}</p>
                            </div>
                        ) : availableModels.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                {availableModels.map((m: Model) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setModelId(m.id)}
                                        className={cn(
                                            "p-3 rounded-xl border text-left transition-all flex items-center gap-3",
                                            modelId === m.id ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5 hover:border-white/10',
                                            !m.isCompatible && 'opacity-40'
                                        )}
                                    >
                                        <div className="size-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                            <Cpu size={12} className={modelId === m.id ? 'text-primary' : 'text-muted-foreground'} />
                                        </div>
                                        <div className="flex-1 truncate">
                                            <h4 className="font-bold text-[10px] uppercase tracking-widest truncate">{m.name || m.id}</h4>
                                        </div>
                                        {modelId === m.id && <Zap size={12} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[80px] flex flex-col items-center justify-center text-center p-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                                <p className="text-[10px] font-medium text-muted-foreground italic">
                                    {modelId ? `Current Model: ${modelId}` : 'Enter API key to synchronize available models.'}
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSaveApiKey}
                        disabled={saving || !apiKey || !provider || !modelId}
                        className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                        Update Configuration
                    </button>
                </div>
            </CollapsibleCard>
        </div>
    );
}
