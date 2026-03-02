'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { login, signup } from './actions'
import { createClient } from '@/utils/supabase/client'
import {
    Warehouse,
    ArrowRight,
    Mail,
    Lock,
    AlertCircle,
    Loader2,
    ShieldCheck,
    UserPlus,
    Info,
    KeyRound
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
            <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100dvh-3rem)] overflow-y-auto">

                {/* Header */}
                <div className="px-6 py-3 sm:py-5 text-center border-b border-gray-200 dark:border-slate-800 bg-gradient-to-b from-gray-50 dark:from-slate-800/40 to-transparent">
                    <div className="mx-auto w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mb-2 sm:mb-3 shadow-lg shadow-blue-500/20 dark:shadow-blue-900/30 transform rotate-3 transition-transform hover:rotate-0 hover:scale-105">
                        {isLogin ? (
                            <KeyRound className="w-5 h-5 text-white" />
                        ) : (
                            <UserPlus className="w-5 h-5 text-white" />
                        )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {isLogin ? 'Bienvenido al Pañol' : 'Registro de Usuario'}
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm mt-1 sm:mt-1.5 max-w-xs mx-auto">
                        {isLogin
                            ? 'Ingresa tus credenciales para acceder al sistema de gestión de inventario.'
                            : 'Crea tu cuenta para gestionar repuestos y consumibles del pañol.'}
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="bg-red-500/10 border-l-4 border-red-500 p-3 mx-5 mt-4 rounded-r-md flex items-start gap-2.5 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-600 dark:text-red-500">Error de Autenticación</h3>
                            <p className="text-xs text-red-500/90 dark:text-red-400/90 mt-1">{decodeURIComponent(error)}</p>
                        </div>
                    </div>
                )}

                <div className="px-5 sm:px-6 py-3 sm:py-4">
                    <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                                Correo Electrónico
                            </label>
                            <div className="relative group">
                                <Mail className="icon-left icon-left-md text-gray-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="usuario@dolemolina.com"
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-xl py-2.5 input-with-icon pr-4 text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                                Contraseña
                            </label>
                            <div className="relative group">
                                <Lock className="icon-left icon-left-md text-gray-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    placeholder="••••••••"
                                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-xl py-2.5 input-with-icon pr-4 text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium text-sm"
                                />
                            </div>
                            {!isLogin && (
                                <div className="flex items-center gap-1.5 mt-1 ml-1 animate-in fade-in duration-300">
                                    <Info className="w-3 h-3 text-gray-400 dark:text-slate-600" />
                                    <span className="text-[11px] text-gray-400 dark:text-slate-600">Mínimo 6 caracteres</span>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                "w-full py-2.5 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg mt-1",
                                isLogin
                                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 dark:shadow-blue-900/30 hover:shadow-blue-500/30 dark:hover:shadow-blue-900/50"
                                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-blue-500/20 dark:shadow-blue-900/30",
                                isLoading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="my-3 sm:my-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-700 to-transparent" />
                        <span className="text-[11px] font-medium text-gray-400 dark:text-slate-500 uppercase whitespace-nowrap">O continuar con</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-700 to-transparent" />
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#121212] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] text-gray-800 dark:text-white font-medium flex items-center justify-center gap-3 transition-all duration-200 shadow-sm hover:border-gray-400 dark:hover:border-white/20 text-sm"
                    >
                        <GoogleLogo />
                        Continuar con Google
                    </button>

                    <div className="mt-3 sm:mt-4 text-center pb-1">
                        <p className="text-sm text-gray-500 dark:text-slate-500">
                            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin)
                                    // Clear errors when switching
                                    if (error) router.replace('/login')
                                }}
                                className="ml-2 font-bold text-blue-600 dark:text-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors focus:outline-none focus:underline"
                            >
                                {isLogin ? 'Regístrate' : 'Inicia sesión'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-3 sm:mt-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-slate-600">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Sistema Pañol — Dole Molina · Acceso seguro</span>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-dvh bg-gradient-to-br from-gray-100 via-blue-50 to-gray-100 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-slate-950 dark:to-black flex items-center justify-center px-4 py-4 sm:py-6 relative overflow-y-auto" suppressHydrationWarning>
            {/* Background Effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

            {/* Subtle grid pattern */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            <Suspense fallback={<div className="text-gray-400 dark:text-slate-500 animate-pulse">Cargando entorno seguro...</div>}>
                <AuthForm />
            </Suspense>
        </div>
    )
}
