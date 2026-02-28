'use client'

import { Suspense, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowRight,
    Loader2,
} from 'lucide-react'

const Spline = dynamic(() => import('@splinetool/react-spline'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Loader2 className="w-10 h-10 text-white/30 animate-spin" />
        </div>
    ),
})



export default function LandingPage() {
    const [splineLoaded, setSplineLoaded] = useState(false)
    const [showContent, setShowContent] = useState(false)

    useEffect(() => {
        // Handle OAuth callback: Supabase may redirect ?code= to / instead of /auth/callback
        const params = new URLSearchParams(window.location.search)
        if (params.get('code')) {
            // Forward the code to the auth callback route for proper session exchange
            window.location.href = `/auth/callback?${params.toString()}`
            return
        }

        // Show content after a short delay even if Spline hasn't loaded
        const timer = setTimeout(() => setShowContent(true), 800)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="relative min-h-screen bg-black text-white overflow-y-auto overflow-x-hidden">


            {/* ═══ HERO SECTION ═══ */}
            <section className="relative h-screen w-full flex items-center overflow-hidden">
                {/* Spline 3D — positioned on the right half */}
                <div className="absolute inset-y-0 right-0 w-[60%] z-0">
                    <Spline
                        scene="https://prod.spline.design/QhzaWUXglaFoQHi9/scene.splinecode"
                        onLoad={() => {
                            setSplineLoaded(true)
                            setShowContent(true)
                        }}
                    />
                    {/* Fade-to-black on the left edge of the Spline area for smooth blending */}
                    <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black to-transparent pointer-events-none" />
                </div>

                {/* Subtle vertical gradient for top/bottom edges */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 z-[1] pointer-events-none" />

                {/* Hero Content — left half, well-padded */}
                <AnimatePresence>
                    {showContent && (
                        <div className="relative z-[2] flex flex-col items-start text-left pl-8 sm:pl-12 md:pl-16 lg:pl-24 xl:pl-32 pr-6 w-[50%] pointer-events-none">


                            {/* Title */}
                            <motion.h1
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]"
                            >
                                <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                                    Gestión de
                                </span>
                                <br />
                                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400 bg-clip-text text-transparent">
                                    Pañol
                                </span>
                            </motion.h1>

                            {/* Subtitle */}
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                className="mt-6 text-base sm:text-lg md:text-xl text-white/60 max-w-md leading-relaxed font-light"
                            >
                                Sistema de gestión de inventario industrial para{' '}
                                <span className="text-white/90 font-medium">Dole Molina</span>.
                                Control de repuestos, solicitudes y entregas en tiempo real.
                            </motion.p>

                            {/* CTA Buttons */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                className="mt-10 flex flex-col sm:flex-row items-start gap-4"
                            >
                                <Link
                                    style={{ pointerEvents: 'auto' }}
                                    href="/inventory"
                                    className="group relative px-8 py-4 rounded-2xl bg-white text-black font-bold text-lg flex items-center gap-3 shadow-2xl shadow-white/10 hover:shadow-white/20 transition-all duration-300 hover:scale-[1.02]"
                                >
                                    Ingresar al Sistema
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link
                                    href="/features"
                                    style={{ pointerEvents: 'auto' }}
                                    className="px-8 py-4 rounded-2xl border border-white/20 text-white/80 font-medium text-lg hover:bg-white/5 hover:border-white/30 transition-all duration-300"
                                >
                                    Conocer más
                                </Link>
                            </motion.div>


                        </div>
                    )}
                </AnimatePresence>
            </section>
        </div>
    )
}
