'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export type UserProfile = {
    id: string;
    email: string | null;
    full_name: string | null;
    area: string | null;
    cargo: string | null;
    telefono: string | null;
    avatar_id: string | null;
    role: string;
    created_at: string;
    updated_at: string;
};

export type RolePermission = {
    id: string;
    role_name: string;
    page_key: string;
    page_label: string;
    allowed: boolean;
};

export async function getUserProfile(): Promise<UserProfile | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
    }

    return data as UserProfile | null;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
    const profile = await getUserProfile();
    return profile?.role === 'Administrador';
}

export async function getAllProfiles(): Promise<UserProfile[]> {
    const supabase = await createClient();
    const isAdmin = await isCurrentUserAdmin();

    if (!isAdmin) return [];

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('role', { ascending: true })
        .order('email', { ascending: true });

    if (error) {
        console.error('Error fetching all profiles:', error);
        return [];
    }

    return (data || []) as UserProfile[];
}

export async function getRolePermissions(roleName: string): Promise<RolePermission[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_name', roleName)
        .order('page_key', { ascending: true });

    if (error) {
        console.error('Error fetching permissions:', error);
        return [];
    }

    return (data || []) as RolePermission[];
}

export async function getMyPermissions(): Promise<RolePermission[]> {
    const profile = await getUserProfile();
    if (!profile) return [];

    // Admins have access to everything
    if (profile.role === 'Administrador') {
        return [];
    }

    return getRolePermissions(profile.role);
}

export async function updatePermission(permissionId: string, allowed: boolean) {
    const supabase = await createClient();
    const isAdmin = await isCurrentUserAdmin();

    if (!isAdmin) {
        return { error: 'No autorizado. Solo administradores pueden modificar permisos.' };
    }

    const { error } = await supabase
        .from('role_permissions')
        .update({ allowed, updated_at: new Date().toISOString() })
        .eq('id', permissionId);

    if (error) {
        console.error('Error updating permission:', error);
        return { error: 'Error al actualizar permiso.' };
    }

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
}

export async function updateUserRole(userId: string, newRole: string) {
    const supabase = await createClient();
    const isAdmin = await isCurrentUserAdmin();

    if (!isAdmin) {
        return { error: 'No autorizado. Solo administradores pueden cambiar roles.' };
    }

    const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

    if (error) {
        console.error('Error updating role:', error);
        return { error: 'Error al actualizar rol.' };
    }

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
}

export async function updateUserProfile(formData: {
    full_name: string;
    area: string;
    cargo: string;
    telefono: string;
    avatar_id: string | null;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    const { error } = await supabase
        .from('user_profiles')
        .upsert({
            id: user.id,
            email: user.email,
            full_name: formData.full_name,
            area: formData.area,
            cargo: formData.cargo,
            telefono: formData.telefono,
            avatar_id: formData.avatar_id,
        }, { onConflict: 'id' });

    if (error) {
        console.error('Error updating profile:', error);
        return { error: 'Failed to update profile.' };
    }

    revalidatePath('/profile');
    revalidatePath('/requests/new');
    return { success: true };
}
