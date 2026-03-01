'use client';

import { useState, useEffect, useTransition, useRef, useCallback } from 'react';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { deliverRequest, updateRequestStatus, getRequestStatusLog, deleteRequest, bulkDeleteRequests, bulkDeliverRequests } from '@/app/(app)/requests/actions';
import { getInventoryBySKUs, type InventoryDetailItem } from '@/app/(app)/requests/search-action';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

import { STATUS_CONFIG } from './request-types';
import type { Request, RequestItem, StatusLogEntry } from './request-types';
import { RequestStatusFilters } from './RequestStatusFilters';
import { RequestBulkActions } from './RequestBulkActions';
import { RequestTable } from './RequestTable';
import { RequestDetailModal } from './RequestDetailModal';
import { DeliveryModal } from './DeliveryModal';

interface PendingRequestsListProps {
    requests: Request[];
}

export function PendingRequestsList({ requests }: PendingRequestsListProps) {
    // ── Core state ──
    const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
    if (supabaseRef.current == null) {
        supabaseRef.current = createClient();
    }
    const [requestsState, setRequestsState] = useState<Request[]>(requests);
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
    const [bulkDeliveryDate, setBulkDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isPending, startTransition] = useTransition();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Modal states ──
    const [detailRequest, setDetailRequest] = useState<Request | null>(null);
    const [deliverModalRequest, setDeliverModalRequest] = useState<Request | null>(null);
    const [deleteConfirmationRequest, setDeleteConfirmationRequest] = useState<Request | null>(null);
    const [showReasonFor, setShowReasonFor] = useState<string | null>(null);
    const [reasonInput, setReasonInput] = useState('');

    // ── Detail modal data ──
    const [inventoryData, setInventoryData] = useState<Record<string, InventoryDetailItem>>({});
    const [statusLog, setStatusLog] = useState<StatusLogEntry[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // ── Derived ──
    const filteredRequests = statusFilter === 'all'
        ? requestsState
        : requestsState.filter(r => r.status === statusFilter);
    const canBulkDeliver = selectedRequestIds.length > 0 && filteredRequests.some(r => selectedRequestIds.includes(r.id) && r.status !== 'Cancelada');

    const statusCounts = {
        all: requestsState.length,
        Pendiente: requestsState.filter(r => r.status === 'Pendiente').length,
        Aceptada: requestsState.filter(r => r.status === 'Aceptada').length,
        Cancelada: requestsState.filter(r => r.status === 'Cancelada').length,
        Alerta: requestsState.filter(r => r.status === 'Alerta').length,
    };

    // ── Realtime ──
    const refreshRequestsFromDb = useCallback(async () => {
        const supabase = supabaseRef.current;
        if (!supabase) return;
        const { data, error } = await supabase
            .from('material_requests')
            .select('id, request_code, user_name, user_email, area, items_detail, created_at, status, notes')
            .in('status', ['Pendiente', 'Aceptada', 'Alerta', 'Cancelada'])
            .order('created_at', { ascending: false });
        if (!error) setRequestsState((data || []) as Request[]);
    }, []);

    useEffect(() => { setRequestsState(requests); }, [requests]);

    useEffect(() => {
        const supabase = supabaseRef.current;
        if (!supabase) return;
        let refreshTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleRefresh = () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => { void refreshRequestsFromDb(); }, 300);
        };
        const channel = supabase
            .channel('pending-requests-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'material_requests' }, () => scheduleRefresh())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'request_status_log' }, () => scheduleRefresh())
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setRealtimeStatus('live');
                else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setRealtimeStatus('offline');
            });
        void refreshRequestsFromDb();
        return () => { if (refreshTimer) clearTimeout(refreshTimer); void supabase.removeChannel(channel); };
    }, [refreshRequestsFromDb]);

    useEffect(() => {
        const visibleIds = new Set(filteredRequests.map(r => r.id));
        setSelectedRequestIds(prev => prev.filter(id => visibleIds.has(id)));
    }, [filteredRequests]);

    // ── Handlers ──
    const handleViewDetail = async (request: Request) => {
        setDetailRequest(request);
        setLoadingDetail(true);
        setStatusLog([]);
        try {
            const itemsForLookup = (request.items_detail as RequestItem[]).filter(i => i.sku).map(i => ({ sku: i.sku, talla: i.talla }));
            const [invData, logData] = await Promise.all([
                getInventoryBySKUs(itemsForLookup),
                getRequestStatusLog(request.id),
            ]);
            setInventoryData(invData);
            setStatusLog(logData as StatusLogEntry[]);
        } catch (error) { console.error('Error loading detail:', error); }
        finally { setLoadingDetail(false); }
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
                if (detailRequest?.id === requestId) {
                    setDetailRequest(prev => prev ? { ...prev, status: newStatus } : null);
                    const logData = await getRequestStatusLog(requestId);
                    setStatusLog(logData as StatusLogEntry[]);
                }
            } else {
                toast.error('error' in result ? result.error : 'Error desconocido');
            }
            setShowReasonFor(null);
            setReasonInput('');
        });
    };

    const handleDeliverClick = (request: Request) => {
        setDeliverModalRequest(request);
    };

    const handleConfirmDelivery = async (requestId: string, deliveryDate: string, deliveryItems: RequestItem[], isModified: boolean) => {
        setIsSubmitting(true);
        try {
            const result = await deliverRequest(requestId, new Date(deliveryDate).toISOString(), isModified ? deliveryItems : undefined);
            if ('success' in result && result.success) {
                const req = requestsState.find(r => r.id === requestId);
                const modifiedLabel = isModified ? ' (con modificaciones)' : '';
                toast.success(`Solicitud ${req?.request_code} marcada como entregada${modifiedLabel}.`);
                setDeliverModalRequest(null);
                if (detailRequest?.id === requestId) setDetailRequest(null);
                await refreshRequestsFromDb();
            } else {
                toast.error('error' in result ? result.error : 'Error desconocido');
            }
        } catch { toast.error('Error inesperado.'); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteClick = (request: Request) => {
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
                toast.error('error' in result ? result.error : 'Error desconocido');
            }
            setDeleteConfirmationRequest(null);
            setReasonInput('');
        });
    };

    const handleBulkDelete = async () => {
        if (selectedRequestIds.length === 0) return;
        const reason = window.prompt('Motivo para eliminación masiva (opcional):') || undefined;
        if (!window.confirm(`¿Eliminar ${selectedRequestIds.length} solicitud(es) seleccionada(s)?`)) return;
        startTransition(async () => {
            const ids = [...selectedRequestIds];
            const result = await bulkDeleteRequests(ids, reason);
            if ('success' in result && result.success) {
                toast.success(`Eliminadas ${result.successCount} solicitud(es).`);
                if (result.failedCount > 0) toast.error(`${result.failedCount} no se pudieron eliminar.`);
                setSelectedRequestIds([]);
                if (detailRequest && ids.includes(detailRequest.id)) setDetailRequest(null);
                await refreshRequestsFromDb();
            } else { toast.error('error' in result ? result.error : 'Error desconocido'); }
        });
    };

    const handleBulkDeliver = async () => {
        if (!canBulkDeliver) return;
        const ids = filteredRequests.filter(r => selectedRequestIds.includes(r.id) && r.status !== 'Cancelada').map(r => r.id);
        if (!window.confirm(`¿Confirmar entrega masiva para ${ids.length} solicitud(es)?`)) return;
        startTransition(async () => {
            const result = await bulkDeliverRequests(ids, new Date(bulkDeliveryDate).toISOString());
            if ('success' in result && result.success) {
                toast.success(`Entregadas ${result.successCount} solicitud(es).`);
                if (result.failedCount > 0) toast.error(`${result.failedCount} no se pudieron entregar.`);
                setSelectedRequestIds([]);
                if (detailRequest && ids.includes(detailRequest.id)) setDetailRequest(null);
                await refreshRequestsFromDb();
            } else { toast.error('error' in result ? result.error : 'Error desconocido'); }
        });
    };

    const toggleSelectRequest = (requestId: string) => {
        setSelectedRequestIds(prev => prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]);
    };

    const toggleSelectAllFiltered = () => {
        const filteredIds = filteredRequests.map(r => r.id);
        if (filteredIds.length === 0) return;
        setSelectedRequestIds(filteredIds.every(id => selectedRequestIds.includes(id)) ? [] : filteredIds);
    };

    // ── Render ──
    return (
        <div className="space-y-3 px-5 py-4">
            <RequestStatusFilters
                statusFilter={statusFilter}
                statusCounts={statusCounts}
                realtimeStatus={realtimeStatus}
                onFilterChange={setStatusFilter}
            />

            <RequestBulkActions
                selectedCount={selectedRequestIds.length}
                bulkDeliveryDate={bulkDeliveryDate}
                onBulkDeliveryDateChange={setBulkDeliveryDate}
                onBulkDeliver={handleBulkDeliver}
                onBulkDelete={handleBulkDelete}
                onClearSelection={() => setSelectedRequestIds([])}
                isPending={isPending}
                canBulkDeliver={canBulkDeliver}
            />

            <RequestTable
                requests={filteredRequests}
                selectedIds={selectedRequestIds}
                onViewDetail={handleViewDetail}
                onDeliverClick={handleDeliverClick}
                onDeleteClick={handleDeleteClick}
                onToggleSelect={toggleSelectRequest}
                onToggleSelectAll={toggleSelectAllFiltered}
            />

            {/* Detail Modal */}
            {detailRequest && (
                <RequestDetailModal
                    request={detailRequest}
                    inventoryData={inventoryData}
                    statusLog={statusLog}
                    loadingDetail={loadingDetail}
                    isPending={isPending}
                    onClose={() => setDetailRequest(null)}
                    onStatusChange={handleStatusChange}
                    onDeliverClick={handleDeliverClick}
                    onDeleteClick={handleDeleteClick}
                />
            )}

            {/* Delivery Modal */}
            {deliverModalRequest && (
                <DeliveryModal
                    request={deliverModalRequest}
                    onClose={() => setDeliverModalRequest(null)}
                    onConfirmDelivery={handleConfirmDelivery}
                    isSubmitting={isSubmitting}
                />
            )}

            {/* Reason Input Modal */}
            {showReasonFor && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowReasonFor(null)}>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="font-semibold text-white mb-1">
                            {showReasonFor.includes('Cancelada') ? '¿Motivo de cancelación?' : '¿Motivo de alerta?'}
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            {showReasonFor.includes('Cancelada')
                                ? 'Opcionalmente indica por qué se cancela esta solicitud.'
                                : 'Indica por qué se debe contactar al solicitante.'}
                        </p>
                        <textarea value={reasonInput} onChange={e => setReasonInput(e.target.value)} placeholder="Motivo (opcional)..."
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 resize-none h-20" autoFocus />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowReasonFor(null)} className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                            <button onClick={() => { const [reqId, newStatus] = showReasonFor.split(':'); executeStatusChange(reqId, newStatus, reasonInput || undefined); }}
                                disabled={isPending}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${showReasonFor.includes('Cancelada') ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-orange-600 hover:bg-orange-500 text-white'} disabled:opacity-50`}>
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmationRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setDeleteConfirmationRequest(null)}>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" /> Confirmar Eliminación
                            </h3>
                            <p className="text-slate-400 text-sm">
                                ¿Estás seguro de eliminar la solicitud <span className="font-mono text-white font-medium">{deleteConfirmationRequest.request_code}</span>? Esta acción no se puede deshacer.
                            </p>
                        </div>
                        <div className="px-6 pb-2">
                            <label className="text-xs font-medium text-slate-500 uppercase mb-1.5 block">Motivo (Opcional)</label>
                            <input type="text" value={reasonInput} onChange={(e) => setReasonInput(e.target.value)} placeholder="Ej: Solicitud duplicada..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all" autoFocus />
                        </div>
                        <div className="p-6 pt-4 flex items-center justify-end gap-3 bg-slate-900/30 border-t border-slate-900 mt-2">
                            <button onClick={() => setDeleteConfirmationRequest(null)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancelar</button>
                            <button onClick={confirmDeleteRequest} disabled={isPending}
                                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
