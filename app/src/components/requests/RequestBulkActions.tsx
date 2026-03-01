'use client';

import { Loader2, PackageCheck, Trash2 } from 'lucide-react';
import { ModernDatePicker } from '@/components/ui/ModernDatePicker';

interface RequestBulkActionsProps {
    selectedCount: number;
    bulkDeliveryDate: string;
    onBulkDeliveryDateChange: (date: string) => void;
    onBulkDeliver: () => void;
    onBulkDelete: () => void;
    onClearSelection: () => void;
    isPending: boolean;
    canBulkDeliver: boolean;
}

export function RequestBulkActions({
    selectedCount, bulkDeliveryDate, onBulkDeliveryDateChange,
    onBulkDeliver, onBulkDelete, onClearSelection,
    isPending, canBulkDeliver,
}: RequestBulkActionsProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="rounded-lg border border-blue-800/40 bg-blue-950/20 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-blue-200">
                {selectedCount} solicitud(es) seleccionada(s)
            </p>
            <div className="flex flex-wrap items-center gap-2">
                <ModernDatePicker
                    value={bulkDeliveryDate}
                    onChange={onBulkDeliveryDateChange}
                    placeholder="Fecha Entrega"
                    className="w-36"
                />
                <button
                    onClick={onBulkDeliver}
                    disabled={isPending || !canBulkDeliver}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                    Entrega masiva
                </button>
                <button
                    onClick={onBulkDelete}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-700/80 hover:bg-red-600 text-white disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Eliminar masivo
                </button>
                <button
                    onClick={onClearSelection}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                    Limpiar selección
                </button>
            </div>
        </div>
    );
}
