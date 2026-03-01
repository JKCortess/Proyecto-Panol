'use client';

import { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, AlertTriangle, Package, Activity } from 'lucide-react';

interface AnalyticsItem {
    nombre: string;
    sku: string;
    categoria: string;
    stock: number;
    rop: number;
    valor: number;
}

interface AnalyticsRequest {
    items_detail: { sku: string; detail: string; quantity: number }[];
    created_at: string;
    status: string;
}

interface AnalyticsSectionProps {
    inventoryItems: AnalyticsItem[];
    requests: AnalyticsRequest[];
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function AnalyticsSection({ inventoryItems, requests }: AnalyticsSectionProps) {
    // ── Consumption by category (from delivered requests) ──
    const categoryConsumption = useMemo(() => {
        const consumption: Record<string, number> = {};
        const deliveredRequests = requests.filter(r => r.status === 'Entregada');

        for (const req of deliveredRequests) {
            for (const item of req.items_detail) {
                // Find category from inventory
                const invItem = inventoryItems.find(i => i.sku === item.sku);
                const cat = invItem?.categoria || 'Sin categoría';
                consumption[cat] = (consumption[cat] || 0) + item.quantity;
            }
        }

        return Object.entries(consumption)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [inventoryItems, requests]);

    // ── Top 10 most requested items ──
    const topRequestedItems = useMemo(() => {
        const itemCounts: Record<string, { name: string; count: number }> = {};
        const recentRequests = requests.filter(r => r.status !== 'Eliminada');

        for (const req of recentRequests) {
            for (const item of req.items_detail) {
                if (!itemCounts[item.sku]) {
                    itemCounts[item.sku] = { name: item.detail, count: 0 };
                }
                itemCounts[item.sku].count += item.quantity;
            }
        }

        return Object.entries(itemCounts)
            .map(([sku, { name, count }]) => ({ sku, name: name.length > 25 ? name.slice(0, 25) + '…' : name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [requests]);

    // ── ROP Alerts ──
    const ropAlerts = useMemo(() => {
        return inventoryItems
            .filter(i => i.rop > 0 && i.stock <= i.rop * 1.3)
            .sort((a, b) => (a.stock / (a.rop || 1)) - (b.stock / (b.rop || 1)))
            .slice(0, 12);
    }, [inventoryItems]);

    // ── Inventory value by category ──
    const valueByCat = useMemo(() => {
        const vals: Record<string, number> = {};
        for (const item of inventoryItems) {
            const cat = item.categoria || 'Sin categoría';
            vals[cat] = (vals[cat] || 0) + (item.valor * item.stock);
        }
        return Object.entries(vals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [inventoryItems]);

    const formatCLP = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Analytics Avanzados</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Tendencias de consumo y alertas proactivas</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Consumption by Category */}
                <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-800 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        Consumo por Categoría
                    </h3>
                    {categoryConsumption.length > 0 ? (
                        <div>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={categoryConsumption} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="[stroke:#e2e8f0] dark:[stroke:#1e293b]" stroke="#1e293b" />
                                    <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 11 }} className="text-gray-500 dark:text-slate-400" axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'currentColor', fontSize: 11 }} className="text-gray-500 dark:text-slate-400" axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--tooltip-bg, #0f172a)', border: '1px solid var(--tooltip-border, #1e293b)', borderRadius: '10px', color: 'var(--tooltip-text, #e2e8f0)', fontSize: '12px', padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                                        formatter={(value: number | undefined) => [`${value ?? 0} unidades`, 'Consumo']}
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16} animationDuration={800}>
                                        {categoryConsumption.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            {/* Custom legend */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-2">
                                {categoryConsumption.map((cat, i) => (
                                    <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                        <span className="text-gray-600 dark:text-slate-400 truncate max-w-[120px]">{cat.name}</span>
                                        <span className="text-gray-800 dark:text-slate-200 font-mono font-bold">{cat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-slate-500 text-center py-8">Sin datos de consumo</p>
                    )}
                </div>

                {/* Value Distribution Pie */}
                <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-800 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-400" />
                        Valor por Categoría (CLP)
                    </h3>
                    {valueByCat.length > 0 ? (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="60%" height={220}>
                                <PieChart>
                                    <Pie data={valueByCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                                        {valueByCat.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }}
                                        formatter={(value: number | undefined) => [formatCLP(value ?? 0), 'Valor']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-1.5">
                                {valueByCat.slice(0, 5).map((cat, i) => (
                                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                        <span className="text-gray-600 dark:text-slate-400 truncate flex-1">{cat.name}</span>
                                        <span className="text-gray-800 dark:text-slate-200 font-mono font-bold">{formatCLP(cat.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-slate-500 text-center py-8">Sin datos</p>
                    )}
                </div>

                {/* Top 10 Most Requested Items */}
                <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-800 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        Top 10 Ítems Más Solicitados
                    </h3>
                    {topRequestedItems.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topRequestedItems} layout="vertical" margin={{ left: 10, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }}
                                    formatter={(value: number | undefined) => [`${value ?? 0} unidades`, 'Solicitado']}
                                />
                                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-slate-500 text-center py-8">Sin solicitudes registradas</p>
                    )}
                </div>

                {/* ROP Alerts */}
                <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-800 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        Alertas de Reabastecimiento ({ropAlerts.length})
                    </h3>
                    {ropAlerts.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {ropAlerts.map((item) => {
                                const pct = item.rop > 0 ? Math.round((item.stock / item.rop) * 100) : 100;
                                const isCritical = item.stock <= item.rop;
                                return (
                                    <div key={item.sku} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${isCritical
                                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30'
                                        : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30'
                                        }`}>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${isCritical ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                                {item.nombre}
                                            </p>
                                            <p className="text-gray-500 dark:text-slate-500 font-mono mt-0.5">{item.sku}</p>
                                        </div>
                                        <div className="text-right ml-3 shrink-0">
                                            <p className={`font-bold ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                {item.stock} / {item.rop}
                                            </p>
                                            <p className="text-gray-500 dark:text-slate-500">{pct}% del ROP</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Package className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Todo en orden</p>
                            <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Ningún ítem por debajo del punto de reorden</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
