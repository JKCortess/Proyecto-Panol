import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
    // Supabase PKCE flow sends the auth code to the Site URL (root /).
    // Intercept it and redirect to /auth/callback so the code gets exchanged.
    const { pathname, searchParams } = request.nextUrl
    if (pathname === '/' && searchParams.has('code')) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/callback'
        return NextResponse.redirect(url)
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public assets (images, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
