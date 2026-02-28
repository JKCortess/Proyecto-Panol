'use server'

import { createClient } from '@/utils/supabase/server';

export type FrequentItem = {
    sku: string;
    detail: string;
    talla?: string;
    marca?: string;
    valor?: number;
    imagen?: string;
    cantidad_pedidos: number;
};

/**
 * Queries user's past requests and aggregates item frequency.
 * Returns items sorted by most-requested first, up to 20 items.
 */
export async function getFrequentItems(userId: string): Promise<FrequentItem[]> {
    if (!userId) return [];

    const supabase = await createClient();

    // Fetch all non-cancelled/non-eliminated requests for this user
    const { data: requests, error } = await supabase
        .from('material_requests')
        .select('items_detail')
        .eq('user_id', userId)
        .not('status', 'in', '("Eliminada","Cancelada")');

    if (error || !requests) {
        console.error('Error fetching frequent items:', error);
        return [];
    }

    // Aggregate frequency by composite key (sku::talla)
    const frequencyMap = new Map<string, {
        sku: string;
        detail: string;
        talla?: string;
        marca?: string;
        valor?: number;
        imagen?: string;
        count: number;
    }>();

    for (const request of requests) {
        const items = request.items_detail as {
            sku?: string;
            detail: string;
            quantity: number;
            talla?: string;
            marca?: string;
            value?: number;
            imagen?: string;
        }[];

        if (!Array.isArray(items)) continue;

        for (const item of items) {
            if (!item.sku || item.sku === 'SIN-SKU') continue;

            const key = item.talla ? `${item.sku}::${item.talla}` : item.sku;
            const existing = frequencyMap.get(key);

            if (existing) {
                existing.count += item.quantity;
                // Update metadata with most recent values
                if (item.imagen) existing.imagen = item.imagen;
                if (item.value) existing.valor = item.value;
                if (item.marca) existing.marca = item.marca;
            } else {
                frequencyMap.set(key, {
                    sku: item.sku,
                    detail: item.detail,
                    talla: item.talla || undefined,
                    marca: item.marca || undefined,
                    valor: item.value || undefined,
                    imagen: item.imagen || undefined,
                    count: item.quantity,
                });
            }
        }
    }

    // Sort by count desc, limit to 20
    const sorted = Array.from(frequencyMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
        .map(({ count, ...rest }) => ({
            ...rest,
            cantidad_pedidos: count,
        }));

    return sorted;
}
