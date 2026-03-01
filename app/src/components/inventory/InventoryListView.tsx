"use client";

import { useState, useEffect, useRef } from "react";
import { Package, Loader2 } from "lucide-react";
import Image from "next/image";
import type { InventoryItem } from "@/lib/data";

const INITIAL_LOAD = 60;
const LOAD_MORE = 20;

interface InventoryListViewProps {
    items: InventoryItem[];
    formatCLP: (value: number) => string;
}

export function InventoryListView({ items, formatCLP }: InventoryListViewProps) {
    const [displayCount, setDisplayCount] = useState(INITIAL_LOAD);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Reset display count when items change (filters, search, sort)
    useEffect(() => {
        setDisplayCount(INITIAL_LOAD);
    }, [items]);

    // IntersectionObserver to load more items on scroll
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setDisplayCount((prev) => Math.min(prev + LOAD_MORE, items.length));
                }
            },
            { rootMargin: "200px" }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [items.length]);

    const visibleItems = items.slice(0, displayCount);
    const hasMore = displayCount < items.length;

    return (
        <>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 ui-table">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase text-slate-400 bg-slate-950/60 border-b border-slate-800">
                        <tr>
                            <th className="px-4 py-3 font-mono">SKU</th>
                            <th className="px-4 py-3">Nombre</th>
                            <th className="px-4 py-3">Categoría</th>
                            <th className="px-4 py-3">Marca</th>
                            <th className="px-4 py-3 text-center">Talla</th>
                            <th className="px-4 py-3 text-center">Stock</th>
                            <th className="px-4 py-3 text-center">Reservado</th>
                            <th className="px-4 py-3 text-center">Estante</th>
                            <th className="px-4 py-3 text-right">Valor CLP</th>
                            <th className="px-4 py-3 text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {visibleItems.map((item, index) => {
                            const isCritical = item.rop > 0 && item.stock <= item.rop;
                            const isLow = item.rop > 0 && !isCritical && item.stock <= item.rop * 1.5;

                            return (
                                <tr key={`${item.sku}-${index}`} className="hover:bg-slate-800/40 transition-colors group">
                                    <td className="px-4 py-3 font-mono text-slate-400 text-xs whitespace-nowrap">{item.sku}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                                {item.fotos.length > 0 ? (
                                                    <Image src={item.fotos[0]} alt={item.nombre} width={32} height={32} className="object-cover w-full h-full" unoptimized />
                                                ) : (
                                                    <Package className="w-4 h-4 text-slate-600" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-slate-200 font-medium truncate max-w-[200px]" title={item.nombre}>{item.nombre}</p>
                                                {item.descripcion_general && (
                                                    <p className="text-[10px] text-slate-500 truncate max-w-[200px]" title={item.descripcion_general}>{item.descripcion_general}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">{item.categoria}</td>
                                    <td className="px-4 py-3">
                                        <span className="ui-chip text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{item.marca || '-'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {item.talla ? (
                                            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{item.talla}</span>
                                        ) : (
                                            <span className="text-slate-700">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`font-mono font-bold text-base ${isCritical ? 'text-red-500' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>{item.stock}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-500 font-mono">{item.reservado}</td>
                                    <td className="px-4 py-3 text-center">
                                        {item.estante_nro ? (
                                            <span className="text-xs font-mono text-slate-400">
                                                E{item.estante_nro}
                                                {item.estante_nivel && <span className="text-slate-600"> / N{item.estante_nivel}</span>}
                                            </span>
                                        ) : (
                                            <span className="text-slate-700">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs">
                                        <span className="text-amber-400 font-bold">{formatCLP(item.valor)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {isCritical ? (
                                            <span className="ui-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>Crítico
                                            </span>
                                        ) : isLow ? (
                                            <span className="ui-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Bajo
                                            </span>
                                        ) : (
                                            <span className="ui-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>OK
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Infinite scroll sentinel + loading indicator */}
            <div ref={sentinelRef} className="w-full py-1" />
            {hasMore && (
                <div className="flex flex-col items-center gap-2 py-6">
                    <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                    <span className="text-xs text-slate-500 font-mono">
                        Mostrando {visibleItems.length} de {items.length} ítems...
                    </span>
                </div>
            )}
        </>
    );
}
