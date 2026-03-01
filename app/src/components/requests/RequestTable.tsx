'use client';

import { format } from 'date-fns';
import { PackageCheck, Eye, Trash2 } from 'lucide-react';
import { StatusChip } from '@/components/ui/request-status';
import type { Request, RequestItem } from './request-types';

interface RequestTableProps {
    requests: Request[];
    selectedIds: string[];
    onViewDetail: (request: Request) => void;
    onDeliverClick: (request: Request) => void;
    onDeleteClick: (request: Request) => void;
    onToggleSelect: (requestId: string) => void;
    onToggleSelectAll: () => void;
}

export function RequestTable({
    requests, selectedIds, onViewDetail, onDeliverClick, onDeleteClick,
    onToggleSelect, onToggleSelectAll,
}: RequestTableProps) {
    if (requests.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
                <PackageCheck className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white">No hay solicitudes</h3>
                <p className="text-slate-400 mt-2">No se encontraron solicitudes con este filtro.</p>
            </div>
        );
    }

    const allSelected = requests.length > 0 && requests.every(r => selectedIds.includes(r.id));

    return (
        <div className="rounded-md border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-900 text-slate-400 font-medium border-b border-slate-800">
                        <tr>
                            <th className="px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={onToggleSelectAll}
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
                        {requests.map((request) => (
                            <tr
                                key={request.id}
                                className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                onClick={() => onViewDetail(request)}
                            >
                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(request.id)}
                                        onChange={() => onToggleSelect(request.id)}
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
                                            onClick={() => onViewDetail(request)}
                                            className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 h-8 px-2.5 transition-colors border border-slate-700"
                                            title="Ver detalle"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>

                                        {request.status !== 'Cancelada' && request.status !== 'Entregada' && request.status !== 'Eliminada' && (
                                            <button
                                                onClick={() => onDeliverClick(request)}
                                                className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white h-8 px-3 transition-colors"
                                            >
                                                <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
                                                Entregar
                                            </button>
                                        )}

                                        {request.status !== 'Entregada' && request.status !== 'Eliminada' && (
                                            <button
                                                onClick={() => onDeleteClick(request)}
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
    );
}
