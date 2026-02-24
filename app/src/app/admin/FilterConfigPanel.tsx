"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { Check, GripVertical, Eye, EyeOff, Save, Loader2, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveFilterConfig } from "./filter-config-actions";

const ALL_FILTERS = [
    { key: "status", label: "Estado (Stock)" },
    { key: "category", label: "Categoría" },
    { key: "brand", label: "Marca" },
    { key: "tipoComponente", label: "Tipo Componente" },
    { key: "filterSku", label: "SKU" },
    { key: "filterNombre", label: "Nombre" },
    { key: "filterModelo", label: "Modelo" },
    { key: "filterPotencia", label: "Potencia" },
    { key: "talla", label: "Talla" },
    { key: "estante", label: "Ubicación (Estante)" },
    { key: "nivel", label: "Nivel" },
    { key: "clasificacion", label: "Clasificación" },
    { key: "proveedor", label: "Proveedor" },
];

interface FilterConfigPanelProps {
    defaultFilters: string[];
    filterOrder: string[];
}

export function FilterConfigPanel({ defaultFilters, filterOrder }: FilterConfigPanelProps) {
    // Merge filterOrder with any missing filters
    const initialOrder = [
        ...filterOrder,
        ...ALL_FILTERS.map(f => f.key).filter(k => !filterOrder.includes(k)),
    ];

    const [enabledFilters, setEnabledFilters] = useState<string[]>(defaultFilters);
    const [orderedKeys, setOrderedKeys] = useState<string[]>(initialOrder);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isPending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);

    const toggleFilter = (key: string) => {
        setEnabledFilters(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
        setSaved(false);
    };

    const handleDragStart = (index: number) => {
        setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === dropIndex) {
            setDragIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newOrder = [...orderedKeys];
        const [moved] = newOrder.splice(dragIndex, 1);
        newOrder.splice(dropIndex, 0, moved);
        setOrderedKeys(newOrder);
        setDragIndex(null);
        setDragOverIndex(null);
        setSaved(false);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setDragOverIndex(null);
    };

    const handleSave = () => {
        startTransition(async () => {
            const result = await saveFilterConfig(enabledFilters, orderedKeys);
            if (result.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        });
    };

    const getLabel = (key: string) => ALL_FILTERS.find(f => f.key === key)?.label || key;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/80">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <SlidersHorizontal className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Filtros del Inventario</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Configura qué filtros se muestran por defecto y su orden de aparición.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            saved
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                        )}
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saved ? "Guardado" : "Guardar"}
                    </button>
                </div>
            </div>

            <div className="p-4">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-3 ml-1 tracking-wider">
                    Arrastra para reordenar · Activa/desactiva con el check
                </div>
                <div className="space-y-1">
                    {orderedKeys.map((key, index) => {
                        const isEnabled = enabledFilters.includes(key);
                        const isDragging = dragIndex === index;
                        const isDragOver = dragOverIndex === index;

                        return (
                            <div
                                key={key}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing group",
                                    isDragging && "opacity-40 scale-95",
                                    isDragOver && "border-blue-400 bg-blue-50 dark:bg-blue-500/10",
                                    !isDragging && !isDragOver && (
                                        isEnabled
                                            ? "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                            : "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50 opacity-60 hover:opacity-80"
                                    )
                                )}
                            >
                                <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-slate-400 dark:group-hover:text-slate-500" />

                                <span className="text-xs font-mono text-slate-400 dark:text-slate-600 w-5 text-center shrink-0">
                                    {index + 1}
                                </span>

                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleFilter(key); }}
                                    className={cn(
                                        "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                                        isEnabled
                                            ? "bg-blue-600 border-blue-500 text-white"
                                            : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 hover:border-blue-400"
                                    )}
                                >
                                    {isEnabled && <Check className="w-3 h-3" />}
                                </button>

                                <span className={cn(
                                    "text-sm font-medium flex-1",
                                    isEnabled
                                        ? "text-slate-900 dark:text-slate-200"
                                        : "text-slate-400 dark:text-slate-600 line-through"
                                )}>
                                    {getLabel(key)}
                                </span>

                                {isEnabled ? (
                                    <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : (
                                    <EyeOff className="w-4 h-4 text-slate-300 dark:text-slate-700 shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
