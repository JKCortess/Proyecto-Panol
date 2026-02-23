"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Ruler, DollarSign, MapPin, Tag, Package, Pencil } from "lucide-react";
import { ImageCarousel } from "@/components/inventory/ImageCarousel";
import { InventoryCardActions } from "@/components/inventory/InventoryCardActions";
import { EditItemModal } from "@/components/inventory/EditItemModal";
import type { GroupedInventoryItem } from "@/lib/data";

interface InventoryDeckProps {
    groupedItems: GroupedInventoryItem[];
    isAdmin: boolean;
}

export function InventoryDeck({ groupedItems, isAdmin }: InventoryDeckProps) {
    const router = useRouter();
    const [editingItem, setEditingItem] = useState<GroupedInventoryItem | null>(null);

    const handleSaved = useCallback(() => {
        // Re-fetch the page after a successful save to reflect Google Sheets changes
        router.refresh();
    }, [router]);

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {groupedItems.map((item, index) => {
                    const effectiveRop = item.hasSizes && item.variants.length === 1
                        ? item.variants[0].rop
                        : item.maxRop;
                    const effectiveStock = item.hasSizes && item.variants.length === 1
                        ? item.variants[0].stock
                        : item.totalStock;
                    const isCritical = effectiveRop > 0 && effectiveStock <= effectiveRop;

                    return (
                        <div key={`${item.nombre}-${item.marca}-${item.categoria}-${index}`} className={`group relative bg-white dark:bg-slate-900 rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] ui-card ${isCritical ? 'border-red-500/50 shadow-red-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>

                            {isCritical && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 transform bg-red-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-b-lg shadow-lg shadow-red-900/50 z-10 flex items-center gap-1 border-b border-x border-red-400/30">
                                    <AlertCircle className="w-3 h-3" /> STOCK CRÍTICO
                                </div>
                            )}

                            {/* Admin edit button */}
                            {isAdmin && (
                                <button
                                    onClick={() => setEditingItem(item)}
                                    className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 cursor-pointer"
                                    title="Editar ítem"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {/* Size count badge */}
                            {item.hasSizes && item.variants.length > 1 && (
                                <div className="absolute top-3 left-3 z-20">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600/80 text-white border border-purple-400/30 backdrop-blur-sm flex items-center gap-1">
                                        <Ruler className="w-3 h-3" />
                                        {item.variants.length} tallas
                                    </span>
                                </div>
                            )}

                            {/* Image Area — Carousel */}
                            <ImageCarousel fotos={item.fotos} alt={item.nombre} marca={item.marca} />

                            {/* Content Area */}
                            <div className="p-5 space-y-3">
                                <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-black dark:group-hover:text-white transition-colors" title={item.nombre}>{item.nombre}</h3>
                                    <p className="text-xs font-mono text-slate-500 mt-0.5">SKU: {item.sku}</p>
                                    {item.categoria && (
                                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                            <Tag className="w-3 h-3" />
                                            {item.categoria}
                                        </span>
                                    )}
                                    {item.descripcion_general && (
                                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2" title={item.descripcion_general}>{item.descripcion_general}</p>
                                    )}
                                </div>

                                {/* Value Display */}
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                    <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span className="text-lg font-bold font-mono text-amber-400 tracking-tight">
                                        {item.valor > 0 ? item.valor.toLocaleString("es-CL") : "-"}
                                    </span>
                                    <span className="text-[10px] text-amber-500/60 ml-auto">CLP</span>
                                </div>

                                {/* Stock grid for items without sizes OR with only a single size variant */}
                                {!(item.hasSizes && item.variants.length > 1) && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className={`p-2 rounded-lg border ${isCritical ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                                            <p className={`text-[10px] uppercase font-bold mb-0.5 ${isCritical ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-500'}`}>Stock</p>
                                            <p className={`text-2xl font-bold font-mono leading-none ${isCritical ? 'text-red-600 dark:text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{effectiveStock}</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Min (ROP)</p>
                                            <p className="text-2xl font-bold font-mono text-slate-700 dark:text-slate-300 leading-none">{effectiveRop}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Location Row */}
                                <div className="flex justify-between items-center text-xs text-slate-500 font-mono border-t border-slate-200 dark:border-slate-800 pt-3">
                                    <span className="flex items-center gap-1.5" title={`Estante ${item.estante_nro}, Nivel ${item.estante_nivel}`}>
                                        <MapPin className="w-3 h-3 text-slate-600" />
                                        {item.estante_nro ? (
                                            <span>E{item.estante_nro}{item.estante_nivel && ` / N${item.estante_nivel}`}</span>
                                        ) : (
                                            <span className="text-slate-700">Sin ubicación</span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-5 pb-5 pt-1">
                                <InventoryCardActions
                                    sku={item.sku}
                                    nombre={item.nombre}
                                    valor={item.valor}
                                    imagen={item.fotos.length > 0 ? item.fotos[0] : undefined}
                                    marca={item.marca || undefined}
                                    talla={item.hasSizes && item.variants.length === 1 ? item.variants[0].talla : undefined}
                                    stock={
                                        item.hasSizes && item.variants.length === 1
                                            ? item.variants[0].stock
                                            : !item.hasSizes
                                                ? item.totalStock
                                                : undefined
                                    }
                                    variants={item.hasSizes && item.variants.length > 1 ? item.variants.map(v => ({ talla: v.talla, stock: v.stock, rop: v.rop })) : undefined}
                                    totalStock={item.hasSizes && item.variants.length > 1 ? item.totalStock : undefined}
                                    maxRop={item.hasSizes && item.variants.length > 1 ? item.maxRop : undefined}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edit Modal — rendered outside the grid */}
            {editingItem && (
                <EditItemModal
                    open={!!editingItem}
                    onClose={() => setEditingItem(null)}
                    item={{
                        sku: editingItem.sku,
                        nombre: editingItem.nombre,
                        talla: editingItem.hasSizes && editingItem.variants.length === 1 ? editingItem.variants[0].talla : undefined,
                        foto: editingItem.fotos.length > 0 ? editingItem.fotos[0] : undefined,
                        marca: editingItem.marca || undefined,
                        categoria: editingItem.categoria,
                        stock: editingItem.hasSizes && editingItem.variants.length === 1
                            ? editingItem.variants[0].stock
                            : editingItem.totalStock,
                        rop: editingItem.hasSizes && editingItem.variants.length === 1
                            ? editingItem.variants[0].rop
                            : editingItem.maxRop,
                        valor: editingItem.valor,
                        estante_nro: editingItem.estante_nro,
                        estante_nivel: editingItem.estante_nivel,
                        descripcion_general: editingItem.descripcion_general,
                        observacion: editingItem.observacion,
                        proveedor: editingItem.proveedor,
                    }}
                    onSaved={handleSaved}
                />
            )}
        </>
    );
}
