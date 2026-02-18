import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Map routes to their permission page_key
const routePermissionMap: Record<string, string> = {
    '/admin': 'admin',

    '/inventory': 'inventory',
    '/requests': 'requests_new',
    '/orders': 'orders',
};

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

    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth')
    ) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Redirect authenticated users from /login to home
    if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/login/'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    // If user is authenticated, check role-based access
    if (user) {
        const pathname = request.nextUrl.pathname;

        // Find matching route
        const matchedRoute = Object.keys(routePermissionMap).find(route =>
            pathname === route || pathname.startsWith(route + '/')
        );

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
                    // Redirect to dashboard if access denied
                    const url = request.nextUrl.clone()
                    url.pathname = '/'
                    return NextResponse.redirect(url)
                }
            }
        }
    }

    return response
}
