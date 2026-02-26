"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterTextInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

export function FilterTextInput({
    value,
    onChange,
    placeholder = "Filtrar...",
    label,
    className,
}: FilterTextInputProps) {
    const [localValue, setLocalValue] = React.useState(value);
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const isFocusedRef = React.useRef(false);

    // Sync local state with external value ONLY when not actively typing
    React.useEffect(() => {
        if (!isFocusedRef.current) {
            setLocalValue(value);
        }
    }, [value]);

    // Cleanup debounce on unmount
    React.useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const handleChange = (newValue: string) => {
        setLocalValue(newValue);
        // Debounce the URL update to avoid rapid re-renders
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onChange(newValue);
        }, 800);
    };

    const clearValue = () => {
        setLocalValue("");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onChange("");
    };

    return (
        <div className={cn("relative w-full", className)}>
            {label && (
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1 tracking-wider">
                    {label}
                </div>
            )}
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onFocus={() => { isFocusedRef.current = true; }}
                    onBlur={() => { isFocusedRef.current = false; }}
                    placeholder={placeholder}
                    className={cn(
                        "w-full input-with-icon pr-8 py-2.5 text-sm bg-white dark:bg-slate-900 border rounded-lg shadow-sm transition-all duration-200",
                        "placeholder:text-slate-400 dark:placeholder:text-slate-600",
                        "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                        localValue
                            ? "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-200"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                    )}
                />
                {localValue && (
                    <button
                        onClick={clearValue}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-red-400 transition-colors"
                        title="Limpiar"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
