"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, Check, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface InventoryActionToolbarProps {
    totalItems: number;
    isAdmin?: boolean;
}

type SortOption = {
    value: string;
    label: string;
    icon?: React.ReactNode;
};

type RefreshState = 'idle' | 'loading' | 'success' | 'error';

const SORT_OPTIONS: SortOption[] = [
    { value: "name_asc", label: "Nombre (A-Z)", icon: <ArrowDown className="w-3 h-3 ml-1" /> },
    { value: "name_desc", label: "Nombre (Z-A)", icon: <ArrowUp className="w-3 h-3 ml-1" /> },
    { value: "price_asc", label: "Precio: Menor a Mayor", icon: <ArrowUp className="w-3 h-3 ml-1" /> },
    { value: "price_desc", label: "Precio: Mayor a Menor", icon: <ArrowDown className="w-3 h-3 ml-1" /> },
    { value: "brand_asc", label: "Marca (A-Z)", icon: <ArrowDown className="w-3 h-3 ml-1" /> },
    { value: "brand_desc", label: "Marca (Z-A)", icon: <ArrowUp className="w-3 h-3 ml-1" /> },
];

const COOLDOWN_MS = 10_000; // 10-second cooldown between forced refreshes

export function InventoryActionToolbar({ totalItems, isAdmin }: InventoryActionToolbarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    // Refresh button state
    const [refreshState, setRefreshState] = useState<RefreshState>('idle');
    const [lastRefresh, setLastRefresh] = useState<number>(0);
    const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);


    const currentSort = searchParams.get("sort") || "name_asc";

    const updateParam = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`/inventory?${params.toString()}`);
    };

    // Close sort dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Auto-reset refresh state after showing success/error
    useEffect(() => {
        if (refreshState === 'success' || refreshState === 'error') {
            const timeout = setTimeout(() => setRefreshState('idle'), 3000);
            return () => clearTimeout(timeout);
        }
    }, [refreshState]);

    // Cooldown timer — count down and re-enable button when cooldown expires
    useEffect(() => {
        if (lastRefresh === 0) return;

        const remaining = COOLDOWN_MS - (Date.now() - lastRefresh);
        if (remaining <= 0) {
            setCooldownRemaining(0);
            return;
        }

        setCooldownRemaining(remaining);

        const interval = setInterval(() => {
            const newRemaining = COOLDOWN_MS - (Date.now() - lastRefresh);
            if (newRemaining <= 0) {
                setCooldownRemaining(0);
                clearInterval(interval);
            } else {
                setCooldownRemaining(newRemaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lastRefresh]);

    const handleForceRefresh = useCallback(async () => {
        // Cooldown check
        const now = Date.now();
        if (now - lastRefresh < COOLDOWN_MS) {
            return; // Still in cooldown
        }

        setRefreshState('loading');
        setLastRefresh(now);

        try {
            const res = await fetch('/api/revalidate-inventory', { method: 'POST' });
            const data = await res.json();

            if (res.ok && data.success) {
                setRefreshState('success');
                // Refresh the page to load fresh data
                router.refresh();
            } else {
                console.error('[Refresh] Error:', data.error);
                setRefreshState('error');
            }
        } catch (err) {
            console.error('[Refresh] Network error:', err);
            setRefreshState('error');
        }
    }, [lastRefresh, router]);

    const selectedSortLabel = SORT_OPTIONS.find(o => o.value === currentSort)?.label || "Ordenar por";

    const isInCooldown = cooldownRemaining > 0;
    const isRefreshDisabled = refreshState === 'loading' || isInCooldown;

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white/80 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm gap-4">

            {/* Item Count */}
            <div className="flex items-center gap-3">
                <span className="ui-meta font-mono text-sm pl-2">
                    Mostrando <span className="text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">{totalItems}</span> ítems
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">

                {/* Admin: Force Refresh Button */}
                {isAdmin && (
                    <button
                        onClick={handleForceRefresh}
                        disabled={isRefreshDisabled}
                        title={
                            refreshState === 'loading'
                                ? 'Actualizando datos...'
                                : refreshState === 'success'
                                    ? '¡Datos actualizados!'
                                    : isInCooldown
                                        ? 'Espera unos segundos antes de actualizar de nuevo'
                                        : 'Forzar actualización de datos desde Google Sheets'
                        }
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all shadow-sm border",
                            refreshState === 'success'
                                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 cursor-default"
                                : refreshState === 'error'
                                    ? "bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 cursor-default"
                                    : refreshState === 'loading'
                                        ? "bg-slate-100 dark:bg-blue-950/50 border-slate-300 dark:border-blue-500/40 text-slate-500 dark:text-blue-400 cursor-wait"
                                        : isInCooldown
                                            ? "bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50"
                                            : "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-400 dark:hover:border-amber-400/50 hover:text-amber-700 dark:hover:text-amber-300 focus:ring-2 focus:ring-amber-500/20"
                        )}
                    >
                        {refreshState === 'success' ? (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>¡Actualizado!</span>
                            </>
                        ) : refreshState === 'error' ? (
                            <>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Error</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw className={cn("w-3.5 h-3.5", refreshState === 'loading' && "animate-spin")} />
                                <span className="hidden sm:inline">{refreshState === 'loading' ? 'Actualizando...' : 'Actualizar Datos'}</span>
                            </>
                        )}
                    </button>
                )}

                {/* Sort Dropdown */}
                <div className="relative" ref={sortRef}>
                    <button
                        onClick={() => setIsSortOpen(!isSortOpen)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-700 transition-all shadow-sm focus:ring-2 focus:ring-slate-500/20"
                    >
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                        <span>{selectedSortLabel}</span>
                        <ChevronDown className={`w-3 h-3 text-slate-600 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSortOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <div className="p-1 space-y-0.5">
                                <div className="px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-950/30">Ordenar por</div>
                                {SORT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            updateParam("sort", option.value);
                                            setIsSortOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-lg transition-colors",
                                            currentSort === option.value
                                                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-medium"
                                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                        )}
                                    >
                                        <span className="flex items-center">
                                            {option.label}
                                            {option.icon}
                                        </span>
                                        {currentSort === option.value && <Check className="w-3 h-3" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
}
