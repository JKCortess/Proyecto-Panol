'use client';

import { useState, useEffect, useTransition, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import {
    PackageCheck, Loader2, AlertCircle, X, Eye,
    CheckCircle2, XCircle, AlertTriangle, Undo2,
    MapPin, Layers, Package, DollarSign, Clock,
    ChevronRight, ImageIcon, ShieldAlert, User, History,
    Calendar as CalendarIcon, Trash2, Plus, Minus, Edit3, Search
} from 'lucide-react';
import { ModernDatePicker } from '@/components/ui/ModernDatePicker';
import { deliverRequest, updateRequestStatus, getRequestStatusLog, deleteRequest, bulkDeleteRequests, bulkDeliverRequests } from '@/app/(app)/requests/actions';
import { getInventoryBySKUs, InventoryDetailItem, searchInventory, InventoryItem } from '@/app/(app)/requests/search-action';
import { toast } from 'sonner';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { StatusChip } from '@/components/ui/request-status';

interface RequestItem {
    sku: string;
    detail: string;
    quantity: number;
    notes?: string;
    value?: number;
    talla?: string;
    marca?: string;
}

interface Request {
    id: string;
    request_code: string;
    user_name: string;
    user_email: string;
    area: string;
    items_detail: RequestItem[];
    created_at: string;
    status: string;
    notes?: string;
}

interface StatusLogEntry {
    id: string;
    previous_status: string;
    new_status: string;
    changed_by_name: string;
    reason: string | null;
    created_at: string;
}

interface PendingRequestsListProps {
    requests: Request[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    'Pendiente': {
        label: 'Pendiente',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        icon: <Clock className="w-3.5 h-3.5" />,
    },
    'Aceptada': {
        label: 'Aceptada',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    'Cancelada': {
        label: 'Cancelada',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        icon: <XCircle className="w-3.5 h-3.5" />,
    },
    'Alerta': {
        label: 'Contactar',
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        icon: <ShieldAlert className="w-3.5 h-3.5" />,
    },
    'Entregada': {
        label: 'Entregada',
        color: 'text-blue-300',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        icon: <PackageCheck className="w-3.5 h-3.5" />,
    },
    'Eliminada': {
        label: 'Eliminada',
        color: 'text-rose-300',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        icon: <Trash2 className="w-3.5 h-3.5" />,
    },
};

const FILTERABLE_STATUS_KEYS = ['Pendiente', 'Aceptada', 'Cancelada', 'Alerta'] as const;

function formatCLP(value: number): string {
    if (!value) return '$0';
    return '$' + value.toLocaleString('es-CL');
}

export function PendingRequestsList({ requests }: PendingRequestsListProps) {
    const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
    if (supabaseRef.current == null) {
        supabaseRef.current = createClient();
    }
    const [detailRequest, setDetailRequest] = useState<Request | null>(null);
    const [deliverModalRequest, setDeliverModalRequest] = useState<Request | null>(null);
    const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [deliverModalInventory, setDeliverModalInventory] = useState<Record<string, InventoryDetailItem>>({});
    const [loadingDeliverInventory, setLoadingDeliverInventory] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [inventoryData, setInventoryData] = useState<Record<string, InventoryDetailItem>>({});
    const [statusLog, setStatusLog] = useState<StatusLogEntry[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [activeTab, setActiveTab] = useState<'detail' | 'history'>('detail');
    const [reasonInput, setReasonInput] = useState('');
    const [showReasonFor, setShowReasonFor] = useState<string | null>(null);
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
    const [bulkDeliveryDate, setBulkDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [requestsState, setRequestsState] = useState<Request[]>(requests);
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');

    // Editable delivery items state
    const [deliveryItems, setDeliveryItems] = useState<RequestItem[]>([]);
    const [showAddItem, setShowAddItem] = useState(false);
    const [addItemQuery, setAddItemQuery] = useState('');
    const [addItemResults, setAddItemResults] = useState<InventoryItem[]>([]);
    const [addItemLoading, setAddItemLoading] = useState(false);

    // Filter state
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filteredRequests = statusFilter === 'all'
        ? requestsState
        : requestsState.filter(r => r.status === statusFilter);
    const selectedCount = selectedRequestIds.length;
    const canBulkDeliver = selectedCount > 0 && filteredRequests.some(r => selectedRequestIds.includes(r.id) && r.status !== 'Cancelada');

    const refreshRequestsFromDb = useCallback(async () => {
        const supabase = supabaseRef.current;
        if (!supabase) return;
        const { data, error } = await supabase
            .from('material_requests')
            .select('id, request_code, user_name, user_email, area, items_detail, created_at, status, notes')
            .in('status', ['Pendiente', 'Aceptada', 'Alerta', 'Cancelada'])
            .order('created_at', { ascending: false });

        if (error) {
            return;
        }

        setRequestsState((data || []) as Request[]);
    }, []);

    useEffect(() => {
        setRequestsState(requests);
    }, [requests]);

    useEffect(() => {
        const supabase = supabaseRef.current;
        if (!supabase) return;
        let refreshTimer: ReturnType<typeof setTimeout> | null = null;

        const scheduleRefresh = () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => {
                void refreshRequestsFromDb();
            }, 300);
        };

        const channel = supabase
            .channel('pending-requests-live')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'material_requests' },
                () => scheduleRefresh()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'request_status_log' },
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

        void refreshRequestsFromDb();

        return () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            void supabase.removeChannel(channel);
        };
    }, [refreshRequestsFromDb]);

    useEffect(() => {
        const visibleIds = new Set(filteredRequests.map(r => r.id));
        setSelectedRequestIds(prev => prev.filter(id => visibleIds.has(id)));
    }, [filteredRequests]);

    const handleViewDetail = async (request: Request) => {
        setDetailRequest(request);
        setActiveTab('detail');
        setLoadingDetail(true);
        setStatusLog([]);

        try {
            // Fetch inventory data for all items (passing talla for per-size stock)
            const itemsForLookup = (request.items_detail as RequestItem[])
                .filter(item => item.sku)
                .map(item => ({ sku: item.sku, talla: item.talla }));

            const [invData, logData] = await Promise.all([
                getInventoryBySKUs(itemsForLookup),
                getRequestStatusLog(request.id),
            ]);

            setInventoryData(invData);
            setStatusLog(logData as StatusLogEntry[]);
        } catch (error) {
            console.error('Error loading detail:', error);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleStatusChange = (requestId: string, newStatus: string) => {
        if (newStatus === 'Cancelada' || newStatus === 'Alerta') {
            setShowReasonFor(`${requestId}:${newStatus}`);
            setReasonInput('');
            return;
        }

        executeStatusChange(requestId, newStatus);
    };

    const executeStatusChange = (requestId: string, newStatus: string, reason?: string) => {
        startTransition(async () => {
            const result = await updateRequestStatus(requestId, newStatus, reason);

            if ('success' in result && result.success) {
                const statusLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
                toast.success(`Solicitud ${result.code} marcada como "${statusLabel}"`);
                await refreshRequestsFromDb();

                // Refresh detail if open
                if (detailRequest?.id === requestId) {
                    setDetailRequest(prev => prev ? { ...prev, status: newStatus } : null);
                    const logData = await getRequestStatusLog(requestId);
                    setStatusLog(logData as StatusLogEntry[]);
                }
            } else {
                const errorMsg = 'error' in result ? result.error : 'Error desconocido';
                toast.error(errorMsg);
            }

            setShowReasonFor(null);
            setReasonInput('');
        });
    };

    const handleDeliverClick = async (request: Request) => {
        setDeliverModalRequest(request);
        setDeliveryDate(new Date().toISOString().split('T')[0]);
        setDeliverModalInventory({});
        setLoadingDeliverInventory(true);
        // Initialize editable delivery items as deep copy of original
        setDeliveryItems((request.items_detail as RequestItem[]).map(item => ({ ...item })));
        setShowAddItem(false);
        setAddItemQuery('');
        setAddItemResults([]);
        try {
            const itemsForLookup = (request.items_detail as RequestItem[])
                .filter(item => item.sku)
                .map(item => ({ sku: item.sku, talla: item.talla }));
            const invData = await getInventoryBySKUs(itemsForLookup);
            setDeliverModalInventory(invData);
        } catch (error) {
            console.error('Error loading delivery inventory:', error);
        } finally {
            setLoadingDeliverInventory(false);
        }
    };

    const handleConfirmDelivery = async () => {
        if (!deliverModalRequest || !deliveryDate) return;

        setIsSubmitting(true);
        try {
            // Compare delivery items with original to detect modifications
            const originalItems = deliverModalRequest.items_detail as RequestItem[];
            const isModified = deliveryItems.length !== originalItems.length ||
                deliveryItems.some((di, idx) => {
                    const orig = originalItems[idx];
                    return !orig || di.sku !== orig.sku || di.quantity !== orig.quantity || di.talla !== orig.talla;
                });

            const result = await deliverRequest(
                deliverModalRequest.id,
                new Date(deliveryDate).toISOString(),
                isModified ? deliveryItems : undefined
            );

            if ('success' in result && result.success) {
                const modifiedLabel = isModified ? ' (con modificaciones)' : '';
                toast.success(`Solicitud ${deliverModalRequest.request_code} marcada como entregada${modifiedLabel}.`);
                setDeliverModalRequest(null);
                if (detailRequest?.id === deliverModalRequest.id) {
                    setDetailRequest(null);
                }
                await refreshRequestsFromDb();
            } else {
                const errorMsg = 'error' in result ? result.error : 'Error desconocido';
                toast.error(errorMsg);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error inesperado.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Delivery item editing helpers ──
    const updateDeliveryItemQuantity = (index: number, delta: number) => {
        setDeliveryItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
        }));
    };

    const setDeliveryItemQuantity = (index: number, quantity: number) => {
        setDeliveryItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            return { ...item, quantity: Math.max(0, quantity) };
        }));
    };

    const removeDeliveryItem = (index: number) => {
        setDeliveryItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddItemSearch = async (query: string) => {
        setAddItemQuery(query);
        if (query.trim().length < 2) {
            setAddItemResults([]);
            return;
        }
        setAddItemLoading(true);
        try {
            const results = await searchInventory(query);
            setAddItemResults(results);
        } catch {
            setAddItemResults([]);
        } finally {
            setAddItemLoading(false);
        }
    };

    const addItemToDelivery = async (invItem: InventoryItem) => {
        // Check if item already exists in delivery items
        const existingIdx = deliveryItems.findIndex(di => di.sku === invItem.sku);
        if (existingIdx >= 0) {
            // Increment quantity
            updateDeliveryItemQuantity(existingIdx, 1);
        } else {
            const newItem: RequestItem = {
                sku: invItem.sku,
                detail: invItem.nombre,
                quantity: 1,
                value: invItem.valor,
            };
            setDeliveryItems(prev => [...prev, newItem]);
        }
        // Fetch inventory data for the new item
        const invData = await getInventoryBySKUs([{ sku: invItem.sku }]);
        setDeliverModalInventory(prev => ({ ...prev, ...invData }));
        setShowAddItem(false);
        setAddItemQuery('');
        setAddItemResults([]);
        toast.success(`${invItem.nombre} agregado a la entrega`);
    };

    const isDeliveryModified = (): boolean => {
        if (!deliverModalRequest) return false;
        const originalItems = deliverModalRequest.items_detail as RequestItem[];
        if (deliveryItems.length !== originalItems.length) return true;
        return deliveryItems.some((di, idx) => {
            const orig = originalItems[idx];
            return !orig || di.sku !== orig.sku || di.quantity !== orig.quantity || di.talla !== orig.talla;
        });
    };

    const handleCancelClick = async (request: Request) => {
        const reason = window.prompt(`Motivo para anular la solicitud ${request.request_code} (esto restaurará el stock):`);
        if (reason === null) return;
        executeStatusChange(request.id, 'Cancelada', reason || 'Anulación manual');
    };

    const toggleSelectRequest = (requestId: string) => {
        setSelectedRequestIds(prev =>
            prev.includes(requestId)
                ? prev.filter(id => id !== requestId)
                : [...prev, requestId]
        );
    };

    const toggleSelectAllFiltered = () => {
        const filteredIds = filteredRequests.map(r => r.id);
        if (filteredIds.length === 0) return;
        const allSelected = filteredIds.every(id => selectedRequestIds.includes(id));
        setSelectedRequestIds(allSelected ? [] : filteredIds);
    };

    const [deleteConfirmationRequest, setDeleteConfirmationRequest] = useState<Request | null>(null);

    const handleDeleteSingleRequest = (request: Request) => {
        setDeleteConfirmationRequest(request);
        setReasonInput('');
    };

    const confirmDeleteRequest = () => {
        if (!deleteConfirmationRequest) return;

        startTransition(async () => {
            const result = await deleteRequest(deleteConfirmationRequest.id, reasonInput || undefined);
            if ('success' in result && result.success) {
                toast.success(`Solicitud ${deleteConfirmationRequest.request_code} eliminada`);
                setSelectedRequestIds(prev => prev.filter(id => id !== deleteConfirmationRequest.id));
                if (detailRequest?.id === deleteConfirmationRequest.id) setDetailRequest(null);
                await refreshRequestsFromDb();
            } else {
                const errorMsg = 'error' in result ? result.error : 'Error desconocido';
                toast.error(errorMsg);
            }
            setDeleteConfirmationRequest(null);
            setReasonInput('');
        });
    };

    const handleBulkDelete = async () => {
        if (selectedRequestIds.length === 0) return;
        const reason = window.prompt('Motivo para eliminación masiva (opcional):') || undefined;
        const confirmDelete = window.confirm(`¿Eliminar ${selectedRequestIds.length} solicitud(es) seleccionada(s)?`);
        if (!confirmDelete) return;

        startTransition(async () => {
            const selectedIdsSnapshot = [...selectedRequestIds];
            const result = await bulkDeleteRequests(selectedIdsSnapshot, reason);
            if ('success' in result && result.success) {
                toast.success(`Eliminadas ${result.successCount} solicitud(es).`);
                if (result.failedCount > 0) {
                    toast.error(`${result.failedCount} solicitud(es) no se pudieron eliminar.`);
                }
                setSelectedRequestIds([]);
                if (detailRequest && selectedIdsSnapshot.includes(detailRequest.id)) {
                    setDetailRequest(null);
                }
                await refreshRequestsFromDb();
            } else {
                const errorMsg = 'error' in result ? result.error : 'Error desconocido';
                toast.error(errorMsg);
            }
        });
    };

    const handleBulkDeliver = async () => {
        if (!canBulkDeliver) return;
        const deliverableIds = filteredRequests
            .filter(r => selectedRequestIds.includes(r.id) && r.status !== 'Cancelada')
            .map(r => r.id);

        const confirmDelivery = window.confirm(`¿Confirmar entrega masiva para ${deliverableIds.length} solicitud(es)?`);
        if (!confirmDelivery) return;

        startTransition(async () => {
            const result = await bulkDeliverRequests(deliverableIds, new Date(bulkDeliveryDate).toISOString());
            if ('success' in result && result.success) {
                toast.success(`Entregadas ${result.successCount} solicitud(es).`);
                if (result.failedCount > 0) {
                    toast.error(`${result.failedCount} solicitud(es) no se pudieron entregar.`);
                }
                setSelectedRequestIds([]);
                if (detailRequest && deliverableIds.includes(detailRequest.id)) {
                    setDetailRequest(null);
                }
                await refreshRequestsFromDb();
            } else {
                const errorMsg = 'error' in result ? result.error : 'Error desconocido';
                toast.error(errorMsg);
            }
        });
    };

    // Find matching inventory item for a request item (uses composite key sku::talla)
    const findInventoryMatch = (sku: string, talla?: string): InventoryDetailItem | null => {
        if (!sku) return null;
        // Try composite key first (sku::talla)
        if (talla) {
            const compositeKey = `${sku}::${talla}`;
            if (inventoryData[compositeKey]) return inventoryData[compositeKey];
        }
        // Direct match by sku only
        if (inventoryData[sku]) return inventoryData[sku];
        // Normalized match
        const normalizedSku = sku.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const [key, val] of Object.entries(inventoryData)) {
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedKey.includes(normalizedSku) || normalizedSku.includes(normalizedKey)) {
                return val;
            }
        }
        return null;
    };

    const statusCounts = {
        all: requestsState.length,
        Pendiente: requestsState.filter(r => r.status === 'Pendiente').length,
        Aceptada: requestsState.filter(r => r.status === 'Aceptada').length,
        Cancelada: requestsState.filter(r => r.status === 'Cancelada').length,
        Alerta: requestsState.filter(r => r.status === 'Alerta').length,
    };

    return (
        <div className="space-y-3 px-5 py-4">
            {/* Status Filters + Realtime Status */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${statusFilter === 'all'
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                    >
                        Todas ({statusCounts.all})
                    </button>
                    {FILTERABLE_STATUS_KEYS.map((key) => {
                        const config = STATUS_CONFIG[key];
                        return (
                            <button
                                key={key}
                                onClick={() => setStatusFilter(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${statusFilter === key
                                    ? `${config.bg} ${config.border} ${config.color}`
                                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                            >
                                {config.icon}
                                {config.label} ({statusCounts[key as keyof typeof statusCounts] || 0})
                            </button>
                        );
                    })}
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-opacity duration-300 ${realtimeStatus === 'live'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : realtimeStatus === 'connecting'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'opacity-0 hidden'
                    }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${realtimeStatus === 'live'
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                        }`} />
                    {realtimeStatus === 'live' ? 'En vivo' : 'Conectando...'}
                </span>
            </div>

            {
                selectedCount > 0 && (
                    <div className="rounded-lg border border-blue-800/40 bg-blue-950/20 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-sm text-blue-200">
                            {selectedCount} solicitud(es) seleccionada(s)
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <ModernDatePicker
                                value={bulkDeliveryDate}
                                onChange={setBulkDeliveryDate}
                                placeholder="Fecha Entrega"
                                className="w-36"
                            />
                            <button
                                onClick={handleBulkDeliver}
                                disabled={isPending || !canBulkDeliver}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                            >
                                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                                Entrega masiva
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isPending}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-700/80 hover:bg-red-600 text-white disabled:opacity-50"
                            >
                                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                Eliminar masivo
                            </button>
                            <button
                                onClick={() => setSelectedRequestIds([])}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
                            >
                                Limpiar selección
                            </button>
                        </div>
                    </div>
                )
            }

            {
                filteredRequests.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
                        <PackageCheck className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white">No hay solicitudes</h3>
                        <p className="text-slate-400 mt-2">No se encontraron solicitudes con este filtro.</p>
                    </div>
                ) : (
                    <div className="rounded-md border border-slate-800 bg-slate-900/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-900 text-slate-400 font-medium border-b border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={filteredRequests.length > 0 && filteredRequests.every(r => selectedRequestIds.includes(r.id))}
                                                onChange={toggleSelectAllFiltered}
                                                className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                                            />
                                        </th>
                                        <th className="px-4 py-3">Código</th>
                                        <th className="px-4 py-3">Solicitante</th>
                                        <th className="px-4 py-3">Área</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Fecha Solicitud</th>
                                        <th className="px-4 py-3">Items</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredRequests.map((request) => (
                                        <tr
                                            key={request.id}
                                            className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                            onClick={() => handleViewDetail(request)}
                                        >
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRequestIds.includes(request.id)}
                                                    onChange={() => toggleSelectRequest(request.id)}
                                                    className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-mono font-medium text-blue-400">
                                                {request.request_code}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 font-medium">
                                                {request.user_name || 'Desconocido'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                                    {request.area}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatusChip status={request.status} />
                                            </td>
                                            <td className="px-4 py-3 text-slate-400">
                                                {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm')}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">
                                                <div className="flex flex-col gap-1 max-w-[300px]">
                                                    {(request.items_detail as RequestItem[]).slice(0, 2).map((item, idx) => (
                                                        <div key={idx} className="text-sm truncate flex justify-between">
                                                            <span className="text-slate-400 shrink-0 mr-2">{item.quantity}x</span>
                                                            <span className="truncate" title={item.detail}>{item.detail}</span>
                                                        </div>
                                                    ))}
                                                    {(request.items_detail as RequestItem[]).length > 2 && (
                                                        <span className="text-xs text-slate-500 italic">...{(request.items_detail as RequestItem[]).length - 2} más</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleViewDetail(request)}
                                                        className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 h-8 px-2.5 transition-colors border border-slate-700"
                                                        title="Ver detalle"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>

                                                    {request.status !== 'Cancelada' && request.status !== 'Entregada' && request.status !== 'Eliminada' && (
                                                        <button
                                                            onClick={() => handleDeliverClick(request)}
                                                            className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white h-8 px-3 transition-colors"
                                                        >
                                                            <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
                                                            Entregar
                                                        </button>
                                                    )}

                                                    {request.status !== 'Entregada' && request.status !== 'Eliminada' && (
                                                        <button
                                                            onClick={() => handleDeleteSingleRequest(request)}
                                                            className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-red-700/80 hover:bg-red-600 text-white h-8 px-2.5 transition-colors"
                                                            title="Eliminar solicitud"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* ==================== DETAIL MODAL ==================== */}
            {
                detailRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setDetailRequest(null)}>
                        <div
                            className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <span className="font-mono text-blue-400">{detailRequest.request_code}</span>
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                                            <User className="w-3.5 h-3.5" />
                                            {detailRequest.user_name || 'Desconocido'} · {detailRequest.user_email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <StatusChip status={detailRequest.status} size="md" />
                                    <button onClick={() => setDetailRequest(null)} className="text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Info bar */}
                            <div className="px-6 py-3 bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800 flex flex-wrap gap-4 text-sm shrink-0">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                                    <CalendarIcon className="w-4 h-4 text-blue-400" />
                                    <span>{format(new Date(detailRequest.created_at), "dd/MM/yyyy 'a las' HH:mm")}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                                    <Package className="w-4 h-4 text-blue-400" />
                                    <span>{(detailRequest.items_detail as RequestItem[]).length} ítem(s)</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-700">
                                        {detailRequest.area}
                                    </span>
                                </div>
                                {detailRequest.notes && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                                        <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                        <span className="text-amber-600 dark:text-amber-300/80 text-xs">{detailRequest.notes}</span>
                                    </div>
                                )}
                            </div>

                            {/* Tabs */}
                            <div className="px-6 pt-3 flex gap-1 border-b border-gray-200 dark:border-slate-800 shrink-0">
                                <button
                                    onClick={() => setActiveTab('detail')}
                                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 ${activeTab === 'detail'
                                        ? 'text-blue-600 dark:text-blue-400 border-blue-500 bg-blue-50 dark:bg-slate-800/50'
                                        : 'text-gray-500 dark:text-slate-500 border-transparent hover:text-gray-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <Package className="w-4 h-4 inline mr-1.5" />
                                    Detalle de Items
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 ${activeTab === 'history'
                                        ? 'text-blue-600 dark:text-blue-400 border-blue-500 bg-blue-50 dark:bg-slate-800/50'
                                        : 'text-gray-500 dark:text-slate-500 border-transparent hover:text-gray-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <History className="w-4 h-4 inline mr-1.5" />
                                    Historial ({statusLog.length})
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto flex-1 min-h-0">
                                {activeTab === 'detail' && (
                                    <div className="p-6 space-y-4">
                                        {loadingDetail ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                                <span className="ml-3 text-gray-500 dark:text-slate-400">Cargando detalles del inventario...</span>
                                            </div>
                                        ) : (
                                            (detailRequest.items_detail as RequestItem[]).map((item, idx) => {
                                                const inv = findInventoryMatch(item.sku, item.talla);
                                                return (
                                                    <div key={idx} className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-900/40 hover:border-gray-300 dark:hover:border-slate-700 transition-colors">
                                                        <div className="flex flex-col sm:flex-row">
                                                            {/* Image */}
                                                            <div className="sm:w-40 h-40 sm:h-auto bg-gray-100 dark:bg-slate-800/50 flex items-center justify-center shrink-0 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-slate-800">
                                                                {inv?.foto ? (
                                                                    <Image
                                                                        src={inv.foto}
                                                                        alt={item.detail}
                                                                        width={160}
                                                                        height={160}
                                                                        className="w-full h-full object-contain p-3"
                                                                        unoptimized
                                                                    />
                                                                ) : null}
                                                                <div className={`flex flex-col items-center justify-center text-gray-400 dark:text-slate-600 ${inv?.foto ? 'hidden' : ''}`}>
                                                                    <ImageIcon className="w-10 h-10 mb-1" />
                                                                    <span className="text-xs">Sin imagen</span>
                                                                </div>
                                                            </div>

                                                            {/* Info */}
                                                            <div className="flex-1 p-4">
                                                                <div className="flex items-start justify-between mb-3">
                                                                    <div>
                                                                        <h4 className="text-gray-900 dark:text-white font-semibold text-base">{item.detail}</h4>
                                                                        <p className="text-blue-600 dark:text-blue-400 font-mono text-xs mt-0.5">{item.sku || 'Sin SKU'}</p>
                                                                        {inv?.descripcion_general && (
                                                                            <p className="text-gray-500 dark:text-slate-500 text-xs mt-1 max-w-md">{inv.descripcion_general}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-lg font-bold text-amber-500 dark:text-amber-400">
                                                                            {item.quantity}x
                                                                        </span>
                                                                        <p className="text-xs text-gray-500 dark:text-slate-500">solicitado(s)</p>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                                    {/* Location */}
                                                                    <div className="bg-gray-100 dark:bg-slate-800/60 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700/50">
                                                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                                                                            <MapPin className="w-3 h-3" />
                                                                            Estante
                                                                        </div>
                                                                        <p className="text-gray-900 dark:text-white font-bold text-sm">
                                                                            {inv ? `E${inv.estante_nro}` : '—'}
                                                                        </p>
                                                                    </div>

                                                                    <div className="bg-gray-100 dark:bg-slate-800/60 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700/50">
                                                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                                                                            <Layers className="w-3 h-3" />
                                                                            Nivel
                                                                        </div>
                                                                        <p className="text-gray-900 dark:text-white font-bold text-sm">
                                                                            {inv ? `N${inv.estante_nivel}` : '—'}
                                                                        </p>
                                                                    </div>

                                                                    {/* Stock */}
                                                                    <div className="bg-gray-100 dark:bg-slate-800/60 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700/50">
                                                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                                                                            <Package className="w-3 h-3" />
                                                                            Stock Actual
                                                                        </div>
                                                                        <p className={`font-bold text-sm ${inv && inv.stock <= item.quantity ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                            {inv ? inv.stock : '—'}
                                                                            {inv && (
                                                                                <span className="text-[10px] font-normal text-gray-500 dark:text-slate-500 ml-1">
                                                                                    ({inv.reservado} reserv.)
                                                                                </span>
                                                                            )}
                                                                        </p>
                                                                    </div>

                                                                    {/* Classification */}
                                                                    <div className="bg-gray-100 dark:bg-slate-800/60 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700/50">
                                                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                                                                            <ShieldAlert className="w-3 h-3" />
                                                                            Clasificación
                                                                        </div>
                                                                        <p className={`font-bold text-sm ${inv?.clasificacion === 'Crítico' ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-slate-300'}`}>
                                                                            {inv?.clasificacion || '—'}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Values Row */}
                                                                <div className="mt-3 flex flex-wrap gap-3">
                                                                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2">
                                                                        <DollarSign className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                                                                        <div>
                                                                            <p className="text-[10px] text-gray-500 dark:text-slate-500 uppercase">V. Unitario</p>
                                                                            <p className="text-amber-600 dark:text-amber-400 font-bold text-sm">
                                                                                {inv ? formatCLP(inv.valor || inv.valor_aprox_clp) : '—'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-lg px-3 py-2">
                                                                        <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                                        <div>
                                                                            <p className="text-[10px] text-gray-500 dark:text-slate-500 uppercase">V. Total</p>
                                                                            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                                                                {inv ? formatCLP((inv.valor || inv.valor_aprox_clp) * item.quantity) : '—'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    {inv?.marca && (
                                                                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 rounded-lg px-3 py-2">
                                                                            <div>
                                                                                <p className="text-[10px] text-gray-500 dark:text-slate-500 uppercase">Marca</p>
                                                                                <p className="text-gray-700 dark:text-slate-300 font-medium text-sm">{inv.marca}</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {inv?.categoria && (
                                                                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 rounded-lg px-3 py-2">
                                                                            <div>
                                                                                <p className="text-[10px] text-gray-500 dark:text-slate-500 uppercase">Categoría</p>
                                                                                <p className="text-gray-700 dark:text-slate-300 font-medium text-sm">{inv.categoria}</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {item.notes && (
                                                                    <div className="mt-3 text-xs text-gray-500 dark:text-slate-500 italic bg-gray-50 dark:bg-slate-800/30 rounded px-3 py-2 border border-gray-200 dark:border-slate-800">
                                                                        📝 {item.notes}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}

                                        {/* Total Summary */}
                                        {!loadingDetail && (
                                            <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 bg-gradient-to-r from-gray-50 to-white dark:from-slate-900/80 dark:to-slate-800/40">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-600 dark:text-slate-400 text-sm font-medium">Valor Total Estimado de la Solicitud</span>
                                                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                                        {formatCLP(
                                                            (detailRequest.items_detail as RequestItem[]).reduce((sum, item) => {
                                                                const inv = findInventoryMatch(item.sku, item.talla);
                                                                const unitVal = inv ? (inv.valor || inv.valor_aprox_clp) : 0;
                                                                return sum + unitVal * item.quantity;
                                                            }, 0)
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className="p-6">
                                        {statusLog.length === 0 ? (
                                            <div className="text-center py-8 text-slate-500">
                                                <History className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                                                <p className="text-sm">No hay cambios registrados aún.</p>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                {/* Timeline line */}
                                                <div className="absolute left-[17px] top-4 bottom-4 w-px bg-slate-800" />

                                                <div className="space-y-4">
                                                    {statusLog.map((entry) => {
                                                        const newConfig = STATUS_CONFIG[entry.new_status] || { color: 'text-slate-400', bg: 'bg-slate-800', icon: <Clock className="w-3 h-3" /> };
                                                        return (
                                                            <div key={entry.id} className="relative flex items-start gap-4 pl-2">
                                                                {/* Dot */}
                                                                <div className={`w-[26px] h-[26px] rounded-full ${newConfig.bg} border-2 ${newConfig.border.replace('border-', 'border-')} flex items-center justify-center shrink-0 z-10 bg-slate-950`}>
                                                                    <div className={`${newConfig.color}`}>
                                                                        {newConfig.icon}
                                                                    </div>
                                                                </div>

                                                                <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-800 p-3">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-slate-500 text-xs line-through">{entry.previous_status}</span>
                                                                            <ChevronRight className="w-3 h-3 text-slate-600" />
                                                                            <span className={`text-xs font-semibold ${newConfig.color}`}>{entry.new_status}</span>
                                                                        </div>
                                                                        <span className="text-[10px] text-slate-600">
                                                                            {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm:ss")}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-400">
                                                                        por <span className="text-slate-300 font-medium">{entry.changed_by_name}</span>
                                                                    </p>
                                                                    {entry.reason && (
                                                                        <p className="text-xs text-slate-500 mt-1 italic">💬 {entry.reason}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Action Bar */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 shrink-0">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex flex-wrap gap-2">
                                        {/* Aceptar */}
                                        {detailRequest.status !== 'Aceptada' && detailRequest.status !== 'Cancelada' && (
                                            <button
                                                onClick={() => handleStatusChange(detailRequest.id, 'Aceptada')}
                                                disabled={isPending}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-all disabled:opacity-50"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Aceptar
                                            </button>
                                        )}

                                        {/* Alerta */}
                                        {detailRequest.status !== 'Alerta' && detailRequest.status !== 'Cancelada' && (
                                            <button
                                                onClick={() => handleStatusChange(detailRequest.id, 'Alerta')}
                                                disabled={isPending}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 transition-all disabled:opacity-50"
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                Contactar
                                            </button>
                                        )}

                                        {/* Cancelar */}
                                        {detailRequest.status !== 'Cancelada' && (
                                            <button
                                                onClick={() => handleStatusChange(detailRequest.id, 'Cancelada')}
                                                disabled={isPending}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-all disabled:opacity-50"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                Cancelar
                                            </button>
                                        )}

                                        {/* Revertir a Pendiente */}
                                        {(detailRequest.status === 'Cancelada' || detailRequest.status === 'Aceptada' || detailRequest.status === 'Alerta') && (
                                            <button
                                                onClick={() => handleStatusChange(detailRequest.id, 'Pendiente')}
                                                disabled={isPending}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                                            >
                                                <Undo2 className="w-3.5 h-3.5" />
                                                Revertir a Pendiente
                                            </button>
                                        )}
                                        {detailRequest.status !== 'Entregada' && detailRequest.status !== 'Eliminada' && (
                                            <button
                                                onClick={() => handleDeleteSingleRequest(detailRequest)}
                                                disabled={isPending}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-700/80 border border-red-500/30 text-red-100 hover:bg-red-600 transition-all disabled:opacity-50"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Eliminar
                                            </button>
                                        )}
                                    </div>

                                    {detailRequest.status !== 'Cancelada' && (
                                        <button
                                            onClick={() => handleDeliverClick(detailRequest)}
                                            disabled={isPending}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50"
                                        >
                                            <PackageCheck className="w-4 h-4" />
                                            Confirmar Entrega
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ==================== REASON INPUT MODAL ==================== */}
            {
                showReasonFor && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowReasonFor(null)}>
                        <div className="bg-slate-950 border border-slate-800 rounded-lg shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <h3 className="font-semibold text-white mb-1">
                                {showReasonFor.includes('Cancelada') ? '¿Motivo de cancelación?' : '¿Motivo de alerta?'}
                            </h3>
                            <p className="text-sm text-slate-400 mb-4">
                                {showReasonFor.includes('Cancelada')
                                    ? 'Opcionalmente indica por qué se cancela esta solicitud.'
                                    : 'Indica por qué se debe contactar al solicitante.'
                                }
                            </p>
                            <textarea
                                value={reasonInput}
                                onChange={e => setReasonInput(e.target.value)}
                                placeholder="Motivo (opcional)..."
                                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 resize-none h-20"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowReasonFor(null)}
                                    className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        const [reqId, newStatus] = showReasonFor.split(':');
                                        executeStatusChange(reqId, newStatus, reasonInput || undefined);
                                    }}
                                    disabled={isPending}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${showReasonFor.includes('Cancelada')
                                        ? 'bg-red-600 hover:bg-red-500 text-white'
                                        : 'bg-orange-600 hover:bg-orange-500 text-white'
                                        } disabled:opacity-50`}
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ==================== DELIVERY MODAL (EDITABLE) ==================== */}
            {
                deliverModalRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-slate-950 border border-slate-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                            <div className="flex flex-col space-y-1.5 p-6 pb-2 shrink-0">
                                <h3 className="font-semibold text-lg leading-none tracking-tight text-white flex justify-between items-center">
                                    <span className="flex items-center gap-2">
                                        <Edit3 className="w-4 h-4 text-blue-400" />
                                        Confirmar Entrega
                                    </span>
                                    <button onClick={() => setDeliverModalRequest(null)} className="text-slate-500 hover:text-white transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Solicitud <span className="font-mono text-blue-400">{deliverModalRequest.request_code}</span> — Puedes modificar cantidades, eliminar o agregar ítems antes de entregar.
                                </p>
                            </div>

                            <div className="p-6 pt-2 space-y-4 overflow-y-auto flex-1">
                                {/* Date picker */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 block">Fecha de Entrega</label>
                                    <ModernDatePicker
                                        value={deliveryDate}
                                        onChange={setDeliveryDate}
                                        className="w-full"
                                        placeholder="Seleccionar fecha"
                                    />
                                </div>

                                {/* Modification indicator */}
                                {isDeliveryModified() && (
                                    <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 flex items-start gap-3">
                                        <Edit3 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        <div className="text-sm text-amber-200/80">
                                            <p className="font-medium text-amber-400">Entrega modificada</p>
                                            <p>Los ítems difieren de la solicitud original. Se guardará el registro de ambas versiones.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Editable stock detail table */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5 text-blue-400" />
                                            Ítems a Entregar
                                        </label>
                                        <button
                                            onClick={() => setShowAddItem(!showAddItem)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-all"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Agregar Ítem
                                        </button>
                                    </div>

                                    {/* Add Item Search */}
                                    {showAddItem && (
                                        <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-3 space-y-2">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                                <input
                                                    type="text"
                                                    value={addItemQuery}
                                                    onChange={(e) => handleAddItemSearch(e.target.value)}
                                                    placeholder="Buscar componente por SKU o nombre..."
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg input-with-icon pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                    autoFocus
                                                />
                                            </div>
                                            {addItemLoading && (
                                                <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...
                                                </div>
                                            )}
                                            {addItemResults.length > 0 && (
                                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                                    {addItemResults.map((item) => (
                                                        <button
                                                            key={item.sku}
                                                            onClick={() => addItemToDelivery(item)}
                                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/60 transition-colors flex items-center justify-between group"
                                                        >
                                                            <div>
                                                                <span className="text-white text-xs font-medium">{item.nombre}</span>
                                                                <span className="ml-2 text-[10px] text-blue-400 font-mono">{item.sku}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[10px] font-bold ${item.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                    Stock: {item.stock}
                                                                </span>
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

                                    {/* Items table */}
                                    {loadingDeliverInventory ? (
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
                                                                const normalizedSku = item.sku.toLowerCase().replace(/[^a-z0-9]/g, '');
                                                                for (const [key, val] of Object.entries(deliverModalInventory)) {
                                                                    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                                                                    if (normalizedKey.includes(normalizedSku) || normalizedSku.includes(normalizedKey)) {
                                                                        return val;
                                                                    }
                                                                }
                                                                return null;
                                                            })();
                                                        const currentStock = inv ? inv.stock : null;
                                                        const afterStock = currentStock !== null ? currentStock - item.quantity : null;
                                                        const isWarning = afterStock !== null && afterStock < 0;

                                                        // Find original quantity for comparison
                                                        const originalItem = (deliverModalRequest.items_detail as RequestItem[]).find(
                                                            oi => oi.sku === item.sku && (oi.talla || '') === (item.talla || '')
                                                        );
                                                        const originalQty = originalItem?.quantity;
                                                        const qtyChanged = originalQty !== undefined && originalQty !== item.quantity;
                                                        const isNewItem = !originalItem;

                                                        return (
                                                            <tr key={idx} className={`transition-colors ${item.quantity === 0 ? 'opacity-40' : 'hover:bg-slate-800/30'}`}>
                                                                <td className="px-3 py-2.5">
                                                                    <div className="text-white text-xs font-medium truncate max-w-[160px]" title={item.detail}>
                                                                        {item.detail}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                        {item.talla && (
                                                                            <span className="text-[10px] text-purple-400">Talla: {item.talla}</span>
                                                                        )}
                                                                        {isNewItem && (
                                                                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-medium">
                                                                                NUEVO
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2.5 text-center">
                                                                    <span className="text-slate-500 text-xs font-mono">
                                                                        {originalQty ?? '—'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2.5">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <button
                                                                            onClick={() => updateDeliveryItemQuantity(idx, -1)}
                                                                            disabled={item.quantity <= 0}
                                                                            className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors disabled:opacity-30"
                                                                        >
                                                                            <Minus className="w-3 h-3 text-slate-300" />
                                                                        </button>
                                                                        <input
                                                                            type="number"
                                                                            value={item.quantity}
                                                                            onChange={(e) => setDeliveryItemQuantity(idx, parseInt(e.target.value) || 0)}
                                                                            className={`w-12 text-center text-xs font-bold rounded-md border bg-slate-900 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${qtyChanged
                                                                                ? 'text-amber-400 border-amber-500/40'
                                                                                : 'text-white border-slate-700'
                                                                                }`}
                                                                            min="0"
                                                                        />
                                                                        <button
                                                                            onClick={() => updateDeliveryItemQuantity(idx, 1)}
                                                                            className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
                                                                        >
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
                                                                        <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full ${isWarning
                                                                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                                            }`}>
                                                                            {isWarning && <AlertTriangle className="w-3 h-3" />}
                                                                            {afterStock}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-600 text-xs">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-1 py-2.5 text-center">
                                                                    <button
                                                                        onClick={() => removeDeliveryItem(idx)}
                                                                        className="w-6 h-6 rounded-md flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                                        title="Quitar de la entrega"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {deliveryItems.length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="px-3 py-6 text-center text-slate-500 text-sm">
                                                                No hay ítems para entregar. Agrega al menos uno.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Warning if any item goes below 0 */}
                                {!loadingDeliverInventory && deliveryItems.some(item => {
                                    const compositeKey = item.talla ? `${item.sku}::${item.talla}` : item.sku;
                                    const inv = deliverModalInventory[compositeKey] || deliverModalInventory[item.sku];
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
                                    <button
                                        onClick={() => setDeliverModalRequest(null)}
                                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white h-10 px-4 py-2 text-slate-400"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirmDelivery}
                                        disabled={isSubmitting || !deliveryDate || deliveryItems.filter(i => i.quantity > 0).length === 0}
                                        className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 disabled:opacity-50 ${isDeliveryModified()
                                            ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                                            }`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Procesando...
                                            </>
                                        ) : isDeliveryModified() ? (
                                            <>
                                                <Edit3 className="mr-2 h-4 w-4" />
                                                Entregar con Modificaciones
                                            </>
                                        ) : (
                                            'Confirmar Entrega'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
            {
                deleteConfirmationRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setDeleteConfirmationRequest(null)}>
                        <div
                            className="bg-slate-950 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 pb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    Confirmar Eliminación
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    ¿Estás seguro de eliminar la solicitud <span className="font-mono text-white font-medium">{deleteConfirmationRequest.request_code}</span>?
                                    Esta acción no se puede deshacer.
                                </p>
                            </div>

                            <div className="px-6 pb-2">
                                <label className="text-xs font-medium text-slate-500 uppercase mb-1.5 block">Motivo (Opcional)</label>
                                <input
                                    type="text"
                                    value={reasonInput}
                                    onChange={(e) => setReasonInput(e.target.value)}
                                    placeholder="Ej: Solicitud duplicada..."
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                                    autoFocus
                                />
                            </div>

                            <div className="p-6 pt-4 flex items-center justify-end gap-3 bg-slate-900/30 border-t border-slate-900 mt-2">
                                <button
                                    onClick={() => setDeleteConfirmationRequest(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteRequest}
                                    disabled={isPending}
                                    className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}


