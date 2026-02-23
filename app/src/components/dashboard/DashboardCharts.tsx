"use client";

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    AreaChart,
    Area,
    CartesianGrid,
    Legend,
} from "recharts";

/* ── Types ── */
export type StatusData = { name: string; value: number; color: string };
export type CategoryData = { name: string; items: number; stock: number };
export type MovementData = { name: string; cantidad: number; color: string };
export type TimelineData = { date: string; Pendiente: number; Entregada: number; Cancelada: number; Aceptada: number };

/* ── Shared tooltip style ── */
const tooltipStyle = {
    contentStyle: {
        background: "rgba(15, 23, 42, 0.95)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        borderRadius: "12px",
        color: "#e2e8f0",
        fontSize: "13px",
        padding: "10px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    },
    itemStyle: { color: "#e2e8f0" },
};

/* ── Custom Label for Donut ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderCustomLabel = (props: any) => {
    const cx = Number(props.cx) || 0;
    const cy = Number(props.cy) || 0;
    const midAngle = Number(props.midAngle) || 0;
    const innerRadius = Number(props.innerRadius) || 0;
    const outerRadius = Number(props.outerRadius) || 0;
    const value = Number(props.value) || 0;
    const name = String(props.name || "");
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (value === 0) return null;
    return (
        <text x={x} y={y} fill="#94a3b8" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={12}>
            {name} ({value})
        </text>
    );
};

/* ═══════════════════════════════
   1. STATUS DONUT
   ═══════════════════════════════ */
export function StatusDonut({ data }: { data: StatusData[] }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
        <div className="relative w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={renderCustomLabel}
                        animationBegin={0}
                        animationDuration={800}
                        stroke="none"
                    >
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-white font-mono">{total}</span>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider">Total</span>
            </div>
        </div>
    );
}

/* ═══════════════════════════════
   2. CATEGORY BAR CHART
   ═══════════════════════════════ */
export function CategoryBarChart({ data }: { data: CategoryData[] }) {
    return (
        <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="items" name="Ítems" fill="url(#barGradient)" radius={[0, 6, 6, 0]} animationDuration={800} barSize={18} />
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                    </defs>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ═══════════════════════════════
   3. STOCK MOVEMENT BAR CHART
   ═══════════════════════════════ */
export function MovementBarChart({ data }: { data: MovementData[] }) {
    return (
        <div className="w-full h-[280px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="cantidad" name="Movimientos" radius={[8, 8, 0, 0]} animationDuration={800} barSize={50}>
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ═══════════════════════════════
   4. TIMELINE AREA CHART
   ═══════════════════════════════ */
export function TimelineAreaChart({ data }: { data: TimelineData[] }) {
    return (
        <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                    <defs>
                        <linearGradient id="gradPendiente" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradEntregada" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradCancelada" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradAceptada" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
                    <Area type="monotone" dataKey="Pendiente" stroke="#f59e0b" fill="url(#gradPendiente)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Entregada" stroke="#3b82f6" fill="url(#gradEntregada)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Aceptada" stroke="#10b981" fill="url(#gradAceptada)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Cancelada" stroke="#ef4444" fill="url(#gradCancelada)" strokeWidth={2} dot={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
