'use client';

import { useState, useMemo } from 'react';
import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { EditHistoryCard } from '@/components/admin/EditHistoryCard';

type GroupMode = 'day' | 'week' | 'month';

interface EditChange {
    id: string;
    field_label: string;
    old_value: string;
    new_value: string;
}

interface EditGroup {
    key: string;
    sku: string;
    itemName: string;
    talla: string | null;
    editedBy: string;
    createdAt: string;
    changes: EditChange[];
}

interface DateGroupedEditHistoryProps {
    groups: EditGroup[];
    imageMap: Record<string, string>;
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
            return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

export default function DateGroupedEditHistory({ groups, imageMap }: DateGroupedEditHistoryProps) {
    const [groupMode, setGroupMode] = useState<GroupMode>('day');

    const dateGroups = useMemo(() => {
        const map = new Map<string, { label: string; sortKey: string; items: EditGroup[] }>();

        for (const group of groups) {
            const date = new Date(group.createdAt);
            const key = getGroupKey(date, groupMode);
            if (!map.has(key)) {
                map.set(key, {
                    label: formatGroupLabel(date, groupMode),
                    sortKey: key,
                    items: [],
                });
            }
            map.get(key)!.items.push(group);
        }

        return Array.from(map.values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    }, [groups, groupMode]);

    if (groups.length === 0) {
        return null;
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
                                ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-sm shadow-violet-500/10'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                            }`}
                    >
                        {GROUP_MODE_CONFIG[mode].icon}
                        {GROUP_MODE_CONFIG[mode].label}
                    </button>
                ))}
            </div>

            {/* Grouped records */}
            {dateGroups.map((dateGroup) => (
                <div key={dateGroup.sortKey} className="space-y-3">
                    {/* Group header */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
                            <CalendarDays className="w-4 h-4 text-violet-400" />
                            <span className="text-sm font-semibold text-slate-200 capitalize">
                                {dateGroup.label}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">
                                ({dateGroup.items.length})
                            </span>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-slate-700/50 to-transparent" />
                    </div>

                    {/* Cards */}
                    <div className="space-y-4 pl-2">
                        {dateGroup.items.map((group) => (
                            <EditHistoryCard
                                key={group.key}
                                group={group}
                                imageUrl={imageMap[group.sku] || null}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
