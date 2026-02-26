'use server';

import { getSheets } from "@/lib/google";
import { invalidateInventoryCache } from "@/lib/data";
import { isCurrentUserAdmin, getUserProfile } from "@/app/profile/actions";
import { createClient } from "@/utils/supabase/server";

const SPREADSHEET_ID = process.env.PANOL_DB_SPREADSHEET_ID;

/**
 * Fields that an admin can update on an inventory item.
 * Each field maps to a specific column in the Google Sheets ITEMS tab.
 */
export interface InventoryItemUpdate {
    nombre?: string;          // Column B, index 1
    sku_new?: string;         // Column A, index 0 (new SKU value)
    tipo_componente?: string; // Column C, index 2
    stock?: number;
    rop?: number;
    safety_stock?: number;    // Column W, index 22
    valor_aprox_clp?: number; // Valor aprox CLP (Column Q, index 16)
    valor_spex?: number;      // Valor confirmado SPEX (Column R, index 17)
    estante_nro?: string;     // Column L, index 11
    estante_nivel?: string;   // Column M, index 12
    descripcion_general?: string; // Column O, index 14
    observacion?: string;     // Column N, index 13
    categoria?: string;       // Column D, index 3
    marca?: string;           // Column E, index 4
    proveedor?: string;       // Column X, index 23
}

// Maps field names to their Google Sheets column letters
const FIELD_COLUMN_MAP: Record<keyof InventoryItemUpdate, string> = {
    nombre: 'B',              // index 1
    sku_new: 'A',             // index 0
    tipo_componente: 'C',     // index 2
    stock: 'J',               // index 9
    rop: 'V',                 // index 21
    safety_stock: 'W',        // index 22
    valor_aprox_clp: 'Q',     // index 16
    valor_spex: 'R',          // index 17
    estante_nro: 'L',         // index 11
    estante_nivel: 'M',       // index 12
    descripcion_general: 'O', // index 14
    observacion: 'N',         // index 13
    categoria: 'D',           // index 3
    marca: 'E',               // index 4
    proveedor: 'X',           // index 23
};

// Human-readable labels for audit log
const FIELD_LABELS: Record<string, string> = {
    nombre: "Nombre",
    sku_new: "SKU",
    tipo_componente: "Tipo Componente",
    stock: "Stock",
    rop: "Mín. (ROP)",
    safety_stock: "Safety Stock",
    valor_aprox_clp: "Valor aprox (CLP)",
    valor_spex: "Valor SPEX",
    estante_nro: "Estante Nro",
    estante_nivel: "Nivel Estante",
    descripcion_general: "Descripción",
    observacion: "Observación",
    categoria: "Categoría",
    marca: "Marca",
    proveedor: "Proveedor",
};

/**
 * Column index mapping for reading the current value of each field from the full row.
 * Used to capture old values for the audit log.
 */
const FIELD_ROW_INDEX: Record<keyof InventoryItemUpdate, number> = {
    nombre: 1,
    sku_new: 0,
    tipo_componente: 2,
    stock: 9,
    rop: 21,
    safety_stock: 22,
    valor_aprox_clp: 16,
    valor_spex: 17,
    estante_nro: 11,
    estante_nivel: 12,
    descripcion_general: 14,
    observacion: 13,
    categoria: 3,
    marca: 4,
    proveedor: 23,
};

/**
 * Updates an inventory item's fields in Google Sheets and logs changes to Supabase.
 * Admin-only. Finds the row by SKU + optional talla, then patches only the changed columns.
 */
export async function updateInventoryItem(
    sku: string,
    updates: InventoryItemUpdate,
    talla?: string
): Promise<{ success?: boolean; error?: string }> {
    // 1. Auth check
    const admin = await isCurrentUserAdmin();
    if (!admin) {
        return { error: 'No autorizado. Solo administradores pueden editar ítems.' };
    }

    if (!SPREADSHEET_ID) {
        return { error: 'Google Sheet ID no configurado.' };
    }

    // 2. Filter out undefined fields
    const fieldsToUpdate = Object.entries(updates).filter(
        ([, value]) => value !== undefined && value !== null
    ) as [keyof InventoryItemUpdate, string | number][];

    if (fieldsToUpdate.length === 0) {
        return { error: 'No se proporcionaron campos para actualizar.' };
    }

    try {
        const sheets = await getSheets();

        // 3. Read FULL row data to capture old values for audit
        // We need A to Y (25 cols) to get old values for all editable fields
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "ITEMS!A2:X",
        });

        const rows = response.data.values;
        if (!rows) {
            return { error: 'No se encontraron ítems en la hoja.' };
        }

        // Find target row
        let targetRowIndex = -1;
        let targetRow: string[] = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            let rowSku = (row[0] || '').toString().trim();
            const rowName = (row[1] || '').toString().trim();
            const rowTalla = (row[7] || '').toString().trim();

            // Generate fallback SKU if missing (same logic as data.ts)
            if (!rowSku && rowName) {
                let hash = 0;
                for (let j = 0; j < rowName.length; j++) {
                    const char = rowName.charCodeAt(j);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                rowSku = `GEN-${Math.abs(hash).toString(16).toUpperCase()}`;
            }

            if (rowSku === sku) {
                if (talla) {
                    if (rowTalla === talla) {
                        targetRowIndex = i + 2;
                        targetRow = row;
                        break;
                    }
                } else {
                    targetRowIndex = i + 2;
                    targetRow = row;
                    break;
                }
            }
        }

        if (targetRowIndex === -1) {
            return { error: `SKU "${sku}"${talla ? ` (talla: ${talla})` : ''} no encontrado en Google Sheets.` };
        }

        // 4. Capture old values and build audit entries
        const auditEntries: {
            field_name: string;
            field_label: string;
            old_value: string;
            new_value: string;
        }[] = [];

        for (const [field, newValue] of fieldsToUpdate) {
            const colIndex = FIELD_ROW_INDEX[field];
            const oldValue = (targetRow[colIndex] || '').toString();
            auditEntries.push({
                field_name: field,
                field_label: FIELD_LABELS[field] || field,
                old_value: oldValue,
                new_value: String(newValue),
            });
        }

        // 5. Build batch update data
        const updateData = fieldsToUpdate.map(([field, value]) => ({
            range: `ITEMS!${FIELD_COLUMN_MAP[field]}${targetRowIndex}`,
            values: [[value]],
        }));

        // 6. Execute batch update
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: 'USER_ENTERED',
                data: updateData,
            },
        });

        // 7. Log audit to Supabase
        try {
            const profile = await getUserProfile();
            const supabase = await createClient();
            const itemName = (targetRow[1] || '').toString().trim();

            await supabase.from('inventory_edit_history').insert(
                auditEntries.map((entry) => ({
                    sku,
                    item_name: updates.nombre && entry.field_name === 'nombre' ? updates.nombre : itemName,
                    talla: talla || null,
                    field_name: entry.field_name,
                    field_label: entry.field_label,
                    old_value: entry.old_value,
                    new_value: entry.new_value,
                    edited_by: profile?.id || 'unknown',
                    edited_by_name: profile?.full_name || profile?.email || 'Administrador',
                }))
            );
        } catch (auditError) {
            // Don't fail the main operation if audit logging fails
            console.error('Error logging edit to Supabase:', auditError);
        }

        // 8. Invalidate cache
        invalidateInventoryCache();

        return { success: true };
    } catch (error) {
        console.error('Error updating inventory item in Google Sheets:', error);
        return { error: error instanceof Error ? error.message : 'Error desconocido al actualizar.' };
    }
}
