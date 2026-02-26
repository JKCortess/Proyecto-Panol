'use client'

import { useState, useEffect } from 'react';
import { getFrequentItems, type FrequentItem } from '@/app/requests/frequent-items-action';
import Image from 'next/image';
import {
    Flame,
    Plus,
    ChevronDown,
    ChevronUp,
    ArrowUpDown,
    Package,
    Tag,
    Ruler,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FrequentItemsProps {
    userId: string;
    onAddItem: (item: {
        sku: string;
        detail: string;
        quantity: number;
        value: number;
        imagen: string;
        talla?: string;
        marca?: string;
    }) => void;
}

export function FrequentItems({ userId, onAddItem }: FrequentItemsProps) {
    const [items, setItems] = useState<FrequentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [sortAsc, setSortAsc] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getFrequentItems(userId)
            .then((data) => {
                if (!cancelled) setItems(data);
            })
            .catch(console.error)
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [userId]);

    // Don't render anything if no history
    if (!loading && items.length === 0) return null;

    const displayItems = sortAsc ? [...items].reverse() : items;

    const handleAdd = (item: FrequentItem) => {
        onAddItem({
            sku: item.sku,
            detail: item.detail,
            quantity: 1,
            value: item.valor || 0,
            imagen: item.imagen || '',
            talla: item.talla,
            marca: item.marca,
        });
    };

    return (
        <div className="bg-white/80 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in duration-300">
            {/* Header — always visible */}
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Flame className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            Pedidos Frecuentes
                            {!loading && items.length > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                                    {items.length}
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            Agrega rápidamente lo que más solicitas
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                    )}
                </div>
            </button>

            {/* Collapsible body */}
            <div
                className={cn(
                    'transition-all duration-300 ease-in-out overflow-hidden',
                    expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                )}
            >
                {/* Sort toggle */}
                <div className="px-6 pb-3 flex items-center justify-end">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSortAsc((v) => !v);
                        }}
                        className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        {sortAsc ? 'Menor → Mayor' : 'Mayor → Menor'}
                    </button>
                </div>

                {/* Items grid */}
                <div className="px-6 pb-5 space-y-2 overflow-y-auto max-h-[480px] custom-scrollbar">
                    {loading ? (
                        <div className="py-8 text-center text-slate-500 text-sm">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                            Cargando historial...
                        </div>
                    ) : (
                        displayItems.map((item, i) => (
                            <div
                                key={`${item.sku}-${item.talla || ''}-${i}`}
                                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors group/item"
                            >
                                {/* Image */}
                                {item.imagen ? (
                                    <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
                                        <Image
                                            src={item.imagen}
                                            alt=""
                                            width={40}
                                            height={40}
                                            className="w-full h-full object-cover"
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-md border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                                        <Package className="w-4 h-4 text-slate-400 dark:text-slate-700" />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-800 dark:text-slate-200 truncate font-medium">
                                        {item.detail}
                                    </p>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                            {item.sku}
                                        </span>
                                        {item.marca && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                                <Tag className="w-2.5 h-2.5" />
                                                {item.marca}
                                            </span>
                                        )}
                                        {item.talla && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                <Ruler className="w-2.5 h-2.5" />
                                                {item.talla}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Frequency badge */}
                                <div className="shrink-0 text-center px-2">
                                    <span className="text-lg font-bold text-orange-500 dark:text-orange-400 leading-none">
                                        {item.cantidad_pedidos}
                                    </span>
                                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">
                                        uds
                                    </p>
                                </div>

                                {/* Add button */}
                                <button
                                    type="button"
                                    onClick={() => handleAdd(item)}
                                    className="shrink-0 p-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 transition-all active:scale-95"
                                    title="Agregar al carrito"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
