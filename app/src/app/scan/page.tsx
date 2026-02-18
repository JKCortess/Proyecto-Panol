import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/app/profile/actions';
import { QRScannerClient } from '@/components/scan/QRScannerClient';

export default async function ScanPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const profile = await getUserProfile();
    const isAdmin = profile?.role === 'Administrador';

    if (!isAdmin) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h1 className="text-3xl font-bold text-red-500 mb-4">Acceso Denegado</h1>
                <p className="ui-subtitle">No tienes permisos para ver esta página.</p>
            </div>
        );
    }

    return (
        <div className="ui-page max-w-4xl py-6 md:py-8 screen-scan">
            <QRScannerClient />
        </div>
    );
}
