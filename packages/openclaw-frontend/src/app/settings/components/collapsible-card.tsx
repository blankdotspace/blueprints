import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface CollapsibleCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string;
}

export function CollapsibleCard({ title, icon, children, defaultOpen = false, badge }: CollapsibleCardProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-4 text-left active:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-primary">
                        {icon}
                    </div>
                    <span className="font-bold text-sm">{title}</span>
                    {badge && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {badge}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
            </button>
            {open && (
                <div className="px-5 pb-5 pt-1 border-t border-white/5 animate-in slide-in-from-top-1 fade-in duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}
