import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import StockManager from '@/components/stock/StockManager';

export const metadata = {
    title: 'Gestión de Stock | Gestión de Pañol',
    description: 'Entrada y salida de stock del pañol industrial',
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function StockPage(props: { searchParams: SearchParams }) {
    const searchParams = await props.searchParams;
    const tab = (searchParams.tab as 'entry' | 'exit' | 'history') || 'entry';

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, role, area')
        .eq('id', user.id)
        .single();

    // Fetch recent movements
    const { data: recentMovements } = await supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

    return (
        <div className="p-5 md:p-8 min-h-full">
            <StockManager
                userId={user.id}
                userName={profile?.full_name || user.email || 'Usuario'}
                userRole={profile?.role || 'Operador'}
                userArea={profile?.area || 'Mantención'}
                recentMovements={recentMovements || []}
                initialTab={tab}
            />
        </div>
    );
}

