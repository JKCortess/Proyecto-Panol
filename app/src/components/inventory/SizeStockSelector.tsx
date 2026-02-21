"use client";

import { useState } from "react";
import type { SizeVariant } from "@/lib/data";
import { Ruler } from "lucide-react";

interface SizeStockSelectorProps {
    variants: SizeVariant[];
    totalStock: number;
    maxRop: number;
    /** Callback when stock changes due to size selection — used by parent */
    onStockChange?: (stock: number, rop: number) => void;
}

export function SizeStockSelector({ variants, totalStock, maxRop }: SizeStockSelectorProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const currentStock = selectedIndex !== null ? variants[selectedIndex].stock : totalStock;
    const currentRop = selectedIndex !== null ? variants[selectedIndex].rop : maxRop;
    const isCritical = currentRop > 0 && currentStock <= currentRop;

    return (
        <div className="space-y-2">
            {/* Size label + chips row */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 shrink-0">
                    <Ruler className="w-3 h-3" />
                    Talla
                </span>
                <div className="flex gap-1.5 flex-wrap">
                    {/* "Todas" chip */}
                    <button
                        onClick={() => setSelectedIndex(null)}
                        className={`text-[11px] font-mono font-semibold px-2 py-1 rounded-md border transition-all duration-200 cursor-pointer select-none
                            ${selectedIndex === null
                                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30'
                                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Todas
                    </button>
                    {/* Individual size chips */}
                    {variants.map((v, i) => {
                        const isSelected = selectedIndex === i;
                        const variantCritical = v.rop > 0 && v.stock <= v.rop;
                        return (
                            <button
                                key={v.talla}
                                onClick={() => setSelectedIndex(i)}
                                className={`text-[11px] font-mono font-semibold px-2 py-1 rounded-md border transition-all duration-200 cursor-pointer select-none
                                    ${isSelected
                                        ? variantCritical
                                            ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/30'
                                            : 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30'
                                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {v.talla}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stock display row — shows stock for current selection */}
            <div className="grid grid-cols-2 gap-3">
                <div className={`p-2 rounded-lg border ${isCritical ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                    <p className={`text-[10px] uppercase font-bold mb-0.5 ${isCritical ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-500'}`}>
                        {selectedIndex !== null ? `Stock ${variants[selectedIndex].talla}` : 'Stock Total'}
                    </p>
                    <p className={`text-2xl font-bold font-mono leading-none transition-all duration-200 ${isCritical ? 'text-red-600 dark:text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {currentStock}
                    </p>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Min (ROP)</p>
                    <p className="text-2xl font-bold font-mono text-slate-700 dark:text-slate-300 leading-none">{currentRop}</p>
                </div>
            </div>

            {/* Mini stock breakdown when "Todas" is selected */}
            {selectedIndex === null && variants.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {variants.map((v) => {
                        const vCritical = v.rop > 0 && v.stock <= v.rop;
                        return (
                            <div key={v.talla} className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-md border ${vCritical
                                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-500 dark:text-red-400'
                                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400'
                                }`}>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{v.talla}:</span>
                                <span className={`font-bold ${vCritical ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{v.stock}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
