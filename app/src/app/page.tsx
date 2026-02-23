import { createClient } from "@/utils/supabase/server";
import { IndustrialCard } from "@/components/ui/IndustrialCard";
import {
  Search,
  ArrowUpRight,
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
  TrendingUp,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { DashboardRealtimeSync } from "@/components/dashboard/DashboardRealtimeSync";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { StatusChip } from "@/components/ui/request-status";
import { ModernDatePicker } from "@/components/ui/ModernDatePicker";
import {
  StatusDonut,
  CategoryBarChart,
  MovementBarChart,
  TimelineAreaChart,
  type StatusData,
  type CategoryData,
  type MovementData,
  type TimelineData,
} from "@/components/dashboard/DashboardCharts";

/* ── Types ── */
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

type DashboardSearchParams = { from?: string; to?: string };
const isValidDate = (v?: string) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));
const toStartOfDayIso = (d: string) => new Date(`${d}T00:00:00.000`).toISOString();
const toEndOfDayIso = (d: string) => new Date(`${d}T23:59:59.999`).toISOString();

const formatCLP = (v: number) => (v ? `$${v.toLocaleString("es-CL")}` : "$0");

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* ═══════════════════════════════════════════════
     INVENTORY DATA — Direct from Supabase
     ═══════════════════════════════════════════════ */
  const [
    { data: inventoryStats },
    { data: categoryBreakdown },
    { data: criticalItemsRaw },
  ] = await Promise.all([
    supabase.rpc("get_inventory_stats").maybeSingle() as unknown as Promise<{
      data: { total_items: number; total_stock: number; critical_count: number; total_value: number } | null;
    }>,
    // Fallback: direct query for categories
    supabase
      .from("inventory")
      .select("category, stock_current")
      .order("category"),
    // Critical items
    supabase
      .from("inventory")
      .select("sku, name, brand, stock_current, rop, shelf_number, image_url")
      .gt("rop", 0)
      .order("stock_current", { ascending: true })
      .limit(6),
  ]);

  // Compute inventory KPIs from raw data if RPC doesn't exist
  let totalItems = 0;
  let totalStock = 0;
  let criticalCount = 0;
  let totalValueCLP = 0;

  if (inventoryStats) {
    totalItems = inventoryStats.total_items;
    totalStock = inventoryStats.total_stock;
    criticalCount = inventoryStats.critical_count;
    totalValueCLP = inventoryStats.total_value;
  }

  // If RPC failed, compute from direct query
  if (!inventoryStats) {
    const { data: allInv } = await supabase
      .from("inventory")
      .select("stock_current, rop, value_clp");
    const inv = allInv || [];
    totalItems = inv.length;
    totalStock = inv.reduce((s, i) => s + (i.stock_current || 0), 0);
    criticalCount = inv.filter((i) => (i.rop || 0) > 0 && (i.stock_current || 0) <= (i.rop || 0)).length;
    totalValueCLP = inv.reduce((s, i) => s + (i.value_clp || 0) * (i.stock_current || 0), 0);
  }

  // Category chart data
  const catMap: Record<string, { items: number; stock: number }> = {};
  (categoryBreakdown || []).forEach((r: { category: string | null; stock_current: number | null }) => {
    const cat = r.category || "Sin categoría";
    if (!catMap[cat]) catMap[cat] = { items: 0, stock: 0 };
    catMap[cat].items++;
    catMap[cat].stock += r.stock_current || 0;
  });
  const categoryChartData: CategoryData[] = Object.entries(catMap)
    .map(([name, v]) => ({ name, items: v.items, stock: v.stock }))
    .sort((a, b) => b.items - a.items)
    .slice(0, 8);

  // Critical items
  const criticalItems = (criticalItemsRaw || []).filter(
    (i: { rop: number | null; stock_current: number | null }) =>
      (i.rop || 0) > 0 && (i.stock_current || 0) <= (i.rop || 0)
  );

  /* ═══════════════════════════════════════════════
     REQUEST DATA — From Supabase
     ═══════════════════════════════════════════════ */
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
  // Stock movements
  let stockMovementsQuery = supabase
    .from("stock_movements")
    .select("movement_type, quantity_change");

  if (fromDate) {
    const f = toStartOfDayIso(fromDate);
    allRequestsQuery = allRequestsQuery.gte("created_at", f);
    recentRequestsQuery = recentRequestsQuery.gte("created_at", f);
    recentAdminMovementsQuery = recentAdminMovementsQuery.gte("created_at", f);
    stockMovementsQuery = stockMovementsQuery.gte("created_at", f);
  }
  if (toDate) {
    const t = toEndOfDayIso(toDate);
    allRequestsQuery = allRequestsQuery.lte("created_at", t);
    recentRequestsQuery = recentRequestsQuery.lte("created_at", t);
    recentAdminMovementsQuery = recentAdminMovementsQuery.lte("created_at", t);
    stockMovementsQuery = stockMovementsQuery.lte("created_at", t);
  }

  const [
    { data: allRequests },
    { data: recentRequests },
    { data: recentAdminMovements },
    { data: profile },
    { data: stockMovements },
  ] = await Promise.all([
    allRequestsQuery,
    recentRequestsQuery,
    recentAdminMovementsQuery,
    user
      ? supabase.from("user_profiles").select("role").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    stockMovementsQuery,
  ]);

  const requestRows = (allRequests || []) as MaterialRequestRow[];
  const recentRequestRows = (recentRequests || []) as MaterialRequestRow[];
  const adminMovementRows = (recentAdminMovements || []) as StatusLogRow[];

  // Request KPIs
  const pendingRequests = requestRows.filter((r) => r.status === "Pendiente");
  const deliveredRequests = requestRows.filter((r) => r.status === "Entregada");
  const deletedRequests = requestRows.filter((r) => r.status === "Eliminada" || r.status === "Cancelada");
  const acceptedRequests = requestRows.filter((r) => r.status === "Aceptada");

  const pendingCount = pendingRequests.length;
  const deliveredCount = deliveredRequests.length;
  const deletedCount = deletedRequests.length;
  const acceptedCount = acceptedRequests.length;

  const nowMs = Date.now();
  const pendingOver48h = pendingRequests.filter(
    (r) => nowMs - new Date(r.created_at).getTime() > 48 * 60 * 60 * 1000
  ).length;

  /* ── Chart Data Preparation ── */

  // 1. Status donut
  const statusChartData: StatusData[] = [
    { name: "Pendiente", value: pendingCount, color: "#f59e0b" },
    { name: "Aceptada", value: acceptedCount, color: "#10b981" },
    { name: "Entregada", value: deliveredCount, color: "#3b82f6" },
    { name: "Cancelada", value: deletedCount, color: "#ef4444" },
  ].filter((s) => s.value > 0);

  // 2. Movement chart
  const movMap: Record<string, number> = {};
  (stockMovements || []).forEach((m: { movement_type: string; quantity_change: number }) => {
    movMap[m.movement_type] = (movMap[m.movement_type] || 0) + Math.abs(m.quantity_change);
  });
  const movementChartData: MovementData[] = [
    { name: "Entrada", cantidad: movMap["Entrada"] || 0, color: "#10b981" },
    { name: "Salida", cantidad: movMap["Salida"] || 0, color: "#f59e0b" },
  ];

  // 3. Timeline data
  const timeMap: Record<string, Record<string, number>> = {};
  requestRows.forEach((r) => {
    const day = new Date(r.created_at).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
    });
    if (!timeMap[day]) timeMap[day] = {};
    timeMap[day][r.status] = (timeMap[day][r.status] || 0) + 1;
  });
  const timelineData: TimelineData[] = Object.entries(timeMap)
    .map(([date, statuses]) => ({
      date,
      Pendiente: statuses["Pendiente"] || 0,
      Entregada: statuses["Entregada"] || 0,
      Cancelada: (statuses["Cancelada"] || 0) + (statuses["Eliminada"] || 0),
      Aceptada: statuses["Aceptada"] || 0,
    }))
    .reverse();

  // Area breakdown
  const areaCountMap = requestRows.reduce<Record<string, number>>((acc, req) => {
    const area = req.area || "Sin área";
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {});
  const topAreas = Object.entries(areaCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Recent movements
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

  const riskLabel =
    pendingOver48h > 0 || criticalCount > 0 ? "Requiere atención" : "Operación estable";
  const riskColor =
    pendingOver48h > 0 || criticalCount > 0 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="p-5 md:p-8 space-y-6 md:space-y-8 min-h-full">
      {/* ── HEADER ── */}
      <header className="relative z-30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-2xl ui-card p-5 md:p-6 shadow-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Panel de Control
          </h1>
          <p className="mt-1" style={{ color: 'var(--muted)' }}>
            Resumen operativo del pañol en tiempo real
          </p>
          <div className="mt-2">
            <DashboardRealtimeSync />
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="icon-left icon-left-sm" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Buscar SKU, Nombre..."
              className="w-full rounded-lg input-with-icon py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>
          <NotificationBell initialPendingCount={pendingCount} isAdmin={isAdmin} />
        </div>
      </header>

      {/* ── DATE FILTER ── */}
      <form
        action="/"
        method="GET"
        className="rounded-2xl ui-card p-4 flex flex-col md:flex-row md:items-end gap-3"
      >
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          <CalendarDays className="w-4 h-4 text-blue-400" />
          Filtro por fecha
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          <ModernDatePicker name="from" label="Desde" defaultValue={fromDate} placeholder="dd-mm-aaaa" />
          <ModernDatePicker name="to" label="Hasta" defaultValue={toDate} placeholder="dd-mm-aaaa" />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            Aplicar
          </button>
          {hasDateFilter && (
            <Link
              href="/"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg ui-btn-secondary text-sm transition-colors"
            >
              <FilterX className="w-3.5 h-3.5" />
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {/* ═══════════════════════════════════════
          KPIs INVENTARIO — 4 cards
          ═══════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="relative overflow-hidden ui-card rounded-2xl p-5 shadow-lg group hover:border-blue-500/40 transition-all" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -translate-y-6 translate-x-6" />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-blue-400/70 tracking-wider mb-0.5">
                Total Ítems
              </p>
              <p className="text-2xl font-bold font-mono leading-none" style={{ color: 'var(--foreground)' }}>
                {totalItems}
              </p>
            </div>
          </div>
        </div>

        {/* Stock Total */}
        <div className="relative overflow-hidden ui-card rounded-2xl p-5 shadow-lg group hover:border-cyan-500/40 transition-all" style={{ borderColor: 'rgba(6,182,212,0.2)' }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full -translate-y-6 translate-x-6" />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-cyan-400/70 tracking-wider mb-0.5">
                Stock Total
              </p>
              <p className="text-2xl font-bold font-mono text-cyan-400 leading-none">
                {totalStock.toLocaleString("es-CL")}
              </p>
            </div>
          </div>
        </div>

        {/* Stock Crítico */}
        <Link
          href="/inventory?status=critical"
          className="relative overflow-hidden ui-card rounded-2xl p-5 shadow-lg group hover:border-red-500/40 hover:shadow-red-500/10 transition-all"
          style={{ borderColor: 'rgba(239,68,68,0.2)' }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full -translate-y-6 translate-x-6" />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0 group-hover:bg-red-500/25 transition-colors">
              <TriangleAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[10px] uppercase font-bold text-red-400/70 tracking-wider">
                  Stock Crítico
                </p>
                <Search className="w-3 h-3 text-red-500/30 group-hover:text-red-400 transition-colors" />
              </div>
              <p className="text-2xl font-bold font-mono text-red-400 group-hover:text-red-300 transition-colors leading-none">
                {criticalCount}
              </p>
            </div>
          </div>
        </Link>

        {/* Valor Inventario */}
        <div className="relative overflow-hidden ui-card rounded-2xl p-5 shadow-lg group hover:border-emerald-500/40 transition-all" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -translate-y-6 translate-x-6" />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-400/70 tracking-wider mb-0.5">
                Valor Inventario
              </p>
              <p className="text-lg font-bold font-mono text-emerald-400 leading-none">
                {formatCLP(totalValueCLP)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          KPIs SOLICITUDES — 4 cards
          ═══════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pendientes */}
        <div className="relative overflow-hidden ui-card rounded-2xl p-5 shadow-lg hover:border-amber-500/40 transition-all" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Hourglass className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-amber-400/70 tracking-wider mb-0.5">
                Pendientes
              </p>
              <p className="text-2xl font-bold font-mono text-amber-400 leading-none">
                {pendingCount}
              </p>
            </div>
          </div>
        </div>

        {/* Aceptadas */}
        <div className="relative overflow-hidden ui-card rounded-2xl p-5 shadow-lg hover:border-emerald-500/40 transition-all" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <CircleCheckBig className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-400/70 tracking-wider mb-0.5">
                Aceptadas
              </p>
              <p className="text-2xl font-bold font-mono text-emerald-400 leading-none">
                {acceptedCount}
              </p>
            </div>
          </div>
        </div>

        {/* Entregadas */}
        <div className="relative overflow-hidden ui-card rounded-2xl p-5 shadow-lg hover:border-blue-500/40 transition-all" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
              <PackageOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-blue-400/70 tracking-wider mb-0.5">
                Entregadas
              </p>
              <p className="text-2xl font-bold font-mono text-blue-400 leading-none">
                {deliveredCount}
              </p>
            </div>
          </div>
        </div>

        {/* Canceladas */}
        <div className="relative overflow-hidden ui-card rounded-2xl p-5 shadow-lg hover:border-rose-500/40 transition-all" style={{ borderColor: 'rgba(244,63,94,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-rose-400/70 tracking-wider mb-0.5">
                Canceladas
              </p>
              <p className="text-2xl font-bold font-mono text-rose-400 leading-none">
                {deletedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          CHARTS SECTION — 2×2 Grid
          ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Status Distribution Donut */}
        <div className="rounded-2xl ui-card shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <PieChartIcon className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Estado de Solicitudes</h3>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Distribución actual por estado</p>
            </div>
          </div>
          <div className="p-4">
            {statusChartData.length > 0 ? (
              <StatusDonut data={statusChartData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-slate-500 gap-2">
                <PieChartIcon className="w-8 h-8 opacity-20" />
                <span className="text-sm">Sin solicitudes registradas</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Inventory by Category */}
        <div className="rounded-2xl ui-card shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Inventario por Categoría</h3>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Cantidad de ítems por categoría</p>
            </div>
          </div>
          <div className="p-4">
            {categoryChartData.length > 0 ? (
              <CategoryBarChart data={categoryChartData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-slate-500 gap-2">
                <BarChart3 className="w-8 h-8 opacity-20" />
                <span className="text-sm">Sin datos de inventario</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Stock Movements */}
        <div className="rounded-2xl ui-card shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Movimientos de Stock</h3>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Entradas vs Salidas (unidades)</p>
            </div>
          </div>
          <div className="p-4">
            <MovementBarChart data={movementChartData} />
          </div>
        </div>

        {/* Chart 4: Timeline */}
        <div className="rounded-2xl ui-card shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Actividad en el Tiempo</h3>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Solicitudes por día y estado</p>
            </div>
          </div>
          <div className="p-4">
            {timelineData.length > 0 ? (
              <TimelineAreaChart data={timelineData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-slate-500 gap-2">
                <TrendingUp className="w-8 h-8 opacity-20" />
                <span className="text-sm">Sin actividad registrada</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          OPERATIONAL SECTION
          ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Panel */}
        <div className="rounded-2xl ui-card shadow-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              Riesgo Operativo
            </h3>
          </div>
          <p className={`text-lg font-semibold ${riskColor}`}>{riskLabel}</p>
          <div className="mt-3 space-y-2">
            <p className="text-sm flex items-center gap-2" style={{ color: 'var(--muted)' }}>
              <Hourglass className="w-3.5 h-3.5 text-amber-500/60" />
              <span>
                <strong className="text-amber-400">{pendingOver48h}</strong> solicitud(es) pendiente(s) por más de 48h
              </span>
            </p>
            <p className="text-sm flex items-center gap-2" style={{ color: 'var(--muted)' }}>
              <TriangleAlert className="w-3.5 h-3.5 text-red-500/60" />
              <span>
                <strong className="text-red-400">{criticalCount}</strong> SKU(s) en nivel crítico
              </span>
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              href="/requests/pending"
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
            >
              Ver pendientes
            </Link>
            <Link
              href="/inventory?status=critical"
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
            >
              Ver críticos
            </Link>
          </div>
        </div>

        {/* Area Breakdown */}
        <div className="rounded-2xl ui-card shadow-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <ClipboardList className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              Carga por Área
            </h3>
          </div>
          <div className="space-y-3 mt-2">
            {topAreas.length > 0 ? (
              topAreas.map(([area, count]) => {
                const maxCount = topAreas[0][1];
                const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={area}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="truncate pr-3" style={{ color: 'var(--muted)' }}>{area}</span>
                      <span className="font-mono font-bold" style={{ color: 'var(--foreground)' }}>{count}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full transition-all duration-700"
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
        </div>
      </div>

      {/* ═══════════════════════════════════════
          CRITICAL ITEMS + RECENT MOVEMENTS
          ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
        {/* Critical Items — 2 cols */}
        <div className="lg:col-span-2 rounded-2xl ui-card shadow-xl flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="font-bold text-red-400 tracking-wide uppercase text-sm">
                Ítems Bajo Mínimo
              </h3>
            </div>
            <Link
              href="/inventory?status=critical"
              className="text-xs font-mono transition-colors flex items-center gap-1 ui-btn-secondary px-2 py-1 rounded"
              style={{ color: 'var(--muted)' }}
            >
              Ver Todos <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {criticalItems.length > 0 ? (
                criticalItems.map(
                  (item: {
                    sku: string;
                    name: string;
                    brand: string | null;
                    stock_current: number;
                    rop: number;
                    shelf_number: string | null;
                    image_url: string | null;
                  }) => (
                    <div
                      key={item.sku}
                      className="p-3 rounded-xl flex items-center gap-3 hover:border-slate-600 transition-colors group" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                            unoptimized
                          />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-sm truncate pr-2" style={{ color: 'var(--foreground)' }}>
                            {item.name}
                          </h4>
                          <span className="text-xs font-bold text-red-400 shrink-0">
                            {item.stock_current} uds
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.brand || "-"}
                          </span>
                          {item.shelf_number && (
                            <>
                              <span className="text-slate-700">·</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />E{item.shelf_number}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                              style={{
                                width: `${item.rop > 0 ? Math.min((item.stock_current / item.rop) * 100, 100) : 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Min: {item.rop}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500/20" />
                  <span className="text-sm">
                    Todos los stocks están dentro de niveles saludables.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Movements — 1 col */}
        <div className="rounded-2xl ui-card shadow-xl flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>Movimientos Recientes</h3>
            <Clock className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {recentMovements.length > 0 ? (
              recentMovements.map((move, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg transition-colors group border border-transparent" style={{ ['--tw-bg-opacity' as string]: 1 }}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${move.status === "Pendiente"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/30"
                        }`}
                    >
                      {move.status === "Pendiente" ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {move.user}
                      </div>
                      <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                        {move.id} · {move.time}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm" style={{ color: 'var(--muted)' }}>
                    {move.quantity} ítems
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2 h-full">
                <Clock className="w-8 h-8 text-slate-700" />
                <span className="text-sm">No hay actividad registrada.</span>
              </div>
            )}
          </div>
          <div className="p-3 border-t text-center" style={{ borderColor: 'var(--border)' }}>
            <Link
              href="/my-orders"
              className="text-xs text-blue-400 transition-colors font-mono hover:opacity-70"
            >
              VER TODA LA ACTIVIDAD
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          ADMIN AUDIT (Admin only)
          ═══════════════════════════════════════ */}
      {isAdmin && (
        <div className="rounded-2xl ui-card shadow-xl overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
                Auditoría Administrativa Reciente
              </h3>
            </div>
            <Link
              href="/requests/pending"
              className="text-xs text-blue-400 hover:opacity-70 flex items-center gap-1 transition-colors"
            >
              Ver gestión <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y" style={{ ['--tw-divide-opacity' as string]: 1, borderColor: 'var(--border)' }}>
            {adminMovementList.length > 0 ? (
              adminMovementList.map((m) => (
                <div
                  key={m.id}
                  className="px-5 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 transition-colors" style={{ ['--tw-bg-opacity' as string]: 1 }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center border ${m.previous === "Eliminada" && m.action === "Pendiente"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : m.action === "Entregada"
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                          : m.action === "Eliminada"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        }`}
                    >
                      {m.action === "Entregada" ? (
                        <PackageCheck className="w-3.5 h-3.5" />
                      ) : m.action === "Eliminada" ? (
                        <Trash2 className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--foreground)' }}>
                        <span className="font-mono">{m.requestCode}</span> · {m.previous} →{" "}
                        {m.action}
                      </p>
                      <div className="mt-1">
                        <StatusChip
                          status={
                            m.previous === "Eliminada" && m.action === "Pendiente"
                              ? "Restaurada"
                              : m.action
                          }
                        />
                      </div>
                      <p className="text-xs text-slate-500 truncate">por {m.actor}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{m.time}</span>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center text-slate-500 text-sm">
                No hay movimientos administrativos recientes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
