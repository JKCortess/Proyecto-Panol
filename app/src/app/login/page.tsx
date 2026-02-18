'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { login, signup } from './actions'
import { createClient } from '@/utils/supabase/client'
import {
    Package,
    ArrowRight,
    Mail,
    Lock,
    AlertCircle,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

function GoogleLogo() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
    )
}

function AuthForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const error = searchParams.get('error')

    const handleGoogleLogin = async () => {
        setIsLoading(true)
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)
        const formData = new FormData(event.currentTarget)

        try {
            if (isLogin) {
                await login(formData)
            } else {
                await signup(formData)
            }
        } catch {
            // Handle redirect errors normally, but for others stop loading
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500 slide-in-from-bottom-4">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="p-8 text-center border-b border-slate-800 bg-slate-900/50">
                    <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20 transform rotate-3 transition-transform hover:rotate-0">
                        <Package className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-slate-400 text-sm mt-2">
                        {isLogin
                            ? 'Enter your credentials to access the workspace.'
                            : 'Sign up to start managing your inventory.'}
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="bg-red-500/10 border-l-4 border-red-500 p-4 m-6 mb-0 rounded-r-md flex items-start gap-3 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-500">Authentication Error</h3>
                            <p className="text-xs text-red-400/90 mt-1">{decodeURIComponent(error)}</p>
                        </div>
                    </div>
                )}

                <div className="p-8 pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                                Email Address
                            </label>
                            <div className="relative group">
                                <Mail className="icon-left icon-left-md text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="name@company.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 input-with-icon pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <Lock className="icon-left icon-left-md text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 input-with-icon pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                "w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg",
                                isLogin
                                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                                    : "bg-slate-100 hover:bg-white text-slate-900 shadow-slate-900/10",
                                isLoading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="h-px flex-1 bg-slate-800" />
                        <span className="text-xs font-medium text-slate-500 uppercase">Or continue with</span>
                        <div className="h-px flex-1 bg-slate-800" />
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="w-full py-3 rounded-xl border border-white/10 bg-[#121212] hover:bg-[#1a1a1a] text-white font-medium flex items-center justify-center gap-3 transition-all duration-200 shadow-sm"
                    >
                        <GoogleLogo />
                        Continuar con Google
                    </button>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin)
                                    // Clear errors when switching
                                    if (error) router.replace('/login')
                                }}
                                className="ml-2 font-bold text-blue-500 hover:text-blue-400 transition-colors focus:outline-none focus:underline"
                            >
                                {isLogin ? 'Sign up' : 'Sign in'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center space-y-2">
                <p className="text-xs text-slate-600">
                    Protected by Supabase Auth & Next.js Security
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <Suspense fallback={<div className="text-slate-500 animate-pulse">Loading secure environment...</div>}>
                <AuthForm />
            </Suspense>
        </div>
    )
}
