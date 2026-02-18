import { NextResponse } from 'next/server';
import { invalidateInventoryCache, getInventory, getCacheStatus } from '@/lib/data';
import { isCurrentUserAdmin } from '@/app/profile/actions';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/revalidate-inventory
 * 
 * Admin-only API route that:
 * 1. Invalidates the in-memory cache for inventory + image links
 * 2. Pre-fetches fresh data from Google Sheets to warm the cache
 * 3. Calls revalidatePath to bust Next.js page cache
 * 4. Returns cache status info
 */
export async function POST() {
    try {
        // Verify the user is an admin
        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'No autorizado. Solo administradores pueden forzar la actualización.' },
                { status: 403 }
            );
        }

        // 1. Invalidate in-memory cache (sets variables to null)
        invalidateInventoryCache();

        // 2. Pre-fetch fresh data from Google Sheets to warm the cache
        //    This ensures the next page render gets fresh data immediately
        const freshItems = await getInventory();
        console.log(`[Revalidate] Fresh data fetched: ${freshItems.length} items from Google Sheets.`);

        // 3. Revalidate Next.js page cache for all routes that use inventory data
        revalidatePath('/inventory');
        revalidatePath('/');
        revalidatePath('/requests/pending');
        revalidatePath('/requests/new');

        // Get the new cache status
        const cacheStatus = getCacheStatus();

        return NextResponse.json({
            success: true,
            message: `Datos actualizados exitosamente. ${freshItems.length} ítems cargados desde Google Sheets.`,
            itemCount: freshItems.length,
            cacheStatus,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Revalidate] Error:', error);
        return NextResponse.json(
            { error: 'Error interno al invalidar el caché.' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/revalidate-inventory
 * Returns the current cache status (no auth required for read-only).
 */
export async function GET() {
    const cacheStatus = getCacheStatus();
    return NextResponse.json({
        cacheStatus,
        timestamp: new Date().toISOString(),
    });
}
