'use client';

import { useState, useCallback, useRef, useEffect, useTransition } from 'react';
import {
    Clock, CheckCircle, PackageCheck, XCircle, AlertTriangle,
    GripVertical, User, Calendar, Package, ChevronRight, Eye,
    Columns3, List, ArrowLeftRight,
} from 'lucide-react';
import { updateRequestStatus } from '@/app/(app)/requests/actions';
import { toast } from 'sonner';
import { StatusChip } from '@/components/ui/request-status';

/* ── Types ── */
interface RequestItem {
    sku: string;
    detail: string;
    quantity: number;
    talla?: string;
    marca?: string;
}

interface KanbanRequest {
    id: string;
    request_code: string;
    user_name: string | null;
    user_email: string | null;
    area: string | null;
    items_detail: RequestItem[];
    status: string;
    created_at: string;
    updated_at: string | null;
    notes?: string | null;
}

interface KanbanBoardProps {
    requests: KanbanRequest[];
    onRequestClick?: (request: KanbanRequest) => void;
}

/* ── Column Config ── */
const KANBAN_COLUMNS = [
    {
        key: 'Pendiente',
        label: 'Pendiente',
        icon: Clock,
        color: 'amber',
        borderColor: 'border-amber-500/40',
        bgColor: 'bg-amber-500/5',
        headerBg: 'bg-amber-500/10',
        dotColor: 'bg-amber-400',
        iconColor: 'text-amber-400',
    },
    {
        key: 'Aceptada',
        label: 'Aceptada',
        icon: CheckCircle,
        color: 'blue',
        borderColor: 'border-blue-500/40',
        bgColor: 'bg-blue-500/5',
        headerBg: 'bg-blue-500/10',
        dotColor: 'bg-blue-400',
        iconColor: 'text-blue-400',
    },
    {
        key: 'Entregada',
        label: 'Entregada',
        icon: PackageCheck,
        color: 'emerald',
        borderColor: 'border-emerald-500/40',
        bgColor: 'bg-emerald-500/5',
        headerBg: 'bg-emerald-500/10',
        dotColor: 'bg-emerald-400',
        iconColor: 'text-emerald-400',
    },
    {
        key: 'Cancelada',
        label: 'Cancelada',
        icon: XCircle,
        color: 'red',
        borderColor: 'border-red-500/40',
        bgColor: 'bg-red-500/5',
        headerBg: 'bg-red-500/10',
        dotColor: 'bg-red-400',
        iconColor: 'text-red-400',
    },
] as const;

/* ── Valid transitions ── */
const VALID_TRANSITIONS: Record<string, string[]> = {
    'Pendiente': ['Aceptada', 'Cancelada', 'Alerta'],
    'Aceptada': ['Pendiente', 'Cancelada', 'Alerta'],
    'Cancelada': ['Pendiente'],
    'Alerta': ['Pendiente', 'Aceptada', 'Cancelada'],
    'Entregada': ['Cancelada'],
};

function canTransition(from: string, to: string) {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/* ── Kanban Card ── */
function KanbanCard({
    request,
    onDragStart,
    onClick,
    isPending,
}: {
    request: KanbanRequest;
    onDragStart: (e: React.DragEvent, request: KanbanRequest) => void;
    onClick?: () => void;
    isPending: boolean;
}) {
    const items = request.items_detail || [];
    const date = new Date(request.created_at);
    const formattedDate = date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });

    return (
        <div
            draggable={!isPending}
            onDragStart={(e) => onDragStart(e, request)}
            onClick={onClick}
            className={`group relative bg-white dark:bg-slate-900/80 rounded-xl border border-gray-200 dark:border-slate-700/60 p-3.5 cursor-grab active:cursor-grabbing
                hover:border-blue-400/50 dark:hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200
                ${isPending ? 'opacity-50 pointer-events-none' : ''}
            `}
        >
            {/* Drag handle indicator */}
            <div className="absolute top-3 right-2 opacity-0 group-hover:opacity-60 transition-opacity">
                <GripVertical className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
            </div>

            {/* Header: Code + Date */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold font-mono text-gray-900 dark:text-white">
                    #{request.request_code}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formattedDate}
                </span>
            </div>

            {/* User */}
            <div className="flex items-center gap-1.5 mb-2">
                <User className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                <span className="text-xs text-gray-600 dark:text-slate-400 truncate">
                    {request.user_name || request.user_email || 'Sin nombre'}
                </span>
            </div>

            {/* Area badge */}
            {request.area && (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 mb-2">
                    {request.area}
                </span>
            )}

            {/* Items preview */}
            <div className="space-y-1">
                {items.slice(0, 2).map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px]">
                        <Package className="w-3 h-3 text-gray-400 dark:text-slate-600 shrink-0" />
                        <span className="text-gray-700 dark:text-slate-300 truncate">{item.quantity}x {item.detail}</span>
                    </div>
                ))}
                {items.length > 2 && (
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 italic">
                        +{items.length - 2} más
                    </span>
                )}
            </div>

            {/* View button */}
            <button
                onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                className="mt-2 w-full text-[10px] py-1 rounded-lg bg-gray-50 dark:bg-slate-800/60 text-gray-500 dark:text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-1"
            >
                <Eye className="w-3 h-3" /> Ver detalle
            </button>
        </div>
    );
}

/* ── Kanban Column ── */
function KanbanColumn({
    config,
    requests,
    onDragStart,
    onDrop,
    isDragOver,
    onDragOver,
    onDragLeave,
    onRequestClick,
    pendingIds,
}: {
    config: typeof KANBAN_COLUMNS[number];
    requests: KanbanRequest[];
    onDragStart: (e: React.DragEvent, request: KanbanRequest) => void;
    onDrop: (e: React.DragEvent, targetStatus: string) => void;
    isDragOver: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onRequestClick?: (request: KanbanRequest) => void;
    pendingIds: Set<string>;
}) {
    const Icon = config.icon;

    return (
        <div
            className={`flex flex-col rounded-xl border ${config.borderColor} ${config.bgColor} min-h-[400px] max-h-[calc(100vh-220px)] transition-all duration-200
                ${isDragOver ? `ring-2 ring-${config.color}-400/50 scale-[1.01] shadow-lg shadow-${config.color}-500/10` : ''}
            `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, config.key)}
        >
            {/* Column header */}
            <div className={`px-4 py-3 ${config.headerBg} rounded-t-xl border-b ${config.borderColor} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
                    <Icon className={`w-4 h-4 ${config.iconColor}`} />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{config.label}</span>
                </div>
                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${config.headerBg} ${config.iconColor}`}>
                    {requests.length}
                </span>
            </div>

            {/* Cards container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
                {requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Icon className={`w-8 h-8 ${config.iconColor} opacity-30 mb-2`} />
                        <p className="text-xs text-gray-400 dark:text-slate-500">Sin solicitudes</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-1">Arrastra aquí para mover</p>
                    </div>
                ) : (
                    requests.map((req) => (
                        <KanbanCard
                            key={req.id}
                            request={req}
                            onDragStart={onDragStart}
                            onClick={() => onRequestClick?.(req)}
                            isPending={pendingIds.has(req.id)}
                        />
                    ))
                )}
            </div>

            {/* Drop zone indicator */}
            {isDragOver && (
                <div className={`mx-3 mb-3 py-3 rounded-lg border-2 border-dashed ${config.borderColor} flex items-center justify-center gap-2`}>
                    <ArrowLeftRight className={`w-4 h-4 ${config.iconColor}`} />
                    <span className={`text-xs font-medium ${config.iconColor}`}>Soltar aquí</span>
                </div>
            )}
        </div>
    );
}

/* ── Main Kanban Board ── */
export function KanbanBoard({ requests, onRequestClick }: KanbanBoardProps) {
    const [localRequests, setLocalRequests] = useState(requests);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const draggedRef = useRef<KanbanRequest | null>(null);
    const [isPending, startTransition] = useTransition();

    // Keep in sync with parent
    useEffect(() => {
        setLocalRequests(requests);
    }, [requests]);

    // Group by status
    const columns = KANBAN_COLUMNS.map((col) => ({
        config: col,
        requests: localRequests.filter((r) => r.status === col.key),
    }));

    const handleDragStart = useCallback((_e: React.DragEvent, request: KanbanRequest) => {
        draggedRef.current = request;
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, columnKey: string) => {
        e.preventDefault();
        if (draggedRef.current && canTransition(draggedRef.current.status, columnKey)) {
            setDragOverColumn(columnKey);
        }
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverColumn(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        setDragOverColumn(null);

        const request = draggedRef.current;
        draggedRef.current = null;

        if (!request || request.status === targetStatus) return;
        if (!canTransition(request.status, targetStatus)) {
            toast.error(`No se puede mover de "${request.status}" a "${targetStatus}"`);
            return;
        }

        // Optimistic update
        setLocalRequests((prev) =>
            prev.map((r) => (r.id === request.id ? { ...r, status: targetStatus } : r))
        );
        setPendingIds((prev) => new Set(prev).add(request.id));

        startTransition(async () => {
            try {
                const result = await updateRequestStatus(request.id, targetStatus, `Movido via Kanban: ${request.status} → ${targetStatus}`);
                if (result?.error) {
                    // Rollback
                    setLocalRequests((prev) =>
                        prev.map((r) => (r.id === request.id ? { ...r, status: request.status } : r))
                    );
                    toast.error(result.error);
                } else {
                    toast.success(`#${request.request_code}: ${request.status} → ${targetStatus}`);
                }
            } catch {
                // Rollback
                setLocalRequests((prev) =>
                    prev.map((r) => (r.id === request.id ? { ...r, status: request.status } : r))
                );
                toast.error('Error al actualizar estado');
            } finally {
                setPendingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(request.id);
                    return next;
                });
            }
        });
    }, []);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Columns3 className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Vista Kanban</h3>
                    <span className="text-xs text-gray-500 dark:text-slate-500">• Arrastra las tarjetas para cambiar estado</span>
                </div>
            </div>

            {/* Transition hint */}
            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-slate-500">
                <span>Flujo:</span>
                {KANBAN_COLUMNS.map((col, i) => (
                    <span key={col.key} className="flex items-center gap-1">
                        <StatusChip status={col.key} />
                        {i < KANBAN_COLUMNS.length - 1 && <ChevronRight className="w-3 h-3" />}
                    </span>
                ))}
            </div>

            {/* Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {columns.map(({ config, requests: colRequests }) => (
                    <KanbanColumn
                        key={config.key}
                        config={config}
                        requests={colRequests}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        isDragOver={dragOverColumn === config.key}
                        onDragOver={(e) => handleDragOver(e, config.key)}
                        onDragLeave={handleDragLeave}
                        onRequestClick={onRequestClick}
                        pendingIds={pendingIds}
                    />
                ))}
            </div>
        </div>
    );
}
