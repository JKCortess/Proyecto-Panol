import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    PackageCheck,
    RotateCcw,
    ShieldAlert,
    Trash2,
    XCircle,
    type LucideIcon,
} from 'lucide-react';

type StatusMeta = {
    label: string;
    icon: LucideIcon;
    textClass: string;
    bgClass: string;
    borderClass: string;
};

const STATUS_META: Record<string, StatusMeta> = {
    Pendiente: {
        label: 'Pendiente',
        icon: Clock,
        textClass: 'text-amber-700 dark:text-amber-300',
        bgClass: 'bg-amber-100 dark:bg-amber-500/10',
        borderClass: 'border-amber-300 dark:border-amber-500/40',
    },
    Aceptada: {
        label: 'Aceptada',
        icon: CheckCircle2,
        textClass: 'text-emerald-700 dark:text-emerald-300',
        bgClass: 'bg-emerald-100 dark:bg-emerald-500/10',
        borderClass: 'border-emerald-300 dark:border-emerald-500/40',
    },
    Alerta: {
        label: 'Contactar',
        icon: ShieldAlert,
        textClass: 'text-orange-700 dark:text-orange-300',
        bgClass: 'bg-orange-100 dark:bg-orange-500/10',
        borderClass: 'border-orange-300 dark:border-orange-500/40',
    },
    Cancelada: {
        label: 'Cancelada',
        icon: XCircle,
        textClass: 'text-red-700 dark:text-red-300',
        bgClass: 'bg-red-100 dark:bg-red-500/10',
        borderClass: 'border-red-300 dark:border-red-500/40',
    },
    Entregada: {
        label: 'Entregada',
        icon: PackageCheck,
        textClass: 'text-green-700 dark:text-green-300',
        bgClass: 'bg-green-100 dark:bg-green-500/10',
        borderClass: 'border-green-300 dark:border-green-500/40',
    },
    Eliminada: {
        label: 'Eliminada',
        icon: Trash2,
        textClass: 'text-rose-700 dark:text-rose-300',
        bgClass: 'bg-rose-100 dark:bg-rose-500/10',
        borderClass: 'border-rose-300 dark:border-rose-500/40',
    },
    Restaurada: {
        label: 'Restaurada',
        icon: RotateCcw,
        textClass: 'text-emerald-700 dark:text-emerald-300',
        bgClass: 'bg-emerald-100 dark:bg-emerald-500/10',
        borderClass: 'border-emerald-300 dark:border-emerald-500/40',
    },
    default: {
        label: 'Estado',
        icon: AlertTriangle,
        textClass: 'text-slate-600 dark:text-slate-300',
        bgClass: 'bg-slate-100 dark:bg-slate-500/10',
        borderClass: 'border-slate-300 dark:border-slate-500/40',
    },
};

export function getRequestStatusMeta(status: string): StatusMeta {
    return STATUS_META[status] || { ...STATUS_META.default, label: status || 'Estado' };
}

export function StatusChip({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
    const meta = getRequestStatusMeta(status);
    const Icon = meta.icon;
    const sizeClass = size === 'md' ? 'text-xs px-2.5 py-1.5' : 'text-[11px] px-2 py-0.5';
    const iconClass = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

    return (
        <span className={`inline-flex items-center gap-1 rounded-full border ${meta.borderClass} ${meta.bgClass} ${meta.textClass} ${sizeClass}`}>
            <Icon className={iconClass} />
            {meta.label}
        </span>
    );
}

