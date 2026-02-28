"use client";

import { useState, useTransition } from "react";
import { type RolePermission, updatePermission } from "@/app/(app)/profile/actions";
import { IndustrialCard } from "@/components/ui/IndustrialCard";
import {
    LayoutDashboard,
    Package,
    ArrowLeftRight,
    Users,
    ClipboardList,
    FileText,
    ListTodo,
    Loader2,
    Check,
    Lock,
    Unlock,
} from "lucide-react";

import { ALL_MENU_ITEMS } from "@/constants/navigation";

// Convert menu items array to a map for O(1) lookup
const navigationMap = ALL_MENU_ITEMS.reduce((acc, item) => {
    acc[item.key] = { label: item.label, icon: item.icon };
    return acc;
}, {} as Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }>);

// Permission config to match sidebar exactly
const permissionConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    ...navigationMap,
};

interface AdminPermissionsPanelProps {
    permissions: RolePermission[];
}

export function AdminPermissionsPanel({ permissions }: AdminPermissionsPanelProps) {
    const [localPermissions, setLocalPermissions] = useState(permissions);
    const [, startTransition] = useTransition();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ id: string; type: 'success' | 'error'; msg: string } | null>(null);

    const handleToggle = (perm: RolePermission) => {
        setUpdatingId(perm.id);
        startTransition(async () => {
            const newAllowed = !perm.allowed;
            const result = await updatePermission(perm.id, newAllowed);

            if (result.error) {
                setFeedback({ id: perm.id, type: 'error', msg: result.error });
            } else {
                setLocalPermissions(prev =>
                    prev.map(p => p.id === perm.id ? { ...p, allowed: newAllowed } : p)
                );
                setFeedback({ id: perm.id, type: 'success', msg: newAllowed ? 'Activado' : 'Desactivado' });
            }
            setUpdatingId(null);
            setTimeout(() => setFeedback(null), 2000);
        });
    };

    return (
        <IndustrialCard className="p-0 overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-200 tracking-wide uppercase text-sm">
                            Permisos de Acceso — Rol: Operador
                        </h3>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 font-mono">
                        {localPermissions.filter(p => p.allowed).length}/{localPermissions.length} páginas activas
                    </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 ml-5">
                    Controla qué páginas del menú pueden ver los usuarios con rol <span className="text-amber-400 font-medium">Operador</span>.
                    Los <span className="text-purple-400 font-medium">Administradores</span> siempre tienen acceso completo.
                </p>
            </div>

            <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {localPermissions.map((perm) => {
                        const config = permissionConfig[perm.page_key];
                        const Icon = config?.icon || Package;
                        const label = config?.label || perm.page_label;

                        const isUpdating = updatingId === perm.id;
                        const permFeedback = feedback?.id === perm.id ? feedback : null;

                        return (
                            <div
                                key={perm.id}
                                className={`relative rounded-xl border p-4 transition-all duration-300 ${perm.allowed
                                    ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-500/30 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-red-500/30 opacity-60 hover:opacity-80'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${perm.allowed
                                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                                            }`}>
                                            <Icon className={`w-5 h-5 ${perm.allowed ? 'text-emerald-400' : 'text-slate-500'}`} />
                                        </div>
                                        <div>
                                            <h4 className={`font-medium text-sm ${perm.allowed ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {label}
                                            </h4>
                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                /{perm.page_key.replace('_', '/')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Toggle Switch */}
                                    <button
                                        onClick={() => handleToggle(perm)}
                                        disabled={isUpdating}
                                        className="relative shrink-0"
                                        title={perm.allowed ? 'Desactivar acceso' : 'Activar acceso'}
                                    >
                                        {isUpdating ? (
                                            <div className="w-12 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                                                <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                                            </div>
                                        ) : (
                                            <div className={`w-12 h-7 rounded-full transition-all duration-300 flex items-center ${perm.allowed
                                                ? 'bg-emerald-600 justify-end pr-1'
                                                : 'bg-slate-700 justify-start pl-1'
                                                }`}>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${perm.allowed
                                                    ? 'bg-white shadow-lg shadow-emerald-500/20'
                                                    : 'bg-slate-500'
                                                    }`}>
                                                    {perm.allowed
                                                        ? <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                                                        : <Lock className="w-2.5 h-2.5 text-slate-300" />
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                </div>

                                {/* Feedback */}
                                {permFeedback && (
                                    <div className={`mt-2 text-xs font-medium flex items-center gap-1 ${permFeedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                        <Check className="w-3 h-3" />
                                        {permFeedback.msg}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </IndustrialCard>
    );
}
