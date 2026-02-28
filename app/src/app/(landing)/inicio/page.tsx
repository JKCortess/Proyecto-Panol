'use client'

import { Suspense, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Package,
    ArrowRight,
    ShieldCheck,
    ScanLine,
    Bot,
    BarChart3,
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

const features = [
    {
        icon: Package,
        title: 'Inventario Inteligente',
        description: 'Control total de repuestos y consumibles con alertas de reorden automáticas.',
        gradient: 'from-blue-500 to-cyan-400',
    },
    {
        icon: ScanLine,
        title: 'Entrega con QR',
        description: 'Verificación de entregas con códigos QR únicos. Seguro, rápido y trazable.',
        gradient: 'from-violet-500 to-purple-400',
    },
    {
        icon: Bot,
        title: 'Asistente IA',
        description: 'Busca repuestos, consulta stock y obtén recomendaciones con inteligencia artificial.',
        gradient: 'from-emerald-500 to-teal-400',
    },
    {
        icon: BarChart3,
        title: 'Analítica en Tiempo Real',
        description: 'Dashboard operativo con métricas, tendencias y riesgo del inventario.',
        gradient: 'from-amber-500 to-orange-400',
    },
]

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
                            {/* Logo Badge */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="mb-8"
                            >
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl shadow-white/5">
                                    <Package className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                                </div>
                            </motion.div>

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
                                <a
                                    href="#features"
                                    style={{ pointerEvents: 'auto' }}
                                    className="px-8 py-4 rounded-2xl border border-white/20 text-white/80 font-medium text-lg hover:bg-white/5 hover:border-white/30 transition-all duration-300"
                                >
                                    Conocer más
                                </a>
                            </motion.div>

                            {/* Trust Badge */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 0.7 }}
                                className="mt-12 flex items-center gap-2 text-white/30 text-sm"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                <span>Protegido con Supabase Auth & Next.js</span>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2]"
                >
                    <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
                        <motion.div
                            animate={{ y: [0, 12, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            className="w-1.5 h-1.5 rounded-full bg-white/50"
                        />
                    </div>
                </motion.div>
            </section>

            {/* ═══ FEATURES SECTION ═══ */}
            <section
                id="features"
                className="relative py-28 px-6"
                style={{
                    background: 'linear-gradient(180deg, #000 0%, #0a0a0a 40%, #111 100%)',
                }}
            >
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.7 }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
                            Todo lo que necesitas
                        </h2>
                        <p className="mt-4 text-lg text-white/50 max-w-2xl mx-auto">
                            Una plataforma completa para la gestión operativa del pañol industrial.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {features.map((feature, i) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-50px' }}
                                transition={{ duration: 0.6, delay: i * 0.1 }}
                                className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6 hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-500 hover:-translate-y-1"
                            >
                                {/* Glow effect on hover */}
                                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500`} />

                                <div className="relative z-10">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                                        <feature.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2 text-white/90">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-white/50 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ CTA SECTION ═══ */}
            <section className="relative py-24 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-cyan-600/10" />
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="relative max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                        ¿Listo para optimizar tu pañol?
                    </h2>
                    <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
                        Accede al sistema para gestionar inventario, crear solicitudes y monitorear entregas en tiempo real.
                    </p>
                    <Link
                        href="/inventory"
                        className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-black font-bold text-lg shadow-2xl shadow-white/10 hover:shadow-white/20 transition-all duration-300 hover:scale-[1.02]"
                    >
                        Comenzar Ahora
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </motion.div>
            </section>

            {/* ═══ FOOTER ═══ */}
            <footer className="border-t border-white/[0.06] py-8 px-6">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <Package className="w-4 h-4 text-white/60" />
                        </div>
                        <span className="text-sm text-white/40 font-medium">
                            Gestión de Pañol · Dole Molina
                        </span>
                    </div>
                    <p className="text-xs text-white/25">
                        © {new Date().getFullYear()} · Sistema de Gestión de Inventario Industrial
                    </p>
                </div>
            </footer>
        </div>
    )
}
