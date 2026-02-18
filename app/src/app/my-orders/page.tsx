import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    ArrowRight,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    PackageCheck,
    ShieldAlert,
    Trash2,
    XCircle,
} from "lucide-react";
import Image from "next/image";
import { IndustrialCard } from "@/components/ui/IndustrialCard";
import { StatusChip, getRequestStatusMeta } from "@/components/ui/request-status";

type MyOrdersPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const STATUS_FILTER_KEYS = ['all', 'Pendiente', 'Aceptada', 'Alerta', 'Cancelada', 'Entregada', 'Eliminada'] as const;
type StatusFilterKey = (typeof STATUS_FILTER_KEYS)[number];

const FILTER_LABEL: Record<StatusFilterKey, string> = {
    all: 'Todas',
    Pendiente: 'Pendiente',
    Aceptada: 'Aceptada',
    Alerta: 'Contactar',
    Cancelada: 'Cancelada',
    Entregada: 'Entregada',
    Eliminada: 'Eliminada',
};

export default async function MyOrdersPage({ searchParams }: MyOrdersPageProps) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    const resolvedSearchParams = (await searchParams) ?? {};
    const rawStatus = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : 'all';
    const statusFilter: StatusFilterKey = STATUS_FILTER_KEYS.includes(rawStatus as StatusFilterKey)
        ? (rawStatus as StatusFilterKey)
        : 'all';

    const { data: requests, error } = await supabase
        .from('material_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching requests:', error);
    }

    const allRequests = requests || [];
    const filteredRequests = statusFilter === 'all'
        ? allRequests
        : allRequests.filter((req) => req.status === statusFilter);

    const statusCount = {
        all: allRequests.length,
        Pendiente: allRequests.filter((r) => r.status === 'Pendiente').length,
        Aceptada: allRequests.filter((r) => r.status === 'Aceptada').length,
        Alerta: allRequests.filter((r) => r.status === 'Alerta').length,
        Cancelada: allRequests.filter((r) => r.status === 'Cancelada').length,
        Entregada: allRequests.filter((r) => r.status === 'Entregada').length,
        Eliminada: allRequests.filter((r) => r.status === 'Eliminada').length,
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <main className="min-h-screen p-6 md:p-12 bg-slate-950 text-slate-200">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Mis Solicitudes</h1>
                        <p className="text-slate-400 mt-1">Historial completo de tus solicitudes de material.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/requests/new"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <span className="text-lg leading-none mb-0.5">+</span> Nueva Solicitud
                        </Link>
                    </div>
                </header>

                <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                        {STATUS_FILTER_KEYS.map((key) => (
                            <Link
                                key={key}
                                href={key === 'all' ? '/my-orders' : `/my-orders?status=${encodeURIComponent(key)}`}
                                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${statusFilter === key
                                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                                    }`}
                            >
                                {FILTER_LABEL[key]} ({statusCount[key]})
                            </Link>
                        ))}
                    </div>

                    {allRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-slate-800 rounded-xl border-dashed">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-300">No tienes pedidos registrados</h3>
                            <p className="text-slate-500 max-w-sm text-center mt-2 mb-6">
                                Las solicitudes que generes aparecerán aquí para que puedas hacerles seguimiento.
                            </p>
                            <Link
                                href="/requests/new"
                                className="text-blue-400 hover:text-blue-300 font-medium hover:underline flex items-center gap-2"
                            >
                                Crear mi primera solicitud <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredRequests.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900/40">
                                    No hay solicitudes para el filtro seleccionado.
                                </div>
                            ) : filteredRequests.map((req) => (
                                <Link
                                    key={req.id}
                                    href={`/my-orders/${req.id}`}
                                    className="block group"
                                >
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
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
