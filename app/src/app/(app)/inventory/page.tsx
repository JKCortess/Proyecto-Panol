
import { getInventory, groupItemsByIdentity } from "@/lib/data";
import { getFilterConfig } from "@/app/(app)/admin/filter-config-actions";

// Force dynamic rendering — never serve stale cached pages.
// Google Sheets is the source of truth; every navigation should show fresh data.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import type { GroupedInventoryItem } from "@/lib/data";
import { InventoryControls } from "@/components/inventory/InventoryControls";
import { InventoryActionToolbar } from "@/components/inventory/InventoryActionToolbar";
import { InventoryDeck } from "@/components/inventory/InventoryDeck";
import { InventoryListView } from "@/components/inventory/InventoryListView";
import { Search, Package, FileSpreadsheet } from "lucide-react";
import { getUserProfile } from "@/app/(app)/profile/actions";

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
    tipoComponente?: string;
    filterModelo?: string;
    filterPotencia?: string;
    proveedor?: string;
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SearchParamsProps> }) {
    const params = await searchParams;
    const query = params.q || "";

    // Fetch inventory data, check admin status, and filter config in parallel
    // Cache (60s TTL) prevents excessive API calls. Use "Actualizar Datos" button to force refresh.
    const [allItems, profile, filterConfig] = await Promise.all([
        getInventory(query),
        getUserProfile(),
        getFilterConfig(),
    ]);
    const isAdmin = profile?.role === 'Administrador';

    // Extract unique values for filters
    const categories = Array.from(new Set(allItems.map(i => i.categoria).filter(Boolean))).sort();
    const brands = Array.from(new Set(allItems.map(i => i.marca).filter(Boolean))).sort();
    const estantes = Array.from(new Set(allItems.map(i => i.estante_nro).filter(Boolean))).sort((a, b) => parseInt(a) - parseInt(b));
    const clasificaciones = Array.from(new Set(allItems.map(i => i.clasificacion).filter(Boolean))).sort();
    const niveles = Array.from(new Set(allItems.map(i => i.estante_nivel).filter(Boolean))).sort();
    const tallas = Array.from(new Set(allItems.map(i => i.talla).filter(Boolean))).sort();
    const tiposComponente = Array.from(new Set(allItems.map(i => i.tipo_componente).filter(Boolean))).sort();
    const proveedores = Array.from(new Set(allItems.map(i => i.proveedor).filter(Boolean))).sort();

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

    if (params.tipoComponente) {
        const tipos = params.tipoComponente.split(',');
        items = items.filter(item => item.tipo_componente && tipos.includes(item.tipo_componente));
    }

    if (params.filterModelo) {
        const modeloFilter = params.filterModelo.toLowerCase();
        items = items.filter(item => item.modelo.toLowerCase().includes(modeloFilter));
    }

    if (params.filterPotencia) {
        const potenciaFilter = params.filterPotencia.toLowerCase();
        items = items.filter(item => item.potencia.toLowerCase().includes(potenciaFilter));
    }

    if (params.proveedor) {
        const provs = params.proveedor.split(',');
        items = items.filter(item => item.proveedor && provs.includes(item.proveedor));
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
        if (!value) return "$ -";
        return `$ ${value.toLocaleString("es-CL")}`;
    };

    return (
        <main className="min-h-screen p-6 md:p-8 bg-slate-950 screen-inventory ui-page">
            <div className="space-y-6">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div className="ui-section">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-lg">
                                <Package className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                            </div>
                            <h1 className="ui-title text-2xl">Inventario General</h1>
                        </div>
                        <p className="ui-subtitle">Gestión de stock, ubicaciones en estantes y seguimiento de activos.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="icon-left icon-left-sm text-slate-500 group-focus-within:text-slate-300 transition-colors" />
                            <form action="/inventory" method="GET">
                                <input
                                    name="q"
                                    defaultValue={query}
                                    type="text"
                                    className="block w-full input-with-icon pr-3 py-2.5 border border-slate-800 rounded-lg leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 sm:text-sm transition-all shadow-sm"
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
                        allItems={allItems}
                        filterConfig={filterConfig}
                    />
                </div>

                <div className="mb-6 relative z-20">
                    <InventoryActionToolbar totalItems={viewMode === 'deck' ? groupedItems.length : items.length} isAdmin={isAdmin} />
                </div>


                {/* Conditional View Rendering */}
                {viewMode === "list" ? (
                    /* ======================== LIST VIEW ======================== */
                    <InventoryListView items={items} formatCLP={formatCLP} />
                ) : (
                    /* ======================== DECK VIEW ======================== */
                    <InventoryDeck groupedItems={groupedItems} isAdmin={isAdmin} />
                )}

                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <Package className="w-16 h-16 text-slate-800 mb-4" />
                        <h3 className="text-lg font-medium text-slate-300">No se encontraron ítems</h3>
                        <p>Intenta ajustar tu búsqueda o filtros.</p>
                    </div>
                )}
            </div>
        </main >
    );
}


