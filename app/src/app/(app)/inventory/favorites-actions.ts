'use server';

import { createClient } from '@/utils/supabase/server';

export async function toggleFavorite(sku: string): Promise<{ favorited: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { favorited: false, error: 'No autenticado' };

    // Check if already favorited
    const { data: existing } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('sku', sku)
        .maybeSingle();

    if (existing) {
        // Unfavorite
        await supabase.from('user_favorites').delete().eq('id', existing.id);
        return { favorited: false };
    } else {
        // Favorite
        const { error } = await supabase.from('user_favorites').insert({ user_id: user.id, sku });
        if (error) return { favorited: false, error: error.message };
        return { favorited: true };
    }
}

export async function getUserFavorites(): Promise<string[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from('user_favorites')
        .select('sku')
        .eq('user_id', user.id);

    return (data || []).map(f => f.sku);
}
