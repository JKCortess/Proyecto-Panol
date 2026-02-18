'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export interface WebhookConfig {
    mode: 'production' | 'test';
    url_production: string;
    url_test: string;
}

/**
 * Get the current webhook configuration from Supabase
 */
export async function getWebhookConfig(): Promise<WebhookConfig> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['webhook_mode', 'webhook_url_production', 'webhook_url_test']);

    if (error) {
        console.error('Error fetching webhook config:', error);
        // Return defaults if query fails
        return {
            mode: 'production',
            url_production: 'https://n8n-n8n.mfwm9e.easypanel.host/webhook/d92604e6-c697-42d3-9e42-d6528d9c5334',
            url_test: 'https://n8n-n8n.mfwm9e.easypanel.host/webhook-test/d92604e6-c697-42d3-9e42-d6528d9c5334',
        };
    }

    const settingsMap: Record<string, string> = {};
    for (const row of data || []) {
        settingsMap[row.key] = row.value;
    }

    return {
        mode: (settingsMap['webhook_mode'] as 'production' | 'test') || 'production',
        url_production: settingsMap['webhook_url_production'] || 'https://n8n-n8n.mfwm9e.easypanel.host/webhook/d92604e6-c697-42d3-9e42-d6528d9c5334',
        url_test: settingsMap['webhook_url_test'] || 'https://n8n-n8n.mfwm9e.easypanel.host/webhook-test/d92604e6-c697-42d3-9e42-d6528d9c5334',
    };
}

/**
 * Update the webhook mode (production or test)
 */
export async function updateWebhookMode(mode: 'production' | 'test') {
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

    const { error } = await supabase
        .from('app_settings')
        .update({
            value: mode,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
        })
        .eq('key', 'webhook_mode');

    if (error) {
        console.error('Error updating webhook mode:', error);
        return { error: 'Error al actualizar la configuración del webhook' };
    }

    revalidatePath('/admin');
    return { success: true, mode };
}

/**
 * Get the active webhook URL based on current configuration.
 * This is used by the request submission flow.
 */
export async function getActiveWebhookUrl(): Promise<string> {
    const config = await getWebhookConfig();
    return config.mode === 'test' ? config.url_test : config.url_production;
}
