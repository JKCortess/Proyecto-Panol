import { createClient } from "@/utils/supabase/server";
import { getUserProfile } from "@/app/profile/actions";
import { redirect } from "next/navigation";
import { History, ArrowRight, Search, Package, Calendar, User, Filter } from "lucide-react";

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

    const { data: records, count, error } = await query;

    if (error) {
        console.error("Error fetching edit history:", error);
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
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
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
                <div className="space-y-4">
                    {groups.map((group) => {
                        const date = new Date(group.createdAt);
                        const formattedDate = date.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
                        const formattedTime = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

                        return (
                            <div key={group.key} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                {/* Card Header */}
                                <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                                        <Package className="w-4 h-4 text-violet-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                            {group.itemName}
                                            {group.talla && <span className="ml-1 text-purple-400 font-mono text-xs">({group.talla})</span>}
                                        </p>
                                        <p className="text-xs font-mono text-slate-400">SKU: {group.sku}</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {group.editedBy}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formattedDate} {formattedTime}
                                        </span>
                                    </div>
                                </div>

                                {/* Changes Table */}
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {group.changes.map((change) => (
                                        <div key={change.id} className="flex items-center gap-3 px-5 py-2.5">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 min-w-[100px] shrink-0">
                                                {change.field_label}
                                            </span>
                                            <span className="text-xs font-mono text-red-400/80 line-through truncate max-w-[200px]" title={change.old_value}>
                                                {change.old_value || "(vacío)"}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="text-xs font-mono text-emerald-400 font-semibold truncate max-w-[200px]" title={change.new_value}>
                                                {change.new_value || "(vacío)"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
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
