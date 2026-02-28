import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import DateGroupedRequests from "@/components/requests/DateGroupedRequests";

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
                        <DateGroupedRequests requests={filteredRequests} />
                    )}
                </div>
            </div>
        </main>
    );
}
