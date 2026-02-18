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
        textClass: 'text-amber-300',
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/40',
    },
    Aceptada: {
        label: 'Aceptada',
        icon: CheckCircle2,
        textClass: 'text-emerald-300',
        bgClass: 'bg-emerald-500/10',
        borderClass: 'border-emerald-500/40',
    },
    Alerta: {
        label: 'Contactar',
        icon: ShieldAlert,
        textClass: 'text-orange-300',
        bgClass: 'bg-orange-500/10',
        borderClass: 'border-orange-500/40',
    },
    Cancelada: {
        label: 'Cancelada',
        icon: XCircle,
        textClass: 'text-red-300',
        bgClass: 'bg-red-500/10',
        borderClass: 'border-red-500/40',
    },
    Entregada: {
        label: 'Entregada',
        icon: PackageCheck,
        textClass: 'text-blue-300',
        bgClass: 'bg-blue-500/10',
        borderClass: 'border-blue-500/40',
    },
    Eliminada: {
        label: 'Eliminada',
        icon: Trash2,
        textClass: 'text-rose-300',
        bgClass: 'bg-rose-500/10',
        borderClass: 'border-rose-500/40',
    },
    Restaurada: {
        label: 'Restaurada',
        icon: RotateCcw,
        textClass: 'text-emerald-300',
        bgClass: 'bg-emerald-500/10',
        borderClass: 'border-emerald-500/40',
    },
    default: {
        label: 'Estado',
        icon: AlertTriangle,
        textClass: 'text-slate-300',
        bgClass: 'bg-slate-500/10',
        borderClass: 'border-slate-500/40',
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

