'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export function DashboardRealtimeSync() {
    const router = useRouter();
    const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [status, setStatus] = useState<'connecting' | 'live' | 'polling' | 'offline'>('connecting');

    if (supabaseRef.current == null) {
        supabaseRef.current = createClient();
    }

    useEffect(() => {
        const supabase = supabaseRef.current;
        if (!supabase) return;

        const scheduleRefresh = () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = setTimeout(() => {
                router.refresh();
            }, 450);
        };

        const startPolling = () => {
            setStatus('polling');
            if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            // Poll every 30 seconds as fallback
            pollingTimerRef.current = setInterval(() => {
                router.refresh();
            }, 30000);
        };

        const channel = supabase
            .channel('dashboard-live-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'material_requests' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'request_status_log' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, scheduleRefresh)
            .subscribe((eventStatus) => {
                if (eventStatus === 'SUBSCRIBED') {
                    setStatus('live');
                    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
                    return;
                }
                if (eventStatus === 'CHANNEL_ERROR' || eventStatus === 'TIMED_OUT' || eventStatus === 'CLOSED') {
                    // Fallback to polling if realtime fails
                    console.log(`Realtime connection failed (${eventStatus}), switching to polling.`);
                    startPolling();
                }
            });

        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            void supabase.removeChannel(channel);
        };
    }, [router]);

    return (
        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium ${status === 'live'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : status === 'polling'
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                    : status === 'connecting'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'border-red-500/40 bg-red-500/10 text-red-300'
            }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'live'
                    ? 'bg-emerald-400'
                    : status === 'polling'
                        ? 'bg-blue-400 animate-pulse'
                        : status === 'connecting'
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                }`} />
            {status === 'live' ? 'En vivo' :
                status === 'polling' ? 'Sincro. automática' :
                    status === 'connecting' ? 'Conectando...' : 'Sin conexión'}
        </span>
    );
}



