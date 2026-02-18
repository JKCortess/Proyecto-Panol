
import { getSheets } from "./google";
import { randomUUID } from "crypto";

const SPREADSHEET_ID = process.env.PANOL_DB_SPREADSHEET_ID;

interface UpdateData {
    range: string;
    values: any[][];
}

export async function syncStockToSheets(
    items: { sku: string; quantity: number; talla?: string }[],
    userId: string,
    requestId: string,
    deliveryDate: string
) {
    if (!SPREADSHEET_ID) {
        console.error("PANOL_DB_SPREADSHEET_ID not set");
        return { error: "Google Sheet ID not configured" };
    }

    const sheets = await getSheets();

    try {
        // 1. Fetch current stock and SKU mapping
        // Reading A (SKU) through G (Stock_Actual)
        // Columns: A=SKU, B=Nombre, C=Categoría, D=Marca, E=Talla, F=Link_Foto, G=Stock_Actual
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "ITEMS!A2:G",
        });

        const rows = response.data.values;
        if (!rows) return { error: "No items found in Sheets" };

        // Map SKU::Talla (composite key) to { rowIndex, currentStock }
        // Row index in sheet = index in array + 2 (since we started at A2)
        // Items with the same SKU but different tallas are separate rows.
        const inventoryMap = new Map<string, { rowIndex: number; currentStock: number }>();

        rows.forEach((row, index) => {
            let sku = row[0]?.toString().trim();
            const name = row[1]?.toString().trim() || "";
            const talla = row[4]?.toString().trim() || ""; // Column E = Talla

            if (!sku && name) {
                // Determine SKU from Name hash (Same logic as data.ts)
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                    const char = name.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // Convert to 32bit integer
                }
                sku = `GEN-${Math.abs(hash).toString(16).toUpperCase()}`;
            }

            const stock = parseInt(row[6] || "0", 10); // Column G = Stock_Actual (index 6)
            if (sku) {
                // Use composite key SKU::Talla for items with sizes
                const key = talla ? `${sku}::${talla}` : sku;
                inventoryMap.set(key, { rowIndex: index + 2, currentStock: stock });
            }
        });

        const updates: UpdateData[] = [];
        const movements: any[][] = [];

        for (const item of items) {
            // Build composite key matching the inventoryMap
            const lookupKey = item.talla ? `${item.sku}::${item.talla}` : item.sku;
            const itemData = inventoryMap.get(lookupKey);
            if (!itemData) {
                // Fallback: try SKU-only if composite key not found
                const fallback = !item.talla ? null : inventoryMap.get(item.sku);
                if (!fallback) {
                    console.warn(`SKU ${item.sku} (talla: ${item.talla || 'N/A'}) not found in Google Sheets`);
                    continue;
                }
                // Use fallback only if there's a single row for that SKU
                console.warn(`Using SKU-only fallback for ${item.sku} talla ${item.talla}`);
            }

            // Calculate new stock
            // We are DELIVERING, so we subtract
            const resolvedData = itemData || inventoryMap.get(item.sku)!;
            const newStock = resolvedData.currentStock - item.quantity;

            // Prepare Stock Update (Column G = Stock_Actual)
            updates.push({
                range: `ITEMS!G${resolvedData.rowIndex}`,
                values: [[newStock]],
            });

            // Prepare Movement Log (MOVIMIENTOS)
            // Columns: ID_Transaccion, Fecha, Tipo, SKU, Cantidad, Usuario_ID, OT, ID_Pedido, Estado
            movements.push([
                randomUUID(),           // ID_Transaccion
                deliveryDate,           // Fecha
                'Salida',               // Tipo (Delivery is an exit)
                item.sku,               // SKU
                item.quantity,          // Cantidad (Positive in log, usually? Or negative? Gemind description says "Cantidad: int". Usually absolute value associated with Type)
                // "Stock_Actual SOLO se modifica en... Entrega confirmed -> -= cantidad"
                // Let's assume quantity is absolute and Type dictates sign.
                userId,                 // Usuario_ID
                '',                     // Orden_Trabajo_ID (Not passed in simple delivery currently?)
                requestId,              // ID_Pedido
                'Confirmado'            // Estado_Movimiento
            ]);
        }

        // 2. Execute Batch Update for Inventory
        if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    valueInputOption: "USER_ENTERED",
                    data: updates,
                },
            });
        }

        // 3. Append Movements
        if (movements.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: "MOVIMIENTOS!A2",
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: movements,
                },
            });
        }

        return { success: true };

    } catch (error) {
        console.error("Error syncing to Google Sheets:", error);
        return { error: error instanceof Error ? error.message : "Unknown Sheets Error" };
    }
}

export async function restoreStockInSheets(
    items: { sku: string; quantity: number; talla?: string }[],
    userId: string,
    requestId: string,
    restorationDate: string
) {
    if (!SPREADSHEET_ID) {
        console.error("PANOL_DB_SPREADSHEET_ID not set");
        return { error: "Google Sheet ID not configured" };
    }

    const sheets = await getSheets();

    try {
        // 1. Fetch current stock and SKU mapping
        // Columns: A=SKU, B=Nombre, C=Categoría, D=Marca, E=Talla, F=Link_Foto, G=Stock_Actual
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "ITEMS!A2:G",
        });

        const rows = response.data.values;
        if (!rows) return { error: "No items found in Sheets" };

        const inventoryMap = new Map<string, { rowIndex: number; currentStock: number }>();

        rows.forEach((row, index) => {
            let sku = row[0]?.toString().trim();
            const name = row[1]?.toString().trim() || "";
            const talla = row[4]?.toString().trim() || ""; // Column E = Talla
            // Fallback generation logic
            if (!sku && name) {
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                    const char = name.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                sku = `GEN-${Math.abs(hash).toString(16).toUpperCase()}`;
            }

            const stock = parseInt(row[6] || "0", 10); // Column G = Stock_Actual (index 6)
            if (sku) {
                // Use composite key SKU::Talla for items with sizes
                const key = talla ? `${sku}::${talla}` : sku;
                inventoryMap.set(key, { rowIndex: index + 2, currentStock: stock });
            }
        });

        const updates: UpdateData[] = [];
        const movements: any[][] = [];

        for (const item of items) {
            // Build composite key matching the inventoryMap
            const lookupKey = item.talla ? `${item.sku}::${item.talla}` : item.sku;
            const itemData = inventoryMap.get(lookupKey) || inventoryMap.get(item.sku);
            if (!itemData) {
                console.warn(`SKU ${item.sku} (talla: ${item.talla || 'N/A'}) not found in Google Sheets`);
                continue;
            }

            // Calculate new stock
            // We are RESTORING, so we add
            const newStock = itemData.currentStock + item.quantity;

            // Prepare Stock Update (Column G = Stock_Actual)
            updates.push({
                range: `ITEMS!G${itemData.rowIndex}`,
                values: [[newStock]],
            });

            // Prepare Movement Log (MOVIMIENTOS)
            movements.push([
                randomUUID(),           // ID_Transaccion
                restorationDate,        // Fecha
                'Entrada',              // Tipo (Restoration is an entry)
                item.sku,               // SKU
                item.quantity,          // Cantidad
                userId,                 // Usuario_ID
                '',                     // Orden_Trabajo_ID
                requestId,              // ID_Pedido
                'Anulada/Restaurada'    // Estado_Movimiento
            ]);
        }

        // 2. Execute Batch Update for Inventory
        if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    valueInputOption: "USER_ENTERED",
                    data: updates,
                },
            });
        }

        // 3. Append Movements
        if (movements.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: "MOVIMIENTOS!A2",
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: movements,
                },
            });
        }

        return { success: true };

    } catch (error) {
        console.error("Error restoring stock to Google Sheets:", error);
        return { error: error instanceof Error ? error.message : "Unknown Sheets Error" };
    }
}

/**
 * Add stock (Entrada) directly in Google Sheets.
 * Used by the Stock Manager module for manual stock entries.
 */
export async function addStockInSheets(
    items: { sku: string; name: string; quantity: number; talla?: string; notes?: string }[],
    userId: string,
    generalNotes?: string
) {
    if (!SPREADSHEET_ID) {
        console.error("PANOL_DB_SPREADSHEET_ID not set");
        return { error: "Google Sheet ID not configured" };
    }

    const sheets = await getSheets();

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "ITEMS!A2:G",
        });

        const rows = response.data.values;
        if (!rows) return { error: "No items found in Sheets" };

        const inventoryMap = new Map<string, { rowIndex: number; currentStock: number }>();

        rows.forEach((row, index) => {
            let sku = row[0]?.toString().trim();
            const name = row[1]?.toString().trim() || "";
            const talla = row[4]?.toString().trim() || "";

            if (!sku && name) {
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                    const char = name.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                sku = `GEN-${Math.abs(hash).toString(16).toUpperCase()}`;
            }

            const stock = parseInt(row[6] || "0", 10);
            if (sku) {
                const key = talla ? `${sku}::${talla}` : sku;
                inventoryMap.set(key, { rowIndex: index + 2, currentStock: stock });
            }
        });

        const updates: UpdateData[] = [];
        const movements: any[][] = [];
        const results: { sku: string; success: boolean; error?: string }[] = [];

        for (const item of items) {
            const lookupKey = item.talla ? `${item.sku}::${item.talla}` : item.sku;
            const itemData = inventoryMap.get(lookupKey) || inventoryMap.get(item.sku);

            if (!itemData) {
                console.warn(`SKU ${item.sku} (talla: ${item.talla || 'N/A'}) not found in Google Sheets for stock entry`);
                results.push({ sku: item.sku, success: false, error: 'SKU no encontrado en Google Sheets' });
                continue;
            }

            // ENTRY: add to current stock
            const newStock = itemData.currentStock + item.quantity;

            updates.push({
                range: `ITEMS!G${itemData.rowIndex}`,
                values: [[newStock]],
            });

            movements.push([
                randomUUID(),
                new Date().toISOString(),
                'Entrada',
                item.sku,
                item.quantity,
                userId,
                '',
                '',
                'Confirmado'
            ]);

            results.push({ sku: item.sku, success: true });
        }

        if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    valueInputOption: "USER_ENTERED",
                    data: updates,
                },
            });
        }

        if (movements.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: "MOVIMIENTOS!A2",
                valueInputOption: "USER_ENTERED",
                requestBody: { values: movements },
            });
        }

        return { success: true, details: results };

    } catch (error) {
        console.error("Error adding stock to Google Sheets:", error);
        return { error: error instanceof Error ? error.message : "Unknown Sheets Error" };
    }
}

/**
 * Remove stock (Salida) directly in Google Sheets.
 * Used by the Stock Manager module for manual stock exits.
 */
export async function removeStockInSheets(
    items: { sku: string; name: string; quantity: number; talla?: string; reason?: string }[],
    userId: string,
    recipientName: string,
    recipientArea: string,
    exitDate: string,
    generalNotes?: string
) {
    if (!SPREADSHEET_ID) {
        console.error("PANOL_DB_SPREADSHEET_ID not set");
        return { error: "Google Sheet ID not configured" };
    }

    const sheets = await getSheets();

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "ITEMS!A2:G",
        });

        const rows = response.data.values;
        if (!rows) return { error: "No items found in Sheets" };

        const inventoryMap = new Map<string, { rowIndex: number; currentStock: number }>();

        rows.forEach((row, index) => {
            let sku = row[0]?.toString().trim();
            const name = row[1]?.toString().trim() || "";
            const talla = row[4]?.toString().trim() || "";

            if (!sku && name) {
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                    const char = name.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                sku = `GEN-${Math.abs(hash).toString(16).toUpperCase()}`;
            }

            const stock = parseInt(row[6] || "0", 10);
            if (sku) {
                const key = talla ? `${sku}::${talla}` : sku;
                inventoryMap.set(key, { rowIndex: index + 2, currentStock: stock });
            }
        });

        const updates: UpdateData[] = [];
        const movements: any[][] = [];
        const results: { sku: string; success: boolean; error?: string }[] = [];

        for (const item of items) {
            const lookupKey = item.talla ? `${item.sku}::${item.talla}` : item.sku;
            const itemData = inventoryMap.get(lookupKey) || inventoryMap.get(item.sku);

            if (!itemData) {
                console.warn(`SKU ${item.sku} (talla: ${item.talla || 'N/A'}) not found in Google Sheets for stock exit`);
                results.push({ sku: item.sku, success: false, error: 'SKU no encontrado en Google Sheets' });
                continue;
            }

            // EXIT: subtract from current stock (floor at 0)
            const newStock = Math.max(0, itemData.currentStock - item.quantity);

            updates.push({
                range: `ITEMS!G${itemData.rowIndex}`,
                values: [[newStock]],
            });

            const noteText = [
                `Salida: ${item.name} x${item.quantity}`,
                `Dest: ${recipientName} (${recipientArea})`,
                item.reason ? `Motivo: ${item.reason}` : null,
                generalNotes || null,
            ].filter(Boolean).join(' | ');

            movements.push([
                randomUUID(),
                exitDate,
                'Salida',
                item.sku,
                item.quantity,
                userId,
                '',
                '',
                'Confirmado'
            ]);

            results.push({ sku: item.sku, success: true });
        }

        if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    valueInputOption: "USER_ENTERED",
                    data: updates,
                },
            });
        }

        if (movements.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: "MOVIMIENTOS!A2",
                valueInputOption: "USER_ENTERED",
                requestBody: { values: movements },
            });
        }

        return { success: true, details: results };

    } catch (error) {
        console.error("Error removing stock from Google Sheets:", error);
        return { error: error instanceof Error ? error.message : "Unknown Sheets Error" };
    }
}
