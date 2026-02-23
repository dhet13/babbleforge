import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useSheetStore } from '../../store/sheetStore';
import type { SheetRow } from '../../types/sheets';

export default function SheetContextSummary() {
    const [isOpen, setIsOpen] = useState(false);
    const screens = useSheetStore((s) => s.screens) as SheetRow[];
    const designTokens = useSheetStore((s) => s.design) as SheetRow[];
    const features = useSheetStore((s) => s.features) as SheetRow[];

    const tokenCategories: Record<string, number> = {};
    for (const t of designTokens) {
        const r = t as unknown as Record<string, string>;
        const cat = r.Category || 'Other';
        tokenCategories[cat] = (tokenCategories[cat] || 0) + 1;
    }

    return (
        <div className="sheet-context-summary">
            <button className="context-toggle" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                Sheet Context
                <span className="context-counts">
                    {screens.length} screens | {designTokens.length} tokens | {features.length} features
                </span>
            </button>

            {isOpen && (
                <div className="context-details">
                    <div className="context-section">
                        <div className="context-section-title">Screens</div>
                        {screens.map((s) => {
                            const r = s as unknown as Record<string, string>;
                            return (
                                <div key={s.id} className="context-row">
                                    <span className="context-id">{r.Screen_ID}</span>
                                    <span className="context-name">{r.Screen_Name}</span>
                                    <span className="context-frame">{r.Figma_Frame_Name}</span>
                                    <span className={`context-status ${(r.Status || '').toLowerCase().replace(/\s/g, '-')}`}>
                                        {r.Status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="context-section">
                        <div className="context-section-title">Design Tokens</div>
                        {Object.entries(tokenCategories).map(([cat, count]) => (
                            <div key={cat} className="context-row">
                                <span className="context-name">{cat}</span>
                                <span className="context-count">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
