'use client';

import { Bell, CheckCircle, Clock, Package, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface NotificationBellProps {
    initialPendingCount: number;
    isAdmin: boolean;
}

type NotificationItem = {
    id: string;
    request_code: string;
    user_name: string | null;
    created_at: string;
    status: string;
};

export function NotificationBell({ initialPendingCount, isAdmin }: NotificationBellProps) {
    const [pendingCount, setPendingCount] = useState(initialPendingCount);
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
    const isOpenRef = useRef(isOpen);

    if (supabaseRef.current == null) {
        supabaseRef.current = createClient();
    }
    const supabase = supabaseRef.current;

    // Keep ref in sync so the realtime callback can read latest value
    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    const router = useRouter();

    // Update local count when server state changes
    useEffect(() => {
        setPendingCount(initialPendingCount);
    }, [initialPendingCount]);

    // Close dropdown involved when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        if (!isAdmin) return;
        setLoading(true);
        // Fetch recent requests (Pending first, then others)
        const { data, error } = await supabase
            .from('material_requests')
            .select('id, request_code, user_name, created_at, status')
            .order('created_at', { ascending: false })
            .limit(8);

        if (!error && data) {
            setNotifications(data as NotificationItem[]);
        }
        setLoading(false);
    };

    // Realtime subscription for new requests (Toast + Counter)
    useEffect(() => {
        if (!isAdmin) return;

        const channel = supabase
            .channel('notifications-bell')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'material_requests'
                },
                (payload) => {
                    setPendingCount((prev) => prev + 1);
                    toast.message('Nueva Solicitud', {
                        description: `Código: ${(payload.new as any).request_code || 'N/A'}`,
                        action: {
                            label: 'Ver',
                            onClick: () => router.push('/requests/pending')
                        }
                    });
                    router.refresh();

                    // If open, refresh list too
                    if (isOpenRef.current) fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [isAdmin, router]);

    const toggleOpen = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        if (newState) {
            fetchNotifications();
        }
    };

    const hasNotifications = pendingCount > 0;

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours} h`;
        return `Hace ${diffDays} d`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleOpen}
                className={`p-2.5 border rounded-lg transition-colors relative ${isOpen ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
                <Bell className="w-5 h-5" />
                {hasNotifications && (
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-slate-900 animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-slate-800">
                    <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center backdrop-blur-sm">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Notificaciones Recientes</h3>
                        {pendingCount > 0 && (
                            <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 font-medium">
                                {pendingCount} Pendiente{pendingCount !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-8 flex justify-center text-slate-500">
                                <span className="loading-spinner w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                                <Bell className="w-10 h-10 opacity-10 mb-3" />
                                <p className="text-sm font-medium text-slate-400">Sin notificaciones</p>
                                <p className="text-xs mt-1 opacity-70">No hay actividad reciente.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/50">
                                {notifications.map(n => (
                                    <Link
                                        href={n.status === 'Pendiente' ? '/requests/pending' : `/my-orders/${n.id}`}
                                        key={n.id}
                                        className="block p-4 hover:bg-slate-800/50 transition-all group"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${n.status === 'Pendiente'
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                                }`}>
                                                {n.status === 'Pendiente' ? <Clock className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                                                        Solicitud #{n.request_code}
                                                    </p>
                                                    <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                                                        {formatTimeAgo(n.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <User className="w-3 h-3" /> {n.user_name || 'Usuario desconocido'}
                                                </p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${n.status === 'Pendiente' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                        n.status === 'Aceptada' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                            n.status === 'Entregada' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                                                'bg-slate-800 border-slate-700 text-slate-400'
                                                        }`}>
                                                        {n.status}
                                                    </span>
                                                </div>
                                            </div>
                                            {n.status === 'Pendiente' && (
                                                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0 animate-pulse" />
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
