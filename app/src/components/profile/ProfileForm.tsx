'use client'

import { useState } from 'react';
import { updateUserProfile, type UserProfile } from '@/app/profile/actions';
import {
    User,
    Briefcase,
    Phone,
    Building2,
    Save,
    Loader2,
    CheckCircle,
    Sparkles,
    ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvatarSelector } from './AvatarSelector';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

interface ProfileFormProps {
    profile: UserProfile | null;
    userEmail: string;
}

const AREAS = ['Mantención', 'SADEMA', 'Packing', 'Frío', 'Administración', 'Otro'];

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [area, setArea] = useState(profile?.area || 'Mantención');
    const [cargo, setCargo] = useState(profile?.cargo || '');
    const [telefono, setTelefono] = useState(profile?.telefono || '');
    const [avatarId, setAvatarId] = useState<string | null>(profile?.avatar_id || null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{ success?: boolean; error?: string } | null>(null);

    const hasChanges =
        fullName !== (profile?.full_name || '') ||
        area !== (profile?.area || 'Mantención') ||
        cargo !== (profile?.cargo || '') ||
        telefono !== (profile?.telefono || '') ||
        avatarId !== (profile?.avatar_id || null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveResult(null);

        const result = await updateUserProfile({
            full_name: fullName,
            area,
            cargo,
            telefono,
            avatar_id: avatarId,
        });

        setSaveResult(result);
        setIsSaving(false);
        if (result.success) {
            // No need to setHasChanges(false) as it is derived from state which hasn't updated from props yet?
            // Actually, if profile prop doesn't change, hasChanges will still be true until parent updates.
            // But since this is a server component parent (usually), we might need to rely on router.refresh()?
            // For now, removing the manual set.
            setTimeout(() => setSaveResult(null), 3000);
        }
    };

    const isNewProfile = !profile;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Welcome Banner for new users */}
            {isNewProfile && (
                <div className="p-5 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-xl flex items-start gap-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-blue-700 dark:text-blue-300 font-semibold mb-1">¡Bienvenido a Gestión de Pañol!</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            Completa tu perfil para agilizar tus solicitudes de materiales.
                            Tu nombre y área se usarán automáticamente en los formularios.
                        </p>
                    </div>
                </div>
            )}

            {/* Avatar Section */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <ImageIcon className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Imagen de Perfil</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Elige cómo quieres que te vean los demás</p>
                    </div>
                </div>
                <AvatarSelector
                    currentAvatarId={avatarId}
                    userName={fullName || userEmail.split('@')[0]}
                    onSelect={setAvatarId}
                />
            </div>

            {/* Email (read-only) */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                        <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cuenta</h3>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Correo electrónico</label>
                    <input
                        disabled
                        value={userEmail}
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 px-3 text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono text-sm"
                    />
                    <p className="text-xs text-slate-600">Este es el correo asociado a tu cuenta. No se puede modificar aquí.</p>
                </div>
            </div>

            {/* Personal Data */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Datos Personales</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Nombre Completo <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Ej: Juan Pérez Leiva"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 px-3 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Teléfono / Anexo
                        </label>
                        <div className="relative">
                            <Phone className="icon-left icon-left-sm text-slate-500" />
                            <input
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                placeholder="+56 9 1234 5678"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 input-with-icon pr-3 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Work Data */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Building2 className="w-5 h-5 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Datos Laborales</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Área <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Briefcase className="icon-left icon-left-sm text-slate-500" />
                            <select
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 input-with-icon pr-3 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none"
                                required
                            >
                                {AREAS.map((a) => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Cargo / Función
                        </label>
                        <div className="relative">
                            <Briefcase className="icon-left icon-left-sm text-slate-500" />
                            <input
                                value={cargo}
                                onChange={(e) => setCargo(e.target.value)}
                                placeholder="Ej: Técnico Electromecánico"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2.5 input-with-icon pr-3 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* System Preferences */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Preferencias del Sistema</h3>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-200 text-sm">Tema de la Interfaz</h4>
                        <p className="text-xs text-slate-500 mt-1">Elige entre modo claro u oscuro</p>
                    </div>
                    <div className="flex items-center">
                        <ThemeToggle variant="default" className="relative top-0 right-0 bg-transparent border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800" />
                    </div>
                </div>
            </div>

            {/* Result messages */}
            {saveResult?.error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                    {saveResult.error}
                </div>
            )}

            {saveResult?.success && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm text-center flex items-center justify-center gap-2 animate-in fade-in duration-300">
                    <CheckCircle className="w-4 h-4" />
                    Perfil actualizado correctamente.
                </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    disabled={isSaving || !hasChanges}
                    className={cn(
                        "flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all transform active:scale-95 disabled:cursor-not-allowed",
                        hasChanges
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                    )}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            {isNewProfile ? 'Crear Perfil' : 'Guardar Cambios'}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
