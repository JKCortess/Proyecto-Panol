import { createClient } from "@/utils/supabase/server";
import { getUserProfile } from "@/app/profile/actions";
import { getInventory } from "@/lib/data";
import { redirect } from "next/navigation";
import { History, Search, Filter } from "lucide-react";
import { EditHistoryCard } from "@/components/admin/EditHistoryCard";
import DateGroupedEditHistory from "@/components/admin/DateGroupedEditHistory";

interface EditRecord {
    id: string;
    created_at: string;
    sku: string;
    item_name: string;
    talla: string | null;
    field_name: string;
    field_label: string;
    old_value: string;
    new_value: string;
    edited_by: string;
    edited_by_name: string;
}

interface SearchParamsProps {
    search?: string;
    page?: string;
}

const PAGE_SIZE = 50;

export default async function EditHistoryPage({ searchParams }: { searchParams: Promise<SearchParamsProps> }) {
    const profile = await getUserProfile();
    if (!profile || profile.role !== "Administrador") {
        redirect("/");
    }

    const params = await searchParams;
    const search = params.search || "";
    const page = Math.max(1, parseInt(params.page || "1"));

    const supabase = await createClient();

    // Build query
    let query = supabase
        .from("inventory_edit_history")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

    if (search) {
        query = query.or(`sku.ilike.%${search}%,item_name.ilike.%${search}%,edited_by_name.ilike.%${search}%`);
    }

    // Pagination
    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    // Fetch edit history and inventory (for images) in parallel
    const [{ data: records, count, error }, inventoryItems] = await Promise.all([
        query,
        getInventory(),
    ]);

    if (error) {
        console.error("Error fetching edit history:", error);
    }

    // Build SKU → first image URL map (plain object for serialization to client)
    const imageMapObj: Record<string, string> = {};
    for (const item of inventoryItems) {
        if (item.fotos.length > 0 && !imageMapObj[item.sku]) {
            imageMapObj[item.sku] = item.fotos[0];
        }
    }

    const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
    const edits = (records || []) as EditRecord[];

    // Group edits by created_at + sku (same edit session)
    const groups: { key: string; sku: string; itemName: string; talla: string | null; editedBy: string; createdAt: string; changes: EditRecord[] }[] = [];
    for (const edit of edits) {
        // Group by same timestamp + SKU (edits done in the same save)
        const timeKey = new Date(edit.created_at).toISOString().slice(0, 19); // precision to the second
        const groupKey = `${timeKey}::${edit.sku}::${edit.talla || ""}`;
        const existing = groups.find((g) => g.key === groupKey);
        if (existing) {
            existing.changes.push(edit);
        } else {
            groups.push({
                key: groupKey,
                sku: edit.sku,
                itemName: edit.item_name,
                talla: edit.talla,
                editedBy: edit.edited_by_name,
                createdAt: edit.created_at,
                changes: [edit],
            });
        }
    }

    return (
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center border border-violet-500/30">
                        <History className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Historial de Ediciones</h1>
                        <p className="text-sm text-slate-500">Registro de cambios realizados al inventario</p>
                    </div>
                </div>
                <div className="sm:ml-auto flex items-center gap-2 text-xs text-slate-500">
                    <Filter className="w-3.5 h-3.5" />
                    <span>{count || 0} cambios registrados</span>
                </div>
            </div>

            {/* Search Bar */}
            <form method="GET" className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        name="search"
                        type="text"
                        defaultValue={search}
                        placeholder="Buscar por SKU, nombre o editor..."
                        className="w-full input-with-icon pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                    />
                </div>
            </form>

            {/* Records */}
            {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <History className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-lg font-medium text-slate-400">No se encontraron registros</h3>
                    <p className="text-sm mt-1">Los cambios que se realicen al inventario aparecerán aquí.</p>
                </div>
            ) : (
                <DateGroupedEditHistory groups={groups} imageMap={imageMapObj} />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                    {page > 1 && (
                        <a href={`/admin/edit-history?page=${page - 1}${search ? `&search=${search}` : ""}`}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Anterior
                        </a>
                    )}
                    <span className="text-sm text-slate-500 font-mono">
                        {page} / {totalPages}
                    </span>
                    {page < totalPages && (
                        <a href={`/admin/edit-history?page=${page + 1}${search ? `&search=${search}` : ""}`}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            Siguiente
                        </a>
                    )}
                </div>
            )}
        </main>
    );
}
