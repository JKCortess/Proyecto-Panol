'use client';

import { STATUS_CONFIG, FILTERABLE_STATUS_KEYS } from './request-types';

interface RequestStatusFiltersProps {
    statusFilter: string;
    statusCounts: Record<string, number>;
    realtimeStatus: 'connecting' | 'live' | 'offline';
    onFilterChange: (status: string) => void;
}

export function RequestStatusFilters({ statusFilter, statusCounts, realtimeStatus, onFilterChange }: RequestStatusFiltersProps) {
    return (
        <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => onFilterChange('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${statusFilter === 'all'
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                >
                    Todas ({statusCounts.all})
                </button>
                {FILTERABLE_STATUS_KEYS.map((key) => {
                    const config = STATUS_CONFIG[key];
                    return (
                        <button
                            key={key}
                            onClick={() => onFilterChange(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${statusFilter === key
                                ? `${config.bg} ${config.border} ${config.color}`
                                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}
                        >
                            {config.icon}
                            {config.label} ({statusCounts[key] || 0})
                        </button>
                    );
                })}
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-opacity duration-300 ${realtimeStatus === 'live'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : realtimeStatus === 'connecting'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : 'opacity-0 hidden'
                }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${realtimeStatus === 'live'
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                    }`} />
                {realtimeStatus === 'live' ? 'En vivo' : 'Conectando...'}
            </span>
        </div>
    );
}
