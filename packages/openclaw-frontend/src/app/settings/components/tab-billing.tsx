import React from 'react';
import { CreditCard, ExternalLink, Calendar, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CollapsibleCard } from './collapsible-card';

export interface TabBillingProps {
    leaseBilling: {
        hasLease: boolean;
        limitUsd: number | null;
        usageUsd: number;
        expiresAt: string | null;
    } | null;
}

export function TabBilling({ leaseBilling }: TabBillingProps) {
    return (
        <div className="space-y-4">
            <CollapsibleCard title="Wallet & Usage" icon={<CreditCard size={18} />} defaultOpen>
                <div className="space-y-5">
                    {!leaseBilling?.hasLease ? (
                        <div className="text-center py-6 px-4 bg-white/5 rounded-2xl border border-white/5">
                            <h3 className="text-sm font-bold text-white mb-2">Personal API Key Active</h3>
                            <p className="text-xs text-muted-foreground">You are using an external API key. Managed usage tracking is disabled.</p>
                            <a href="/billing" className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-primary hover:text-primary/80">
                                Manage Core Wallet <ExternalLink size={12} />
                            </a>
                        </div>
                    ) : (
                        <>
                            {/* Stats grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {/* Credits */}
                                <div className="flex flex-col items-center py-4 px-2 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Credits</p>
                                    <span className="text-xl font-black text-white">
                                        {leaseBilling.limitUsd !== null
                                            ? `$${leaseBilling.limitUsd.toFixed(2)}`
                                            : '∞'}
                                    </span>
                                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">limit</p>
                                </div>
                                {/* Usage */}
                                <div className="flex flex-col items-center py-4 px-2 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Usage</p>
                                    <span className="text-xl font-black text-amber-400">
                                        ${(leaseBilling.usageUsd ?? 0).toFixed(3)}
                                    </span>
                                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">spent</p>
                                </div>
                                {/* Available */}
                                <div className="flex flex-col items-center py-4 px-2 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Available</p>
                                    <span className={cn(
                                        'text-xl font-black',
                                        (() => {
                                            if (leaseBilling.limitUsd === null) return 'text-green-400';
                                            const avail = leaseBilling.limitUsd - leaseBilling.usageUsd;
                                            return avail <= 0 ? 'text-red-400' : avail < leaseBilling.limitUsd * 0.2 ? 'text-yellow-400' : 'text-green-400';
                                        })()
                                    )}>
                                        {leaseBilling.limitUsd !== null
                                            ? `$${(leaseBilling.limitUsd - leaseBilling.usageUsd).toFixed(2)}`
                                            : '∞'}
                                    </span>
                                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">remaining</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <Calendar size={14} className="text-muted-foreground" />
                                        <span className="text-xs font-medium text-white/80">Current Period Ends</span>
                                    </div>
                                    <span className="text-xs font-bold font-mono">
                                        {leaseBilling.expiresAt ? new Date(leaseBilling.expiresAt).toLocaleDateString() : 'Active'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <Receipt size={14} className="text-muted-foreground" />
                                        <span className="text-xs font-medium text-white/80">Status</span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                        Active Lease
                                    </span>
                                </div>
                            </div>

                            <a
                                href="/billing"
                                className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/10"
                            >
                                Manage Billing <ExternalLink size={14} />
                            </a>
                        </>
                    )}
                </div>
            </CollapsibleCard>
        </div>
    );
}
