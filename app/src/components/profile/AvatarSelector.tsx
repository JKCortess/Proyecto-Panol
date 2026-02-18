'use client'

import { useState } from 'react';
import { Camera, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// 20 avatar options with emoji + gradient combos
const AVATAR_OPTIONS = [
    { id: 'avatar-1', emoji: '🦊', gradient: 'from-orange-500 to-red-500', label: 'Zorro' },
    { id: 'avatar-2', emoji: '🐺', gradient: 'from-slate-500 to-slate-700', label: 'Lobo' },
    { id: 'avatar-3', emoji: '🦁', gradient: 'from-amber-500 to-orange-600', label: 'León' },
    { id: 'avatar-4', emoji: '🐻', gradient: 'from-amber-700 to-amber-900', label: 'Oso' },
    { id: 'avatar-5', emoji: '🦅', gradient: 'from-sky-600 to-blue-800', label: 'Águila' },
    { id: 'avatar-6', emoji: '🐧', gradient: 'from-cyan-400 to-blue-500', label: 'Pingüino' },
    { id: 'avatar-7', emoji: '🦉', gradient: 'from-amber-600 to-yellow-800', label: 'Búho' },
    { id: 'avatar-8', emoji: '🐱', gradient: 'from-pink-400 to-rose-500', label: 'Gato' },
    { id: 'avatar-9', emoji: '🐶', gradient: 'from-yellow-400 to-amber-500', label: 'Perro' },
    { id: 'avatar-10', emoji: '🦈', gradient: 'from-blue-600 to-indigo-700', label: 'Tiburón' },
    { id: 'avatar-11', emoji: '🚀', gradient: 'from-violet-500 to-purple-700', label: 'Cohete' },
    { id: 'avatar-12', emoji: '⚡', gradient: 'from-yellow-400 to-orange-500', label: 'Rayo' },
    { id: 'avatar-13', emoji: '🔧', gradient: 'from-slate-400 to-slate-600', label: 'Herramienta' },
    { id: 'avatar-14', emoji: '⚙️', gradient: 'from-zinc-400 to-zinc-600', label: 'Engranaje' },
    { id: 'avatar-15', emoji: '🏔️', gradient: 'from-teal-400 to-emerald-600', label: 'Montaña' },
    { id: 'avatar-16', emoji: '🌊', gradient: 'from-cyan-500 to-blue-600', label: 'Ola' },
    { id: 'avatar-17', emoji: '🔥', gradient: 'from-red-500 to-orange-600', label: 'Fuego' },
    { id: 'avatar-18', emoji: '💎', gradient: 'from-cyan-300 to-blue-500', label: 'Diamante' },
    { id: 'avatar-19', emoji: '🎯', gradient: 'from-red-400 to-rose-600', label: 'Diana' },
    { id: 'avatar-20', emoji: '🛡️', gradient: 'from-emerald-500 to-green-700', label: 'Escudo' },
];

interface AvatarSelectorProps {
    currentAvatarId: string | null;
    userName: string;
    onSelect: (avatarId: string | null) => void;
}

export function getAvatarById(id: string | null) {
    if (!id) return null;
    return AVATAR_OPTIONS.find(a => a.id === id) || null;
}

export { AVATAR_OPTIONS };

export function AvatarDisplay({
    avatarId,
    userName,
    size = 'md',
    className,
}: {
    avatarId: string | null;
    userName: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}) {
    const avatar = getAvatarById(avatarId);
    const initial = userName ? userName.charAt(0).toUpperCase() : '?';

    const sizeClasses = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-16 h-16 text-2xl',
        xl: 'w-24 h-24 text-4xl',
    };

    if (avatar) {
        return (
            <div
                className={cn(
                    'rounded-full flex items-center justify-center bg-gradient-to-br shrink-0',
                    avatar.gradient,
                    sizeClasses[size],
                    className
                )}
            >
                <span className={cn(
                    size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-5xl'
                )}>
                    {avatar.emoji}
                </span>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 shrink-0 font-bold text-white',
                sizeClasses[size],
                className
            )}
        >
            <span className="font-bold">{initial}</span>
        </div>
    );
}

export function AvatarSelector({ currentAvatarId, userName, onSelect }: AvatarSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(currentAvatarId);

    const initial = userName ? userName.charAt(0).toUpperCase() : '?';

    const handleSelect = (id: string | null) => {
        setSelectedId(id);
        onSelect(id);
        setIsOpen(false);
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Current Avatar Preview */}
            <div className="relative group">
                <AvatarDisplay avatarId={selectedId} userName={userName} size="xl" />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                    <Camera className="w-6 h-6 text-white drop-shadow-lg" />
                </button>

                {/* Glowing ring animation */}
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300" />
            </div>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
            >
                {isOpen ? 'Cerrar selector' : 'Cambiar avatar'}
            </button>

            {/* Avatar Grid - Expandable */}
            {isOpen && (
                <div className="w-full animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 mt-2 shadow-lg dark:shadow-none">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-300">Elige tu avatar</h4>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* Default initial avatar option */}
                        <div className="mb-4">
                            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium">Por defecto</p>
                            <button
                                type="button"
                                onClick={() => handleSelect(null)}
                                className={cn(
                                    'relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 transition-all duration-200 transform hover:scale-110',
                                    selectedId === null
                                        ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-lg shadow-blue-500/20'
                                        : 'hover:ring-1 hover:ring-slate-400 dark:hover:ring-slate-500'
                                )}
                            >
                                <span className="font-bold text-xl text-white">{initial}</span>
                                {selectedId === null && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Avatar grid */}
                        <div>
                            <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-medium">Avatares disponibles</p>
                            <div className="grid grid-cols-5 sm:grid-cols-7 gap-3">
                                {AVATAR_OPTIONS.map((avatar) => (
                                    <button
                                        key={avatar.id}
                                        type="button"
                                        onClick={() => handleSelect(avatar.id)}
                                        title={avatar.label}
                                        className={cn(
                                            'relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-gradient-to-br transition-all duration-200 transform hover:scale-110',
                                            avatar.gradient,
                                            selectedId === avatar.id
                                                ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-lg shadow-blue-500/20 scale-110'
                                                : 'hover:ring-1 hover:ring-slate-400 dark:hover:ring-slate-500'
                                        )}
                                    >
                                        <span className="text-xl sm:text-2xl">{avatar.emoji}</span>
                                        {selectedId === avatar.id && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
