'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { cancelOwnRequest } from '@/app/(app)/requests/actions';

interface CancelRequestButtonProps {
    requestId: string;
    requestCode: string;
}

export function CancelRequestButton({ requestId, requestCode }: CancelRequestButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleCancel = async () => {
        startTransition(async () => {
            try {
                // Default reason since we removed the prompt for speed/ux
                const result = await cancelOwnRequest(requestId, 'Cancelación por usuario (Botón)');

                if (result.success) {
                    toast.success(`Solicitud ${requestCode} cancelada`);
                    router.refresh();
                    setShowConfirm(false);
                } else {
                    toast.error(result.error || 'Error al cancelar');
                }
            } catch (error) {
                console.error("Error in handleCancel:", error);
                toast.error("Error de conexión");
            }
        });
    };

    if (showConfirm) {
        return (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                <span className="text-xs text-red-400 font-medium">¿Seguro?</span>
                <button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sí, Cancelar"}
                </button>
                <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isPending}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                >
                    No
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setShowConfirm(true)}
            disabled={isPending}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <XCircle className="w-4 h-4" />
            Cancelar Solicitud
        </button>
    );
}
