import React from 'react';
import { Shield, AlertTriangle, Zap } from 'lucide-react';
import { SecurityLevel, Profile } from '@eliza-manager/shared';
import { cn } from '@/lib/utils';
import { CollapsibleCard } from './collapsible-card';

export interface TabSecurityProps {
    profile: Profile | null;
    securityLevel: SecurityLevel;
    handleUpdateSecurity: (level: SecurityLevel) => Promise<void>;
    gatewayToken: string;
    rawGatewayToken: string;
    isEncrypted: (val: string) => boolean;
}

export function TabSecurity({
    profile,
    securityLevel,
    handleUpdateSecurity,
    gatewayToken,
    rawGatewayToken,
    isEncrypted
}: TabSecurityProps) {
    return (
        <div className="space-y-4">
            {/* Security */}
            <CollapsibleCard title="Environment Security" icon={<Shield size={18} />} defaultOpen>
                <div className="space-y-4">
                    <div className="grid gap-3">
                        {[
                            { level: SecurityLevel.STANDARD, label: 'Standard', desc: 'Secure Sandbox: Read-only rootfs, no network privileges, dropped caps. Recommended.' },
                            { level: SecurityLevel.ADVANCED, label: 'Advanced', desc: 'Extended isolation: Adds SYS_ADMIN capability for specialized tools. Still readonly root.' },
                            { level: SecurityLevel.PRO, label: 'Pro', desc: 'Full Development: Adds writeable rootfs and NET_ADMIN. For complex agent tasks.' },
                            { level: SecurityLevel.ROOT, label: 'Root (Super Admin)', desc: 'UNSAFE: Full host level access as root user. Use with extreme caution.', adminOnly: true }
                        ]
                            .filter(opt => !opt.adminOnly || profile?.role === 'super_admin')
                            .map((opt) => (
                                <button
                                    key={opt.level}
                                    onClick={() => handleUpdateSecurity(opt.level)}
                                    className={cn(
                                        "group relative flex flex-col items-start gap-1 px-4 py-3 rounded-xl border text-left transition-all",
                                        securityLevel === opt.level
                                            ? "bg-primary/10 border-primary shadow-[0_4px_12px_rgba(var(--primary-rgb),0.1)]"
                                            : "bg-white/5 border-white/10 hover:border-white/20 active:bg-white/10"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className={cn(
                                            "text-sm font-semibold",
                                            securityLevel === opt.level ? "text-primary" : "text-white"
                                        )}>
                                            {opt.label} Isolation
                                        </span>
                                        {securityLevel === opt.level && (
                                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {opt.desc}
                                    </p>
                                </button>
                            ))}
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/80">
                        <div className="flex gap-3">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <p className="text-[11px] leading-relaxed">
                                <strong>Warning:</strong> Changing security settings requires an agent restart to take effect.
                                Higher levels grant the agent more access to the underlying system, which should only be used if trusted.
                            </p>
                        </div>
                    </div>
                </div>
            </CollapsibleCard>

            {/* Gateway Access */}
            <CollapsibleCard title="Gateway Access" icon={<Zap size={18} />} defaultOpen>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-primary/80">API Gateway Token</label>
                        <div className="flex gap-2">
                            <div className="flex-1 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-primary font-mono text-xs select-all flex items-center">
                                {gatewayToken || 'auto-generating...'}
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed flex items-center gap-1.5">
                            <Shield size={10} className="text-primary/50" />
                            {isEncrypted(rawGatewayToken)
                                ? 'Token is encrypted at rest for your security. Update to change.'
                                : 'Use this token in your client applications to authenticate with this agent.'}
                        </p>
                    </div>
                </div>
            </CollapsibleCard>
        </div>
    );
}
