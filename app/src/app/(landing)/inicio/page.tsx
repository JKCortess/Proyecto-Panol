'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Loader2, LogIn, Sun } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const Spline = dynamic(() => import('@splinetool/react-spline'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
        </div>
    ),
})

const SPLINE_SCENE_URL = "https://prod.spline.design/hbq98GwTXMeK-9vT/scene.splinecode"

export default function LandingPage() {
    const [splineLoaded, setSplineLoaded] = useState(false)
    const [showContent, setShowContent] = useState(false)
    const [userName, setUserName] = useState<string | null>(null)
    const [userLoading, setUserLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase
                    .from('user_profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single()
                    .then(({ data }) => {
                        setUserName(data?.full_name || user.email?.split('@')[0] || 'Usuario')
                        setUserLoading(false)
                    })
            } else {
                setUserLoading(false)
            }
        })
    }, [])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('code')) {
            window.location.href = `/auth/callback?${params.toString()}`
            return
        }
        const timer = setTimeout(() => setShowContent(true), 800)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="relative min-h-screen overflow-y-auto overflow-x-hidden">
            {/* TOP BAR */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 lg:px-16 py-4"
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0,0,0,0.08), rgba(0,0,0,0.04))',
                            color: '#1a1a2e',
                            border: '1px solid rgba(0,0,0,0.1)',
                        }}
                    >
                        P
                    </div>
                    <span
                        className="text-sm font-semibold tracking-tight hidden sm:block"
                        style={{ color: '#1a1a2e' }}
                    >
                        Pañol Smart-MRO
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {!userLoading && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            {userName ? (
                                <Link
                                    href="/inventory"
                                    className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                    style={{
                                        background: 'rgba(255,255,255,0.7)',
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                    }}
                                >
                                    <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                                        style={{
                                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                            color: '#fff',
                                        }}
                                    >
                                        {userName.charAt(0).toUpperCase()}
                                    </div>
                                    <span
                                        className="text-sm font-medium hidden sm:block"
                                        style={{ color: '#1a1a2e' }}
                                    >
                                        {userName.split(' ')[0]}
                                    </span>
                                </Link>
                            ) : (
                                <Link
                                    href="/login"
                                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                    style={{
                                        background: 'rgba(255,255,255,0.7)',
                                        backdropFilter: 'blur(20px)',
                                        WebkitBackdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                        color: '#1a1a2e',
                                    }}
                                >
                                    <LogIn className="w-4 h-4" />
                                    <span className="text-sm font-medium">
                                        Iniciar Sesión
                                    </span>
                                </Link>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.header>

            {/* HERO SECTION */}
            <section
                className="relative h-screen w-full flex items-center overflow-hidden"
                style={{ background: '#e8e8ec' }}
            >
                {/* Spline 3D full background */}
                <div className="absolute inset-0 z-0">
                    <Spline
                        scene={SPLINE_SCENE_URL}
                        onLoad={() => {
                            setSplineLoaded(true)
                            setShowContent(true)
                        }}
                    />
                </div>

                {/* Hero Content */}
                <AnimatePresence>
                    {showContent && (
                        <div className="relative z-[2] flex flex-col items-start text-left pl-8 sm:pl-12 md:pl-16 lg:pl-24 xl:pl-32 pr-6 w-[50%] pointer-events-none">
                            <motion.h1
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]"
                            >
                                <span
                                    className="bg-clip-text text-transparent"
                                    style={{
                                        backgroundImage: 'linear-gradient(to right, #0a0a1a, #1a1a2e, #2a2a3e)',
                                    }}
                                >
                                    Gestión de
                                </span>
                                <br />
                                <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
                                    Pañol
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                className="mt-6 text-base sm:text-lg md:text-xl max-w-md leading-relaxed font-normal"
                                style={{ color: '#3a3a4a' }}
                            >
                                Sistema de gestión de inventario industrial para{' '}
                                <span className="font-bold" style={{ color: '#0a0a1a' }}>
                                    Dole Molina
                                </span>
                                . Control de repuestos, solicitudes y entregas en tiempo real.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                className="mt-10 flex flex-col sm:flex-row items-start gap-4"
                            >
                                <Link
                                    style={{ pointerEvents: 'auto' }}
                                    href="/inventory"
                                    className="group relative px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all duration-300 hover:scale-[1.02]"
                                >
                                    <span
                                        className="absolute inset-0 rounded-2xl"
                                        style={{
                                            background: '#0d59f2',
                                            boxShadow: '0 8px 32px rgba(13,89,242,0.3)',
                                        }}
                                    />
                                    <span className="relative z-10" style={{ color: '#ffffff' }}>
                                        Ingresar al Sistema
                                    </span>
                                    <ArrowRight
                                        className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform"
                                        style={{ color: '#ffffff' }}
                                    />
                                </Link>
                                <Link
                                    href="/features"
                                    style={{ pointerEvents: 'auto' }}
                                    className="relative px-8 py-4 rounded-2xl font-medium text-lg transition-all duration-300 hover:scale-[1.02]"
                                >
                                    <span
                                        className="absolute inset-0 rounded-2xl"
                                        style={{
                                            border: '1.5px solid #1a1a2e',
                                        }}
                                    />
                                    <span className="relative z-10" style={{ color: '#1a1a2e' }}>
                                        Conocer más
                                    </span>
                                </Link>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </section>
        </div>
    )
}
