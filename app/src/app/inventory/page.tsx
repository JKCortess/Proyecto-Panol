
import { getInventory, groupItemsByIdentity } from "@/lib/data";

// Force dynamic rendering — never serve stale cached pages.
// Google Sheets is the source of truth; every navigation should show fresh data.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import type { GroupedInventoryItem } from "@/lib/data";
import { InventoryCardActions } from "@/components/inventory/InventoryCardActions";
import { InventoryControls } from "@/components/inventory/InventoryControls";
import { InventoryActionToolbar } from "@/components/inventory/InventoryActionToolbar";
import { ImageCarousel } from "@/components/inventory/ImageCarousel";
// SizeStockSelector no longer needed — stock display is now integrated into InventoryCardActions
import { Search, AlertCircle, Package, FileSpreadsheet, MapPin, DollarSign, Ruler } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getUserProfile } from "@/app/profile/actions";

const DATASHEET_URL = "https://docs.google.com/spreadsheets/d/1JuZ-9eh9DlNVdqBrs-wutlY3JRQAdzLlx6RGdRzqG5Q/edit?usp=sharing";

interface SearchParamsProps {
    q?: string;
    category?: string;
    brand?: string;
    status?: string;
    estante?: string;
    talla?: string;
    view?: string;
    sort?: string;
    clasificacion?: string;
    nivel?: string;
    filterSku?: string;
    filterNombre?: string;
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SearchParamsProps> }) {
    const params = await searchParams;
    const query = params.q || "";

    // Fetch inventory data and check admin status in parallel
    const [allItems, profile] = await Promise.all([
        getInventory(query),
        getUserProfile(),
    ]);
    const isAdmin = profile?.role === 'Administrador';

    // Extract unique values for filters
    const categories = Array.from(new Set(allItems.map(i => i.categoria).filter(Boolean))).sort();
    const brands = Array.from(new Set(allItems.map(i => i.marca).filter(Boolean))).sort();
    const estantes = Array.from(new Set(allItems.map(i => i.estante_nro).filter(Boolean))).sort((a, b) => parseInt(a) - parseInt(b));
    const clasificaciones = Array.from(new Set(allItems.map(i => i.clasificacion).filter(Boolean))).sort();
    const niveles = Array.from(new Set(allItems.map(i => i.estante_nivel).filter(Boolean))).sort();
    const tallas = Array.from(new Set(allItems.map(i => i.talla).filter(Boolean))).sort();

    // Apply structured filters
    let items = allItems;

    if (params.category) {
        const categories = params.category.split(',');
        items = items.filter(item => categories.includes(item.categoria));
    }

    if (params.brand) {
        const brands = params.brand.split(',');
        items = items.filter(item => item.marca && brands.includes(item.marca));
    }

    if (params.estante) {
        const estantes = params.estante.split(',');
        items = items.filter(item => item.estante_nro && estantes.includes(item.estante_nro));
    }

    if (params.clasificacion) {
        const clasificaciones = params.clasificacion.split(',');
        items = items.filter(item => item.clasificacion && clasificaciones.includes(item.clasificacion));
    }

    if (params.nivel) {
        const niveles = params.nivel.split(',');
        items = items.filter(item => item.estante_nivel && niveles.includes(item.estante_nivel));
    }

    if (params.talla) {
        const tallas = params.talla.split(',');
        items = items.filter(item => item.talla && tallas.includes(item.talla));
    }

    if (params.filterSku) {
        const skuFilter = params.filterSku.toLowerCase();
        items = items.filter(item => item.sku.toLowerCase().includes(skuFilter));
    }

    if (params.filterNombre) {
        const nombreFilter = params.filterNombre.toLowerCase();
        items = items.filter(item => item.nombre.toLowerCase().includes(nombreFilter));
    }

    if (params.status) {
        const statuses = params.status.split(',');
        items = items.filter(item => {
            return statuses.some(status => {
                if (status === 'critical') {
                    // Solo ítems con ROP configurado (> 0) cuyo stock está en o bajo el ROP
                    return item.rop > 0 && item.stock <= item.rop;
                } else if (status === 'low') {
                    return item.rop > 0 && item.stock > item.rop && item.stock <= item.rop * 1.5;
                } else if (status === 'good') {
                    // Stock holgado O sin ROP configurado
                    return item.rop === 0 || item.stock > item.rop * 1.5;
                }
                return false;
            });
        });
    }

    const sort = params.sort || "name_asc";

    // Apply sorting
    items = [...items].sort((a, b) => { // Create a copy to avoid mutating original array from cache if any
        switch (sort) {
            case "price_asc": return a.valor - b.valor;
            case "price_desc": return b.valor - a.valor;
            case "brand_asc": return (a.marca || "").localeCompare(b.marca || "");
            case "brand_desc": return (b.marca || "").localeCompare(a.marca || "");
            case "name_desc": return b.nombre.localeCompare(a.nombre);
            case "name_asc":
            default: return a.nombre.localeCompare(b.nombre);
        }
    });

    // Group items by Nombre+Marca+Categoría for the deck view (merge size variants)
    const groupedItems = groupItemsByIdentity(items);

    const viewMode = params.view || "deck";

    // Helper to format CLP values
    const formatCLP = (value: number) => {
        if (!value) return "-";
        return `$${value.toLocaleString("es-CL")}`;
    };

    return (
        <main className="min-h-screen p-6 md:p-8 bg-slate-950 screen-inventory ui-page">
            <div className="space-y-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                    <div className="ui-section">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="ui-title text-2xl">Inventario General</h1>
                        </div>
                        <p className="ui-subtitle">Gestión de stock, ubicaciones en estantes y seguimiento de activos.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="icon-left icon-left-sm text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <form action="/inventory" method="GET">
                                <input
                                    name="q"
                                    defaultValue={query}
                                    type="text"
                                    className="block w-full input-with-icon pr-3 py-2.5 border border-slate-800 rounded-lg leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all shadow-sm"
                                    placeholder="Buscar por SKU, Nombre, Marca..."
                                />
                            </form>
                        </div>

                        {/* Data Sheet Button */}
                        <a
                            href={DATASHEET_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ui-btn-secondary inline-flex items-center justify-center px-4 py-2.5 border border-emerald-500/30 text-sm font-medium rounded-lg text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 hover:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg shadow-emerald-900/10 transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Google Sheet
                        </a>


                    </div>
                </div>

                {/* Controls Component */}
                <div className="sticky top-2 z-30">
                    <InventoryControls
                        categories={categories}
                        brands={brands}
                        estantes={estantes}
                        clasificaciones={clasificaciones}
                        niveles={niveles}
                        tallas={tallas}
                    />
                </div>

                <div className="mb-6 relative z-20">
                    <InventoryActionToolbar totalItems={viewMode === 'deck' ? groupedItems.length : items.length} isAdmin={isAdmin} />
                </div>

                {/* Conditional View Rendering */}
                {viewMode === "list" ? (
                    /* ======================== LIST VIEW ======================== */
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 ui-table">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase text-slate-400 bg-slate-950/60 border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3 font-mono">SKU</th>
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Categoría</th>
                                    <th className="px-4 py-3">Marca</th>
                                    <th className="px-4 py-3 text-center">Talla</th>
                                    <th className="px-4 py-3 text-center">Stock</th>
                                    <th className="px-4 py-3 text-center">Reservado</th>
                                    <th className="px-4 py-3 text-center">Estante</th>
                                    <th className="px-4 py-3 text-right">Valor CLP</th>
                                    <th className="px-4 py-3 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {items.map((item, index) => {
                                    const isCritical = item.rop > 0 && item.stock <= item.rop;
                                    const isLow = item.rop > 0 && !isCritical && item.stock <= item.rop * 1.5;

                                    return (
                                        <tr key={`${item.sku}-${index}`} className="hover:bg-slate-800/40 transition-colors group">
                                            <td className="px-4 py-3 font-mono text-blue-400 text-xs whitespace-nowrap">{item.sku}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                                        {item.fotos.length > 0 ? (
                                                            <Image src={item.fotos[0]} alt={item.nombre} width={32} height={32} className="object-cover w-full h-full" unoptimized />
                                                        ) : (
                                                            <Package className="w-4 h-4 text-slate-600" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-slate-200 font-medium truncate max-w-[200px]" title={item.nombre}>{item.nombre}</p>
                                                        {item.descripcion_general && (
                                                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]" title={item.descripcion_general}>{item.descripcion_general}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-xs">{item.categoria}</td>
                                            <td className="px-4 py-3">
                                                <span className="ui-chip text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{item.marca || '-'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {item.talla ? (
                                                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{item.talla}</span>
                                                ) : (
                                                    <span className="text-slate-700">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-mono font-bold text-base ${isCritical ? 'text-red-500' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>{item.stock}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-500 font-mono">{item.reservado}</td>
                                            <td className="px-4 py-3 text-center">
                                                {item.estante_nro ? (
                                                    <span className="text-xs font-mono text-slate-400">
                                                        E{item.estante_nro}
                                                        {item.estante_nivel && <span className="text-slate-600"> / N{item.estante_nivel}</span>}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs">
                                                <span className="text-amber-400 font-bold">{formatCLP(item.valor)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {isCritical ? (
                                                    <span className="ui-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>Crítico
                                                    </span>
                                                ) : isLow ? (
                                                    <span className="ui-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Bajo
                                                    </span>
                                                ) : (
                                                    <span className="ui-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>OK
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* ======================== DECK VIEW ======================== */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {groupedItems.map((item, index) => {
                            const isCritical = item.maxRop > 0 && item.totalStock <= item.maxRop;

                            return (
                                <div key={`${item.nombre}-${item.marca}-${item.categoria}-${index}`} className={`group relative bg-slate-900 rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] ui-card ${isCritical ? 'border-red-500/50 shadow-red-900/10' : 'border-slate-800 hover:border-slate-700'}`}>

                                    {/* Status Badge */}
                                    <div className="absolute top-3 right-3 z-10">
                                        {isCritical ? (
                                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse"></div>
                                        ) : (
                                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                                        )}
                                    </div>

                                    {isCritical && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 transform bg-red-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-b-lg shadow-lg shadow-red-900/50 z-10 flex items-center gap-1 border-b border-x border-red-400/30">
                                            <AlertCircle className="w-3 h-3" /> STOCK CRÍTICO
                                        </div>
                                    )}

                                    {/* Size count badge */}
                                    {item.hasSizes && item.variants.length > 1 && (
                                        <div className="absolute top-3 left-3 z-20">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600/80 text-white border border-purple-400/30 backdrop-blur-sm flex items-center gap-1">
                                                <Ruler className="w-3 h-3" />
                                                {item.variants.length} tallas
                                            </span>
                                        </div>
                                    )}

                                    {/* Image Area — Carousel */}
                                    <ImageCarousel fotos={item.fotos} alt={item.nombre} marca={item.marca} />

                                    {/* Content Area */}
                                    <div className="p-5 space-y-3">
                                        <div>
                                            <h3 className="font-bold text-base text-slate-100 line-clamp-1 group-hover:text-blue-400 transition-colors" title={item.nombre}>{item.nombre}</h3>
                                            <p className="text-xs font-mono text-slate-500 mt-0.5">SKU: {item.sku}</p>
                                            {item.descripcion_general && (
                                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2" title={item.descripcion_general}>{item.descripcion_general}</p>
                                            )}
                                        </div>

                                        {/* Value Display */}
                                        {item.valor > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                                <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
                                                <span className="text-lg font-bold font-mono text-amber-400 tracking-tight">
                                                    {item.valor.toLocaleString("es-CL")}
                                                </span>
                                                <span className="text-[10px] text-amber-500/60 ml-auto">CLP</span>
                                            </div>
                                        )}

                                        {/* Size Selector OR regular metrics */}
                                        {!(item.hasSizes && item.variants.length > 0) && (
                                            /* No sizes — show standard metrics grid */
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className={`p-2 rounded-lg border ${isCritical ? 'bg-red-950/20 border-red-900/30' : 'bg-slate-950 border-slate-800'}`}>
                                                    <p className={`text-[10px] uppercase font-bold mb-0.5 ${isCritical ? 'text-red-400' : 'text-emerald-500'}`}>Stock</p>
                                                    <p className={`text-2xl font-bold font-mono leading-none ${isCritical ? 'text-red-500' : 'text-emerald-400'}`}>{item.totalStock}</p>
                                                </div>
                                                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                                                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Min (ROP)</p>
                                                    <p className="text-2xl font-bold font-mono text-slate-300 leading-none">{item.maxRop}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Location Row */}
                                        <div className="flex justify-between items-center text-xs text-slate-500 font-mono border-t border-slate-800 pt-3">
                                            <span className="flex items-center gap-1.5" title={`Estante ${item.estante_nro}, Nivel ${item.estante_nivel}`}>
                                                <MapPin className="w-3 h-3 text-slate-600" />
                                                {item.estante_nro ? (
                                                    <span>E{item.estante_nro}{item.estante_nivel && ` / N${item.estante_nivel}`}</span>
                                                ) : (
                                                    <span className="text-slate-700">Sin ubicación</span>
                                                )}
                                            </span>
                                        </div>

                                        {/* Classification & Category Tags */}
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                {item.categoria}
                                            </span>
                                            {item.clasificacion && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${item.clasificacion.toLowerCase().includes('criti') || item.clasificacion.toLowerCase().includes('críti')
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                                    }`}>
                                                    {item.clasificacion}
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-1">
                                            <InventoryCardActions
                                                sku={item.sku}
                                                nombre={item.nombre}
                                                valor={item.valor}
                                                imagen={item.fotos.length > 0 ? item.fotos[0] : undefined}
                                                marca={item.marca || undefined}
                                                talla={item.hasSizes && item.variants.length === 1 ? item.variants[0].talla : undefined}
                                                stock={
                                                    item.hasSizes && item.variants.length === 1
                                                        ? item.variants[0].stock        // Single talla → use variant stock
                                                        : !item.hasSizes
                                                            ? item.totalStock            // No talla → use totalStock
                                                            : undefined                  // Multi-size → handled via variants prop
                                                }
                                                variants={item.hasSizes && item.variants.length > 1 ? item.variants.map(v => ({ talla: v.talla, stock: v.stock, rop: v.rop })) : undefined}
                                                totalStock={item.hasSizes && item.variants.length > 1 ? item.totalStock : undefined}
                                                maxRop={item.hasSizes && item.variants.length > 1 ? item.maxRop : undefined}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Package className="w-16 h-16 text-slate-800 mb-4" />
                        <h3 className="text-lg font-medium text-slate-300">No se encontraron ítems</h3>
                        <p>Intenta ajustar tu búsqueda o filtros.</p>
                    </div>
                )}
            </div>
        </main>
    );
}


