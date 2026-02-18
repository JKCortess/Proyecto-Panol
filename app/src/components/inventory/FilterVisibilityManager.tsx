"use client";

import * as React from "react";
import { Check, Columns, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterVisibilityManagerProps {
    availableFilters: { key: string; label: string }[];
    visibleFilters: string[];
    onChange: (newVisibleFilters: string[]) => void;
}

export function FilterVisibilityManager({
    availableFilters,
    visibleFilters,
    onChange,
}: FilterVisibilityManagerProps) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleFilter = (key: string) => {
        if (visibleFilters.includes(key)) {
            onChange(visibleFilters.filter((k) => k !== key));
        } else {
            onChange([...visibleFilters, key]);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex items-center justify-center p-2.5 rounded-lg border transition-all duration-200 hover:shadow-lg hover:shadow-blue-900/10",
                    open
                        ? "bg-blue-600 border-blue-500 text-white shadow-blue-500/20"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
                title="Personalizar filtros"
            >
                <Settings2 className="w-5 h-5" />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                        <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-0.5">Filtros Visibles</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-600">Selecciona qué filtros mostrar</p>
                    </div>

                    <div className="p-1.5 space-y-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {availableFilters.map((filter) => {
                            const isVisible = visibleFilters.includes(filter.key);
                            return (
                                <button
                                    key={filter.key}
                                    onClick={() => toggleFilter(filter.key)}
                                    className={cn(
                                        "flex items-center w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors group",
                                        isVisible
                                            ? "text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800"
                                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                    )}
                                >
                                    <div className={cn(
                                        "w-4 h-4 mr-3 rounded border flex items-center justify-center transition-colors",
                                        isVisible
                                            ? "bg-blue-600 border-blue-500 text-white"
                                            : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-500"
                                    )}>
                                        {isVisible && <Check className="w-3 h-3" />}
                                    </div>
                                    {filter.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30">
                        <button
                            onClick={() => onChange(availableFilters.map(f => f.key))}
                            className="w-full py-1.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors"
                        >
                            Mostrar Todos
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
