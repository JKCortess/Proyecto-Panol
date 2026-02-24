'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export interface FilterConfig {
    /** Which filters are visible by default */
    defaultFilters: string[];
    /** The order in which filters appear */
    filterOrder: string[];
}

const DEFAULT_FILTERS = ['status', 'category', 'brand', 'estante'];
const DEFAULT_ORDER = [
    'status', 'category', 'brand', 'tipoComponente',
    'filterSku', 'filterNombre', 'filterModelo', 'filterPotencia',
    'talla', 'estante', 'nivel', 'clasificacion', 'proveedor',
];

/**
 * Get the current filter configuration from Supabase app_settings
 */
export async function getFilterConfig(): Promise<FilterConfig> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['inventory_default_filters', 'inventory_filter_order']);

    if (error) {
        console.error('Error fetching filter config:', error);
        return { defaultFilters: DEFAULT_FILTERS, filterOrder: DEFAULT_ORDER };
    }

    const settingsMap: Record<string, string> = {};
    for (const row of data || []) {
        settingsMap[row.key] = row.value;
    }

    let defaultFilters = DEFAULT_FILTERS;
    let filterOrder = DEFAULT_ORDER;

    try {
        if (settingsMap['inventory_default_filters']) {
            defaultFilters = JSON.parse(settingsMap['inventory_default_filters']);
        }
    } catch { /* use default */ }

    try {
        if (settingsMap['inventory_filter_order']) {
            filterOrder = JSON.parse(settingsMap['inventory_filter_order']);
        }
    } catch { /* use default */ }

    return { defaultFilters, filterOrder };
}

/**
 * Save filter configuration (admin only)
 */
export async function saveFilterConfig(defaultFilters: string[], filterOrder: string[]) {
    const supabase = await createClient();

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'Administrador') {
        return { error: 'Solo administradores pueden cambiar esta configuración' };
    }

    const now = new Date().toISOString();

    // Upsert both settings
    const { error: err1 } = await supabase
        .from('app_settings')
        .upsert({
            key: 'inventory_default_filters',
            value: JSON.stringify(defaultFilters),
            updated_at: now,
            updated_by: user.id,
        }, { onConflict: 'key' });

    const { error: err2 } = await supabase
        .from('app_settings')
        .upsert({
            key: 'inventory_filter_order',
            value: JSON.stringify(filterOrder),
            updated_at: now,
            updated_by: user.id,
        }, { onConflict: 'key' });

    if (err1 || err2) {
        console.error('Error saving filter config:', err1, err2);
        return { error: 'Error al guardar la configuración de filtros' };
    }

    revalidatePath('/admin');
    revalidatePath('/inventory');
    return { success: true };
}
