import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getUserProfile } from './actions';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { UserCircle } from 'lucide-react';

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const profile = await getUserProfile();

    return (
        <div className="container mx-auto max-w-3xl py-10 px-4">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-2.5 bg-slate-500/10 rounded-xl">
                    <UserCircle className="w-7 h-7 text-slate-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configuraciones</h1>
                    <p className="text-slate-400 text-sm">
                        Gestiona tu información personal y preferencias del sistema.
                    </p>
                </div>
            </div>

            <div className="mt-8">
                <ProfileForm profile={profile} userEmail={user.email!} />
            </div>
        </div>
    );
}
