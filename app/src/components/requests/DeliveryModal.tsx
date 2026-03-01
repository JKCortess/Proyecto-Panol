'use client';

import { useState } from 'react';
import {
    Loader2, X, AlertTriangle, Package, Plus, Minus, Edit3, Search,
} from 'lucide-react';
import { ModernDatePicker } from '@/components/ui/ModernDatePicker';
import { searchInventory, getInventoryBySKUs, type InventoryDetailItem, type InventoryItem } from '@/app/(app)/requests/search-action';
import { toast } from 'sonner';
import type { Request, RequestItem } from './request-types';

interface DeliveryModalProps {
    request: Request;
    onClose: () => void;
    onConfirmDelivery: (requestId: string, deliveryDate: string, deliveryItems: RequestItem[], isModified: boolean) => void;
    isSubmitting: boolean;
}

export function DeliveryModal({ request, onClose, onConfirmDelivery, isSubmitting }: DeliveryModalProps) {
    const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [deliverModalInventory, setDeliverModalInventory] = useState<Record<string, InventoryDetailItem>>({});
    const [loadingInventory, setLoadingInventory] = useState(true);
    const [deliveryItems, setDeliveryItems] = useState<RequestItem[]>(
        (request.items_detail as RequestItem[]).map(item => ({ ...item }))
    );
    const [showAddItem, setShowAddItem] = useState(false);
    const [addItemQuery, setAddItemQuery] = useState('');
    const [addItemResults, setAddItemResults] = useState<InventoryItem[]>([]);
    const [addItemLoading, setAddItemLoading] = useState(false);

    // Load inventory data on mount
    useState(() => {
        const loadInventory = async () => {
            try {
                const itemsForLookup = (request.items_detail as RequestItem[])
                    .filter(item => item.sku)
                    .map(item => ({ sku: item.sku, talla: item.talla }));
                const invData = await getInventoryBySKUs(itemsForLookup);
                setDeliverModalInventory(invData);
            } catch (error) {
                console.error('Error loading delivery inventory:', error);
            } finally {
                setLoadingInventory(false);
            }
        };
        loadInventory();
    });

    const updateQuantity = (index: number, delta: number) => {
        setDeliveryItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            return { ...item, quantity: Math.max(0, item.quantity + delta) };
        }));
    };

    const setQuantity = (index: number, quantity: number) => {
        setDeliveryItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            return { ...item, quantity: Math.max(0, quantity) };
        }));
    };

    const removeItem = (index: number) => {
        setDeliveryItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddItemSearch = async (query: string) => {
        setAddItemQuery(query);
        if (query.trim().length < 2) { setAddItemResults([]); return; }
        setAddItemLoading(true);
        try {
            const results = await searchInventory(query);
            setAddItemResults(results);
        } catch { setAddItemResults([]); }
        finally { setAddItemLoading(false); }
    };

    const addItemToDelivery = async (invItem: InventoryItem) => {
        const existingIdx = deliveryItems.findIndex(di => di.sku === invItem.sku);
        if (existingIdx >= 0) {
            updateQuantity(existingIdx, 1);
        } else {
            setDeliveryItems(prev => [...prev, { sku: invItem.sku, detail: invItem.nombre, quantity: 1, value: invItem.valor }]);
        }
        const invData = await getInventoryBySKUs([{ sku: invItem.sku }]);
        setDeliverModalInventory(prev => ({ ...prev, ...invData }));
        setShowAddItem(false);
        setAddItemQuery('');
        setAddItemResults([]);
        toast.success(`${invItem.nombre} agregado a la entrega`);
    };

    const isModified = (): boolean => {
        const originalItems = request.items_detail as RequestItem[];
        if (deliveryItems.length !== originalItems.length) return true;
        return deliveryItems.some((di, idx) => {
            const orig = originalItems[idx];
            return !orig || di.sku !== orig.sku || di.quantity !== orig.quantity || di.talla !== orig.talla;
        });
    };

    const handleConfirm = () => {
        if (!deliveryDate) return;
        onConfirmDelivery(request.id, deliveryDate, deliveryItems, isModified());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="flex flex-col space-y-1.5 p-6 pb-2 shrink-0">
                    <h3 className="font-semibold text-lg leading-none tracking-tight text-white flex justify-between items-center">
                        <span className="flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-blue-400" />
                            Confirmar Entrega
                        </span>
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </h3>
                    <p className="text-sm text-slate-400">
                        Solicitud <span className="font-mono text-blue-400">{request.request_code}</span> — Puedes modificar cantidades, eliminar o agregar ítems antes de entregar.
                    </p>
                </div>

                <div className="p-6 pt-2 space-y-4 overflow-y-auto flex-1">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 block">Fecha de Entrega</label>
                        <ModernDatePicker value={deliveryDate} onChange={setDeliveryDate} className="w-full" placeholder="Seleccionar fecha" />
                    </div>

                    {isModified() && (
                        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 flex items-start gap-3">
                            <Edit3 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-200/80">
                                <p className="font-medium text-amber-400">Entrega modificada</p>
                                <p>Los ítems difieren de la solicitud original. Se guardará el registro de ambas versiones.</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-blue-400" /> Ítems a Entregar
                            </label>
                            <button onClick={() => setShowAddItem(!showAddItem)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-all">
                                <Plus className="w-3 h-3" /> Agregar Ítem
                            </button>
                        </div>

                        {showAddItem && (
                            <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-3 space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input type="text" value={addItemQuery} onChange={(e) => handleAddItemSearch(e.target.value)}
                                        placeholder="Buscar componente por SKU o nombre..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg input-with-icon pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                        autoFocus />
                                </div>
                                {addItemLoading && (
                                    <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...
                                    </div>
                                )}
                                {addItemResults.length > 0 && (
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {addItemResults.map((item) => (
                                            <button key={item.sku} onClick={() => addItemToDelivery(item)}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/60 transition-colors flex items-center justify-between group">
                                                <div>
                                                    <span className="text-white text-xs font-medium">{item.nombre}</span>
                                                    <span className="ml-2 text-[10px] text-blue-400 font-mono">{item.sku}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold ${item.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>Stock: {item.stock}</span>
                                                    <Plus className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {addItemQuery.length >= 2 && !addItemLoading && addItemResults.length === 0 && (
                                    <p className="text-xs text-slate-500 py-2">No se encontraron resultados.</p>
                                )}
                            </div>
                        )}

                        {loadingInventory ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                <span className="ml-2 text-sm text-slate-400">Cargando stock...</span>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-slate-800 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-900/80">
                                        <tr className="text-slate-500 text-[11px] uppercase tracking-wider">
                                            <th className="px-3 py-2 text-left">Componente</th>
                                            <th className="px-3 py-2 text-center">Solicitado</th>
                                            <th className="px-3 py-2 text-center">Entregar</th>
                                            <th className="px-3 py-2 text-center">Stock</th>
                                            <th className="px-3 py-2 text-center">Result.</th>
                                            <th className="px-3 py-2 text-center w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {deliveryItems.map((item, idx) => {
                                            const compositeKey = item.talla ? `${item.sku}::${item.talla}` : item.sku;
                                            const inv = deliverModalInventory[compositeKey]
                                                || deliverModalInventory[item.sku]
                                                || (() => {
                                                    const n = item.sku.toLowerCase().replace(/[^a-z0-9]/g, '');
                                                    for (const [key, val] of Object.entries(deliverModalInventory)) {
                                                        const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                                                        if (k.includes(n) || n.includes(k)) return val;
                                                    }
                                                    return null;
                                                })();
                                            const currentStock = inv ? inv.stock : null;
                                            const afterStock = currentStock !== null ? currentStock - item.quantity : null;
                                            const isWarning = afterStock !== null && afterStock < 0;
                                            const originalItem = (request.items_detail as RequestItem[]).find(
                                                oi => oi.sku === item.sku && (oi.talla || '') === (item.talla || '')
                                            );
                                            const originalQty = originalItem?.quantity;
                                            const qtyChanged = originalQty !== undefined && originalQty !== item.quantity;
                                            const isNewItem = !originalItem;

                                            return (
                                                <tr key={idx} className={`transition-colors ${item.quantity === 0 ? 'opacity-40' : 'hover:bg-slate-800/30'}`}>
                                                    <td className="px-3 py-2.5">
                                                        <div className="text-white text-xs font-medium truncate max-w-[160px]" title={item.detail}>{item.detail}</div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {item.talla && <span className="text-[10px] text-purple-400">Talla: {item.talla}</span>}
                                                            {isNewItem && (
                                                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-medium">NUEVO</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center"><span className="text-slate-500 text-xs font-mono">{originalQty ?? '—'}</span></td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => updateQuantity(idx, -1)} disabled={item.quantity <= 0}
                                                                className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors disabled:opacity-30">
                                                                <Minus className="w-3 h-3 text-slate-300" />
                                                            </button>
                                                            <input type="number" value={item.quantity}
                                                                onChange={(e) => setQuantity(idx, parseInt(e.target.value) || 0)}
                                                                className={`w-12 text-center text-xs font-bold rounded-md border bg-slate-900 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${qtyChanged ? 'text-amber-400 border-amber-500/40' : 'text-white border-slate-700'}`}
                                                                min="0" />
                                                            <button onClick={() => updateQuantity(idx, 1)}
                                                                className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors">
                                                                <Plus className="w-3 h-3 text-slate-300" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className={`font-bold text-xs ${currentStock !== null ? 'text-slate-200' : 'text-slate-600'}`}>
                                                            {currentStock !== null ? currentStock : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        {afterStock !== null ? (
                                                            <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full ${isWarning ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                                                                {isWarning && <AlertTriangle className="w-3 h-3" />}{afterStock}
                                                            </span>
                                                        ) : <span className="text-slate-600 text-xs">—</span>}
                                                    </td>
                                                    <td className="px-1 py-2.5 text-center">
                                                        <button onClick={() => removeItem(idx)}
                                                            className="w-6 h-6 rounded-md flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Quitar de la entrega">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {deliveryItems.length === 0 && (
                                            <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500 text-sm">No hay ítems para entregar. Agrega al menos uno.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {!loadingInventory && deliveryItems.some(item => {
                        const ck = item.talla ? `${item.sku}::${item.talla}` : item.sku;
                        const inv = deliverModalInventory[ck] || deliverModalInventory[item.sku];
                        return inv && (inv.stock - item.quantity) < 0;
                    }) && (
                            <div className="bg-red-900/20 border border-red-900/50 rounded-md p-3 flex items-start gap-3">
                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <div className="text-sm text-red-200/80">
                                    <p className="font-medium text-red-400">Advertencia</p>
                                    <p>Uno o más ítems quedarán con stock negativo tras la entrega.</p>
                                </div>
                            </div>
                        )}
                </div>

                <div className="p-6 pt-0 flex items-center justify-between gap-2 shrink-0 border-t border-slate-800/50">
                    <div className="text-xs text-slate-500">
                        {deliveryItems.filter(i => i.quantity > 0).length} ítem(s) · {deliveryItems.reduce((s, i) => s + i.quantity, 0)} unidades
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white h-10 px-4 py-2 text-slate-400">
                            Cancelar
                        </button>
                        <button onClick={handleConfirm}
                            disabled={isSubmitting || !deliveryDate || deliveryItems.filter(i => i.quantity > 0).length === 0}
                            className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 disabled:opacity-50 ${isModified() ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</>
                            ) : isModified() ? (
                                <><Edit3 className="mr-2 h-4 w-4" />Entregar con Modificaciones</>
                            ) : 'Confirmar Entrega'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
