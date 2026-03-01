'use client';

import { useState } from 'react';
import { Columns3, List } from 'lucide-react';
import { PendingRequestsList } from '@/components/requests/PendingRequestsList';
import { KanbanBoard } from '@/components/requests/KanbanBoard';
import type { Request } from '@/components/requests/request-types';

interface RequestViewToggleProps {
    requests: Request[];
}

export function RequestViewToggle({ requests }: RequestViewToggleProps) {
    const [view, setView] = useState<'table' | 'kanban'>('table');

    return (
        <>
            {/* View toggle buttons */}
            <div className="px-4 pt-3 flex justify-end">
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/50 rounded-lg p-1 border border-gray-200 dark:border-slate-700/50">
                    <button
                        onClick={() => setView('table')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'table'
                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <List className="w-3.5 h-3.5" />
                        Tabla
                    </button>
                    <button
                        onClick={() => setView('kanban')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'kanban'
                            ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Columns3 className="w-3.5 h-3.5" />
                        Kanban
                    </button>
                </div>
            </div>

            {/* View content */}
            {view === 'table' ? (
                <PendingRequestsList requests={requests} />
            ) : (
                <div className="p-4">
                    <KanbanBoard
                        requests={requests.map(r => ({
                            id: r.id,
                            request_code: r.request_code,
                            user_name: r.user_name,
                            user_email: r.user_email,
                            area: r.area,
                            items_detail: r.items_detail as { sku: string; detail: string; quantity: number; talla?: string; marca?: string }[],
                            status: r.status,
                            created_at: r.created_at,
                            updated_at: null,
                            notes: r.notes,
                        }))}
                    />
                </div>
            )}
        </>
    );
}
