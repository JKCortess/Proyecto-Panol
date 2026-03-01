
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/app/(app)/profile/actions';
import { getPendingRequests, getRecentAdminMovements } from '@/app/(app)/requests/actions';
import { RequestViewToggle } from '@/components/requests/RequestViewToggle';
import { AdminMovementHistoryTable } from '@/components/requests/AdminMovementHistoryTable';
import { ModernDatePicker } from '@/components/ui/ModernDatePicker';


type PendingRequestsPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

function toCsvValue(value: string | null | undefined) {
    const safe = (value ?? '').replace(/"/g, '""');
    return `"${safe}"`;
}

export default async function PendingRequestsPage({ searchParams }: PendingRequestsPageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Check permissions
    const profile = await getUserProfile();
    const isAdmin = profile?.role === 'Administrador';

    if (!isAdmin) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h1 className="text-3xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
                <p className="ui-subtitle">No tienes permisos para ver esta página.</p>
            </div>
        );
    }

    // Fetch data
    const resolvedSearchParams = (await searchParams) ?? {};
    const movementFrom = typeof resolvedSearchParams.movement_from === 'string' ? resolvedSearchParams.movement_from : '';
    const movementTo = typeof resolvedSearchParams.movement_to === 'string' ? resolvedSearchParams.movement_to : '';
    const movementUser = typeof resolvedSearchParams.movement_user === 'string' ? resolvedSearchParams.movement_user : '';
    const movementCode = typeof resolvedSearchParams.movement_code === 'string' ? resolvedSearchParams.movement_code : '';

    const allRequests = await getPendingRequests();
    const recentMovements = await getRecentAdminMovements(100, {
        fromDate: movementFrom || undefined,
        toDate: movementTo || undefined,
        adminQuery: movementUser || undefined,
        requestCode: movementCode || undefined,
    });
    const pendingCount = allRequests.filter((r: { status: string }) => r.status === 'Pendiente').length;
    const alertCount = allRequests.filter((r: { status: string }) => r.status === 'Alerta').length;
    const csvHeader = ['fecha_hora', 'solicitud', 'accion', 'administrador', 'motivo'].join(',');
    const csvRows = recentMovements.map((entry: {
        request_code?: string | null;
        new_status: string;
        changed_by_name?: string | null;
        reason?: string | null;
        created_at: string;
    }) =>
        [
            toCsvValue(new Date(entry.created_at).toLocaleString('es-CL')),
            toCsvValue(entry.request_code ?? 'N/D'),
            toCsvValue(entry.new_status),
            toCsvValue(entry.changed_by_name ?? 'Administrador'),
            toCsvValue(entry.reason ?? '-'),
        ].join(',')
    );
    const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent([csvHeader, ...csvRows].join('\n'))}`;
    const csvFileName = `historial_admin_${new Date().toISOString().slice(0, 10)}.csv`;

    return (
        <div className="ui-page max-w-6xl py-8 screen-requests">
            {/* ═══════════ SECCIÓN 1: Solicitudes no entregadas ═══════════ */}
            <div className="ui-card rounded-2xl overflow-hidden border-l-4 border-l-blue-500">
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">📋</span>
                            <h1 className="ui-title">Solicitudes no entregadas</h1>
                        </div>
                        <p className="ui-subtitle">
                            Solicitudes pendientes de revisión y entrega por parte del administrador.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {alertCount > 0 && (
                            <div className="ui-chip bg-orange-900/20 px-4 py-2 rounded-xl border border-orange-800/50">
                                <span className="text-orange-400 text-sm mr-2">⚠️ Alertas:</span>
                                <span className="text-orange-400 font-bold font-mono text-xl">{alertCount}</span>
                            </div>
                        )}
                        <div className="ui-chip px-4 py-2 rounded-xl">
                            <span className="text-slate-400 text-sm mr-2">Pendientes:</span>
                            <span className="text-blue-400 font-bold font-mono text-xl">{pendingCount}</span>
                        </div>
                        <div className="ui-chip px-4 py-2 rounded-xl">
                            <span className="text-slate-400 text-sm mr-2">Total:</span>
                            <span className="text-white font-bold font-mono text-xl">{allRequests.length}</span>
                        </div>
                    </div>
                </div>
                <RequestViewToggle requests={allRequests} />
            </div>

            {/* ═══════════ SEPARADOR VISUAL ═══════════ */}
            <div className="relative my-10">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-700/60"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-slate-950 px-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        — Historial —
                    </span>
                </div>
            </div>

            {/* ═══════════ SECCIÓN 2: Historial de solicitudes procesadas ═══════════ */}
            <div className="ui-card rounded-2xl overflow-hidden border-l-4 border-l-emerald-500">
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/70 flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">📜</span>
                            <h2 className="ui-title text-xl">Historial de solicitudes procesadas</h2>
                        </div>
                        <p className="ui-subtitle">
                            Registro de todas las solicitudes que fueron entregadas, canceladas o eliminadas.
                        </p>
                    </div>
                    <a
                        href={csvHref}
                        download={csvFileName}
                        className="h-9 px-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-sm font-medium inline-flex items-center"
                    >
                        Exportar CSV
                    </a>
                </div>
                <form method="GET" className="px-5 py-4 border-b border-slate-800 bg-slate-900/40 flex flex-col md:flex-row md:items-end gap-3">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="movement_from" className="ui-meta">Desde</label>
                        <ModernDatePicker
                            name="movement_from"
                            defaultValue={movementFrom}
                            placeholder="Desde"
                            className="w-full"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="movement_to" className="ui-meta">Hasta</label>
                        <ModernDatePicker
                            name="movement_to"
                            defaultValue={movementTo}
                            placeholder="Hasta"
                            className="w-full"
                        />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                        <label htmlFor="movement_user" className="ui-meta">Administrador</label>
                        <input
                            id="movement_user"
                            name="movement_user"
                            type="text"
                            placeholder="Nombre del admin"
                            defaultValue={movementUser}
                            className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white ui-btn-secondary"
                        />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                        <label htmlFor="movement_code" className="ui-meta">Código Solicitud</label>
                        <input
                            id="movement_code"
                            name="movement_code"
                            type="text"
                            placeholder="Ej: 482917"
                            defaultValue={movementCode}
                            className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white ui-btn-secondary"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
                        >
                            Filtrar
                        </button>
                        <a
                            href="/requests/pending"
                            className="ui-btn-secondary h-9 px-3 rounded-xl text-sm font-medium inline-flex items-center"
                        >
                            Limpiar
                        </a>
                    </div>
                </form>
                <AdminMovementHistoryTable movements={recentMovements} />
            </div>
        </div>
    );
}


