"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option {
    value: string;
    label: string;
}

interface FilterComboboxProps {
    options: Option[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

export function FilterCombobox({
    options,
    value = [], // Default to empty array
    onChange,
    placeholder = "Seleccionar...",
    label,
    className,
}: FilterComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    React.useEffect(() => {
        if (open && inputRef.current) {
            // Small delay to ensure render
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setSearch(""); // Reset search when closed
        }
    }, [open]);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (optionValue: string) => {
        if (value.includes(optionValue)) {
            onChange(value.filter((v) => v !== optionValue));
        } else {
            onChange([...value, optionValue]);
        }
        // Don't close on select for multi-select
    };

    const clearSelection = () => {
        onChange([]);
        // Keep open or close? User might want to clear and re-select. 
        // Usually keeping open is safer, but "borrar toda la selección" might imply reset.
        // Let's keep it open.
        inputRef.current?.focus();
    };

    // Helper to get display text
    const getDisplayText = () => {
        if (!value || value.length === 0) return placeholder;
        if (value.length === 1) {
            return options.find((o) => o.value === value[0])?.label || value[0];
        }
        return `${value.length} seleccionados`;
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            {label && <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1 tracking-wider">{label}</div>}

            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex items-center justify-between w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border rounded-lg shadow-sm transition-all duration-200 group",
                    open
                        ? "border-slate-500 ring-2 ring-slate-500/20 text-slate-900 dark:text-slate-200"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
                    value.length > 0 ? "bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-700" : ""
                )}
            >
                <span className="truncate mr-2 text-left">
                    {getDisplayText()}
                </span>
                <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {open && (
                <div className="absolute z-50 w-full min-w-[220px] mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                            <input
                                ref={inputRef}
                                className="w-full input-with-icon pr-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-slate-500/50 focus:ring-1 focus:ring-slate-500/20 transition-all font-medium"
                                placeholder={`Buscar...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        {value.length > 0 && (
                            <button
                                onClick={clearSelection}
                                title="Limpiar selección"
                                className="flex items-center justify-center w-8 h-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 transition-colors"
                            >
                                <Eraser className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="max-h-[240px] overflow-y-auto p-1.5 custom-scrollbar space-y-0.5">
                        {filteredOptions.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                                <Search className="w-8 h-8 opacity-20" />
                                No se encontraron resultados
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = value.includes(option.value);
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            "flex items-center w-full px-2 py-2 text-xs font-medium rounded-lg cursor-pointer transition-all group",
                                            isSelected
                                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/30"
                                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent"
                                        )}
                                    >
                                        <div className={cn(
                                            "mr-2 h-4 w-4 rounded flex items-center justify-center transition-colors border",
                                            isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-600"
                                        )}>
                                            {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                        <span className="truncate">{option.label}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
