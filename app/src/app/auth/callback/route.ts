import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const rawNext = searchParams.get('next') ?? '/inventory'
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/inventory'

    // Build the redirect URL using the host header (handles 0.0.0.0 in dev)
    const host = request.headers.get('host') || 'localhost:3000'
    const isLocalEnv = process.env.NODE_ENV === 'development'
    const forwardedHost = request.headers.get('x-forwarded-host')

    let redirectBase: string
    if (isLocalEnv) {
        redirectBase = `http://${host}`
    } else if (forwardedHost) {
        redirectBase = `https://${forwardedHost}`
    } else {
        redirectBase = `http://${host}`
    }

    if (code) {
        // Track cookies that Supabase sets during exchangeCodeForSession
        // and explicitly forward them on the redirect response
        const cookiesToForward: { name: string; value: string; options: Record<string, unknown> }[] = []

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookies) {
                        cookies.forEach((cookie) => {
                            cookiesToForward.push(cookie)
                        })
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            const response = NextResponse.redirect(`${redirectBase}${next}`)

            // Set all auth cookies on the redirect response
            cookiesToForward.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
            })

            return response
        } else {
            console.error('[Auth Callback] exchangeCodeForSession error:', error.message)
        }
    }

    return NextResponse.redirect(`${redirectBase}/login?error=${encodeURIComponent('Error al intercambiar código de autenticación')}`)
}
