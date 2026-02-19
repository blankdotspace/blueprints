import React, { useState } from 'react';
import { Code, CodeSquare, Edit2, X } from 'lucide-react';
import { CollapsibleCard } from './collapsible-card';

export interface TabRawProps {
    jsonContent: string;
    setJsonContent: (val: string) => void;
}

export function TabRaw({ jsonContent, setJsonContent }: TabRawProps) {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div className="space-y-4">
            <CollapsibleCard title="Raw Configuration" icon={<Code size={18} />} badge="Danger Zone">
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center gap-2 transition-colors border border-white/5"
                        >
                            {isEditing ? <><X size={12} /> Cancel</> : <><Edit2 size={12} /> Edit JSON</>}
                        </button>
                    </div>

                    <div className="p-4 rounded-xl bg-black/20 border border-white/10 overflow-x-auto">
                        {isEditing ? (
                            <textarea
                                value={jsonContent}
                                onChange={(e) => setJsonContent(e.target.value)}
                                className="w-full h-[400px] text-[11px] font-mono leading-relaxed bg-transparent text-white focus:outline-none focus:ring-0 resize-y custom-scrollbar"
                                spellCheck={false}
                            />
                        ) : (
                            <pre className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                                {jsonContent}
                            </pre>
                        )}
                    </div>

                    <div className="flex items-center justify-center p-4 rounded-xl border border-dashed border-white/10 bg-white/5">
                        <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground flex items-center gap-2">
                            <CodeSquare size={12} />
                            {isEditing ? 'Editing raw JSON structure' : 'Read-only view'}
                        </p>
                    </div>
                </div>
            </CollapsibleCard>
        </div>
    );
}
