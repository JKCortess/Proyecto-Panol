"use client";

import { useState, useTransition } from "react";
import { type UserProfile, updateUserRole } from "@/app/profile/actions";
import { IndustrialCard } from "@/components/ui/IndustrialCard";
import { Shield, User, ChevronDown, Loader2, Check, X } from "lucide-react";
import { AvatarDisplay } from "@/components/profile/AvatarSelector";

interface AdminUserTableProps {
    profiles: UserProfile[];
}

export function AdminUserTable({ profiles }: AdminUserTableProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{ id: string; type: 'success' | 'error'; msg: string } | null>(null);

    const handleRoleChange = (userId: string, newRole: string) => {
        startTransition(async () => {
            const result = await updateUserRole(userId, newRole);
            if (result.error) {
                setFeedback({ id: userId, type: 'error', msg: result.error });
            } else {
                setFeedback({ id: userId, type: 'success', msg: 'Rol actualizado' });
            }
            setEditingId(null);
            setTimeout(() => setFeedback(null), 3000);
        });
    };

    return (
        <IndustrialCard className="p-0 overflow-hidden border-slate-800 bg-slate-900 shadow-2xl">
            <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h3 className="font-bold text-slate-200 tracking-wide uppercase text-sm">Usuarios del Sistema</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">{profiles.length} registros</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-slate-800">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Usuario</th>
                            <th className="px-6 py-4 font-semibold">Email</th>
                            <th className="px-6 py-4 font-semibold">Área</th>
                            <th className="px-6 py-4 font-semibold">Cargo</th>
                            <th className="px-6 py-4 font-semibold">Rol</th>
                            <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 bg-slate-900/50">
                        {profiles.map((profile) => (
                            <tr key={profile.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <AvatarDisplay
                                            avatarId={profile.avatar_id}
                                            userName={profile.full_name || '?'}
                                            size="sm"
                                        />
                                        <span className="font-medium text-slate-200">
                                            {profile.full_name || 'Sin nombre'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-blue-400 font-mono text-xs">
                                    {profile.email}
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                    {profile.area || '—'}
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                    {profile.cargo || '—'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
                                        ${profile.role === 'Administrador'
                                            ? 'bg-purple-900/20 text-purple-400 border-purple-500/20'
                                            : 'bg-amber-900/20 text-amber-400 border-amber-500/20'
                                        }`}>
                                        {profile.role === 'Administrador'
                                            ? <Shield className="w-3 h-3" />
                                            : <User className="w-3 h-3" />
                                        }
                                        {profile.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {feedback?.id === profile.id ? (
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${feedback.type === 'success'
                                            ? 'text-emerald-400 bg-emerald-500/10'
                                            : 'text-red-400 bg-red-500/10'
                                            }`}>
                                            {feedback.type === 'success' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                            {feedback.msg}
                                        </span>
                                    ) : editingId === profile.id ? (
                                        <div className="flex items-center gap-2 justify-center">
                                            {isPending ? (
                                                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleRoleChange(profile.id, profile.role === 'Administrador' ? 'Operador' : 'Administrador')}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all
                                                            ${profile.role === 'Administrador'
                                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'
                                                            }`}
                                                    >
                                                        Cambiar a {profile.role === 'Administrador' ? 'Operador' : 'Administrador'}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="text-xs text-slate-500 hover:text-white px-2 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setEditingId(profile.id)}
                                            className="text-xs text-slate-500 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all flex items-center gap-1.5 mx-auto"
                                        >
                                            <ChevronDown className="w-3 h-3" />
                                            Cambiar Rol
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </IndustrialCard>
    );
}
