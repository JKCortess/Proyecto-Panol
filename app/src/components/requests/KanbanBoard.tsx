'use client';

import { useState, useCallback, useRef, useEffect, useTransition } from 'react';
import {
    Clock, CheckCircle2, PackageCheck, XCircle,
    GripVertical, User, Calendar, Package, Eye,
    Columns3, ArrowRight,
} from 'lucide-react';
import { updateRequestStatus } from '@/app/(app)/requests/actions';
import { toast } from 'sonner';

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

/* ── Column definitions with DISTINCT colors ── */
const KANBAN_COLUMNS = [
    {
        key: 'Pendiente',
        label: 'Pendiente',
        icon: Clock,
        accent: '#f59e0b',        // amber
        bgColumn: 'rgba(245, 158, 11, 0.04)',
        bgHeader: 'rgba(245, 158, 11, 0.08)',
        borderCol: 'rgba(245, 158, 11, 0.25)',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeText: '#f59e0b',
        cardHover: 'rgba(245, 158, 11, 0.06)',
    },
    {
        key: 'Aceptada',
        label: 'Aceptada',
        icon: CheckCircle2,
        accent: '#3b82f6',        // blue — clearly different from green
        bgColumn: 'rgba(59, 130, 246, 0.04)',
        bgHeader: 'rgba(59, 130, 246, 0.08)',
        borderCol: 'rgba(59, 130, 246, 0.25)',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeText: '#3b82f6',
        cardHover: 'rgba(59, 130, 246, 0.06)',
    },
    {
        key: 'Entregada',
        label: 'Entregada',
        icon: PackageCheck,
        accent: '#10b981',        // emerald green — distinct from blue
        bgColumn: 'rgba(16, 185, 129, 0.04)',
        bgHeader: 'rgba(16, 185, 129, 0.08)',
        borderCol: 'rgba(16, 185, 129, 0.25)',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeText: '#10b981',
        cardHover: 'rgba(16, 185, 129, 0.06)',
    },
    {
        key: 'Cancelada',
        label: 'Cancelada',
        icon: XCircle,
        accent: '#ef4444',        // red
        bgColumn: 'rgba(239, 68, 68, 0.04)',
        bgHeader: 'rgba(239, 68, 68, 0.08)',
        borderCol: 'rgba(239, 68, 68, 0.25)',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        badgeText: '#ef4444',
        cardHover: 'rgba(239, 68, 68, 0.06)',
    },
] as const;

/* ── Valid transitions (from actions.ts) ── */
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

/* ═══════════ Kanban Card ═══════════ */
function KanbanCard({
    request,
    accentColor,
    onDragStart,
    onClick,
    isPending,
}: {
    request: KanbanRequest;
    accentColor: string;
    onDragStart: (e: React.DragEvent, request: KanbanRequest) => void;
    onClick?: () => void;
    isPending: boolean;
}) {
    const items = request.items_detail || [];
    const date = new Date(request.created_at);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('es-CL', { month: 'short' });

    return (
        <div
            draggable={!isPending}
            onDragStart={(e) => onDragStart(e, request)}
            onClick={onClick}
            style={{ borderLeftColor: accentColor }}
            className={`
                group relative rounded-lg border-l-[3px]
                bg-white dark:bg-slate-800/90
                border border-slate-200 dark:border-slate-700/50
                shadow-sm hover:shadow-md
                transition-all duration-200 cursor-grab active:cursor-grabbing
                hover:translate-y-[-1px]
                ${isPending ? 'opacity-40 pointer-events-none animate-pulse' : ''}
            `}
        >
            {/* Grip handle */}
            <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Card body */}
            <div className="p-3 space-y-2">
                {/* Row 1: Code + Date */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                    <span
                        className="text-[13px] font-bold font-mono tracking-tight truncate"
                        style={{ color: accentColor }}
                    >
                        #{request.request_code}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap flex items-center gap-0.5 shrink-0">
                        <Calendar className="w-2.5 h-2.5" />
                        {day} {month}
                    </span>
                </div>

                {/* Row 2: User */}
                <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium">
                        {request.user_name || request.user_email?.split('@')[0] || 'Sin nombre'}
                    </span>
                </div>

                {/* Row 3: Area badge */}
                {request.area && (
                    <div className="flex">
                        <span className="inline-block text-[10px] leading-tight px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 truncate max-w-full">
                            {request.area}
                        </span>
                    </div>
                )}

                {/* Row 4: Items list (compact) */}
                <div className="space-y-0.5 pt-0.5 border-t border-slate-100 dark:border-slate-700/40">
                    {items.slice(0, 2).map((item, i) => (
                        <div key={i} className="flex items-start gap-1 min-w-0">
                            <Package className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                            <span className="text-[11px] leading-tight text-slate-500 dark:text-slate-400 line-clamp-1">
                                <span className="font-medium text-slate-600 dark:text-slate-300">{item.quantity}x</span>{' '}
                                {item.detail}
                            </span>
                        </div>
                    ))}
                    {items.length > 2 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 pl-4">
                            +{items.length - 2} ítem{items.length - 2 > 1 ? 's' : ''} más
                        </span>
                    )}
                    {items.length === 0 && (
                        <span className="text-[10px] text-slate-400 italic">Sin ítems</span>
                    )}
                </div>
            </div>

            {/* Footer: View detail */}
            <button
                onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                className="w-full text-[10px] py-1.5 border-t border-slate-100 dark:border-slate-700/40 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors flex items-center justify-center gap-1 rounded-b-lg"
            >
                <Eye className="w-3 h-3" /> Ver detalle
            </button>
        </div>
    );
}

/* ═══════════ Kanban Column ═══════════ */
function KanbanColumn({
    config,
    requests,
    onDragStart,
    onDrop,
    isDragOver,
    canDrop,
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
    canDrop: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onRequestClick?: (request: KanbanRequest) => void;
    pendingIds: Set<string>;
}) {
    const Icon = config.icon;

    return (
        <div
            className="flex flex-col rounded-xl overflow-hidden transition-all duration-200"
            style={{
                background: config.bgColumn,
                border: `1px solid ${isDragOver && canDrop ? config.accent : config.borderCol}`,
                boxShadow: isDragOver && canDrop ? `0 0 0 2px ${config.accent}40, 0 4px 12px ${config.accent}10` : 'none',
                transform: isDragOver && canDrop ? 'scale(1.01)' : 'scale(1)',
                minHeight: '380px',
                maxHeight: 'calc(100vh - 240px)',
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, config.key)}
        >
            {/* Column Header */}
            <div
                className="px-3 py-2.5 flex items-center justify-between"
                style={{ background: config.bgHeader, borderBottom: `1px solid ${config.borderCol}` }}
            >
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: config.badgeBg }}
                    >
                        <Icon className="w-3.5 h-3.5" style={{ color: config.accent }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {config.label}
                    </span>
                </div>
                <span
                    className="text-xs font-bold font-mono w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: config.badgeBg, color: config.badgeText }}
                >
                    {requests.length}
                </span>
            </div>

            {/* Cards area */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
                {requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                            style={{ background: config.badgeBg }}
                        >
                            <Icon className="w-5 h-5 opacity-50" style={{ color: config.accent }} />
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Sin solicitudes</p>
                        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">Arrastra aquí</p>
                    </div>
                ) : (
                    requests.map((req) => (
                        <KanbanCard
                            key={req.id}
                            request={req}
                            accentColor={config.accent}
                            onDragStart={onDragStart}
                            onClick={() => onRequestClick?.(req)}
                            isPending={pendingIds.has(req.id)}
                        />
                    ))
                )}
            </div>

            {/* Drop zone indicator */}
            {isDragOver && canDrop && (
                <div
                    className="mx-2.5 mb-2.5 py-2.5 rounded-lg border-2 border-dashed flex items-center justify-center gap-1.5 animate-pulse"
                    style={{ borderColor: config.accent, background: `${config.accent}08` }}
                >
                    <ArrowRight className="w-3.5 h-3.5" style={{ color: config.accent }} />
                    <span className="text-[11px] font-medium" style={{ color: config.accent }}>
                        Mover a {config.label}
                    </span>
                </div>
            )}

            {isDragOver && !canDrop && (
                <div className="mx-2.5 mb-2.5 py-2.5 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center gap-1.5 opacity-50">
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-medium text-slate-400">No permitido</span>
                </div>
            )}
        </div>
    );
}

/* ═══════════ Main Kanban Board ═══════════ */
export function KanbanBoard({ requests, onRequestClick }: KanbanBoardProps) {
    const [localRequests, setLocalRequests] = useState(requests);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const draggedRef = useRef<KanbanRequest | null>(null);
    const [, startTransition] = useTransition();

    useEffect(() => {
        setLocalRequests(requests);
    }, [requests]);

    const columns = KANBAN_COLUMNS.map((col) => ({
        config: col,
        requests: localRequests.filter((r) => r.status === col.key),
    }));

    const handleDragStart = useCallback((_e: React.DragEvent, request: KanbanRequest) => {
        draggedRef.current = request;
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, columnKey: string) => {
        e.preventDefault();
        setDragOverColumn(columnKey);
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
                const result = await updateRequestStatus(
                    request.id,
                    targetStatus,
                    `Kanban: ${request.status} → ${targetStatus}`
                );
                if (result?.error) {
                    setLocalRequests((prev) =>
                        prev.map((r) => (r.id === request.id ? { ...r, status: request.status } : r))
                    );
                    toast.error(result.error);
                } else {
                    toast.success(
                        `#${request.request_code} → ${targetStatus}`,
                        { duration: 2000 }
                    );
                }
            } catch {
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

    const canDropOnColumn = draggedRef.current
        ? canTransition(draggedRef.current.status, dragOverColumn ?? '')
        : false;

    return (
        <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Columns3 className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">Vista Kanban</span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Arrastra las tarjetas entre columnas para cambiar el estado
                </span>
            </div>

            {/* Flow legend */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {KANBAN_COLUMNS.map((col, i) => (
                    <div key={col.key} className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: col.badgeBg, color: col.badgeText }}
                        >
                            <col.icon className="w-2.5 h-2.5" />
                            {col.label}
                        </div>
                        {i < KANBAN_COLUMNS.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                        )}
                    </div>
                ))}
            </div>

            {/* Board Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {columns.map(({ config, requests: colRequests }) => (
                    <KanbanColumn
                        key={config.key}
                        config={config}
                        requests={colRequests}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        isDragOver={dragOverColumn === config.key}
                        canDrop={dragOverColumn === config.key && canDropOnColumn}
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
