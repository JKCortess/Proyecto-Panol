'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
    Loader2, X, CheckCircle2, XCircle, AlertTriangle, Undo2,
    MapPin, Layers, Package, DollarSign, ShieldAlert, User, History,
    Calendar as CalendarIcon, Trash2, ImageIcon, PackageCheck, ChevronRight, Clock,
} from 'lucide-react';
import Image from 'next/image';
import { StatusChip } from '@/components/ui/request-status';
import { STATUS_CONFIG, formatCLP } from './request-types';
import type { Request, RequestItem, StatusLogEntry } from './request-types';
import type { InventoryDetailItem } from '@/app/(app)/requests/search-action';

interface RequestDetailModalProps {
    request: Request;
    inventoryData: Record<string, InventoryDetailItem>;
    statusLog: StatusLogEntry[];
    loadingDetail: boolean;
    isPending: boolean;
    onClose: () => void;
    onStatusChange: (requestId: string, newStatus: string) => void;
    onDeliverClick: (request: Request) => void;
    onDeleteClick: (request: Request) => void;
}

export function RequestDetailModal({
    request, inventoryData, statusLog, loadingDetail, isPending,
    onClose, onStatusChange, onDeliverClick, onDeleteClick,
}: RequestDetailModalProps) {
    const [activeTab, setActiveTab] = useState<'detail' | 'history'>('detail');

    const findInventoryMatch = (sku: string, talla?: string): InventoryDetailItem | null => {
        if (!sku) return null;
        if (talla) {
            const compositeKey = `${sku}::${talla}`;
            if (inventoryData[compositeKey]) return inventoryData[compositeKey];
        }
        if (inventoryData[sku]) return inventoryData[sku];
        const normalizedSku = sku.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const [key, val] of Object.entries(inventoryData)) {
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedKey.includes(normalizedSku) || normalizedSku.includes(normalizedKey)) {
                return val;
            }
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 shrink-0">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="font-mono text-blue-400">{request.request_code}</span>
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                                <User className="w-3.5 h-3.5" />
                                {request.user_name || 'Desconocido'} · {request.user_email}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusChip status={request.status} size="md" />
                        <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Info bar */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800 flex flex-wrap gap-4 text-sm shrink-0">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                        <CalendarIcon className="w-4 h-4 text-blue-400" />
                        <span>{format(new Date(request.created_at), "dd/MM/yyyy 'a las' HH:mm")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                        <Package className="w-4 h-4 text-blue-400" />
                        <span>{(request.items_detail as RequestItem[]).length} ítem(s)</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-700">
                            {request.area}
                        </span>
                    </div>
                    {request.notes && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                            <span className="text-amber-600 dark:text-amber-300/80 text-xs">{request.notes}</span>
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
                                (request.items_detail as RequestItem[]).map((item, idx) => {
                                    const inv = findInventoryMatch(item.sku, item.talla);
                                    return (
                                        <div key={idx} className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-900/40 hover:border-gray-300 dark:hover:border-slate-700 transition-colors">
                                            <div className="flex flex-col sm:flex-row">
                                                {/* Image */}
                                                <div className="sm:w-40 h-40 sm:h-auto bg-gray-100 dark:bg-slate-800/50 flex items-center justify-center shrink-0 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-slate-800">
                                                    {inv?.foto ? (
                                                        <Image src={inv.foto} alt={item.detail} width={160} height={160} className="w-full h-full object-contain p-3" unoptimized />
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
                                                            <span className="text-lg font-bold text-amber-500 dark:text-amber-400">{item.quantity}x</span>
                                                            <p className="text-xs text-gray-500 dark:text-slate-500">solicitado(s)</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div className="bg-gray-100 dark:bg-slate-800/60 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700/50">
                                                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                                                                <MapPin className="w-3 h-3" /> Estante
                                                            </div>
                                                            <p className="text-gray-900 dark:text-white font-bold text-sm">{inv ? `E${inv.estante_nro}` : '—'}</p>
                                                        </div>
                                                        <div className="bg-gray-100 dark:bg-slate-800/60 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700/50">
                                                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                                                                <Layers className="w-3 h-3" /> Nivel
                                                            </div>
                                                            <p className="text-gray-900 dark:text-white font-bold text-sm">{inv ? `N${inv.estante_nivel}` : '—'}</p>
                                                        </div>
                                                        <div className="bg-gray-100 dark:bg-slate-800/60 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700/50">
                                                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                                                                <Package className="w-3 h-3" /> Stock Actual
                                                            </div>
                                                            <p className={`font-bold text-sm ${inv && inv.stock <= item.quantity ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                {inv ? inv.stock : '—'}
                                                                {inv && (
                                                                    <span className="text-[10px] font-normal text-gray-500 dark:text-slate-500 ml-1">({inv.reservado} reserv.)</span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="bg-gray-100 dark:bg-slate-800/60 rounded-lg p-2.5 border border-gray-200 dark:border-slate-700/50">
                                                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-500 text-[10px] uppercase tracking-wider mb-1">
                                                                <ShieldAlert className="w-3 h-3" /> Clasificación
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
                                                (request.items_detail as RequestItem[]).reduce((sum, item) => {
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
                                    <div className="absolute left-[17px] top-4 bottom-4 w-px bg-slate-800" />
                                    <div className="space-y-4">
                                        {statusLog.map((entry) => {
                                            const newConfig = STATUS_CONFIG[entry.new_status] || { color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700', icon: <Clock className="w-3 h-3" /> };
                                            return (
                                                <div key={entry.id} className="relative flex items-start gap-4 pl-2">
                                                    <div className={`w-[26px] h-[26px] rounded-full ${newConfig.bg} border-2 ${newConfig.border} flex items-center justify-center shrink-0 z-10 bg-slate-950`}>
                                                        <div className={`${newConfig.color}`}>{newConfig.icon}</div>
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
                            {request.status !== 'Aceptada' && request.status !== 'Cancelada' && (
                                <button onClick={() => onStatusChange(request.id, 'Aceptada')} disabled={isPending}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-all disabled:opacity-50">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Aceptar
                                </button>
                            )}
                            {request.status !== 'Alerta' && request.status !== 'Cancelada' && (
                                <button onClick={() => onStatusChange(request.id, 'Alerta')} disabled={isPending}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 transition-all disabled:opacity-50">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Contactar
                                </button>
                            )}
                            {request.status !== 'Cancelada' && (
                                <button onClick={() => onStatusChange(request.id, 'Cancelada')} disabled={isPending}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-all disabled:opacity-50">
                                    <XCircle className="w-3.5 h-3.5" /> Cancelar
                                </button>
                            )}
                            {(request.status === 'Cancelada' || request.status === 'Aceptada' || request.status === 'Alerta') && (
                                <button onClick={() => onStatusChange(request.id, 'Pendiente')} disabled={isPending}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50">
                                    <Undo2 className="w-3.5 h-3.5" /> Revertir a Pendiente
                                </button>
                            )}
                            {request.status !== 'Entregada' && request.status !== 'Eliminada' && (
                                <button onClick={() => onDeleteClick(request)} disabled={isPending}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-700/80 border border-red-500/30 text-red-100 hover:bg-red-600 transition-all disabled:opacity-50">
                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                </button>
                            )}
                        </div>
                        {request.status !== 'Cancelada' && (
                            <button onClick={() => onDeliverClick(request)} disabled={isPending}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50">
                                <PackageCheck className="w-4 h-4" /> Confirmar Entrega
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
