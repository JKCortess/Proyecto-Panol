"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { FilterCombobox, Option } from "@/components/ui/FilterCombobox";
import { FilterTextInput } from "@/components/ui/FilterTextInput";
import { FilterVisibilityManager } from "./FilterVisibilityManager";

interface InventoryControlsProps {
    categories: string[];
    brands: string[];
    estantes: string[];
    clasificaciones: string[];
    niveles: string[];
    tallas: string[];
    tiposComponente: string[];
    proveedores: string[];
}

const AVAILABLE_FILTERS = [
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

export function InventoryControls({ categories, brands, estantes, clasificaciones, niveles, tallas, tiposComponente, proveedores }: InventoryControlsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Helper to get array from comma-separated param
    const getParamArray = (key: string) => {
        const val = searchParams.get(key);
        return val ? val.split(",") : [];
    };

    // Current State from URL (as arrays)
    const currentCategory = getParamArray("category");
    const currentBrand = getParamArray("brand");
    const currentStatus = getParamArray("status");
    const currentEstante = getParamArray("estante");
    const currentNivel = getParamArray("nivel");
    const currentClasificacion = getParamArray("clasificacion");
    const currentTalla = getParamArray("talla");
    const currentTipoComponente = getParamArray("tipoComponente");
    const currentProveedor = getParamArray("proveedor");
    const currentFilterSku = searchParams.get("filterSku") || "";
    const currentFilterNombre = searchParams.get("filterNombre") || "";
    const currentFilterModelo = searchParams.get("filterModelo") || "";
    const currentFilterPotencia = searchParams.get("filterPotencia") || "";

    // Determine active visible filters - logic: 
    // 1. If we have params that are NOT in default, show them.
    // 2. Otherwise default set.
    const [visibleFilters, setVisibleFilters] = useState<string[]>([
        "status", "category", "brand", "estante"
    ]);

    // Ensure effectively active filters (from URL) are always visible
    const activeParams = [];
    if (currentStatus.length > 0) activeParams.push("status");
    if (currentCategory.length > 0) activeParams.push("category");
    if (currentBrand.length > 0) activeParams.push("brand");
    if (currentTipoComponente.length > 0) activeParams.push("tipoComponente");
    if (currentFilterSku) activeParams.push("filterSku");
    if (currentFilterNombre) activeParams.push("filterNombre");
    if (currentFilterModelo) activeParams.push("filterModelo");
    if (currentFilterPotencia) activeParams.push("filterPotencia");
    if (currentEstante.length > 0) activeParams.push("estante");
    if (currentNivel.length > 0) activeParams.push("nivel");
    if (currentClasificacion.length > 0) activeParams.push("clasificacion");
    if (currentTalla.length > 0) activeParams.push("talla");
    if (currentProveedor.length > 0) activeParams.push("proveedor");

    const displayedFilters = Array.from(new Set([...visibleFilters, ...activeParams]));

    const hasActiveFilters = activeParams.length > 0;

    const updateFilter = (key: string, values: string[]) => {
        const params = new URLSearchParams(searchParams.toString());
        if (values && values.length > 0) {
            params.set(key, values.join(","));
        } else {
            params.delete(key);
        }
        router.push(`/inventory?${params.toString()}`);
    };

    const updateTextFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`/inventory?${params.toString()}`);
    };

    const clearAllFilters = () => {
        const params = new URLSearchParams();
        const q = searchParams.get("q");
        const view = searchParams.get("view");
        const sort = searchParams.get("sort");
        if (q) params.set("q", q);
        if (view) params.set("view", view);
        if (sort) params.set("sort", sort);
        router.push(`/inventory?${params.toString()}`);
    };

    // Prepare Options
    const statusOptions: Option[] = [
        { value: "critical", label: "Crítico (Bajo ROP)" },
        { value: "low", label: "Bajo Stock (Atención)" },
        { value: "good", label: "Stock OK" },
    ];

    const categoryOptions: Option[] = categories.map(c => ({ value: c, label: c }));
    const brandOptions: Option[] = brands.map(b => ({ value: b, label: b }));
    const estanteOptions: Option[] = estantes.map(e => ({ value: e, label: `Estante ${e}` }));
    const nivelOptions: Option[] = niveles.map(n => ({ value: n, label: `Nivel ${n}` }));
    const clasificacionOptions: Option[] = clasificaciones.map(c => ({ value: c, label: c }));
    const tallaOptions: Option[] = tallas.map(t => ({ value: t, label: t }));
    const tipoComponenteOptions: Option[] = tiposComponente.map(t => ({ value: t, label: t }));
    const proveedorOptions: Option[] = proveedores.map(p => ({ value: p, label: p }));

    const handleFilterVisibilityChange = (newFilters: string[]) => {
        setVisibleFilters(newFilters);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-xl relative z-20 transition-all">

                {/* Filter Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-flow-col xl:auto-cols-fr gap-3 w-full flex-1">

                    {displayedFilters.includes("status") && (
                        <FilterCombobox
                            label="Estado"
                            options={statusOptions}
                            value={currentStatus}
                            onChange={(vals) => updateFilter("status", vals)}
                            placeholder="Todos"
                        />
                    )}

                    {displayedFilters.includes("category") && (
                        <FilterCombobox
                            label="Categoría"
                            options={categoryOptions}
                            value={currentCategory}
                            onChange={(vals) => updateFilter("category", vals)}
                            placeholder="Todas"
                        />
                    )}

                    {displayedFilters.includes("brand") && (
                        <FilterCombobox
                            label="Marca"
                            options={brandOptions}
                            value={currentBrand}
                            onChange={(vals) => updateFilter("brand", vals)}
                            placeholder="Todas"
                        />
                    )}

                    {displayedFilters.includes("tipoComponente") && (
                        <FilterCombobox
                            label="Tipo Componente"
                            options={tipoComponenteOptions}
                            value={currentTipoComponente}
                            onChange={(vals) => updateFilter("tipoComponente", vals)}
                            placeholder="Todos"
                        />
                    )}

                    {displayedFilters.includes("filterSku") && (
                        <FilterTextInput
                            label="SKU"
                            value={currentFilterSku}
                            onChange={(val) => updateTextFilter("filterSku", val)}
                            placeholder="Filtrar por SKU..."
                        />
                    )}

                    {displayedFilters.includes("filterNombre") && (
                        <FilterTextInput
                            label="Nombre"
                            value={currentFilterNombre}
                            onChange={(val) => updateTextFilter("filterNombre", val)}
                            placeholder="Filtrar por nombre..."
                        />
                    )}

                    {displayedFilters.includes("filterModelo") && (
                        <FilterTextInput
                            label="Modelo"
                            value={currentFilterModelo}
                            onChange={(val) => updateTextFilter("filterModelo", val)}
                            placeholder="Filtrar por modelo..."
                        />
                    )}

                    {displayedFilters.includes("filterPotencia") && (
                        <FilterTextInput
                            label="Potencia"
                            value={currentFilterPotencia}
                            onChange={(val) => updateTextFilter("filterPotencia", val)}
                            placeholder="Filtrar por potencia..."
                        />
                    )}

                    {displayedFilters.includes("talla") && (
                        <FilterCombobox
                            label="Talla"
                            options={tallaOptions}
                            value={currentTalla}
                            onChange={(vals) => updateFilter("talla", vals)}
                            placeholder="Todas"
                        />
                    )}

                    {displayedFilters.includes("estante") && (
                        <FilterCombobox
                            label="Ubicación"
                            options={estanteOptions}
                            value={currentEstante}
                            onChange={(vals) => updateFilter("estante", vals)}
                            placeholder="Todas"
                        />
                    )}

                    {displayedFilters.includes("nivel") && (
                        <FilterCombobox
                            label="Nivel"
                            options={nivelOptions}
                            value={currentNivel}
                            onChange={(vals) => updateFilter("nivel", vals)}
                            placeholder="Todos"
                        />
                    )}

                    {displayedFilters.includes("clasificacion") && (
                        <FilterCombobox
                            label="Clasificación"
                            options={clasificacionOptions}
                            value={currentClasificacion}
                            onChange={(vals) => updateFilter("clasificacion", vals)}
                            placeholder="Todas"
                        />
                    )}

                    {displayedFilters.includes("proveedor") && (
                        <FilterCombobox
                            label="Proveedor"
                            options={proveedorOptions}
                            value={currentProveedor}
                            onChange={(vals) => updateFilter("proveedor", vals)}
                            placeholder="Todos"
                        />
                    )}

                    {/* Add Filter Button */}
                    <div className="flex items-end gap-2">
                        <FilterVisibilityManager
                            availableFilters={AVAILABLE_FILTERS}
                            visibleFilters={displayedFilters}
                            onChange={handleFilterVisibilityChange}
                        />

                        {hasActiveFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="flex items-center justify-center h-[42px] px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all"
                                title="Borrar todos los filtros"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Active Filters Tags */}
            {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 px-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center h-6 mr-1">
                        <SlidersHorizontal className="w-3 h-3 mr-1" /> Filtros activos:
                    </span>
                    {currentStatus.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                            {currentStatus.map(s => statusOptions.find(o => o.value === s)?.label || s).join(", ")}
                            <button onClick={() => updateFilter("status", [])} className="hover:text-amber-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentCategory.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium border border-slate-500/20">
                            {currentCategory.join(", ")}
                            <button onClick={() => updateFilter("category", [])} className="hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentBrand.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20">
                            {currentBrand.join(", ")}
                            <button onClick={() => updateFilter("brand", [])} className="hover:text-purple-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentEstante.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                            Estante: {currentEstante.join(", ")}
                            <button onClick={() => updateFilter("estante", [])} className="hover:text-emerald-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentNivel.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium border border-cyan-500/20">
                            Nivel: {currentNivel.join(", ")}
                            <button onClick={() => updateFilter("nivel", [])} className="hover:text-cyan-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentClasificacion.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-medium border border-pink-500/20">
                            {currentClasificacion.join(", ")}
                            <button onClick={() => updateFilter("clasificacion", [])} className="hover:text-pink-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentTipoComponente.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/20">
                            {currentTipoComponente.join(", ")}
                            <button onClick={() => updateFilter("tipoComponente", [])} className="hover:text-indigo-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentFilterSku && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium border border-slate-500/20">
                            SKU: {currentFilterSku}
                            <button onClick={() => updateTextFilter("filterSku", "")} className="hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentFilterNombre && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium border border-slate-500/20">
                            Nombre: {currentFilterNombre}
                            <button onClick={() => updateTextFilter("filterNombre", "")} className="hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentFilterModelo && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium border border-slate-500/20">
                            Modelo: {currentFilterModelo}
                            <button onClick={() => updateTextFilter("filterModelo", "")} className="hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentFilterPotencia && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium border border-slate-500/20">
                            Potencia: {currentFilterPotencia}
                            <button onClick={() => updateTextFilter("filterPotencia", "")} className="hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentTalla.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium border border-slate-500/20">
                            Talla: {currentTalla.join(", ")}
                            <button onClick={() => updateFilter("talla", [])} className="hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentProveedor.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-medium border border-teal-500/20">
                            {currentProveedor.join(", ")}
                            <button onClick={() => updateFilter("proveedor", [])} className="hover:text-teal-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
