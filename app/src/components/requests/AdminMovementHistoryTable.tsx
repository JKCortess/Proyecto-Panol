'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    Eye,
    Loader2,
    RotateCcw,
    X,
    Undo2,
} from 'lucide-react';
import { getRequestDetailForAdmin, restoreRequest, updateRequestStatus } from '@/app/requests/actions';
import { getInventoryBySKUs, type InventoryDetailItem } from '@/app/requests/search-action';
import { StatusChip } from '@/components/ui/request-status';

type AdminMovement = {
    id: string;
    request_id?: string | null;
    request_code?: string | null;
    previous_status?: string | null;
    new_status: string;
    changed_by_name?: string | null;
    reason?: string | null;
    created_at: string;
    current_request_status?: string | null;
};

type RequestItem = {
    sku?: string;
    detail?: string;
    quantity?: number;
    notes?: string;
    talla?: string;
    marca?: string;
};

type RequestDetail = {
    id: string;
    request_code: string;
    user_name?: string | null;
    user_email?: string | null;
    area?: string | null;
    items_detail?: RequestItem[] | null;
    notes?: string | null;
    status: string;
    created_at: string;
    updated_at?: string | null;
};

type Props = {
    movements: AdminMovement[];
};

function normalizeSku(value?: string) {
    return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function AdminMovementHistoryTable({ movements }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [detail, setDetail] = useState<RequestDetail | null>(null);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [inventoryBySku, setInventoryBySku] = useState<Record<string, InventoryDetailItem>>({});
    const [quickFilter, setQuickFilter] = useState<'all' | 'deleted' | 'delivered' | 'cancelled'>('all');
    const [annulledIds, setAnnulledIds] = useState<Set<string>>(new Set());

    const filteredMovements = useMemo(
        () =>
            movements.filter((entry) => {
                if (quickFilter === 'deleted') return entry.new_status === 'Eliminada';
                if (quickFilter === 'delivered') return entry.new_status === 'Entregada';
                if (quickFilter === 'cancelled') return entry.new_status === 'Cancelada';
                return true;
            }),
        [movements, quickFilter]
    );

    const openDetail = (requestId?: string | null) => {
        if (!requestId) {
            setDetailError('Este movimiento no tiene request_id asociado.');
            setDetail(null);
            return;
        }

        setLoadingId(requestId ?? null);
        setDetailError(null);
        startTransition(async () => {
            const result = await getRequestDetailForAdmin(requestId);
            if ('success' in result && result.success) {
                const request = result.request as RequestDetail;
                setDetail(request);
                const itemsForLookup = (request.items_detail || [])
                    .filter((i) => i.sku)
                    .map((i) => ({ sku: i.sku!, talla: i.talla }));
                const inv = await getInventoryBySKUs(itemsForLookup);
                setInventoryBySku(inv);
                setDetailError(null);
            } else {
                setDetail(null);
                setInventoryBySku({});
                setDetailError('error' in result ? (result.error ?? 'No se pudo cargar el detalle') : 'No se pudo cargar el detalle');
            }
            setLoadingId(null);
        });
    };

    const handleRestore = (entry: AdminMovement) => {
        if (!entry.request_id) {
            toast.error('Este movimiento no tiene solicitud asociada');
            return;
        }
        const confirmed = window.confirm(`Restaurar la solicitud ${entry.request_code || entry.request_id}?`);
        if (!confirmed) return;

        const reason = window.prompt('Motivo de restauracion (opcional):') || undefined;
        const requestId = entry.request_id ?? null;
        setLoadingId(requestId);

        startTransition(async () => {
            if (!requestId) {
                setLoadingId(null);
                toast.error('Este movimiento no tiene solicitud asociada');
                return;
            }
            const result = await restoreRequest(requestId, reason);
            if ('success' in result && result.success) {
                toast.success(`Solicitud ${result.code} restaurada a Pendiente`);
                router.refresh();
            } else {
                toast.error('error' in result ? (result.error ?? 'No se pudo restaurar') : 'No se pudo restaurar');
            }
            setLoadingId(null);
        });
    };

    const handleCancelDelivery = (entry: AdminMovement) => {
        if (!entry.request_id || !entry.request_code) {
            toast.error('Este movimiento no tiene solicitud asociada');
            return;
        }

        const reason = window.prompt(`Motivo para anular ${entry.request_code} (esto restaurará el stock):`);
        if (reason === null) return;

        const requestId = entry.request_id;
        setLoadingId(requestId);

        startTransition(async () => {
            const result = await updateRequestStatus(requestId, 'Cancelada', reason || 'Anulación desde Historial');

            if ('success' in result && result.success) {
                toast.success(`Solicitud ${result.code} anulada y stock restaurado.`);
                setAnnulledIds((prev) => new Set(prev).add(requestId));
                router.refresh();
            } else {
                toast.error('error' in result ? (result.error ?? 'No se pudo anular') : 'Error desconocido');
            }
            setLoadingId(null);
        });
    };

    return (
        <>
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/30 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setQuickFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${quickFilter === 'all'
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                >
                    Todo ({movements.length})
                </button>
                <button
                    type="button"
                    onClick={() => setQuickFilter('deleted')}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${quickFilter === 'deleted'
                        ? 'bg-rose-600/20 border-rose-500/40 text-rose-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                >
                    Eliminadas ({movements.filter((m) => m.new_status === 'Eliminada').length})
                </button>

                <button
                    type="button"
                    onClick={() => setQuickFilter('delivered')}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${quickFilter === 'delivered'
                        ? 'bg-amber-600/20 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                >
                    Entregadas ({movements.filter((m) => m.new_status === 'Entregada').length})
                </button>
                <button
                    type="button"
                    onClick={() => setQuickFilter('cancelled')}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${quickFilter === 'cancelled'
                        ? 'bg-orange-600/20 border-orange-500/40 text-orange-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                >
                    Canceladas ({movements.filter((m) => m.new_status === 'Cancelada').length})
                </button>
            </div >

            <div className="overflow-x-auto ui-table">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                            <th className="px-4 py-3">Fecha y Hora</th>
                            <th className="px-4 py-3">Solicitud</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Administrador</th>
                            <th className="px-4 py-3">Motivo</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredMovements.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                                    Sin movimientos para este filtro.
                                </td>
                            </tr>
                        ) : (
                            filteredMovements.map((entry) => (
                                <tr key={entry.id} className="hover:bg-slate-800/40">
                                    <td className="px-4 py-3 text-slate-300">
                                        {new Date(entry.created_at).toLocaleString('es-CL')}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-blue-400">
                                        {entry.request_code ?? 'N/D'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-200 font-medium">
                                        <StatusChip
                                            status={entry.previous_status === 'Eliminada' && entry.new_status === 'Pendiente' ? 'Restaurada' : entry.new_status}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">
                                        {entry.changed_by_name ?? 'Administrador'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">
                                        {entry.reason ?? '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            {entry.new_status === 'Entregada' && entry.current_request_status === 'Entregada' && !annulledIds.has(entry.request_id ?? '') && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelDelivery(entry)}
                                                    disabled={isPending && loadingId === entry.request_id}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-700/50 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                                                    title="Anular entrega y restaurar stock"
                                                >
                                                    {isPending && loadingId === entry.request_id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Undo2 className="h-3.5 w-3.5" />
                                                    )}
                                                    Anular
                                                </button>
                                            )}
                                            {entry.new_status === 'Eliminada' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRestore(entry)}
                                                    disabled={isPending && loadingId === entry.request_id}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/50 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                                                >
                                                    {isPending && loadingId === entry.request_id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                    )}
                                                    Restaurar
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => openDetail(entry.request_id)}
                                                disabled={isPending && loadingId === entry.request_id}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                                            >
                                                {isPending && loadingId === entry.request_id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Eye className="h-3.5 w-3.5" />
                                                )}
                                                Ver detalle
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {
                detailError && (
                    <div className="px-4 py-3 text-sm text-rose-300 border-t border-slate-800 bg-rose-500/10">
                        {detailError}
                    </div>
                )
            }

            {
                detail && (
                    <div
                        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center"
                        onClick={() => setDetail(null)}
                    >
                        <div
                            className="w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                                <div>
                                    <h3 className="text-base font-semibold text-white">Detalle de Solicitud</h3>
                                    <p className="text-xs text-slate-400 font-mono">{detail.request_code}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDetail(null)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-4 px-5 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <p className="text-slate-300"><span className="text-slate-500">Solicitante:</span> {detail.user_name || '-'}</p>
                                    <p className="text-slate-300"><span className="text-slate-500">Correo:</span> {detail.user_email || '-'}</p>
                                    <p className="text-slate-300"><span className="text-slate-500">Area:</span> {detail.area || '-'}</p>
                                    <p className="text-slate-300"><span className="text-slate-500">Estado actual:</span> {detail.status}</p>
                                    <p className="text-slate-300"><span className="text-slate-500">Creada:</span> {new Date(detail.created_at).toLocaleString('es-CL')}</p>
                                    <p className="text-slate-300"><span className="text-slate-500">Actualizada:</span> {detail.updated_at ? new Date(detail.updated_at).toLocaleString('es-CL') : '-'}</p>
                                </div>

                                <div className="rounded-xl border border-slate-800 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-900 text-slate-400">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Imagen</th>
                                                <th className="px-3 py-2 text-left">SKU</th>
                                                <th className="px-3 py-2 text-left">Detalle</th>
                                                <th className="px-3 py-2 text-right">Cantidad</th>
                                                <th className="px-3 py-2 text-left">Notas</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {(detail.items_detail || []).length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-3 py-3 text-slate-500 text-center">
                                                        Sin items registrados
                                                    </td>
                                                </tr>
                                            ) : (
                                                (detail.items_detail || []).map((item, idx) => {
                                                    // Try composite key first (sku::talla), then sku only
                                                    const compositeKey = item.sku && item.talla ? `${item.sku}::${item.talla}` : undefined;
                                                    const direct = compositeKey ? inventoryBySku[compositeKey] : (item.sku ? inventoryBySku[item.sku] : undefined);
                                                    const normalized = normalizeSku(item.sku);
                                                    const fallback = !direct
                                                        ? Object.entries(inventoryBySku).find(([key]) => normalizeSku(key) === normalized)?.[1]
                                                        : undefined;
                                                    const inv = direct || fallback;
                                                    return (
                                                        <tr key={`${detail.id}-item-${idx}`}>
                                                            <td className="px-3 py-2">
                                                                {inv?.foto ? (
                                                                    <Image
                                                                        src={inv.foto}
                                                                        alt={inv.nombre || item.detail || 'Item'}
                                                                        width={40}
                                                                        height={40}
                                                                        className="h-10 w-10 rounded-lg object-cover border border-slate-700"
                                                                        unoptimized
                                                                    />
                                                                ) : (
                                                                    <div className="h-10 w-10 rounded-lg border border-slate-700 bg-slate-900" />
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-slate-200 font-mono">{item.sku || '-'}</td>
                                                            <td className="px-3 py-2 text-slate-300">{item.detail || inv?.nombre || '-'}</td>
                                                            <td className="px-3 py-2 text-right text-slate-200">{item.quantity ?? 0}</td>
                                                            <td className="px-3 py-2 text-slate-400">{item.notes || '-'}</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="text-sm text-slate-300">
                                    <span className="text-slate-500">Notas generales:</span> {detail.notes || '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
