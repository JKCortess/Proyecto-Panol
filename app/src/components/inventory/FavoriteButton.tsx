'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { toggleFavorite } from '@/app/(app)/inventory/favorites-actions';
import { toast } from 'sonner';

interface FavoriteButtonProps {
    sku: string;
    initiallyFavorited: boolean;
    size?: 'sm' | 'md';
}

export function FavoriteButton({ sku, initiallyFavorited, size = 'sm' }: FavoriteButtonProps) {
    const [isFavorited, setIsFavorited] = useState(initiallyFavorited);
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        startTransition(async () => {
            const result = await toggleFavorite(sku);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            setIsFavorited(result.favorited);
            toast.success(result.favorited ? 'Agregado a favoritos' : 'Eliminado de favoritos');
        });
    };

    const sizeClasses = size === 'sm'
        ? 'w-7 h-7'
        : 'w-9 h-9';
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
        <button
            onClick={(e) => { e.stopPropagation(); handleToggle(); }}
            disabled={isPending}
            className={`${sizeClasses} rounded-full flex items-center justify-center transition-all duration-200 ${isFavorited
                    ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 border border-pink-500/30'
                    : 'bg-slate-800/60 text-slate-500 hover:text-pink-400 hover:bg-slate-800 border border-slate-700/50'
                } ${isPending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
            title={isFavorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
            <Heart className={`${iconSize} ${isFavorited ? 'fill-current' : ''}`} />
        </button>
    );
}
