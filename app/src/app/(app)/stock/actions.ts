'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getInventory } from '@/lib/data';
import { addStockInSheets, removeStockInSheets } from '@/lib/sheets-mutations';
import { invalidateInventoryCache } from '@/lib/data';

// ===================== TYPES =====================
export type StockEntryItem = {
    sku: string;
    name: string;
    quantity: number;
    notes?: string;
    category?: string;
    brand?: string;
    image_url?: string;
    shelf_number?: string;
    shelf_level?: string;
    value_clp?: number;
    talla?: string;
};

export type StockExitItem = {
    sku: string;
    name: string;
    quantity: number;
    reason?: string;
    talla?: string;
};

// ===================== ENTRADA DE STOCK =====================
export async function addStockEntry(
    items: StockEntryItem[],
    generalNotes?: string
) {
    const supabase = await createClient();

    // Get admin info
    const userResult = await supabase.auth.getUser();
    const adminId = userResult.data.user?.id;
    if (!adminId) return { error: 'No autenticado' };

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', adminId)
        .single();

    if (profile?.role !== 'Administrador') {
        return { error: 'Solo administradores pueden gestionar stock' };
    }

    // 1. Update stock in Google Sheets (Source of Truth)
    const sheetsResult = await addStockInSheets(
        items.map(i => ({
            sku: i.sku,
            name: i.name,
            quantity: i.quantity,
            talla: i.talla,
            notes: i.notes,
        })),
        adminId,
        generalNotes
    );

    if (sheetsResult?.error) {
        console.error("Stock Entry Error (Sheets):", sheetsResult.error);
        return { error: `Error actualizando Google Sheets: ${sheetsResult.error}` };
    }

    // 2. Log movements in Supabase (audit trail)
    const results: { sku: string; success: boolean; error?: string }[] = [];

    for (const item of items) {
        try {
            // Ensure SKU exists in inventory table (skeleton for FK constraint)
            await supabase
                .from('inventory')
                .upsert(
                    {
                        sku: item.sku,
                        name: item.name,
                        category: item.category || null,
                        brand: item.brand || null,
                        image_url: item.image_url || null,
                        stock_current: 0,
                        stock_reserved: 0,
                        shelf_number: item.shelf_number || null,
                        shelf_level: item.shelf_level || null,
                        value_clp: item.value_clp || null,
                    },
                    { onConflict: 'sku', ignoreDuplicates: true }
                );

            // Log movement in Supabase
            const { error: movError } = await supabase
                .from('stock_movements')
                .insert({
                    sku: item.sku,
                    quantity_change: item.quantity,
                    movement_type: 'Entrada',
                    admin_id: adminId,
                    notes: item.notes || generalNotes || `Entrada de stock: ${item.name} x${item.quantity}`,
                });

            if (movError) throw movError;

            results.push({ sku: item.sku, success: true });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            results.push({ sku: item.sku, success: false, error: errorMessage });
        }
    }

    // 3. Invalidate inventory cache so next page load fetches fresh data from Sheets
    invalidateInventoryCache();

    const allSuccess = results.every(r => r.success);
    const successCount = results.filter(r => r.success).length;

    revalidatePath('/stock');
    revalidatePath('/inventory');
    revalidatePath('/');

    return {
        success: allSuccess,
        message: allSuccess
            ? `✅ ${successCount} ítem(es) ingresado(s) correctamente`
            : `⚠️ ${successCount}/${results.length} ítem(es) procesado(s)`,
        details: results,
        adminName: profile?.full_name || 'Administrador',
    };
}

// ===================== SALIDA DE STOCK =====================
export async function processStockExit(
    items: StockExitItem[],
    exitDate: string,
    recipientName: string,
    recipientArea: string,
    generalNotes?: string
) {
    const supabase = await createClient();

    // Get admin info
    const userResult = await supabase.auth.getUser();
    const adminId = userResult.data.user?.id;
    if (!adminId) return { error: 'No autenticado' };

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', adminId)
        .single();

    if (profile?.role !== 'Administrador') {
        return { error: 'Solo administradores pueden gestionar stock' };
    }

    // 1. Update stock in Google Sheets (Source of Truth)
    const sheetsResult = await removeStockInSheets(
        items.map(i => ({
            sku: i.sku,
            name: i.name,
            quantity: i.quantity,
            talla: i.talla,
            reason: i.reason,
        })),
        adminId,
        recipientName,
        recipientArea,
        exitDate,
        generalNotes
    );

    if (sheetsResult?.error) {
        console.error("Stock Exit Error (Sheets):", sheetsResult.error);
        return { error: `Error actualizando Google Sheets: ${sheetsResult.error}` };
    }

    // 2. Log movements in Supabase (audit trail)
    const results: { sku: string; success: boolean; error?: string }[] = [];

    for (const item of items) {
        try {
            // Ensure SKU exists in inventory table (skeleton for FK constraint)
            await supabase
                .from('inventory')
                .upsert(
                    { sku: item.sku, name: item.name, stock_current: 0, stock_reserved: 0 },
                    { onConflict: 'sku', ignoreDuplicates: true }
                );

            // LOG movement
            const noteText = [
                `Salida de stock: ${item.name} x${item.quantity}`,
                `Destinatario: ${recipientName} (${recipientArea})`,
                `Fecha salida: ${new Date(exitDate).toLocaleDateString('es-CL')}`,
                item.reason ? `Motivo: ${item.reason}` : null,
                generalNotes ? `Notas: ${generalNotes}` : null,
            ].filter(Boolean).join(' | ');

            const { error: movError } = await supabase
                .from('stock_movements')
                .insert({
                    sku: item.sku,
                    quantity_change: -item.quantity,
                    movement_type: 'Salida',
                    admin_id: adminId,
                    notes: noteText,
                });

            if (movError) throw movError;

            results.push({ sku: item.sku, success: true });
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            results.push({ sku: item.sku, success: false, error: errorMessage });
        }
    }

    // 3. Invalidate inventory cache so next page load fetches fresh data from Sheets
    invalidateInventoryCache();

    const allSuccess = results.every(r => r.success);
    const successCount = results.filter(r => r.success).length;

    revalidatePath('/stock');
    revalidatePath('/inventory');
    revalidatePath('/');

    return {
        success: allSuccess,
        message: allSuccess
            ? `✅ ${successCount} ítem(es) retirado(s) correctamente`
            : `⚠️ ${successCount}/${results.length} ítem(es) procesado(s)`,
        details: results,
        adminName: profile?.full_name || 'Administrador',
    };
}

// ===================== GET RECENT MOVEMENTS =====================
export async function getRecentStockMovements(limit: number = 20) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('stock_movements')
        .select('*, admin:user_profiles!stock_movements_admin_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching stock movements:', error);
        return [];
    }

    return data || [];
}

// ===================== SEARCH GOOGLE SHEETS INVENTORY =====================
export async function searchGSInventory(query: string) {
    if (!query || query.length < 2) return [];

    try {
        const allItems = await getInventory(query);
        return allItems.slice(0, 10).map(item => ({
            sku: item.sku,
            nombre: item.nombre,
            categoria: item.categoria,
            marca: item.marca,
            foto: item.foto,
            stock: item.stock,
            estante_nro: item.estante_nro,
            estante_nivel: item.estante_nivel,
            valor: item.valor,
            valor_aprox_clp: item.valor_aprox_clp,
        }));
    } catch (error) {
        console.error('Error searching GS inventory:', error);
        return [];
    }
}
