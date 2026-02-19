'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useAgent } from '@/hooks/use-agent';
import { useNotification } from '@/components/notification-provider';
import { SecurityLevel, Profile } from '@eliza-manager/shared';
import { isModelCompatible } from '@eliza-manager/shared';
export interface Model {
    id: string;
    name: string;
    isCompatible: boolean;
}
import { BottomNav } from '@/components/bottom-nav';
import { apiPatch, apiFetch } from '@/lib/api';
import { createClient } from '@/lib/supabase';
import {
    Settings as SettingsIcon,
    Loader2,
    User,
    Shield,
    Key,
    CreditCard,
    LogOut,
    Code,
    Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabAgent } from './components/tab-agent';
import { TabSecurity } from './components/tab-security';
import { TabKeys } from './components/tab-keys';
import { TabBilling } from './components/tab-billing';
import { TabRaw } from './components/tab-raw';

type TabType = 'agent' | 'security' | 'keys' | 'billing' | 'raw';

function SettingsContent() {
    const { user, signOut } = useAuth();
    const { agent, loading: agentLoading, refetch, deployAgent, purgeAgent, startAgent, stopAgent } = useAgent();
    const { showNotification } = useNotification();

    const [activeTab, setActiveTab] = useState<TabType>('agent');
    const [agentName, setAgentName] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [saving, setSaving] = useState(false);
    const [agentToggling, setAgentToggling] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [apiKeyStatus, setApiKeyStatus] = useState<'configured' | 'missing'>('missing');
    const [jsonContent, setJsonContent] = useState('');
    const [profile, setProfile] = useState<Profile | null>(null);
    const [securityLevel, setSecurityLevel] = useState<SecurityLevel>(SecurityLevel.STANDARD);
    const [leaseBilling, setLeaseBilling] = useState<{
        usageUsd: number;
        limitUsd: number | null;
        expiresAt: string | null;
        hasLease: boolean;
    } | null>(null);

    // AI Provider/Model state
    const [provider, setProvider] = useState<string>('openrouter');
    const [modelId, setModelId] = useState<string>('');
    const [availableModels, setAvailableModels] = useState<Model[]>([]);
    const [fetchingModels, setFetchingModels] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);

    const supabase = createClient();

    const fetchModels = async (prov: string, token: string, currentModelId?: string) => {
        if (!token && prov !== 'blueprint_shared') return;
        setFetchingModels(true);
        setModelError(null);
        try {
            let url = '';
            if (prov === 'venice') url = 'https://api.venice.ai/api/v1/models';
            else if (prov === 'openai') url = 'https://api.openai.com/v1/models';
            else if (prov === 'anthropic') url = 'https://api.anthropic.com/v1/models';
            else if (prov === 'groq') url = 'https://api.groq.com/openai/v1/models';
            else if (prov === 'deepseek') url = 'https://api.deepseek.com/models';
            else if (prov === 'mistral') url = 'https://api.mistral.ai/v1/models';

            if (!url) {
                setFetchingModels(false);
                return;
            }

            const headers: Record<string, string> = {};
            if (prov === 'anthropic') {
                headers['x-api-key'] = token;
                headers['anthropic-version'] = '2023-06-01';
            } else {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`);
            const data = await res.json();

            if (data?.data && Array.isArray(data.data)) {
                let models: Model[] = [];
                if (prov === 'venice') {
                    models = data.data.map((m: any) => ({
                        id: m.id,
                        name: m.model_spec?.name || m.id,
                        isCompatible: m.model_spec?.capabilities?.supportsFunctionCalling === true
                    }));
                } else {
                    models = data.data.map((m: any) => ({
                        id: m.id,
                        name: m.id,
                        isCompatible: isModelCompatible(m.id)
                    }));
                }

                models.sort((a, b) => a.name.localeCompare(b.name));
                setAvailableModels(models);

                if (!currentModelId || !models.find(m => m.id === currentModelId)) {
                    const defaultModel = models.find(m => (m.id.includes('70b') || m.id.includes('gpt-4o')) && m.isCompatible) || models.find(m => m.isCompatible) || models[0];
                    if (defaultModel) setModelId(defaultModel.id);
                }
            }
        } catch (err: unknown) {
            console.error('Fetch models error:', err);
            setModelError(err instanceof Error ? err.message : 'Establishment failed');
        } finally {
            setFetchingModels(false);
        }
    };

    const handleToggleAgent = async () => {
        if (!agent) return;
        setAgentToggling(true);

        const desiredStateData = agent.agent_desired_state;
        const desiredState = Array.isArray(desiredStateData)
            ? desiredStateData[0]
            : (desiredStateData as any);

        const currentlyEnabled = desiredState?.enabled ?? false;

        try {
            if (currentlyEnabled) {
                await stopAgent();
                showNotification('Agent shutdown requested', 'success');
            } else {
                await startAgent();
                showNotification('Agent startup requested', 'success');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to toggle agent';
            showNotification(message, 'error');
        } finally {
            setAgentToggling(false);
        }
    };

    const handleLaunchAgent = async () => {
        setAgentToggling(true);
        try {
            await deployAgent();
            showNotification('Agent launched successfully', 'success');
        } catch (err: unknown) {
            showNotification('Failed to launch agent', 'error');
        } finally {
            setAgentToggling(false);
        }
    };

    const handleTerminateAgent = async () => {
        if (!confirm('Are you sure you want to PERMANENTLY delete this agent? Everything will be wiped.')) return;
        setAgentToggling(true);
        try {
            await purgeAgent();
            showNotification('Agent terminated and removed', 'success');
        } catch (err: unknown) {
            showNotification('Failed to terminate agent', 'error');
        } finally {
            setAgentToggling(false);
        }
    };

    // Initialize state from agent once loaded
    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data) setProfile(data);
        };
        fetchProfile();
    }, [user, supabase]);

    // Fetch lease billing info whenever billing tab opens
    useEffect(() => {
        if (activeTab !== 'billing') return;
        const fetchBilling = async () => {
            try {
                const leases = await apiFetch<any[]>('/managed-keys/lease');
                const active = leases?.find((l: any) => l.status === 'active');
                if (active) {
                    const mk = active.managed_provider_keys as any;
                    const limitUsd: number | null = mk?.monthly_limit_usd ?? mk?.daily_limit_usd ?? null;
                    setLeaseBilling({
                        usageUsd: Number(active.usage_usd) || 0,
                        limitUsd: limitUsd !== null ? Number(limitUsd) : null,
                        expiresAt: active.expires_at,
                        hasLease: true,
                    });
                } else {
                    setLeaseBilling({ usageUsd: 0, limitUsd: null, expiresAt: null, hasLease: false });
                }
            } catch {
                setLeaseBilling({ usageUsd: 0, limitUsd: null, expiresAt: null, hasLease: false });
            }
        };
        fetchBilling();
    }, [activeTab]);

    useEffect(() => {
        if (agent) {
            const desired = Array.isArray(agent.agent_desired_state) ? agent.agent_desired_state[0] : agent.agent_desired_state;
            const metadata = (desired as any)?.metadata || {};
            setSecurityLevel(metadata.security_level ?? SecurityLevel.STANDARD);

            // ... existing login
            const config = (desired as any)?.config || {};
            setAgentName(agent.name || '');
            setSystemPrompt((config.agents?.defaults?.system_prompt as string) || '');
            setJsonContent(JSON.stringify(config, null, 2));

            const providers = (config as any).models?.providers || {};

            // Get current provider and api key
            const activeProfile = (config as any).auth?.profiles?.['default'];
            const currentProvider = activeProfile?.provider || 'openrouter';
            setProvider(currentProvider);

            // Get current model
            const currentModelFull = (config as any).agents?.defaults?.model?.primary;
            if (currentModelFull && typeof currentModelFull === 'string') {
                const parts = currentModelFull.split('/');
                setModelId(parts.pop() || '');
            } else {
                setModelId('');
            }

            const currentKey = providers[currentProvider]?.apiKey;
            setApiKey(currentKey || '');
            const hasKey = !!currentKey;
            setApiKeyStatus(hasKey ? 'configured' : 'missing');
        }
    }, [agent]);

    const handleUpdateSecurity = async (level: SecurityLevel) => {
        if (!agent) return;
        setSecurityLevel(level);
        try {
            await apiPatch(`/agents/${agent.id}/config`, {
                metadata: { security_level: level }
            });
            showNotification('Security level updated', 'success');
            await refetch(true);
        } catch (err: any) {
            showNotification('Failed to update security: ' + err.message, 'error');
        }
    };

    const handleSaveAgent = async () => {
        if (!agent) return;
        setSaving(true);
        try {
            await apiPatch(`/agents/${agent.id}/config`, { name: agentName });
            showNotification('Agent updated', 'success');
            refetch();
        } catch (err: unknown) {
            showNotification('Failed to save', 'error');
            console.log(err)
        } finally {
            setSaving(false);
        }
    };

    const handleSaveApiKey = async () => {
        if (!agent || !apiKey) return;
        setSaving(true);
        try {
            const desiredStateData = agent.agent_desired_state;
            const desiredState = Array.isArray(desiredStateData)
                ? desiredStateData[0]
                : (desiredStateData as any);

            const currentConfig = (desiredState?.config || {}) as Record<string, any>;

            // Model Configuration
            let actualModelId = modelId || 'gpt-4o';
            let modelName = 'GPT-4o';
            let modelApi = 'openai-responses';
            let baseUrl = 'https://api.openai.com/v1';

            if (provider === 'anthropic') {
                actualModelId = modelId || 'claude-3-5-sonnet-latest';
                const found = availableModels.find(m => m.id === actualModelId);
                modelName = found ? found.name : 'Claude 3.5 Sonnet';
                modelApi = 'anthropic-messages';
                baseUrl = 'https://api.anthropic.com';
            } else if (provider === 'venice') {
                actualModelId = modelId || 'llama-3.3-70b';
                const found = availableModels.find(m => m.id === actualModelId);
                modelName = found ? found.name : 'Venice Model';
                modelApi = 'openai-completions';
                baseUrl = 'https://api.venice.ai/api/v1';
            } else if (provider === 'openai') {
                actualModelId = modelId || 'gpt-4o';
                const found = availableModels.find(m => m.id === actualModelId);
                modelName = found ? found.name : 'OpenAI Model';
                modelApi = 'openai-responses';
                baseUrl = 'https://api.openai.com/v1';
            } else if (provider === 'groq') {
                actualModelId = modelId || 'llama-3.3-70b-versatile';
                const found = availableModels.find(m => m.id === actualModelId);
                modelName = found ? found.name : 'Groq Model';
                modelApi = 'openai-completions';
                baseUrl = 'https://api.groq.com/openai/v1';
            } else if (provider === 'deepseek') {
                actualModelId = modelId || 'deepseek-chat';
                const found = availableModels.find(m => m.id === actualModelId);
                modelName = found ? found.name : 'DeepSeek Model';
                modelApi = 'openai-completions';
                baseUrl = 'https://api.deepseek.com';
            } else if (provider === 'mistral') {
                actualModelId = modelId || 'mistral-large-latest';
                const found = availableModels.find(m => m.id === actualModelId);
                modelName = found ? found.name : 'Mistral Model';
                modelApi = 'openai-completions';
                baseUrl = 'https://api.mistral.ai/v1';
            } else if (provider === 'openrouter') {
                actualModelId = modelId || 'openrouter/auto';
                const found = availableModels.find(m => m.id === actualModelId);
                modelName = found ? found.name : 'OpenRouter Model';
                modelApi = 'openai-completions';
                baseUrl = 'https://openrouter.ai/api/v1';
            }

            const newConfig = {
                ...currentConfig,
                auth: {
                    ...(currentConfig.auth || {}),
                    profiles: {
                        ...(currentConfig.auth?.profiles || {}),
                        default: {
                            ...(currentConfig.auth?.profiles?.default || {}),
                            provider: provider,
                            mode: 'api_key'
                        }
                    }
                },
                models: {
                    ...(currentConfig.models || {}),
                    providers: {
                        ...(currentConfig.models?.providers || {}),
                        [provider]: {
                            ...(currentConfig.models?.providers?.[provider] || {}),
                            apiKey: apiKey || currentConfig.models?.providers?.[provider]?.apiKey || '',
                            baseUrl,
                            models: [
                                { id: actualModelId, name: modelName, api: modelApi, compat: {} }
                            ]
                        }
                    }
                },
                agents: {
                    ...(currentConfig.agents || {}),
                    defaults: {
                        ...(currentConfig.agents?.defaults || {}),
                        model: {
                            ...(currentConfig.agents?.defaults?.model || {}),
                            primary: `${provider}/${actualModelId}`
                        },
                        models: {
                            ...(currentConfig.agents?.defaults?.models || {}),
                            [`${provider}/${actualModelId}`]: {}
                        }
                    }
                },
            };

            await apiPatch(`/agents/${agent.id}/config`, {
                config: newConfig
            });

            setApiKeyStatus('configured');
            setApiKey('');
            showNotification('API key saved', 'success');
            refetch();
        } catch (err: unknown) {
            console.error('Failed to save API key:', err);
            showNotification('Failed to update API key', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveJson = async () => {
        if (!agent) return;
        setSaving(true);
        try {
            let parsed;
            try {
                parsed = JSON.parse(jsonContent);
            } catch (err: unknown) {
                throw new Error('Invalid JSON format');
            }

            await apiPatch(`/agents/${agent.id}/config`, { config: parsed });

            showNotification('Configuration updated', 'success');
            refetch();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to save JSON';
            showNotification(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (agentLoading) {
        return (
            <div className="flex flex-col h-[100dvh]">
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <BottomNav />
            </div>
        );
    }

    // Derived state for cleaner JSX
    const desiredStateData = agent?.agent_desired_state;
    const desiredState = Array.isArray(desiredStateData)
        ? desiredStateData[0]
        : (desiredStateData as any);

    const config = (desiredState?.config || {}) as Record<string, any>;
    const rawGatewayToken = config.gateway?.auth?.token || '';

    // Helper to check if a value is encrypted (format: IV:TEXT)
    const isEncrypted = (val: string) => {
        if (!val || typeof val !== 'string' || !val.includes(':')) return false;
        const [iv, text] = val.split(':');
        return iv.length === 32 && /^[0-9a-f]+$/i.test(iv) && /^[0-9a-f]+$/i.test(text);
    };

    const gatewayToken = isEncrypted(rawGatewayToken)
        ? `${rawGatewayToken.substring(0, 8)}... (encrypted)`
        : rawGatewayToken;

    return (
        <div className="flex flex-col h-[100dvh]">
            {/* Header */}
            <header className="flex-shrink-0 px-4 pt-4 border-b border-white/5 bg-background/80 backdrop-blur-xl pt-[calc(1rem+var(--safe-area-top))]">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <SettingsIcon size={18} className="text-primary" />
                    </div>
                    <h1 className="text-lg font-black tracking-tight">Settings</h1>
                </div>

                {/* Tab Navigation */}
                <div className="flex overflow-x-auto no-scrollbar gap-1 px-1 pb-2">
                    {[
                        { id: 'agent', label: 'Agent', icon: <User size={14} /> },
                        { id: 'security', label: 'Security', icon: <Shield size={14} /> },
                        { id: 'keys', label: 'API Keys', icon: <Key size={14} /> },
                        { id: 'billing', label: 'Billing', icon: <CreditCard size={14} /> },
                        { id: 'raw', label: 'Raw Config', icon: <Code size={14} /> },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest whitespace-nowrap transition-all flex-shrink-0',
                                activeTab === tab.id
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-muted-foreground hover:bg-white/5'
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto scroll-smooth-mobile px-4 py-5 space-y-4 pb-24">
                {activeTab === 'agent' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                        <TabAgent
                            agent={agent}
                            agentName={agentName}
                            setAgentName={setAgentName}
                            systemPrompt={systemPrompt}
                            setSystemPrompt={setSystemPrompt}
                            handleLaunchAgent={handleLaunchAgent}
                            handleToggleAgent={handleToggleAgent}
                            handleSaveAgent={handleSaveAgent}
                            handleTerminateAgent={handleTerminateAgent}
                            agentToggling={agentToggling}
                            saving={saving}
                        />
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                        <TabSecurity
                            profile={profile}
                            securityLevel={securityLevel}
                            handleUpdateSecurity={handleUpdateSecurity}
                            gatewayToken={gatewayToken}
                            rawGatewayToken={rawGatewayToken}
                            isEncrypted={isEncrypted}
                        />
                    </div>
                )}

                {activeTab === 'keys' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                        <TabKeys
                            apiKeyStatus={apiKeyStatus}
                            provider={provider}
                            setProvider={setProvider}
                            apiKey={apiKey}
                            setApiKey={setApiKey}
                            modelId={modelId}
                            setModelId={setModelId}
                            fetchModels={fetchModels}
                            fetchingModels={fetchingModels}
                            modelError={modelError}
                            availableModels={availableModels}
                            handleSaveApiKey={handleSaveApiKey}
                            saving={saving}
                        />
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                        <TabBilling leaseBilling={leaseBilling} />
                    </div>
                )}

                {activeTab === 'raw' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                        <TabRaw jsonContent={jsonContent} setJsonContent={setJsonContent} />
                        <div className="mt-4">
                            <button
                                onClick={handleSaveJson}
                                disabled={saving}
                                className="w-full py-4 rounded-2xl bg-primary hover:opacity-90 active:scale-[0.98] text-white font-black text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Sync Configuration
                            </button>
                        </div>
                    </div>
                )}

                {/* Account Section - Terminate Session */}
                <div className="pt-4 border-t border-white/5 pb-4">
                    <button
                        onClick={signOut}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-red-400 hover:bg-red-400/10 active:scale-[0.98] text-[11px] font-black uppercase tracking-widest transition-all"
                    >
                        <LogOut size={16} />
                        close session (logout)
                    </button>
                    {user && (
                        <p className="text-center text-[9px] font-black tracking-widest text-muted-foreground mt-2 uppercase opacity-50">
                            Session: {user.email}
                        </p>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col h-[100dvh]">
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <BottomNav />
            </div>
        }>
            <SettingsContent />
        </Suspense>
    );
}
