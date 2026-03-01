'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        setIsOffline(!navigator.onLine);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed top-0 inset-x-0 z-[100] bg-amber-600 text-white text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top duration-300">
            <WifiOff className="w-3.5 h-3.5" />
            Modo sin conexión — los datos mostrados pueden estar desactualizados
        </div>
    );
}
