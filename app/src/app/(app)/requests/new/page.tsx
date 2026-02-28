import { createClient } from '@/utils/supabase/server';
import { CreateRequestForm } from '@/components/requests/CreateRequestForm';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/app/profile/actions';

export default async function NewRequestPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch user profile to pre-fill the form
    const profile = await getUserProfile();

    return (
        <div className="container mx-auto max-w-4xl py-10 px-4">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Carrito de Solicitud</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
                Complete el formulario para solicitar insumos o componentes del pañol.
            </p>

            <CreateRequestForm
                userEmail={user.email!}
                userId={user.id}
                userName={profile?.full_name}
                userArea={profile?.area}
                userRole={profile?.role}
            />
        </div>
    );
}
