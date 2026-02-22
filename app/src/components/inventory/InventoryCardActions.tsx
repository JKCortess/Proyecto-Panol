"use client";

import { useCart } from "@/context/cart-context";
import { Plus, ShoppingCart, Ruler, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

interface SizeVariantInfo {
    talla: string;
    stock: number;
    rop: number;
}

interface InventoryCardActionsProps {
    sku: string;
    nombre: string;
    valor: number;
    imagen?: string;
    marca?: string;
    /** Single talla (for items with 1 size or no sizes) */
    talla?: string;
    /** Stock for single items (no variants) or items with 1 talla */
    stock?: number;
    /** Multiple talla variants (for grouped items with >1 size) */
    variants?: SizeVariantInfo[];
    /** Total stock for all variants (used when showing "Todas" view) */
    totalStock?: number;
    /** Max ROP across variants */
    maxRop?: number;
}

export function InventoryCardActions({ sku, nombre, valor, imagen, marca, talla, stock, variants, totalStock, maxRop }: InventoryCardActionsProps) {
    const { addToCart, cart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const hasMultipleSizes = variants && variants.length > 0;

    // Determine the effective talla for adding to cart
    const effectiveTalla = hasMultipleSizes
        ? (selectedIndex !== null ? variants![selectedIndex].talla : undefined)
        : (talla || undefined);

    // Check if item is already in cart (match by sku + talla)
    const cartItem = cart.find(item => item.sku === sku && (item.talla || '') === (effectiveTalla || ''));
    const inCartQty = cartItem ? cartItem.cantidad : 0;

    // ─── Stock Limit Logic ────────────────────────────────────────────
    // Determine available stock based on selection
    const availableStock = hasMultipleSizes
        ? (selectedIndex !== null ? variants![selectedIndex].stock : undefined) // specific talla selected
        : (stock ?? undefined); // single item stock

    // Max quantity user can add = available stock - already in cart (min 0)
    const maxQuantity = availableStock !== undefined
        ? Math.max(0, availableStock - inCartQty)
        : undefined; // undefined = no limit (shouldn't happen but safe fallback)

    const isAtMax = maxQuantity !== undefined && quantity >= maxQuantity;
    const isOutOfStock = maxQuantity !== undefined && maxQuantity <= 0;

    // Clamp quantity when selection changes or cart updates change the max
    useEffect(() => {
        if (maxQuantity !== undefined && maxQuantity > 0 && quantity > maxQuantity) {
            setQuantity(maxQuantity);
        }
        if (maxQuantity !== undefined && maxQuantity <= 0) {
            setQuantity(1); // Reset to 1, button will be disabled anyway
        }
    }, [maxQuantity, quantity]);

    // Reset quantity to 1 when talla selection changes
    useEffect(() => {
        setQuantity(1);
    }, [selectedIndex]);

    const handleAdd = () => {
        if (quantity > 0 && !isOutOfStock) {
            if (hasMultipleSizes && selectedIndex === null) {
                return; // Require talla selection
            }
            // Final safety check
            if (maxQuantity !== undefined && quantity > maxQuantity) return;
            addToCart({ sku, nombre, valor, imagen, marca, talla: effectiveTalla }, quantity);
        }
    };

    const increment = () => setQuantity(prev => {
        if (maxQuantity !== undefined && prev >= maxQuantity) return prev;
        return prev + 1;
    });
    const decrement = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

    const needsSelection = hasMultipleSizes && selectedIndex === null;
    const isDisabled = needsSelection || isOutOfStock;

    // Stock display values when variants are present
    const currentStock = hasMultipleSizes
        ? (selectedIndex !== null ? variants![selectedIndex].stock : (totalStock ?? 0))
        : undefined;
    const currentRop = hasMultipleSizes
        ? (selectedIndex !== null ? variants![selectedIndex].rop : (maxRop ?? 0))
        : undefined;
    const isCritical = currentRop !== undefined && currentRop > 0 && currentStock !== undefined && currentStock <= currentRop;

    return (
        <div className="space-y-2 w-full">
            {/* Talla Selector + Stock for multi-size items */}
            {hasMultipleSizes && (
                <div className="space-y-2">
                    {/* Talla chips */}
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
                                        ? 'bg-slate-600 text-white border-slate-500 shadow-md shadow-slate-900/30'
                                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                Todas
                            </button>
                            {/* Individual size chips */}
                            {variants!.map((v, i) => {
                                const isSelected = selectedIndex === i;
                                const variantCritical = v.rop > 0 && v.stock <= v.rop;
                                const variantEmpty = v.stock <= 0;
                                return (
                                    <button
                                        key={`${v.talla}-${i}`}
                                        onClick={() => setSelectedIndex(i)}
                                        className={`text-[11px] font-mono font-semibold px-2 py-1 rounded-md border transition-all duration-200 cursor-pointer select-none
                                            ${variantEmpty && !isSelected
                                                ? 'bg-slate-100 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 border-slate-300 dark:border-slate-800 line-through'
                                                : isSelected
                                                    ? variantCritical
                                                        ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/30'
                                                        : 'bg-slate-600 text-white border-slate-500 shadow-md shadow-slate-900/30'
                                                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        {v.talla}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Stock display */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`p-2 rounded-lg border ${isCritical ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                            <p className={`text-[10px] uppercase font-bold mb-0.5 ${isCritical ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-500'}`}>
                                {selectedIndex !== null ? `Stock ${variants![selectedIndex].talla}` : 'Stock Total'}
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
                    {selectedIndex === null && variants!.length > 1 && (
                        <div className="flex gap-2 flex-wrap">
                            {variants!.map((v, i) => {
                                const vCritical = v.rop > 0 && v.stock <= v.rop;
                                return (
                                    <div key={`${v.talla}-${i}`} className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-md border ${vCritical
                                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-500 dark:text-red-400'
                                        : 'bg-transparent border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400'
                                        }`}>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{v.talla}:</span>
                                        <span className={`font-bold ${vCritical ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{v.stock}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Quantity Selector Row */}
            <div className="flex items-center gap-2 w-full">
                {/* Minus Button */}
                <button
                    onClick={decrement}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-lg font-bold select-none"
                    title="Reducir cantidad"
                >
                    −
                </button>

                {/* Quantity Display */}
                <div className={`flex-1 h-9 rounded-lg border flex items-center justify-center transition-all ${isOutOfStock
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                    : isAtMax
                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-700/40'
                        : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                    }`}>
                    <span className={`text-lg font-bold font-mono ${isOutOfStock ? 'text-red-500 dark:text-red-400' : isAtMax ? 'text-amber-500 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                        {isOutOfStock ? 0 : quantity}
                    </span>
                </div>

                {/* Plus Button */}
                <button
                    onClick={increment}
                    disabled={isAtMax || isOutOfStock}
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center text-white transition-all shadow-lg active:scale-95 select-none
                        ${isAtMax || isOutOfStock
                            ? 'bg-slate-400 dark:bg-slate-700 border-slate-300 dark:border-slate-600 opacity-40 cursor-not-allowed shadow-none'
                            : 'bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 border-slate-600 dark:border-slate-500 shadow-slate-900/30'
                        }`}
                    title={isAtMax ? "Stock máximo alcanzado" : isOutOfStock ? "Sin stock" : "Aumentar cantidad"}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Max stock warning */}
            {isAtMax && !isOutOfStock && !needsSelection && (
                <p className="text-center text-[10px] text-amber-400/80 font-medium flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Máx. disponible: {availableStock}{effectiveTalla ? ` (${effectiveTalla})` : ''}
                </p>
            )}

            {/* Out of stock warning */}
            {isOutOfStock && !needsSelection && (
                <p className="text-center text-[10px] text-red-400 font-medium flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Sin stock disponible{effectiveTalla ? ` (${effectiveTalla})` : ''}
                </p>
            )}

            {/* Add to Cart Button */}
            <button
                onClick={handleAdd}
                disabled={isDisabled}
                className={`w-full h-10 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all
                    ${isDisabled
                        ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60 shadow-none'
                        : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 dark:from-slate-600 dark:to-slate-500 dark:hover:from-slate-500 dark:hover:to-slate-400 shadow-slate-900/20'
                    }`}
                title={needsSelection ? "Selecciona una talla primero" : isOutOfStock ? "Sin stock" : "Agregar al Pedido"}
            >
                <ShoppingCart className="w-4 h-4" />
                {needsSelection ? 'Selecciona talla' : isOutOfStock ? 'Sin stock' : 'Agregar al pedido'}
            </button>

            {/* In-cart indicator */}
            {inCartQty > 0 && (
                <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 font-medium animate-in fade-in">
                    🛒 {inCartQty} en el carrito{effectiveTalla ? ` (${effectiveTalla})` : ''}
                </p>
            )}
        </div>
    );
}
