"use client";

import { useState, useTransition } from "react";
import { IndustrialCard } from "@/components/ui/IndustrialCard";
import {
    Webhook,
    Loader2,
    Check,
    AlertTriangle,
    Radio,
    Globe,
    FlaskConical,
} from "lucide-react";
import type { WebhookConfig } from "./webhook-actions";
import { updateWebhookMode } from "./webhook-actions";

interface WebhookConfigPanelProps {
    config: WebhookConfig;
}

export function WebhookConfigPanel({ config }: WebhookConfigPanelProps) {
    const [mode, setMode] = useState<'production' | 'test'>(config.mode);
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const handleModeChange = (newMode: 'production' | 'test') => {
        if (newMode === mode || isPending) return;

        startTransition(async () => {
            const result = await updateWebhookMode(newMode);

            if (result.error) {
                setFeedback({ type: 'error', msg: result.error });
            } else {
                setMode(newMode);
                setFeedback({
                    type: 'success',
                    msg: newMode === 'production'
                        ? 'Webhook cambiado a Producción'
                        : 'Webhook cambiado a Test'
                });
            }
            setTimeout(() => setFeedback(null), 3000);
        });
    };

    const activeUrl = mode === 'test' ? config.url_test : config.url_production;

    return (
        <IndustrialCard className="p-0 overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-200 tracking-wide uppercase text-sm">
                            Configuración del Webhook N8N
                        </h3>
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border ${mode === 'production'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        }`}>
                        <Radio className="w-3 h-3 animate-pulse" />
                        {mode === 'production' ? 'PRODUCCIÓN' : 'TEST'}
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 ml-5">
                    Selecciona si las solicitudes se envían al webhook de <span className="text-emerald-400 font-medium">Producción</span> o al de <span className="text-amber-400 font-medium">Test</span>.
                </p>
            </div>

            {/* Mode Selector */}
            <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Production Option */}
                    <button
                        onClick={() => handleModeChange('production')}
                        disabled={isPending}
                        className={`relative rounded-xl border p-5 transition-all duration-300 text-left group ${mode === 'production'
                            ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20 dark:bg-emerald-500/5'
                            : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:border-emerald-500/20 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${mode === 'production'
                                ? 'bg-emerald-500/15 border border-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                                }`}>
                                <Globe className={`w-6 h-6 ${mode === 'production' ? 'text-emerald-400' : 'text-slate-400'
                                    }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className={`font-semibold text-sm ${mode === 'production' ? 'text-emerald-400' : 'text-slate-900 dark:text-slate-300'
                                        }`}>
                                        Producción
                                    </h4>
                                    {mode === 'production' && (
                                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            Activo
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Las solicitudes se envían al flujo real de N8N. Recomendado para uso diario.
                                </p>
                            </div>
                        </div>

                        {/* Radio indicator */}
                        <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${mode === 'production'
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-400 dark:border-slate-500'
                            }`}>
                            {mode === 'production' && (
                                <Check className="w-3 h-3 text-white" />
                            )}
                        </div>
                    </button>

                    {/* Test Option */}
                    <button
                        onClick={() => handleModeChange('test')}
                        disabled={isPending}
                        className={`relative rounded-xl border p-5 transition-all duration-300 text-left group ${mode === 'test'
                            ? 'bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20 dark:bg-amber-500/5'
                            : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:border-amber-500/20 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${mode === 'test'
                                ? 'bg-amber-500/15 border border-amber-500/30'
                                : 'bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                                }`}>
                                <FlaskConical className={`w-6 h-6 ${mode === 'test' ? 'text-amber-400' : 'text-slate-400'
                                    }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className={`font-semibold text-sm ${mode === 'test' ? 'text-amber-400' : 'text-slate-900 dark:text-slate-300'
                                        }`}>
                                        Test
                                    </h4>
                                    {mode === 'test' && (
                                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            Activo
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Las solicitudes se envían al webhook de prueba. Ideal para verificar el flujo sin afectar producción.
                                </p>
                            </div>
                        </div>

                        {/* Radio indicator */}
                        <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${mode === 'test'
                            ? 'border-amber-500 bg-amber-500'
                            : 'border-slate-400 dark:border-slate-500'
                            }`}>
                            {mode === 'test' && (
                                <Check className="w-3 h-3 text-white" />
                            )}
                        </div>
                    </button>
                </div>

                {/* Loading overlay */}
                {isPending && (
                    <div className="flex items-center justify-center gap-2 py-2">
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                        <span className="text-xs text-slate-400">Actualizando configuración...</span>
                    </div>
                )}

                {/* URL Display */}
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Webhook className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">URL Activa</span>
                    </div>
                    <code className="text-xs text-slate-400 dark:text-slate-300 font-mono break-all leading-relaxed select-all">
                        {activeUrl}
                    </code>
                </div>

                {/* Warning for test mode */}
                {mode === 'test' && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs text-amber-400 font-semibold mb-1">Modo Test Activo</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Los envíos de solicitudes irán al webhook de test. Asegúrate de tener activo el flujo de test en N8N para recibir las notificaciones.
                            </p>
                        </div>
                    </div>
                )}

                {/* Feedback */}
                {feedback && (
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${feedback.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        <Check className="w-3.5 h-3.5" />
                        {feedback.msg}
                    </div>
                )}
            </div>
        </IndustrialCard>
    );
}
