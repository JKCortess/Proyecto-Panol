import { getInventory } from "@/lib/data";
import { createClient } from "@/utils/supabase/server";
import { IndustrialCard } from "@/components/ui/IndustrialCard";
import {
  Search,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle,
  MapPin,
  ClipboardList,
  ShieldAlert,
  PackageCheck,
  Trash2,
  User,
  CalendarDays,
  FilterX,
  Package,
  Boxes,
  TriangleAlert,
  DollarSign,
  Hourglass,
  CircleCheckBig,
  PackageOpen,
  Ban,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { DashboardRealtimeSync } from "@/components/dashboard/DashboardRealtimeSync";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { StatusChip } from "@/components/ui/request-status";
import { ModernDatePicker } from "@/components/ui/ModernDatePicker";

type MaterialRequestRow = {
  id: string;
  request_code: string;
  user_name: string | null;
  user_email: string | null;
  area: string | null;
  items_detail: unknown[] | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type StatusLogRow = {
  id: string;
  request_code: string;
  previous_status: string;
  new_status: string;
  changed_by_name: string | null;
  created_at: string;
};



type DashboardSearchParams = {
  from?: string;
  to?: string;
};

const isValidDate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

const toStartOfDayIso = (date: string) => new Date(`${date}T00:00:00.000`).toISOString();
const toEndOfDayIso = (date: string) => new Date(`${date}T23:59:59.999`).toISOString();

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>;
}) {
  const params = (await searchParams) || {};
  const fromDate = isValidDate(params.from) ? params.from : "";
  const toDate = isValidDate(params.to) ? params.to : "";
  const hasDateFilter = Boolean(fromDate || toDate);
  const supabase = await createClient();
  const allItems = await getInventory();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let allRequestsQuery = supabase
    .from("material_requests")
    .select("id, request_code, user_name, user_email, area, items_detail, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(250);
  let recentRequestsQuery = supabase
    .from("material_requests")
    .select("id, request_code, user_name, user_email, area, items_detail, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(8);
  let recentAdminMovementsQuery = supabase
    .from("request_status_log")
    .select("id, request_code, previous_status, new_status, changed_by_name, created_at")
    .in("new_status", ["Aceptada", "Entregada", "Eliminada"])
    .order("created_at", { ascending: false })
    .limit(8);

  if (fromDate) {
    const fromIso = toStartOfDayIso(fromDate);
    allRequestsQuery = allRequestsQuery.gte("created_at", fromIso);
    recentRequestsQuery = recentRequestsQuery.gte("created_at", fromIso);
    recentAdminMovementsQuery = recentAdminMovementsQuery.gte("created_at", fromIso);
  }
  if (toDate) {
    const toIso = toEndOfDayIso(toDate);
    allRequestsQuery = allRequestsQuery.lte("created_at", toIso);
    recentRequestsQuery = recentRequestsQuery.lte("created_at", toIso);
    recentAdminMovementsQuery = recentAdminMovementsQuery.lte("created_at", toIso);
  }

  const [{ data: allRequests }, { data: recentRequests }, { data: recentAdminMovements }, { data: profile }] = await Promise.all([
    allRequestsQuery,
    recentRequestsQuery,
    recentAdminMovementsQuery,
    user
      ? supabase.from("user_profiles").select("role").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const requestRows = (allRequests || []) as MaterialRequestRow[];
  const recentRequestRows = (recentRequests || []) as MaterialRequestRow[];
  const adminMovementRows = (recentAdminMovements || []) as StatusLogRow[];

  const criticalItems = allItems.filter((item) => item.rop > 0 && item.stock <= item.rop).slice(0, 4);
  const totalItems = allItems.length;
  const totalStock = allItems.reduce((sum, item) => sum + item.stock, 0);
  const criticalCount = allItems.filter((item) => item.rop > 0 && item.stock <= item.rop).length;
  const totalValueCLP = allItems.reduce((sum, item) => sum + (item.valor_aprox_clp || 0), 0);

  const pendingRequests = requestRows.filter((r) => r.status === "Pendiente");
  const deliveredRequests = requestRows.filter((r) => r.status === "Entregada");
  const deletedRequests = requestRows.filter((r) => r.status === "Eliminada");
  const acceptedRequests = requestRows.filter((r) => r.status === "Aceptada");

  const pendingCount = pendingRequests.length;
  const deliveredCount = deliveredRequests.length;
  const deletedCount = deletedRequests.length;
  const acceptedCount = acceptedRequests.length;

  const nowMs = new Date().getTime();
  const pendingOver48h = pendingRequests.filter(
    (r) => nowMs - new Date(r.created_at).getTime() > 48 * 60 * 60 * 1000
  ).length;



  const areaCountMap = requestRows.reduce<Record<string, number>>((acc, req) => {
    const area = req.area || "Sin área";
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {});
  const topAreas = Object.entries(areaCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const recentMovements = recentRequestRows.map((req) => ({
    id: req.request_code,
    user: req.user_name || req.user_email?.split("@")[0] || "Usuario",
    time: new Date(req.created_at).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    quantity: req.items_detail?.length || 0,
    status: req.status,
  }));

  const adminMovementList = adminMovementRows.map((m) => ({
    id: m.id,
    requestCode: m.request_code,
    actor: m.changed_by_name || "Administrador",
    action: m.new_status,
    previous: m.previous_status,
    time: new Date(m.created_at).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const isAdmin = profile?.role === "Administrador";





  const formatCLP = (value: number) => {
    if (!value) return "-";
    return `$${value.toLocaleString("es-CL")}`;
  };



  const riskLabel =
    pendingOver48h > 0 || criticalCount > 0
      ? "Requiere atención"
      : "Operación estable";

  const riskColor =
    pendingOver48h > 0 || criticalCount > 0
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className="p-5 md:p-8 space-y-6 md:space-y-8 min-h-full">
      <header className="relative z-30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-800/70 rounded-2xl bg-slate-900/60 backdrop-blur-xl p-5 md:p-6 shadow-xl">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Panel de Control</h1>
          <p className="text-slate-400">Bienvenido, aquí está el resumen del pañol hoy.</p>
          <div className="mt-2">
            <DashboardRealtimeSync />
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="icon-left icon-left-sm text-slate-500" />
            <input
              type="text"
              placeholder="Buscar SKU, Nombre..."
              className="w-full bg-slate-900 border-slate-800 rounded-lg input-with-icon py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-600"
            />
          </div>
          <NotificationBell initialPendingCount={pendingCount} isAdmin={isAdmin} />
        </div>
      </header>

      <form action="/" method="GET" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
          <CalendarDays className="w-4 h-4 text-blue-400" />
          Filtro por fecha
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          <div>
            <ModernDatePicker
              name="from"
              label="Desde"
              defaultValue={fromDate}
              placeholder="dd-mm-aaaa"
            />
          </div>
          <div>
            <ModernDatePicker
              name="to"
              label="Hasta"
              defaultValue={toDate}
              placeholder="dd-mm-aaaa"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
          >
            Aplicar
          </button>
          {hasDateFilter && (
            <Link
              href="/"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
            >
              <FilterX className="w-3.5 h-3.5" />
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {/* ── KPIs PRINCIPALES (Inventario) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Total Ítems</p>
            <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white leading-none">{totalItems}</p>
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Stock Total</p>
            <p className="text-2xl font-bold font-mono text-cyan-400 leading-none">{totalStock}</p>
          </div>
        </div>
        <Link href="/inventory?status=critical" className="bg-slate-900/70 border border-red-500/20 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex items-center gap-4 hover:bg-red-500/5 hover:border-red-500/40 transition-all group">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 group-hover:bg-red-500/20 transition-colors">
            <TriangleAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[10px] uppercase font-bold text-red-400">Stock Crítico</p>
              <Search className="w-3 h-3 text-red-500/40 group-hover:text-red-400 transition-colors" />
            </div>
            <p className="text-2xl font-bold font-mono text-red-500 group-hover:text-red-400 transition-colors leading-none">{criticalCount}</p>
          </div>
        </Link>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Valor Inventario</p>
            <p className="text-lg font-bold font-mono text-emerald-400 leading-none">{formatCLP(totalValueCLP)}</p>
          </div>
        </div>
      </div>

      {/* ── KPIs SOLICITUDES ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Hourglass className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-amber-500/70 mb-0.5">Pendientes</p>
            <p className="text-2xl font-bold font-mono text-amber-400 leading-none">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CircleCheckBig className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-500/70 mb-0.5">Aceptadas</p>
            <p className="text-2xl font-bold font-mono text-emerald-400 leading-none">{acceptedCount}</p>
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <PackageOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-blue-500/70 mb-0.5">Entregadas</p>
            <p className="text-2xl font-bold font-mono text-blue-400 leading-none">{deliveredCount}</p>
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-rose-500/70 mb-0.5">Eliminadas</p>
            <p className="text-2xl font-bold font-mono text-rose-400 leading-none">{deletedCount}</p>
          </div>
        </div>
      </div>

      {/* ── RESUMEN OPERATIVO: Riesgo + Carga por Área ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IndustrialCard className="p-5 bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wide text-slate-300">Riesgo Operativo</h3>
          </div>
          <p className={`text-lg font-semibold ${riskColor}`}>{riskLabel}</p>
          <div className="mt-3 space-y-1">
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <Hourglass className="w-3.5 h-3.5 text-amber-500/60" />
              {pendingOver48h} solicitud(es) pendiente(s) por más de 48h.
            </p>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <TriangleAlert className="w-3.5 h-3.5 text-red-500/60" />
              {criticalCount} SKU(s) en nivel crítico.
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href="/requests/pending" className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors">
              Ver pendientes
            </Link>
            <Link href="/inventory?status=critical" className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
              Ver críticos
            </Link>
          </div>
        </IndustrialCard>

        <IndustrialCard className="p-5 bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <ClipboardList className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wide text-slate-300">Carga por Área</h3>
          </div>
          <div className="space-y-2.5 mt-2">
            {topAreas.length > 0 ? (
              topAreas.map(([area, count]) => {
                const maxCount = topAreas[0][1];
                const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={area}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-400 truncate pr-3">{area}</span>
                      <span className="font-mono font-bold text-slate-200">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500/60 to-purple-400/40 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">Sin datos de solicitudes.</p>
            )}
          </div>
        </IndustrialCard>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
        <IndustrialCard className="lg:col-span-2 p-0 bg-slate-900 border border-slate-800 shadow-lg flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <h3 className="font-bold text-red-400 tracking-wide uppercase text-sm">Ítems Bajo Mínimo</h3>
            </div>
            <Link href="/inventory?status=critical" className="text-xs font-mono text-slate-500 hover:text-white transition-colors flex items-center gap-1 bg-slate-800 px-2 py-1 rounded border border-slate-700">
              Ver Todos <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {criticalItems.length > 0 ? criticalItems.map(item => (
                <div key={item.sku} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-center gap-3 hover:border-slate-700 transition-colors group">
                  <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center shrink-0 border border-slate-800 overflow-hidden">
                    {item.foto ? (
                      <Image src={item.foto} alt={item.nombre} width={40} height={40} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" unoptimized />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-slate-200 text-sm truncate pr-2">{item.nombre}</h4>
                      <span className="text-xs font-bold text-red-500 shrink-0">{item.stock} uds</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500 font-mono">{item.marca || '-'}</span>
                      {item.estante_nro && (
                        <>
                          <span className="text-slate-700">·</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />E{item.estante_nro}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${item.rop > 0 ? Math.min((item.stock / item.rop) * 100, 100) : 100}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Min: {item.rop}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500/20" />
                  <span className="text-sm">Todos los stocks están dentro de niveles saludables.</span>
                </div>
              )}
            </div>
          </div>
        </IndustrialCard>

        <IndustrialCard className="p-0 bg-slate-900 border border-slate-800 shadow-lg flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
            <h3 className="font-bold text-slate-200 text-sm">Movimientos Recientes</h3>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {recentMovements.length > 0 ? recentMovements.map((move, i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-800/50 rounded-lg transition-colors group border border-transparent hover:border-slate-800">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-slate-800 ${move.status === 'Pendiente' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {move.status === 'Pendiente' ? <Clock className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-300 truncate">{move.user}</div>
                    <div className="text-xs text-slate-500 truncate">{move.id} · {move.time}</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-sm text-slate-500">
                  {move.quantity} ítems
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2 h-full">
                <Clock className="w-8 h-8 text-slate-700" />
                <span className="text-sm">No hay actividad registrada hoy.</span>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-slate-800 bg-slate-950/30 text-center">
            <Link href="/my-orders" className="text-xs text-blue-500 hover:text-white transition-colors font-mono">VER TODA LA ACTIVIDAD</Link>
          </div>
        </IndustrialCard>
      </div>

      {
        isAdmin && (
          <IndustrialCard className="p-0 bg-slate-900 border border-slate-800 shadow-lg overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wide">Auditoría Administrativa Reciente</h3>
              </div>
              <Link href="/requests/pending" className="text-xs text-blue-400 hover:text-white flex items-center gap-1">
                Ver gestión <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-800">
              {adminMovementList.length > 0 ? adminMovementList.map((m) => (
                <div key={m.id} className="px-5 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center border ${m.previous === "Eliminada" && m.action === "Pendiente"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : m.action === "Entregada"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : m.action === "Eliminada"
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}>
                      {m.action === "Entregada" ? (
                        <PackageCheck className="w-3.5 h-3.5" />
                      ) : m.action === "Eliminada" ? (
                        <Trash2 className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">
                        <span className="font-mono">{m.requestCode}</span> · {m.previous} → {m.action}
                      </p>
                      <div className="mt-1">
                        <StatusChip
                          status={m.previous === "Eliminada" && m.action === "Pendiente" ? "Restaurada" : m.action}
                        />
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        por {m.actor}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{m.time}</span>
                </div>
              )) : (
                <div className="px-5 py-10 text-center text-slate-500 text-sm">
                  No hay movimientos administrativos recientes.
                </div>
              )}
            </div>
          </IndustrialCard>
        )
      }
    </div >
  );
}
