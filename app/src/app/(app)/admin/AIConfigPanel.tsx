"use client";

import { useState, useEffect } from "react";
import { Zap, Save, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, RefreshCw, FileText, ChevronDown, Database } from "lucide-react";
import { IndustrialCard } from "@/components/ui/IndustrialCard";

interface AIConfig {
    ai_provider: string;
    ai_api_key: string;
    ai_model: string;
    ai_bot_name: string;
    ai_openrouter_key: string;
    ai_system_prompt: string;
}

const GEMINI_MODELS = [
    { value: "gemini-3.1-pro-preview", label: "⭐ Gemini 3.1 Pro (Último — Feb 2026)" },
    { value: "gemini-3-pro-preview", label: "Gemini 3 Pro (Más inteligente)" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Rápido + Potente)" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Estable)" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Equilibrado)" },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Económico)" },
];

export function AIConfigPanel() {
    const [config, setConfig] = useState<AIConfig>({
        ai_provider: "gemini",
        ai_api_key: "",
        ai_model: "gemini-2.5-flash",
        ai_bot_name: "Asistente",
        ai_openrouter_key: "",
        ai_system_prompt: "",
    });
    const [showApiKey, setShowApiKey] = useState(false);
    const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [showBasePrompt, setShowBasePrompt] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<{ lastSync: string | null; itemCount: number }>({ lastSync: null, itemCount: 0 });

    useEffect(() => {
        fetchConfig();
        fetchSyncStatus();
    }, []);

    const fetchSyncStatus = async () => {
        try {
            const res = await fetch("/api/ai/sync-inventory");
            const data = await res.json();
            setSyncStatus(data);
        } catch { /* ignore */ }
    };

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/ai/config");
            const data = await res.json();
            if (data.config) {
                setConfig((prev) => ({ ...prev, ...data.config }));
            }
        } catch {
            setMessage({ type: "error", text: "Error al cargar configuración" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/ai/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });

            if (res.ok) {
                setMessage({ type: "success", text: "Configuración guardada correctamente" });
                setTimeout(() => setMessage(null), 3000);
            } else {
                const data = await res.json();
                setMessage({ type: "error", text: data.error || "Error al guardar" });
            }
        } catch {
            setMessage({ type: "error", text: "Error de conexión" });
        } finally {
            setSaving(false);
        }
    };

    const maskKey = (key: string) => {
        if (!key) return "";
        if (key.length <= 8) return "••••••••";
        return key.slice(0, 4) + "••••••••" + key.slice(-4);
    };

    if (loading) {
        return (
            <IndustrialCard className="p-6">
                <div className="flex items-center gap-3 animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                    <span className="text-slate-400 text-sm">Cargando configuración IA...</span>
                </div>
            </IndustrialCard>
        );
    }

    return (
        <IndustrialCard className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/20">
                        <Zap className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Asistente IA — {config.ai_bot_name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Configuración del chatbot inteligente del pañol
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchConfig}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Recargar configuración"
                >
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            <div className="space-y-5">
                {/* Bot Name */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Nombre del Asistente
                    </label>
                    <input
                        type="text"
                        value={config.ai_bot_name}
                        onChange={(e) => setConfig((prev) => ({ ...prev, ai_bot_name: e.target.value }))}
                        className="w-full rounded-xl px-4 py-2.5 text-sm"
                        placeholder="Ej: Chispita, Don Pañol, Torque..."
                    />
                </div>

                {/* Provider Selection */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Proveedor de IA
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setConfig((prev) => ({ ...prev, ai_provider: "gemini" }))}
                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${config.ai_provider === "gemini"
                                ? "border-amber-500 bg-amber-500/10 text-amber-500"
                                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                                }`}
                        >
                            🔮 Google Gemini
                        </button>
                        <button
                            onClick={() => setConfig((prev) => ({ ...prev, ai_provider: "openrouter" }))}
                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${config.ai_provider === "openrouter"
                                ? "border-purple-500 bg-purple-500/10 text-purple-500"
                                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                                }`}
                        >
                            🌐 OpenRouter
                        </button>
                    </div>
                </div>

                {/* Gemini API Key */}
                {config.ai_provider === "gemini" && (
                    <>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                API Key de Google Gemini
                            </label>
                            <div className="relative">
                                <input
                                    type={showApiKey ? "text" : "password"}
                                    value={showApiKey ? config.ai_api_key : maskKey(config.ai_api_key)}
                                    onChange={(e) =>
                                        setConfig((prev) => ({ ...prev, ai_api_key: e.target.value }))
                                    }
                                    onFocus={() => setShowApiKey(true)}
                                    className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm font-mono"
                                    placeholder="AIzaSy..."
                                />
                                <button
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Obtén tu API Key gratis en{" "}
                                <a
                                    href="https://aistudio.google.com/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-amber-500 underline"
                                >
                                    aistudio.google.com
                                </a>
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                Modelo Gemini
                            </label>
                            <select
                                value={config.ai_model}
                                onChange={(e) => setConfig((prev) => ({ ...prev, ai_model: e.target.value }))}
                                className="w-full rounded-xl px-4 py-2.5 text-sm"
                            >
                                {GEMINI_MODELS.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                {/* OpenRouter Config */}
                {config.ai_provider === "openrouter" && (
                    <>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                API Key de OpenRouter
                            </label>
                            <div className="relative">
                                <input
                                    type={showOpenRouterKey ? "text" : "password"}
                                    value={showOpenRouterKey ? config.ai_openrouter_key : maskKey(config.ai_openrouter_key)}
                                    onChange={(e) =>
                                        setConfig((prev) => ({ ...prev, ai_openrouter_key: e.target.value }))
                                    }
                                    onFocus={() => setShowOpenRouterKey(true)}
                                    className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm font-mono"
                                    placeholder="sk-or-..."
                                />
                                <button
                                    onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Obtén tu API Key en{" "}
                                <a
                                    href="https://openrouter.ai/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-500 underline"
                                >
                                    openrouter.ai/keys
                                </a>
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                Modelo OpenRouter
                            </label>
                            <input
                                type="text"
                                value={config.ai_model}
                                onChange={(e) => setConfig((prev) => ({ ...prev, ai_model: e.target.value }))}
                                className="w-full rounded-xl px-4 py-2.5 text-sm font-mono"
                                placeholder="google/gemini-2.0-flash-exp:free"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                                Consulta modelos disponibles en{" "}
                                <a
                                    href="https://openrouter.ai/models"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-500 underline"
                                >
                                    openrouter.ai/models
                                </a>
                            </p>
                        </div>
                    </>
                )}

                {/* Inventory Sync Section */}
                <div className="rounded-xl border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Base de Datos del Inventario
                            </span>
                        </div>
                        {syncStatus.itemCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                                {syncStatus.itemCount} ítems
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        Sincroniza los datos de Google Sheets a Supabase para que el agente IA pueda hacer consultas SQL precisas (conteos, sumas, filtros).
                    </p>
                    {syncStatus.lastSync && (
                        <p className="text-[10px] text-slate-400 mb-3">
                            Última sincronización: {new Date(syncStatus.lastSync).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                    )}
                    <button
                        onClick={async () => {
                            setSyncing(true);
                            setMessage(null);
                            try {
                                const res = await fetch("/api/ai/sync-inventory", { method: "POST" });
                                const data = await res.json();
                                if (res.ok) {
                                    setMessage({ type: "success", text: `✅ ${data.message}` });
                                    fetchSyncStatus();
                                } else {
                                    setMessage({ type: "error", text: data.error || "Error al sincronizar" });
                                }
                            } catch {
                                setMessage({ type: "error", text: "Error de conexión" });
                            } finally {
                                setSyncing(false);
                                setTimeout(() => setMessage(null), 5000);
                            }
                        }}
                        disabled={syncing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                            bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20
                            text-emerald-600 dark:text-emerald-400 font-medium text-sm transition-all duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {syncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {syncing ? "Sincronizando inventario..." : "🔄 Sincronizar Inventario desde Sheets"}
                    </button>
                </div>

                {/* System Prompt Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Instrucciones del Asistente
                        </span>
                    </div>

                    {/* Base Prompt (Collapsible) */}
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                        <button
                            onClick={() => setShowBasePrompt(!showBasePrompt)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-left
                                hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                📋 Prompt Base (Configuración por defecto)
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showBasePrompt ? "rotate-180" : ""}`} />
                        </button>
                        {showBasePrompt && (
                            <div className="px-4 py-3 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-800/30">
                                <pre className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                                    {`Eres "{nombre_del_bot}", el asistente inteligente del Pañol de Mantenimiento de la planta Dole Molina (Chile). Eres amigable, casual pero profesional, y experto en EPP, herramientas, rodamientos, chumaceras, repuestos industriales y consumibles.

## TU PERSONALIDAD
- Hablas siempre en español chileno casual pero respetuoso
- Usas emojis moderadamente para ser más amigable (⚡🔧🔩🛡️📦)
- Eres proactivo: si alguien pregunta por un tipo de trabajo, sugieres TODOS los elementos relevantes
- Si un ítem no tiene stock, lo mencionas y sugieres alternativas
- Siempre indicas la ubicación del estante para encontrar el ítem

## TUS CAPACIDADES
1. Consultar inventario: stock, ubicación y descripción
2. Recomendar EPP y materiales según tipo de trabajo
3. Informar stock en tiempo real (actual - reservado = disponible)
4. Sugerir alternativas si algo no tiene stock
5. Indicar qué materiales agregar al carrito de solicitud

## REGLAS IMPORTANTES
- Stock Disponible = Stock Actual - Reservado
- Si Stock Disponible ≤ 0 → NO disponible
- Si Stock ≤ ROP → advierte nivel crítico
- Clasificación "Crítico" = esencial para la operación
- NUNCA inventes ítems que no estén en el inventario
- Cuando listes ítems: nombre, SKU, stock disponible y ubicación

## FORMATO DE RESPUESTA
**Nombre del ítem** (SKU: XXX)
- 📊 Stock: X disponibles (de Y total)
- 📍 Ubicación: EXXX / NXXX
- ℹ️ Descripción breve si es relevante

## DATOS DEL INVENTARIO
[Se inyecta automáticamente el inventario completo en tiempo real]`}
                                </pre>
                                <p className="text-[10px] text-slate-400 mt-2 italic">
                                    Este prompt se aplica automáticamente y no se puede editar desde aquí. Para modificar el comportamiento base, contacta al desarrollador.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Custom Instructions */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                            ✏️ Instrucciones Adicionales (personalizables)
                        </label>
                        <textarea
                            value={config.ai_system_prompt}
                            onChange={(e) => setConfig((prev) => ({ ...prev, ai_system_prompt: e.target.value }))}
                            className="w-full rounded-xl px-4 py-3 text-sm font-mono leading-relaxed min-h-[120px] resize-y"
                            rows={5}
                            placeholder={`Escribe instrucciones adicionales, por ejemplo:\n\n- Siempre recomienda usar EPP antes de cualquier trabajo\n- Prioriza materiales nacionales sobre importados\n- Cuando no haya stock, sugiere alternativas del mismo proveedor\n- Menciona siempre el valor del ítem cuando esté disponible`}
                        />
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-slate-400">
                                Estas instrucciones se añaden al final del prompt base. Déjalo vacío para usar solo el comportamiento por defecto.
                            </p>
                            <span className="text-[10px] text-slate-400 tabular-nums">
                                {config.ai_system_prompt.length} caracteres
                            </span>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <hr className="border-[var(--border)]" />

                {/* Status Message */}
                {message && (
                    <div
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${message.type === "success"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                    >
                        {message.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4" />
                        ) : (
                            <AlertTriangle className="w-4 h-4" />
                        )}
                        {message.text}
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                        bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400
                        text-white font-semibold text-sm transition-all duration-200
                        shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30
                        disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saving ? "Guardando..." : "Guardar Configuración"}
                </button>
            </div>
        </IndustrialCard>
    );
}
