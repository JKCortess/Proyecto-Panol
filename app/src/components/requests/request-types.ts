import {
    PackageCheck, XCircle, CheckCircle2, AlertTriangle,
    Clock, ShieldAlert, Trash2,
} from 'lucide-react';
import React from 'react';

export interface RequestItem {
    sku: string;
    detail: string;
    quantity: number;
    notes?: string;
    value?: number;
    talla?: string;
    marca?: string;
}

export interface Request {
    id: string;
    request_code: string;
    user_name: string;
    user_email: string;
    area: string;
    items_detail: RequestItem[];
    created_at: string;
    status: string;
    notes?: string;
}

export interface StatusLogEntry {
    id: string;
    previous_status: string;
    new_status: string;
    changed_by_name: string;
    reason: string | null;
    created_at: string;
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactElement }> = {
    'Pendiente': {
        label: 'Pendiente',
        color: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-500/10',
        border: 'border-amber-300 dark:border-amber-500/30',
        icon: React.createElement(Clock, { className: 'w-3.5 h-3.5' }),
    },
    'Aceptada': {
        label: 'Aceptada',
        color: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-500/10',
        border: 'border-emerald-300 dark:border-emerald-500/30',
        icon: React.createElement(CheckCircle2, { className: 'w-3.5 h-3.5' }),
    },
    'Cancelada': {
        label: 'Cancelada',
        color: 'text-red-700 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-500/10',
        border: 'border-red-300 dark:border-red-500/30',
        icon: React.createElement(XCircle, { className: 'w-3.5 h-3.5' }),
    },
    'Alerta': {
        label: 'Contactar',
        color: 'text-orange-700 dark:text-orange-400',
        bg: 'bg-orange-100 dark:bg-orange-500/10',
        border: 'border-orange-300 dark:border-orange-500/30',
        icon: React.createElement(ShieldAlert, { className: 'w-3.5 h-3.5' }),
    },
    'Entregada': {
        label: 'Entregada',
        color: 'text-blue-700 dark:text-blue-300',
        bg: 'bg-blue-100 dark:bg-blue-500/10',
        border: 'border-blue-300 dark:border-blue-500/30',
        icon: React.createElement(PackageCheck, { className: 'w-3.5 h-3.5' }),
    },
    'Eliminada': {
        label: 'Eliminada',
        color: 'text-rose-700 dark:text-rose-300',
        bg: 'bg-rose-100 dark:bg-rose-500/10',
        border: 'border-rose-300 dark:border-rose-500/30',
        icon: React.createElement(Trash2, { className: 'w-3.5 h-3.5' }),
    },
};

export const FILTERABLE_STATUS_KEYS = ['Pendiente', 'Aceptada', 'Cancelada', 'Alerta'] as const;

export function formatCLP(value: number): string {
    if (!value) return '$0';
    return '$' + value.toLocaleString('es-CL');
}
