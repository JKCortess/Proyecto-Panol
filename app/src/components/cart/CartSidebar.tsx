"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useCart } from "@/context/cart-context";
import { ShoppingBasket, X, Trash2, CheckCircle, Package, DollarSign, Minus, Plus, Ruler, Tag } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

// Helper to format CLP values
const formatCLP = (value: number) => {
    if (!value) return "$0";
    return `$${value.toLocaleString("es-CL")}`;
};

// Admin route prefixes where the cart FAB should be hidden
const ADMIN_ROUTES = ["/scan", "/requests/pending", "/stock", "/admin"];

const FAB_STORAGE_KEY = "cart-fab-position";
const FAB_SIZE = 56; // approximate button size in px
const DRAG_THRESHOLD = 5; // px to distinguish click from drag

function loadFabPosition(): { x: number; y: number } | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(FAB_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
}

function saveFabPosition(pos: { x: number; y: number }) {
    try {
        localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify(pos));
    } catch { /* ignore */ }
}

function clampPosition(x: number, y: number) {
    const maxX = window.innerWidth - FAB_SIZE;
    const maxY = window.innerHeight - FAB_SIZE;
    return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY)),
    };
}

export function CartSidebar() {
    const { items, isOpen, setIsOpen, removeFromCart, updateQuantity, totalItems, totalValue, hasMounted } = useCart();
    const router = useRouter();
    const pathname = usePathname();
    const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);

    // --- Draggable FAB state ---
    const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
    const isDragging = useRef(false);
    const didDrag = useRef(false);
    const dragStart = useRef({ x: 0, y: 0, fabX: 0, fabY: 0 });
    const fabRef = useRef<HTMLButtonElement>(null);

    // Initialize position from localStorage or default (bottom-right)
    useEffect(() => {
        const saved = loadFabPosition();
        if (saved) {
            setFabPos(clampPosition(saved.x, saved.y));
        } else {
            // default: bottom-right, matching original position
            const isMobile = window.innerWidth < 768;
            setFabPos(clampPosition(window.innerWidth - FAB_SIZE - 24, window.innerHeight - (isMobile ? 96 : 24) - FAB_SIZE));
        }
    }, []);

    // Keep position clamped on window resize
    useEffect(() => {
        const handleResize = () => {
            setFabPos((prev) => prev ? clampPosition(prev.x, prev.y) : prev);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Pointer handlers for drag
    const onPointerDown = useCallback((e: React.PointerEvent) => {
        isDragging.current = true;
        didDrag.current = false;
        const pos = fabPos ?? { x: 0, y: 0 };
        dragStart.current = { x: e.clientX, y: e.clientY, fabX: pos.x, fabY: pos.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [fabPos]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        if (!didDrag.current && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        didDrag.current = true;
        const newPos = clampPosition(dragStart.current.fabX + dx, dragStart.current.fabY + dy);
        setFabPos(newPos);
    }, []);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        isDragging.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        if (didDrag.current && fabPos) {
            saveFabPosition(fabPos);
        }
        if (!didDrag.current) {
            setIsOpen(true);
        }
    }, [fabPos, setIsOpen]);

    // Hide the cart entirely on admin routes
    const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
    if (isAdminRoute) return null;

    const handleCheckout = () => {
        setIsOpen(false);
        router.push("/requests/new");
    };

    if (!isOpen) {
        return (
            <button
                ref={fabRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={fabPos ? { left: fabPos.x, top: fabPos.y } : { right: 24, bottom: 96 }}
                className="fixed z-50 p-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/30 transition-shadow active:scale-95 flex items-center gap-2 select-none touch-none cursor-grab active:cursor-grabbing"
            >
                <ShoppingBasket className="w-6 h-6 pointer-events-none" />
                {hasMounted && totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-xs font-bold border-2 border-slate-950 pointer-events-none">
                        {totalItems}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
                onClick={() => setIsOpen(false)}
            />

            <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShoppingBasket className="w-5 h-5 text-blue-400" />
                        Carrito
                    </h2>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center space-y-4">
                            <Package className="w-16 h-16 opacity-20" />
                            <p>El carrito está vacío.</p>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-blue-400 text-sm hover:underline"
                            >
                                Seguir navegando
                            </button>
                        </div>
                    ) : (
                        items.map((item) => {
                            const subtotal = (item.valor || 0) * item.cantidad;
                            return (
                                <div key={`${item.sku}-${item.talla || 'no-size'}`} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
                                    {/* Item name and SKU */}
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="w-12 h-12 rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                            {item.imagen ? (
                                                <Image src={item.imagen} alt={item.nombre} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                                            ) : (
                                                <Package className="w-5 h-5 text-slate-600" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-slate-200 truncate">{item.nombre}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                                                {item.marca && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                                        <Tag className="w-2.5 h-2.5" />
                                                        {item.marca}
                                                    </span>
                                                )}
                                                {item.talla && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                        <Ruler className="w-2.5 h-2.5" />
                                                        {item.talla}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {pendingDeleteKey === `${item.sku}-${item.talla || 'no-size'}` ? (
                                            <div className="flex items-center gap-1 shrink-0 animate-in fade-in duration-200">
                                                <span className="text-[10px] text-red-400 font-medium mr-0.5">¿Eliminar?</span>
                                                <button
                                                    onClick={() => { removeFromCart(item.sku, item.talla); setPendingDeleteKey(null); }}
                                                    className="w-6 h-6 rounded bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors"
                                                    title="Confirmar eliminación"
                                                >
                                                    <span className="text-xs font-bold">Sí</span>
                                                </button>
                                                <button
                                                    onClick={() => setPendingDeleteKey(null)}
                                                    className="w-6 h-6 rounded bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <span className="text-xs font-bold">No</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setPendingDeleteKey(`${item.sku}-${item.talla || 'no-size'}`)}
                                                className="text-slate-500 hover:text-red-400 transition-colors p-1 shrink-0"
                                                title="Eliminar del carrito"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Quantity controls + Value */}
                                    <div className="flex items-center justify-between gap-3">
                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => updateQuantity(item.sku, item.talla, item.cantidad - 1)}
                                                className="w-7 h-7 rounded-md bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
                                                title="Reducir"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-10 h-7 flex items-center justify-center rounded-md bg-slate-950 border border-slate-700 text-sm font-bold font-mono text-white">
                                                {item.cantidad}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(item.sku, item.talla, item.cantidad + 1)}
                                                className="w-7 h-7 rounded-md bg-blue-600 border border-blue-500 flex items-center justify-center text-white hover:bg-blue-500 transition-colors"
                                                title="Aumentar"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Item Value */}
                                        {item.valor > 0 ? (
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500">
                                                    {formatCLP(item.valor)} c/u
                                                </p>
                                                <p className="text-sm font-bold font-mono text-amber-400">
                                                    {formatCLP(subtotal)}
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-600 italic">Sin valor</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {items.length > 0 && (
                    <div className="p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm space-y-3">
                        {/* Total Items */}
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Total Ítems</span>
                            <span className="text-base font-bold text-white font-mono">{totalItems}</span>
                        </div>

                        {/* Total Value */}
                        {totalValue > 0 && (
                            <div className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <span className="text-amber-400 text-sm font-medium flex items-center gap-1.5">
                                    <DollarSign className="w-4 h-4" />
                                    Valor Total Estimado
                                </span>
                                <span className="text-lg font-bold text-amber-400 font-mono">
                                    {formatCLP(totalValue)}
                                </span>
                            </div>
                        )}

                        <button
                            onClick={handleCheckout}
                            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all
                                bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white shadow-blue-500/25`}
                        >
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Confirmar Pedido
                            </>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
