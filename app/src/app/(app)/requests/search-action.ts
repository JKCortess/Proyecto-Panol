'use server'

import { getInventory } from '@/lib/data';

export type InventoryItem = {
    sku: string;
    nombre: string;
    categoria: string;
    stock: number;
    ubicacion: string;
    valor?: number;
    imagen?: string;
};

export type InventoryDetailItem = {
    sku: string;
    nombre: string;
    categoria: string;
    marca: string;
    talla: string;
    foto: string;
    stock: number;
    reservado: number;
    estante_nro: string;
    estante_nivel: string;
    valor: number;
    valor_aprox_clp: number;
    clasificacion: string;
    descripcion_general: string;
};

export async function searchInventory(query: string): Promise<InventoryItem[]> {
    if (!query || query.length < 2) return [];

    try {
        const allItems = await getInventory(query);
        // Return only relevant fields, limit to 8 results
        return allItems.slice(0, 8).map(item => ({
            sku: item.sku,
            nombre: item.nombre,
            categoria: item.categoria,
            stock: item.stock,
            ubicacion: `E${item.estante_nro} / N${item.estante_nivel}`,
            valor: item.valor,
            imagen: item.foto || undefined,
        }));
    } catch (error) {
        console.error('Error searching inventory:', error);
        return [];
    }
}

/**
 * Fetches inventory details for given SKU+talla pairs.
 * Uses composite key "sku::talla" (or just "sku" if no talla) to avoid
 * items with the same SKU but different sizes overwriting each other.
 */
export async function getInventoryBySKUs(
    skuOrItems: string[] | { sku: string; talla?: string }[]
): Promise<Record<string, InventoryDetailItem>> {
    if (!skuOrItems || skuOrItems.length === 0) return {};

    // Normalize input: accept either string[] (legacy) or {sku,talla}[]
    const requestedItems: { sku: string; talla?: string }[] =
        typeof skuOrItems[0] === 'string'
            ? (skuOrItems as string[]).map(s => ({ sku: s }))
            : (skuOrItems as { sku: string; talla?: string }[]);

    try {
        const allItems = await getInventory();
        const result: Record<string, InventoryDetailItem> = {};

        for (const requested of requestedItems) {
            if (!requested.sku) continue;
            const normalizedReqSku = requested.sku.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedReqTalla = (requested.talla || '').toLowerCase().trim();

            // Find matching inventory item by SKU + talla
            let bestMatch: typeof allItems[number] | null = null;

            for (const item of allItems) {
                const normalizedItemSku = item.sku.toLowerCase().replace(/[^a-z0-9]/g, '');
                const normalizedItemName = item.nombre.toLowerCase().replace(/[^a-z0-9]/g, '');

                const skuMatches =
                    normalizedItemSku.includes(normalizedReqSku) ||
                    normalizedReqSku.includes(normalizedItemSku) ||
                    normalizedItemName.includes(normalizedReqSku) ||
                    normalizedReqSku.includes(normalizedItemName);

                if (!skuMatches) continue;

                const normalizedItemTalla = (item.talla || '').toLowerCase().trim();

                // If a talla was requested, prefer exact talla match
                if (normalizedReqTalla) {
                    if (normalizedItemTalla === normalizedReqTalla) {
                        bestMatch = item;
                        break; // Exact match found, stop searching
                    }
                    // If no exact talla match yet, keep looking
                } else {
                    // No talla requested — just use first SKU match
                    bestMatch = item;
                    break;
                }
            }

            // Fallback: if talla was requested but not found, use any SKU match
            if (!bestMatch) {
                for (const item of allItems) {
                    const normalizedItemSku = item.sku.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normalizedItemSku.includes(normalizedReqSku) || normalizedReqSku.includes(normalizedItemSku)) {
                        bestMatch = item;
                        break;
                    }
                }
            }

            if (bestMatch) {
                // Use composite key: "sku::talla" so each size gets its own entry
                const compositeKey = normalizedReqTalla
                    ? `${requested.sku}::${requested.talla}`
                    : requested.sku;

                result[compositeKey] = {
                    sku: bestMatch.sku,
                    nombre: bestMatch.nombre,
                    categoria: bestMatch.categoria,
                    marca: bestMatch.marca,
                    talla: bestMatch.talla,
                    foto: bestMatch.foto,
                    stock: bestMatch.stock,
                    reservado: bestMatch.reservado,
                    estante_nro: bestMatch.estante_nro,
                    estante_nivel: bestMatch.estante_nivel,
                    valor: bestMatch.valor,
                    valor_aprox_clp: bestMatch.valor_aprox_clp,
                    clasificacion: bestMatch.clasificacion,
                    descripcion_general: bestMatch.descripcion_general,
                };
            }
        }

        return result;
    } catch (error) {
        console.error('Error fetching inventory by SKUs:', error);
        return {};
    }
}
