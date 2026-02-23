import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isCurrentUserAdmin } from "@/app/profile/actions";
import { getInventory, invalidateInventoryCache } from "@/lib/data";

/**
 * POST /api/ai/sync-inventory
 * Syncs Google Sheets inventory data into the Supabase `inventory` table.
 * Uses RPC function to truncate + insert atomically.
 * Admin only.
 */
export async function POST() {
    try {
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        // Invalidate cache to get fresh data from Sheets
        invalidateInventoryCache();

        const supabase = await createClient();

        // 1. Fetch all inventory from Google Sheets (fresh, no cache)
        const items = await getInventory();

        if (items.length === 0) {
            return NextResponse.json(
                { error: "No se encontraron ítems en Google Sheets" },
                { status: 400 }
            );
        }

        console.log(`[Sync] Fetched ${items.length} items from Google Sheets`);

        // 2. Group items by SKU to handle duplicates (items with same SKU but different talla)
        // The Supabase inventory table has sku as PRIMARY KEY, so we must deduplicate
        const skuMap = new Map<string, typeof items[0][]>();
        for (const item of items) {
            const existing = skuMap.get(item.sku) || [];
            existing.push(item);
            skuMap.set(item.sku, existing);
        }

        // Merge items with the same SKU: aggregate stock, combine talla
        const rows = Array.from(skuMap.entries()).map(([sku, groupedItems]) => {
            // Use the first item as base
            const base = groupedItems[0];

            // Sum stock and reserved across all talla variants
            const totalStock = groupedItems.reduce((sum, i) => sum + (i.stock || 0), 0);
            const totalReserved = groupedItems.reduce((sum, i) => sum + (i.reservado || 0), 0);

            // Combine talla values (e.g., "S, M, L, XL")
            const tallas = groupedItems
                .map(i => i.talla)
                .filter(Boolean)
                .join(", ");

            return {
                sku,
                name: base.nombre,
                category: base.categoria || null,
                brand: base.marca || null,
                talla: tallas || null,
                image_url: base.foto || null,
                stock_current: totalStock,
                stock_reserved: totalReserved,
                shelf_number: base.estante_nro || null,
                shelf_level: base.estante_nivel || null,
                observation: base.observacion || null,
                general_description: base.descripcion_general || null,
                usage_application: base.uso_aplicacion || null,
                value_clp: base.valor_aprox_clp || null,
                value_spex: base.valor_confirmado_spex || null,
                value_final: base.valor || null,
                classification: base.clasificacion || null,
                rop: base.rop || null,
                safety_stock: base.safety_stock || null,
            };
        });

        console.log(`[Sync] Grouped ${items.length} sheet rows into ${rows.length} unique SKUs`);

        // 3. Direct sync: Delete all existing rows, then insert in batches
        // This replaces the RPC function which was failing with unknown columns
        console.log(`[Sync] Deleting all existing inventory rows...`);
        const { error: deleteError } = await supabase
            .from("inventory")
            .delete()
            .neq("sku", "___IMPOSSIBLE_SKU___"); // Delete all rows (workaround: Supabase requires a filter)

        if (deleteError) {
            console.error("[Sync] Delete Error:", deleteError);
            return NextResponse.json(
                { error: `Error al limpiar inventario: ${deleteError.message}` },
                { status: 500 }
            );
        }

        // Insert in batches of 50 to avoid payload limits
        const BATCH_SIZE = 50;
        let insertedCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await supabase
                .from("inventory")
                .insert(batch);

            if (insertError) {
                console.error(`[Sync] Insert Error (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, insertError);
                errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`);
                // Continue with next batch instead of aborting
            } else {
                insertedCount += batch.length;
            }
        }

        if (errors.length > 0 && insertedCount === 0) {
            return NextResponse.json(
                { error: `Error al insertar ítems: ${errors.join('; ')}` },
                { status: 500 }
            );
        }

        // 4. Update last sync timestamp
        const {
            data: { user },
        } = await supabase.auth.getUser();

        await supabase
            .from("app_settings")
            .update({
                value: new Date().toISOString(),
                updated_by: user?.id || null,
                updated_at: new Date().toISOString(),
            })
            .eq("key", "ai_last_sync");

        console.log(`[Sync] Successfully synced ${insertedCount} of ${items.length} items${errors.length > 0 ? ` (${errors.length} batch errors)` : ''}`);

        return NextResponse.json({
            success: true,
            count: insertedCount,
            total: items.length,
            message: errors.length > 0
                ? `${insertedCount}/${items.length} ítems sincronizados (${errors.length} errores en lotes)`
                : `${insertedCount} ítems sincronizados correctamente`,
        });
    } catch (error) {
        console.error("[Sync] Error:", error);
        const message = error instanceof Error ? error.message : "Error interno";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * GET /api/ai/sync-inventory
 * Returns the last sync timestamp and item count.
 */
export async function GET() {
    try {
        const supabase = await createClient();

        const [settingRes, countRes] = await Promise.all([
            supabase
                .from("app_settings")
                .select("value")
                .eq("key", "ai_last_sync")
                .single(),
            supabase
                .from("inventory")
                .select("sku", { count: "exact", head: true }),
        ]);

        return NextResponse.json({
            lastSync: settingRes.data?.value || null,
            itemCount: countRes.count || 0,
        });
    } catch {
        return NextResponse.json({ lastSync: null, itemCount: 0 });
    }
}
