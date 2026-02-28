import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Map routes to their permission page_key
const routePermissionMap: Record<string, string> = {
    // Navigation pages
    '/dashboard': 'dashboard',
    '/inventory': 'inventory',
    '/requests/new': 'requests_new',
    '/my-orders': 'my_orders',
    '/assistant': 'ai_assistant',
    // Admin pages
    '/scan': 'scan_qr',
    '/requests/pending': 'requests_pending',
    '/stock': 'stock',
    '/admin': 'admin',
};

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/auth'];

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname;

    // Allow public routes without authentication
    const isPublicRoute = publicRoutes.some(route =>
        route === '/' ? pathname === '/' : pathname.startsWith(route)
    ) || pathname === '/inicio';

    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Redirect authenticated users from /login to inventory
    if (user && (pathname === '/login' || pathname.startsWith('/login/'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/inventory'
        return NextResponse.redirect(url)
    }

    // If user is authenticated, check role-based access
    if (user) {
        // Find matching route (exact match for '/dashboard', prefix match for others)
        const matchedRoute = Object.keys(routePermissionMap).find(route => {
            if (route === '/dashboard') return pathname === '/dashboard';
            return pathname === route || pathname.startsWith(route + '/');
        });

        if (matchedRoute) {
            const pageKey = routePermissionMap[matchedRoute];

            // Fetch user profile to check role
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            // Admins always have access
            if (profile?.role !== 'Administrador') {
                // Check permission for this page
                const { data: permission } = await supabase
                    .from('role_permissions')
                    .select('allowed')
                    .eq('role_name', profile?.role || 'Operador')
                    .eq('page_key', pageKey)
                    .single();

                if (permission && !permission.allowed) {
                    // Redirect to inventory (always accessible) if access denied
                    const url = request.nextUrl.clone()
                    url.pathname = '/inventory'
                    return NextResponse.redirect(url)
                }
            }
        }
    }

    return response
}
