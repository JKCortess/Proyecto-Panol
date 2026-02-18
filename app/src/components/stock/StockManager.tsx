'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    ArrowDownRight,
    ArrowUpRight,
    History,
    PackagePlus,
    Calendar,
    User,
    Save,
    Trash2,
    ChevronLeft,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { InventoryAutocomplete } from '@/components/requests/InventoryAutocomplete';
import { ModernDatePicker } from '@/components/ui/ModernDatePicker';
import { type InventoryItem } from '@/app/requests/search-action';
import { addStockEntry, processStockExit } from '@/app/stock/actions';
import { toast } from 'sonner';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface StockManagerProps {
    userId: string;
    userName: string;
    userRole: string;
    userArea: string;
    recentMovements: StockMovement[];
    initialTab?: 'entry' | 'exit' | 'history';
}

type StockMovement = {
    id: string;
    created_at: string;
    movement_type: 'Entrada' | 'Salida' | string;
    sku: string;
    quantity_change: number;
    notes?: string | null;
    admin_id?: string | null;
};

type StockItem = {
    sku: string;
    name: string;
    quantity: number;
    currentStock: number;
    category?: string;
    brand?: string;
    image?: string;
    location?: string;
    value?: number;
};

export default function StockManager({ userId, userName, userRole, recentMovements, initialTab = 'entry' }: StockManagerProps) {
    const router = useRouter();
    const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
    if (supabaseRef.current == null) {
        supabaseRef.current = createClient();
    }
    const [activeTab, setActiveTab] = useState<'entry' | 'exit' | 'history'>(initialTab);
    const [items, setItems] = useState<StockItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [movementsState, setMovementsState] = useState<StockMovement[]>(recentMovements);
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
    const [isOnline, setIsOnline] = useState(true); // Default to true to assume connection
    const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'Entrada' | 'Salida'>('all');
    const [historySkuFilter, setHistorySkuFilter] = useState('');
    const [historyFromDate, setHistoryFromDate] = useState('');
    const [historyToDate, setHistoryToDate] = useState('');
    const [historyPage, setHistoryPage] = useState(1);
    const historyPageSize = 10;

    // Form states for Exit
    const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
    const [recipientName, setRecipientName] = useState('');
    const [recipientArea, setRecipientArea] = useState('');
    const [exitReason, setExitReason] = useState('');

    // Form states for Entry
    const [entryNotes, setEntryNotes] = useState('');

    const refreshMovements = useCallback(async () => {
        const supabase = supabaseRef.current;
        if (!supabase) return;
        const { data, error } = await supabase
            .from('stock_movements')
            .select('id, created_at, movement_type, sku, quantity_change, notes, admin_id')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) return;
        setMovementsState((data || []) as StockMovement[]);
    }, []);

    useEffect(() => {
        setMovementsState(recentMovements);
    }, [recentMovements]);

    // Network status listeners
    useEffect(() => {
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        setHistoryPage(1);
    }, [historyTypeFilter, historySkuFilter, historyFromDate, historyToDate]);

    useEffect(() => {
        const supabase = supabaseRef.current;
        if (!supabase) return;
        let refreshTimer: ReturnType<typeof setTimeout> | null = null;

        const scheduleRefresh = () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => {
                void refreshMovements();
            }, 300);
        };

        const channel = supabase
            .channel('stock-movements-live')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stock_movements' },
                () => scheduleRefresh()
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setRealtimeStatus('live');
                    return;
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    setRealtimeStatus('offline');
                }
            });

        void refreshMovements();

        return () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            void supabase.removeChannel(channel);
        };
    }, [refreshMovements]);

    const filteredMovements = useMemo(() => {
        const fromMs = historyFromDate ? new Date(`${historyFromDate}T00:00:00`).getTime() : null;
        const toMs = historyToDate ? new Date(`${historyToDate}T23:59:59.999`).getTime() : null;
        const skuQuery = historySkuFilter.trim().toLowerCase();

        return movementsState.filter((mov) => {
            if (historyTypeFilter !== 'all' && mov.movement_type !== historyTypeFilter) return false;
            if (skuQuery && !mov.sku.toLowerCase().includes(skuQuery)) return false;
            const createdMs = new Date(mov.created_at).getTime();
            if (fromMs && createdMs < fromMs) return false;
            if (toMs && createdMs > toMs) return false;
            return true;
        });
    }, [movementsState, historyTypeFilter, historySkuFilter, historyFromDate, historyToDate]);

    const totalHistoryPages = Math.max(1, Math.ceil(filteredMovements.length / historyPageSize));
    const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
    const paginatedMovements = filteredMovements.slice(
        (safeHistoryPage - 1) * historyPageSize,
        safeHistoryPage * historyPageSize
    );

    const historyCsvHref = useMemo(() => {
        const header = ['fecha_hora', 'tipo', 'sku', 'cantidad', 'notas', 'responsable'].join(',');
        const rows = filteredMovements.map((mov) => {
            const csv = (value: string) => `"${value.replace(/"/g, '""')}"`;
            return [
                csv(new Date(mov.created_at).toLocaleString('es-CL')),
                csv(mov.movement_type),
                csv(mov.sku),
                csv(String(mov.quantity_change)),
                csv(mov.notes || '-'),
                csv(userId === mov.admin_id ? 'Tú' : 'Administrador'),
            ].join(',');
        });
        return `data:text/csv;charset=utf-8,${encodeURIComponent([header, ...rows].join('\n'))}`;
    }, [filteredMovements, userId]);

    const handleAddItem = (item: InventoryItem) => {
        setItems(prev => {
            const existing = prev.find(i => i.sku === item.sku);
            if (existing) {
                return prev.map(i => i.sku === item.sku ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, {
                sku: item.sku,
                name: item.nombre,
                quantity: 1,
                currentStock: item.stock,
                category: item.categoria,
                location: item.ubicacion,
                image: item.imagen,
                value: item.valor
            }];
        });
    };

    const handleRemoveItem = (sku: string) => {
        setItems(prev => prev.filter(i => i.sku !== sku));
    };

    const handleQuantityChange = (sku: string, qty: number) => {
        if (qty < 1) return;
        setItems(prev => prev.map(i => i.sku === sku ? { ...i, quantity: qty } : i));
    };

    const handleSubmitEntry = async () => {
        if (items.length === 0) return;
        setIsSubmitting(true);

        try {
            const payload = items.map(i => ({
                sku: i.sku,
                name: i.name,
                quantity: i.quantity,
                category: i.category,
                image_url: i.image,
                value_clp: i.value,
                notes: entryNotes
            }));

            const result = await addStockEntry(payload, entryNotes);

            if (result.success) {
                toast.success('Entrada de stock registrada correctamente');
                setItems([]);
                setEntryNotes('');
                await refreshMovements();
            } else {
                toast.error('Error al registrar entrada: ' + result.message);
            }
        } catch {
            toast.error('Ocurrió un error inesperado');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitExit = async () => {
        if (items.length === 0) return;
        if (!recipientName || !recipientArea) {
            toast.error('Debe indicar destinatario y área');
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = items.map(i => ({
                sku: i.sku,
                name: i.name,
                quantity: i.quantity,
                reason: exitReason
            }));

            const result = await processStockExit(payload, exitDate, recipientName, recipientArea, exitReason);

            if (result.success) {
                toast.success('Salida de stock registrada correctamente');
                setItems([]);
                setRecipientName('');
                setRecipientArea('');
                setExitReason('');
                await refreshMovements();
            } else {
                toast.error('Error al registrar salida: ' + result.message);
            }
        } catch {
            toast.error('Ocurrió un error inesperado');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 screen-stock ui-page">
            {/* Header with Stats */}
            <div className="ui-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-2xl p-5 md:p-6">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-700/50"
                        title="Volver atrás"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="ui-section">
                        <h1 className="ui-title flex items-center gap-3">
                            Gestión de Stock
                            {!isOnline && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                                    <WifiOff className="w-3 h-3" /> Offline
                                </span>
                            )}
                        </h1>
                        <p className="ui-subtitle">Entrada, salida e historial del inventario en tiempo real.</p>
                        <p className="ui-meta mt-1">
                            Usuario: <span className="text-slate-300">{userName}</span> ({userRole})
                        </p>
                    </div>
                </div>

                <div className="flex gap-1.5 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800 shadow-inner ui-card">
                    <button
                        onClick={() => setActiveTab('entry')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'entry'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'ui-btn-secondary text-slate-400 hover:text-white hover:bg-slate-800/80'
                            }`}
                    >
                        <ArrowDownRight className="w-4 h-4" />
                        Entrada
                    </button>
                    <button
                        onClick={() => setActiveTab('exit')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'exit'
                            ? 'bg-amber-600 text-white shadow-lg'
                            : 'ui-btn-secondary text-slate-400 hover:text-white hover:bg-slate-800/80'
                            }`}
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Salida
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'history'
                            ? 'bg-slate-700 text-white shadow-md'
                            : 'ui-btn-secondary text-slate-400 hover:text-white hover:bg-slate-800/80'
                            }`}
                    >
                        <History className="w-4 h-4" />
                        Historial
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Panel: Search & Form */}
                {(activeTab === 'entry' || activeTab === 'exit') && (
                    <div className="lg:col-span-2 space-y-6">
                        <div className="ui-card bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
                            <div className="mb-6">
                                <label className="ui-meta font-bold uppercase tracking-wider mb-2 block">
                                    Buscar Componente
                                </label>
                                <InventoryAutocomplete
                                    value=""
                                    onChange={() => { }}
                                    onSelect={handleAddItem}
                                    placeholder="Escanear SKU o buscar por nombre..."
                                    className="bg-slate-950 border-slate-700 h-12 text-lg"
                                />
                            </div>

                            {/* Items Table */}
                            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40 backdrop-blur-sm ui-table">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-950 text-slate-400 font-medium uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3">Ítem</th>
                                            <th className="px-4 py-3 text-center w-32">Cantidad</th>
                                            <th className="px-4 py-3 text-right w-20">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {items.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-12 text-center text-slate-500">
                                                    <PackagePlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    <p>No hay ítems seleccionados</p>
                                                    <p className="text-xs">Usa el buscador para agregar componentes</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item) => (
                                                <tr key={item.sku} className="group hover:bg-slate-800/60 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            {item.image ? (
                                                                <Image src={item.image} alt="" width={40} height={40} className="w-10 h-10 rounded-xl bg-slate-800 object-cover" unoptimized />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                                                                    <PackagePlus className="w-5 h-5 text-slate-600" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-medium text-slate-200">{item.name}</p>
                                                                <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                                                                {activeTab === 'exit' && (
                                                                    <p className="text-[10px] text-emerald-500">Stock Actual: {item.currentStock}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleQuantityChange(item.sku, item.quantity - 1)}
                                                                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center ui-btn-secondary"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="number"
                                                                value={item.quantity}
                                                                onChange={(e) => handleQuantityChange(item.sku, parseInt(e.target.value) || 1)}
                                                                className="w-16 bg-slate-950 border border-slate-700 rounded-xl text-center py-1 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                                            />
                                                            <button
                                                                onClick={() => handleQuantityChange(item.sku, item.quantity + 1)}
                                                                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center ui-btn-secondary"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => handleRemoveItem(item.sku)}
                                                            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Right Panel: Context & Actions */}
                {(activeTab === 'entry' || activeTab === 'exit') && (
                    <div className="space-y-6">
                        <div className={`ui-card rounded-2xl border p-6 backdrop-blur-xl ${activeTab === 'entry'
                            ? 'bg-blue-900/10 border-blue-800/30'
                            : 'bg-amber-900/10 border-amber-800/30'
                            }`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`p-2 rounded-xl ${activeTab === 'entry' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                                    }`}>
                                    {activeTab === 'entry' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h2 className={`text-lg font-bold ${activeTab === 'entry' ? 'text-blue-100' : 'text-amber-100'
                                        }`}>
                                        {activeTab === 'entry' ? 'Entrada de Mercadería' : 'Salida de Stock'}
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        {activeTab === 'entry' ? 'Ingreso de nuevos componentes' : 'Retiro para uso inmediato'}
                                    </p>
                                </div>
                            </div>

                            {/* Entry Form Fields */}
                            {activeTab === 'entry' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="ui-meta font-semibold uppercase mb-1 block">Notas / Observaciones</label>
                                        <textarea
                                            value={entryNotes}
                                            onChange={(e) => setEntryNotes(e.target.value)}
                                            placeholder="Ej: Compra según factura #12345..."
                                            rows={3}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSubmitEntry}
                                        disabled={items.length === 0 || isSubmitting}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? 'Procesando...' : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Confirmar Entrada
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Exit Form Fields */}
                            {activeTab === 'exit' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="ui-meta font-semibold uppercase mb-1 block">Fecha de Salida</label>
                                        <ModernDatePicker
                                            value={exitDate}
                                            onChange={setExitDate}
                                            className="w-full"
                                            placeholder="Seleccionar fecha"
                                        />
                                    </div>
                                    <div>
                                        <label className="ui-meta font-semibold uppercase mb-1 block">Destinatario</label>
                                        <div className="relative">
                                            <User className="icon-left icon-left-sm text-slate-500" />
                                            <input
                                                type="text"
                                                value={recipientName}
                                                onChange={(e) => setRecipientName(e.target.value)}
                                                placeholder="Nombre del técnico..."
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 input-with-icon pr-3 text-sm text-slate-200 focus:border-amber-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="ui-meta font-semibold uppercase mb-1 block">Área</label>
                                        <select
                                            value={recipientArea}
                                            onChange={(e) => setRecipientArea(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:border-amber-500 outline-none"
                                        >
                                            <option value="">Seleccionar área...</option>
                                            <option value="Mantención">Mantención</option>
                                            <option value="SADEMA">SADEMA</option>
                                            <option value="Packing">Packing</option>
                                            <option value="Frío">Frío</option>
                                            <option value="Administración">Administración</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="ui-meta font-semibold uppercase mb-1 block">Motivo / OT</label>
                                        <input
                                            type="text"
                                            value={exitReason}
                                            onChange={(e) => setExitReason(e.target.value)}
                                            placeholder="Orden de Trabajo o Motivo..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:border-amber-500 outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSubmitExit}
                                        disabled={items.length === 0 || isSubmitting}
                                        className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? 'Procesando...' : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Confirmar Salida
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Helper Text */}
                            <div className="mt-4 pt-4 border-t border-slate-800/50">
                                <p className="text-[10px] text-slate-500 text-center">
                                    Los movimientos quedarán registrados en Supabase y afectarán el stock físico disponible.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="lg:col-span-3">
                        <div className="ui-card bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
                            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <History className="w-5 h-5 text-slate-400" />
                                    <h3 className="font-bold text-white">Historial de Movimientos Recientes</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={historyCsvHref}
                                        download={`movimientos_stock_${new Date().toISOString().slice(0, 10)}.csv`}
                                        className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs font-medium inline-flex items-center"
                                    >
                                        Exportar CSV
                                    </a>

                                    {/* Status Indicator */}
                                    <div className="flex items-center gap-2">
                                        {isOnline ? (
                                            realtimeStatus === 'live' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[11px] font-medium">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                    En vivo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium opacity-60" title="Conexión en tiempo real pendiente">
                                                    <Wifi className="w-3 h-3" />
                                                    Conectado
                                                </span>
                                            )
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-500/40 bg-red-500/10 text-red-300 text-[11px] font-medium">
                                                <WifiOff className="w-3 h-3" />
                                                Sin conexión
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-b border-slate-800 bg-slate-950/30 grid grid-cols-1 md:grid-cols-5 gap-3">
                                <select
                                    value={historyTypeFilter}
                                    onChange={(e) => setHistoryTypeFilter(e.target.value as 'all' | 'Entrada' | 'Salida')}
                                    className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200"
                                >
                                    <option value="all">Todos los tipos</option>
                                    <option value="Entrada">Entrada</option>
                                    <option value="Salida">Salida</option>
                                </select>
                                <input
                                    type="text"
                                    value={historySkuFilter}
                                    onChange={(e) => setHistorySkuFilter(e.target.value)}
                                    placeholder="Filtrar por SKU"
                                    className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200"
                                />
                                <ModernDatePicker
                                    value={historyFromDate}
                                    onChange={setHistoryFromDate}
                                    placeholder="Desde"
                                    className="w-full sm:w-36"
                                />
                                <ModernDatePicker
                                    value={historyToDate}
                                    onChange={setHistoryToDate}
                                    placeholder="Hasta"
                                    className="w-full sm:w-36"
                                />
                                <button
                                    onClick={() => {
                                        setHistoryTypeFilter('all');
                                        setHistorySkuFilter('');
                                        setHistoryFromDate('');
                                        setHistoryToDate('');
                                    }}
                                    className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-300 hover:bg-slate-800"
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-medium">
                                        <tr>
                                            <th className="px-6 py-3">Fecha</th>
                                            <th className="px-6 py-3">Tipo</th>
                                            <th className="px-6 py-3">SKU</th>
                                            <th className="px-6 py-3 text-right">Cantidad</th>
                                            <th className="px-6 py-3">Notas/Referencia</th>
                                            <th className="px-6 py-3">Responsable</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {paginatedMovements.length > 0 ? (
                                            paginatedMovements.map((mov) => (
                                                <tr key={mov.id} className="hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                                                        {new Date(mov.created_at).toLocaleString('es-CL')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${mov.movement_type === 'Entrada'
                                                            ? 'bg-blue-500/10 text-blue-400'
                                                            : 'bg-amber-500/10 text-amber-400'
                                                            }`}>
                                                            {mov.movement_type === 'Entrada' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                                            {mov.movement_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-slate-300">
                                                        <Link
                                                            href={`/inventory?q=${mov.sku}`}
                                                            className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                                                            title="Ver en inventario"
                                                        >
                                                            {mov.sku}
                                                            <ArrowUpRight className="w-3 h-3 opacity-50" />
                                                        </Link>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-bold ${mov.quantity_change > 0 ? 'text-blue-400' : 'text-amber-400'
                                                        }`}>
                                                        {mov.quantity_change > 0 ? '+' : ''}{mov.quantity_change}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={mov.notes ?? undefined}>
                                                        {mov.notes || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300">
                                                        {userId === mov.admin_id ? 'Tú' : 'Administrador'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                    No hay movimientos con los filtros seleccionados
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <p className="text-xs text-slate-400">
                                    Mostrando {(safeHistoryPage - 1) * historyPageSize + (paginatedMovements.length > 0 ? 1 : 0)}-
                                    {(safeHistoryPage - 1) * historyPageSize + paginatedMovements.length} de {filteredMovements.length} movimientos
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                                        disabled={safeHistoryPage <= 1}
                                        className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 disabled:opacity-50"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-xs text-slate-400">
                                        Página {safeHistoryPage} de {totalHistoryPages}
                                    </span>
                                    <button
                                        onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                                        disabled={safeHistoryPage >= totalHistoryPages}
                                        className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 disabled:opacity-50"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}




