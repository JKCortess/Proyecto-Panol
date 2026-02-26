"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { FilterCombobox, Option } from "@/components/ui/FilterCombobox";
import { FilterTextInput } from "@/components/ui/FilterTextInput";
import { FilterVisibilityManager } from "./FilterVisibilityManager";
import type { InventoryItem } from "@/lib/data";
import type { FilterConfig } from "@/app/admin/filter-config-actions";

interface InventoryControlsProps {
    allItems: InventoryItem[];
    filterConfig?: FilterConfig;
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

const DEFAULT_VISIBLE = ["status", "category", "brand", "estante"];

// ── Helper: apply a single filter to the items list ──
function applyOneFilter(
    items: InventoryItem[],
    key: string,
    values: string[]
): InventoryItem[] {
    if (values.length === 0) return items;

    switch (key) {
        case "category":
            return items.filter(i => values.includes(i.categoria));
        case "brand":
            return items.filter(i => i.marca && values.includes(i.marca));
        case "tipoComponente":
            return items.filter(i => i.tipo_componente && values.includes(i.tipo_componente));
        case "estante":
            return items.filter(i => i.estante_nro && values.includes(i.estante_nro));
        case "nivel":
            return items.filter(i => i.estante_nivel && values.includes(i.estante_nivel));
        case "clasificacion":
            return items.filter(i => i.clasificacion && values.includes(i.clasificacion));
        case "talla":
            return items.filter(i => i.talla && values.includes(i.talla));
        case "proveedor":
            return items.filter(i => i.proveedor && values.includes(i.proveedor));
        case "status":
            return items.filter(i => values.some(s => {
                if (s === 'critical') return i.rop > 0 && i.stock <= i.rop;
                if (s === 'low') return i.rop > 0 && i.stock > i.rop && i.stock <= i.rop * 1.5;
                if (s === 'good') return i.rop === 0 || i.stock > i.rop * 1.5;
                return false;
            }));
        case "filterSku":
            return items.filter(i => i.sku.toLowerCase().includes(values[0].toLowerCase()));
        case "filterNombre":
            return items.filter(i => i.nombre.toLowerCase().includes(values[0].toLowerCase()));
        case "filterModelo":
            return items.filter(i => i.modelo.toLowerCase().includes(values[0].toLowerCase()));
        case "filterPotencia":
            return items.filter(i => i.potencia.toLowerCase().includes(values[0].toLowerCase()));
        default:
            return items;
    }
}

// ── Extract unique sorted values from a filtered subset ──
function uniqueSorted(items: InventoryItem[], field: keyof InventoryItem): string[] {
    return Array.from(new Set(
        items.map(i => String(i[field] || "")).filter(Boolean)
    )).sort();
}

export function InventoryControls({ allItems, filterConfig }: InventoryControlsProps) {
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

    // ── Build a map of all active filters ──
    const activeFiltersMap = useMemo(() => {
        const map: Record<string, string[]> = {};
        if (currentCategory.length > 0) map["category"] = currentCategory;
        if (currentBrand.length > 0) map["brand"] = currentBrand;
        if (currentStatus.length > 0) map["status"] = currentStatus;
        if (currentEstante.length > 0) map["estante"] = currentEstante;
        if (currentNivel.length > 0) map["nivel"] = currentNivel;
        if (currentClasificacion.length > 0) map["clasificacion"] = currentClasificacion;
        if (currentTalla.length > 0) map["talla"] = currentTalla;
        if (currentTipoComponente.length > 0) map["tipoComponente"] = currentTipoComponente;
        if (currentProveedor.length > 0) map["proveedor"] = currentProveedor;
        if (currentFilterSku) map["filterSku"] = [currentFilterSku];
        if (currentFilterNombre) map["filterNombre"] = [currentFilterNombre];
        if (currentFilterModelo) map["filterModelo"] = [currentFilterModelo];
        if (currentFilterPotencia) map["filterPotencia"] = [currentFilterPotencia];
        return map;
    }, [currentCategory, currentBrand, currentStatus, currentEstante, currentNivel, currentClasificacion, currentTalla, currentTipoComponente, currentProveedor, currentFilterSku, currentFilterNombre, currentFilterModelo, currentFilterPotencia]);

    // ── Cascading: compute filtered subset for each filter (excluding itself) ──
    const getSubsetExcluding = (excludeKey: string): InventoryItem[] => {
        let filtered = allItems;
        for (const [key, values] of Object.entries(activeFiltersMap)) {
            if (key === excludeKey) continue;
            filtered = applyOneFilter(filtered, key, values);
        }
        return filtered;
    };

    // ── Compute cascaded options for each combobox filter ──
    const cascadedOptions = useMemo(() => {
        const hasAnyFilter = Object.keys(activeFiltersMap).length > 0;
        if (!hasAnyFilter) {
            // No filters active → show all options from allItems
            return {
                categories: uniqueSorted(allItems, "categoria"),
                brands: uniqueSorted(allItems, "marca"),
                tiposComponente: uniqueSorted(allItems, "tipo_componente"),
                estantes: uniqueSorted(allItems, "estante_nro"),
                niveles: uniqueSorted(allItems, "estante_nivel"),
                clasificaciones: uniqueSorted(allItems, "clasificacion"),
                tallas: uniqueSorted(allItems, "talla"),
                proveedores: uniqueSorted(allItems, "proveedor"),
            };
        }

        return {
            categories: uniqueSorted(getSubsetExcluding("category"), "categoria"),
            brands: uniqueSorted(getSubsetExcluding("brand"), "marca"),
            tiposComponente: uniqueSorted(getSubsetExcluding("tipoComponente"), "tipo_componente"),
            estantes: uniqueSorted(getSubsetExcluding("estante"), "estante_nro"),
            niveles: uniqueSorted(getSubsetExcluding("nivel"), "estante_nivel"),
            clasificaciones: uniqueSorted(getSubsetExcluding("clasificacion"), "clasificacion"),
            tallas: uniqueSorted(getSubsetExcluding("talla"), "talla"),
            proveedores: uniqueSorted(getSubsetExcluding("proveedor"), "proveedor"),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allItems, activeFiltersMap]);

    // ── Filter visibility ──
    const defaultVisible = filterConfig?.defaultFilters || DEFAULT_VISIBLE;
    const configOrder = filterConfig?.filterOrder;

    const [visibleFilters, setVisibleFilters] = useState<string[]>(defaultVisible);

    // Active params
    const activeParams = Object.keys(activeFiltersMap);

    const displayedFilters = Array.from(new Set([...visibleFilters, ...activeParams]));

    // Apply admin-configured order
    const orderedAvailableFilters = useMemo(() => {
        if (!configOrder) return AVAILABLE_FILTERS;
        const ordered = configOrder
            .map(key => AVAILABLE_FILTERS.find(f => f.key === key))
            .filter(Boolean) as typeof AVAILABLE_FILTERS;
        // Append any filters not in configOrder
        const missing = AVAILABLE_FILTERS.filter(f => !configOrder.includes(f.key));
        return [...ordered, ...missing];
    }, [configOrder]);

    // Sort displayedFilters by admin order
    const sortedDisplayedFilters = useMemo(() => {
        const orderIndex = orderedAvailableFilters.reduce((acc, f, i) => {
            acc[f.key] = i;
            return acc;
        }, {} as Record<string, number>);
        return [...displayedFilters].sort((a, b) => (orderIndex[a] ?? 99) - (orderIndex[b] ?? 99));
    }, [displayedFilters, orderedAvailableFilters]);

    const hasActiveFilters = activeParams.length > 0;

    const updateFilter = (key: string, values: string[]) => {
        const params = new URLSearchParams(searchParams.toString());
        if (values && values.length > 0) {
            params.set(key, values.join(","));
        } else {
            params.delete(key);
        }
        router.replace(`/inventory?${params.toString()}`, { scroll: false });
    };

    const updateTextFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.replace(`/inventory?${params.toString()}`, { scroll: false });
    };

    const clearAllFilters = () => {
        const params = new URLSearchParams();
        const q = searchParams.get("q");
        const view = searchParams.get("view");
        const sort = searchParams.get("sort");
        if (q) params.set("q", q);
        if (view) params.set("view", view);
        if (sort) params.set("sort", sort);
        router.replace(`/inventory?${params.toString()}`, { scroll: false });
    };

    // Prepare Options (cascaded)
    const statusOptions: Option[] = [
        { value: "critical", label: "Crítico (Bajo ROP)" },
        { value: "low", label: "Bajo Stock (Atención)" },
        { value: "good", label: "Stock OK" },
    ];

    const categoryOptions: Option[] = cascadedOptions.categories.map(c => ({ value: c, label: c }));
    const brandOptions: Option[] = cascadedOptions.brands.map(b => ({ value: b, label: b }));
    const estanteOptions: Option[] = cascadedOptions.estantes
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(e => ({ value: e, label: `Estante ${e}` }));
    const nivelOptions: Option[] = cascadedOptions.niveles.map(n => ({ value: n, label: `Nivel ${n}` }));
    const clasificacionOptions: Option[] = cascadedOptions.clasificaciones.map(c => ({ value: c, label: c }));
    const tallaOptions: Option[] = cascadedOptions.tallas.map(t => ({ value: t, label: t }));
    const tipoComponenteOptions: Option[] = cascadedOptions.tiposComponente.map(t => ({ value: t, label: t }));
    const proveedorOptions: Option[] = cascadedOptions.proveedores.map(p => ({ value: p, label: p }));

    const handleFilterVisibilityChange = (newFilters: string[]) => {
        setVisibleFilters(newFilters);
    };

    // Map of filter key → rendered component
    const filterComponents: Record<string, React.ReactNode> = {
        status: (
            <FilterCombobox
                label="Estado"
                options={statusOptions}
                value={currentStatus}
                onChange={(vals) => updateFilter("status", vals)}
                placeholder="Todos"
            />
        ),
        category: (
            <FilterCombobox
                label="Categoría"
                options={categoryOptions}
                value={currentCategory}
                onChange={(vals) => updateFilter("category", vals)}
                placeholder="Todas"
            />
        ),
        brand: (
            <FilterCombobox
                label="Marca"
                options={brandOptions}
                value={currentBrand}
                onChange={(vals) => updateFilter("brand", vals)}
                placeholder="Todas"
            />
        ),
        tipoComponente: (
            <FilterCombobox
                label="Tipo Componente"
                options={tipoComponenteOptions}
                value={currentTipoComponente}
                onChange={(vals) => updateFilter("tipoComponente", vals)}
                placeholder="Todos"
            />
        ),
        filterSku: (
            <FilterTextInput
                label="SKU"
                value={currentFilterSku}
                onChange={(val) => updateTextFilter("filterSku", val)}
                placeholder="Filtrar por SKU..."
            />
        ),
        filterNombre: (
            <FilterTextInput
                label="Nombre"
                value={currentFilterNombre}
                onChange={(val) => updateTextFilter("filterNombre", val)}
                placeholder="Filtrar por nombre..."
            />
        ),
        filterModelo: (
            <FilterTextInput
                label="Modelo"
                value={currentFilterModelo}
                onChange={(val) => updateTextFilter("filterModelo", val)}
                placeholder="Filtrar por modelo..."
            />
        ),
        filterPotencia: (
            <FilterTextInput
                label="Potencia"
                value={currentFilterPotencia}
                onChange={(val) => updateTextFilter("filterPotencia", val)}
                placeholder="Filtrar por potencia..."
            />
        ),
        talla: (
            <FilterCombobox
                label="Talla"
                options={tallaOptions}
                value={currentTalla}
                onChange={(vals) => updateFilter("talla", vals)}
                placeholder="Todas"
            />
        ),
        estante: (
            <FilterCombobox
                label="Ubicación"
                options={estanteOptions}
                value={currentEstante}
                onChange={(vals) => updateFilter("estante", vals)}
                placeholder="Todas"
            />
        ),
        nivel: (
            <FilterCombobox
                label="Nivel"
                options={nivelOptions}
                value={currentNivel}
                onChange={(vals) => updateFilter("nivel", vals)}
                placeholder="Todos"
            />
        ),
        clasificacion: (
            <FilterCombobox
                label="Clasificación"
                options={clasificacionOptions}
                value={currentClasificacion}
                onChange={(vals) => updateFilter("clasificacion", vals)}
                placeholder="Todas"
            />
        ),
        proveedor: (
            <FilterCombobox
                label="Proveedor"
                options={proveedorOptions}
                value={currentProveedor}
                onChange={(vals) => updateFilter("proveedor", vals)}
                placeholder="Todos"
            />
        ),
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-xl relative z-20 transition-all">

                {/* Filter Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-flow-col xl:auto-cols-fr gap-3 w-full flex-1">

                    {sortedDisplayedFilters.map(filterKey => (
                        sortedDisplayedFilters.includes(filterKey) && filterComponents[filterKey] ? (
                            <div key={filterKey}>{filterComponents[filterKey]}</div>
                        ) : null
                    ))}

                    {/* Add Filter Button */}
                    <div className="flex items-end gap-2">
                        <FilterVisibilityManager
                            availableFilters={orderedAvailableFilters}
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-500/20">
                            {currentStatus.map(s => statusOptions.find(o => o.value === s)?.label || s).join(", ")}
                            <button onClick={() => updateFilter("status", [])} className="hover:text-amber-900 dark:hover:text-amber-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentCategory.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-500/20">
                            {currentCategory.join(", ")}
                            <button onClick={() => updateFilter("category", [])} className="hover:text-slate-900 dark:hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentBrand.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-medium border border-purple-200 dark:border-purple-500/20">
                            {currentBrand.join(", ")}
                            <button onClick={() => updateFilter("brand", [])} className="hover:text-purple-900 dark:hover:text-purple-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentEstante.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-500/20">
                            Estante: {currentEstante.join(", ")}
                            <button onClick={() => updateFilter("estante", [])} className="hover:text-emerald-900 dark:hover:text-emerald-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentNivel.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 text-xs font-medium border border-cyan-200 dark:border-cyan-500/20">
                            Nivel: {currentNivel.join(", ")}
                            <button onClick={() => updateFilter("nivel", [])} className="hover:text-cyan-900 dark:hover:text-cyan-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentClasificacion.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-100 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 text-xs font-medium border border-pink-200 dark:border-pink-500/20">
                            {currentClasificacion.join(", ")}
                            <button onClick={() => updateFilter("clasificacion", [])} className="hover:text-pink-900 dark:hover:text-pink-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentTipoComponente.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-medium border border-indigo-200 dark:border-indigo-500/20">
                            {currentTipoComponente.join(", ")}
                            <button onClick={() => updateFilter("tipoComponente", [])} className="hover:text-indigo-900 dark:hover:text-indigo-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentFilterSku && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-500/20">
                            SKU: {currentFilterSku}
                            <button onClick={() => updateTextFilter("filterSku", "")} className="hover:text-slate-900 dark:hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentFilterNombre && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-500/20">
                            Nombre: {currentFilterNombre}
                            <button onClick={() => updateTextFilter("filterNombre", "")} className="hover:text-slate-900 dark:hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentFilterModelo && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-500/20">
                            Modelo: {currentFilterModelo}
                            <button onClick={() => updateTextFilter("filterModelo", "")} className="hover:text-slate-900 dark:hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentFilterPotencia && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-500/20">
                            Potencia: {currentFilterPotencia}
                            <button onClick={() => updateTextFilter("filterPotencia", "")} className="hover:text-slate-900 dark:hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentTalla.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-500/20">
                            Talla: {currentTalla.join(", ")}
                            <button onClick={() => updateFilter("talla", [])} className="hover:text-slate-900 dark:hover:text-slate-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {currentProveedor.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 text-xs font-medium border border-teal-200 dark:border-teal-500/20">
                            {currentProveedor.join(", ")}
                            <button onClick={() => updateFilter("proveedor", [])} className="hover:text-teal-900 dark:hover:text-teal-200"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
