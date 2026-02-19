import React from 'react';
import { Loader2, Brain, Power, Square, Play, User, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CollapsibleCard } from './collapsible-card';

export interface TabAgentProps {
    agent: any;
    agentName: string;
    setAgentName: (name: string) => void;
    systemPrompt: string;
    setSystemPrompt: (prompt: string) => void;
    handleLaunchAgent: () => Promise<void>;
    handleToggleAgent: () => Promise<void>;
    handleSaveAgent: () => Promise<void>;
    handleTerminateAgent: () => Promise<void>;
    agentToggling: boolean;
    saving: boolean;
}

export function TabAgent({
    agent,
    agentName,
    setAgentName,
    systemPrompt,
    setSystemPrompt,
    handleLaunchAgent,
    handleToggleAgent,
    handleSaveAgent,
    handleTerminateAgent,
    agentToggling,
    saving
}: TabAgentProps) {
    if (!agent) {
        return (
            <div className="glass-card rounded-2xl overflow-hidden p-8 text-center border-2 border-dashed border-primary/20 bg-primary/5">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Brain size={40} className="text-primary animate-pulse" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-3 italic">Launch Your neural agent</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-8 font-medium leading-relaxed">
                    Ready to deploy your customized OpenClaw agent? We&apos;ll initialize a secure sandbox environment and link your neural pathways.
                </p>
                <button
                    onClick={handleLaunchAgent}
                    disabled={agentToggling}
                    className="w-full max-w-xs py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                >
                    Launch my agent
                </button>
            </div>
        );
    }

    if (agent.isPurging) {
        return (
            <div className="glass-card rounded-2xl overflow-hidden p-8 text-center border-2 border-dashed border-red-500/20 bg-red-500/5 animate-pulse">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                    <Loader2 size={40} className="text-red-500 animate-spin" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-3 italic">Decommissioning Agent</h2>
                <p className="text-sm text-red-400/80 max-w-sm mx-auto mb-4 font-medium leading-relaxed">
                    Finalizing memory purge and dissolving neural pathways. This process cannot be undone.
                </p>
                <div className="text-[10px] font-black uppercase tracking-widest text-red-400/50">
                    Worker Status: Cleaning up Docker & Filesystem...
                </div>
            </div>
        );
    }

    const desiredStateData = agent?.agent_desired_state;
    const desiredState = Array.isArray(desiredStateData)
        ? desiredStateData[0]
        : (desiredStateData as any);
    const currentlyEnabled = desiredState?.enabled ?? false;

    return (
        <div className="space-y-4">
            {/* Agent Control */}
            <div className="glass-card rounded-2xl overflow-hidden p-5 flex items-center justify-between border border-primary/10 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner",
                        currentlyEnabled
                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                            : "bg-red-500/10 text-red-500 border border-red-500/20"
                    )}>
                        <Power size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-sm">Agent Power</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full inline-block",
                                agent?.agent_actual_state?.status === 'running' ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50"
                            )} />
                            {agent?.agent_actual_state?.status || 'stopped'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleToggleAgent}
                    disabled={agentToggling}
                    className={cn(
                        "px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2",
                        currentlyEnabled
                            ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                            : "bg-primary text-white shadow-lg shadow-primary/20 hover:opacity-90"
                    )}
                >
                    {agentToggling ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        currentlyEnabled ? (
                            <><Square size={14} fill="currentColor" /> Stop Agent</>
                        ) : (
                            <><Play size={14} fill="currentColor" /> Start Agent</>
                        )
                    )}
                </button>
            </div>

            {/* Basic Info */}
            <CollapsibleCard title="Agent Information" icon={<User size={18} />} defaultOpen>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Agent Name</label>
                        <input
                            type="text"
                            value={agentName}
                            onChange={(e) => setAgentName(e.target.value)}
                            placeholder="My Agent"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">System Prompt</label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Define your agent's personality and behavior..."
                            rows={6}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none text-sm leading-relaxed"
                        />
                    </div>

                    <button
                        onClick={handleSaveAgent}
                        disabled={saving || !agentName}
                        className="w-full py-3 rounded-xl bg-primary hover:opacity-90 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                        Save Changes
                    </button>
                </div>
            </CollapsibleCard>

            {/* Intelligence Details */}
            <CollapsibleCard title="Intelligence" icon={<Brain size={18} />}>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current Model</label>
                        <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-medium">
                            Using configured model (See Personal API Keys to update)
                        </div>
                    </div>
                </div>
            </CollapsibleCard>

            {/* Terminate Section */}
            <div className="pt-8 pb-4">
                <button
                    onClick={handleTerminateAgent}
                    disabled={agentToggling}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 active:scale-[0.98] text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                    <AlertTriangle size={16} />
                    terminate agent (remove agent)
                </button>
            </div>
        </div>
    );
}
