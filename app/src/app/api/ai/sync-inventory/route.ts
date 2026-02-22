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

        // 2. Transform items to match Supabase schema
        const rows = items.map((item) => ({
            sku: item.sku,
            name: item.nombre,
            category: item.categoria || null,
            brand: item.marca || null,
            talla: item.talla || null,
            image_url: item.foto || null,
            stock_current: item.stock || 0,
            stock_reserved: item.reservado || 0,
            shelf_number: item.estante_nro || null,
            shelf_level: item.estante_nivel || null,
            observation: item.observacion || null,
            general_description: item.descripcion_general || null,
            usage_application: item.uso_aplicacion || null,
            value_clp: item.valor_aprox_clp || null,
            value_spex: item.valor_confirmado_spex || null,
            value_final: item.valor || null,
            classification: item.clasificacion || null,
            rop: item.rop || null,
            safety_stock: item.safety_stock || null,
        }));

        // 3. Call RPC function to atomically truncate + insert
        const { data: insertedCount, error: rpcError } = await supabase.rpc(
            "sync_inventory",
            { items: rows }
        );

        if (rpcError) {
            console.error("[Sync] RPC Error:", rpcError);
            return NextResponse.json(
                { error: `Error al sincronizar: ${rpcError.message}` },
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

        const count = insertedCount || items.length;
        console.log(`[Sync] Successfully synced ${count} items`);

        return NextResponse.json({
            success: true,
            count,
            message: `${count} ítems sincronizados correctamente`,
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
