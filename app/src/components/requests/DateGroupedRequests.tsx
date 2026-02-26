'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Calendar, CalendarDays, CalendarRange,
    Clock, CheckCircle, XCircle, ShieldAlert,
    PackageCheck, Trash2, FileText, ArrowRight,
} from 'lucide-react';
import { IndustrialCard } from '@/components/ui/IndustrialCard';
import { StatusChip, getRequestStatusMeta } from '@/components/ui/request-status';

type GroupMode = 'day' | 'week' | 'month';

interface RequestData {
    id: string;
    request_code: string;
    user_name: string;
    user_email: string;
    area: string;
    items_detail: any[];
    created_at: string;
    status: string;
    notes?: string;
    [key: string]: any;
}

interface DateGroupedRequestsProps {
    requests: RequestData[];
}

const GROUP_MODE_CONFIG: Record<GroupMode, { label: string; icon: React.ReactNode }> = {
    day: { label: 'Día', icon: <Calendar className="w-3.5 h-3.5" /> },
    week: { label: 'Semana', icon: <CalendarRange className="w-3.5 h-3.5" /> },
    month: { label: 'Mes', icon: <CalendarDays className="w-3.5 h-3.5" /> },
};

function getWeekRange(date: Date): { start: Date; end: Date } {
    const d = new Date(date);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(d);
    start.setDate(d.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function getGroupKey(date: Date, mode: GroupMode): string {
    switch (mode) {
        case 'day':
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        case 'week': {
            const { start } = getWeekRange(date);
            return `${start.getFullYear()}-W${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        }
        case 'month':
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
}

function formatGroupLabel(date: Date, mode: GroupMode): string {
    const locale = 'es-CL';
    switch (mode) {
        case 'day':
            return date.toLocaleDateString(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        case 'week': {
            const { start, end } = getWeekRange(date);
            const startStr = start.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
            const endStr = end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
            return `Semana del ${startStr} al ${endStr}`;
        }
        case 'month':
            return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function RequestCard({ req }: { req: RequestData }) {
    return (
        <Link href={`/my-orders/${req.id}`} className="block group">
            <IndustrialCard className="p-0 overflow-hidden hover:border-slate-600 transition-colors bg-slate-900/80">
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start md:items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border ${getRequestStatusMeta(req.status).bgClass} ${getRequestStatusMeta(req.status).textClass} ${getRequestStatusMeta(req.status).borderClass}`}>
                            {req.status === 'Pendiente' && <Clock className="w-6 h-6" />}
                            {req.status === 'Aceptada' && <CheckCircle className="w-6 h-6" />}
                            {req.status === 'Alerta' && <ShieldAlert className="w-6 h-6" />}
                            {req.status === 'Cancelada' && <XCircle className="w-6 h-6" />}
                            {req.status === 'Entregada' && <PackageCheck className="w-6 h-6" />}
                            {req.status === 'Eliminada' && <Trash2 className="w-6 h-6" />}
                            {!['Pendiente', 'Aceptada', 'Alerta', 'Cancelada', 'Entregada', 'Eliminada'].includes(req.status) && <FileText className="w-6 h-6" />}
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-bold text-white font-mono">{req.request_code}</span>
                                <StatusChip status={req.status} />
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatDate(req.created_at)}
                                </span>
                                <span>·</span>
                                <span>{req.items_detail?.length || 0} ítems</span>
                                <span>·</span>
                                <span className="text-slate-400">{req.area}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/50">
                        <div className="flex -space-x-2">
                            {(req.items_detail && Array.isArray(req.items_detail) ? req.items_detail.slice(0, 4) : []).map((item: any, i: number) => (
                                <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-500 overflow-hidden relative shadow-sm">
                                    {item.imagen ? (
                                        <Image
                                            src={item.imagen}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            sizes="32px"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                                    )}
                                </div>
                            ))}
                            {(req.items_detail?.length || 0) > 4 && (
                                <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-500 font-medium">
                                    +{req.items_detail.length - 4}
                                </div>
                            )}
                        </div>

                        <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center gap-2">
                            Ver Detalles <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </IndustrialCard>
        </Link>
    );
}

export default function DateGroupedRequests({ requests }: DateGroupedRequestsProps) {
    const [groupMode, setGroupMode] = useState<GroupMode>('day');

    const groups = useMemo(() => {
        const map = new Map<string, { label: string; sortKey: string; requests: RequestData[] }>();

        for (const req of requests) {
            const date = new Date(req.created_at);
            const key = getGroupKey(date, groupMode);
            if (!map.has(key)) {
                map.set(key, {
                    label: formatGroupLabel(date, groupMode),
                    sortKey: key,
                    requests: [],
                });
            }
            map.get(key)!.requests.push(req);
        }

        return Array.from(map.values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    }, [requests, groupMode]);

    if (requests.length === 0) {
        return (
            <div className="py-12 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900/40">
                No hay solicitudes para el filtro seleccionado.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Group mode selector */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 mr-1 uppercase tracking-wider font-medium">Agrupar por:</span>
                {(Object.keys(GROUP_MODE_CONFIG) as GroupMode[]).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setGroupMode(mode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all duration-200 ${groupMode === mode
                                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 shadow-sm shadow-blue-500/10'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                            }`}
                    >
                        {GROUP_MODE_CONFIG[mode].icon}
                        {GROUP_MODE_CONFIG[mode].label}
                    </button>
                ))}
            </div>

            {/* Grouped requests */}
            {groups.map((group) => (
                <div key={group.sortKey} className="space-y-3">
                    {/* Group header */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
                            <CalendarDays className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-semibold text-slate-200 capitalize">
                                {group.label}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">
                                ({group.requests.length})
                            </span>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-slate-700/50 to-transparent" />
                    </div>

                    {/* Request cards */}
                    <div className="grid grid-cols-1 gap-3 pl-2">
                        {group.requests.map((req) => (
                            <RequestCard key={req.id} req={req} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
