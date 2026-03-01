'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    Package,
    ArrowRight,
    ArrowLeft,
    ScanLine,
    Bot,
    BarChart3,
    Database,
    Shield,
    Webhook,
    Zap,
    Search,
    ClipboardList,
    Settings,
    Camera,
    Layers,
    Globe,
    Lock,
    Image as ImageIcon,
    Brain,
    Wrench,
    Cpu,
    FileText,
    Boxes,
    TrendingUp,
    Bell,
    Users,
    Star,
} from 'lucide-react'

/* ─────────── DATA ─────────── */

const techStack = [
    {
        name: 'Next.js 16',
        description: 'Framework React con SSR y API Routes',
        icon: Globe,
        color: 'text-white',
    },
    {
        name: 'Supabase',
        description: 'Auth, PostgreSQL, RLS y Realtime',
        icon: Database,
        color: 'text-emerald-400',
    },
    {
        name: 'Google Sheets API',
        description: 'Fuente de verdad del inventario',
        icon: FileText,
        color: 'text-green-400',
    },
    {
        name: 'Gemini + OpenRouter',
        description: 'IA dual-provider con Function Calling',
        icon: Brain,
        color: 'text-purple-400',
    },
    {
        name: 'n8n Webhooks',
        description: 'Automatización de notificaciones',
        icon: Webhook,
        color: 'text-orange-400',
    },
    {
        name: 'Framer Motion',
        description: 'Animaciones fluidas y microinteractions',
        icon: Zap,
        color: 'text-yellow-400',
    },
    {
        name: 'TailwindCSS 4',
        description: 'Diseño responsivo y dark mode',
        icon: Layers,
        color: 'text-cyan-400',
    },
    {
        name: 'Recharts',
        description: 'Gráficos interactivos de analítica',
        icon: BarChart3,
        color: 'text-blue-400',
    },
    {
        name: 'QR Code',
        description: 'Generación y escaneo de códigos QR',
        icon: ScanLine,
        color: 'text-violet-400',
    },
    {
        name: 'Google Drive',
        description: 'Imágenes desde enlaces públicos con proxy',
        icon: ImageIcon,
        color: 'text-red-400',
    },
    {
        name: 'Spline 3D',
        description: 'Escena 3D interactiva en landing',
        icon: Cpu,
        color: 'text-pink-400',
    },
    {
        name: 'Zod + React Hook Form',
        description: 'Validación determinista de datos',
        icon: Shield,
        color: 'text-amber-400',
    },
]

const features = [
    {
        icon: Package,
        title: 'Inventario Inteligente',
        subtitle: 'Google Sheets API + Cache Server-Side',
        description:
            'Control de +500 ítems con datos en tiempo real desde Google Sheets. Cache en memoria de 60 segundos para rendimiento óptimo, búsqueda multi-palabra fuzzy, agrupación automática por tallas (XS→XXXL), y filtros por categoría, marca y clasificación.',
        details: [
            'Fuente de verdad: Google Sheets (Pañol_DB)',
            'Cache con TTL de 60s + invalidación manual',
            'Búsqueda fuzzy normalizada (sin acentos)',
            'Agrupación por Nombre + Marca + Categoría',
        ],
        gradient: 'from-blue-500 to-cyan-400',
    },
    {
        icon: Bot,
        title: 'Asistente IA con Function Calling',
        subtitle: 'Gemini + OpenRouter · Dual Provider',
        description:
            'Asistente conversacional que consulta el inventario en tiempo real usando Function Calling con hasta 15 rondas de herramientas. Soporta Gemini y OpenRouter con modelos configurables. Genera Product Cards interactivos con imágenes y botones de acción.',
        details: [
            '5 herramientas: buscar, contar, detalle, categorías, stock bajo',
            'Compactación automática de contexto en ronda 7+',
            'Product Cards con fotos, SKU y enlace directo',
            'Historial de conversaciones persistente en Supabase',
        ],
        gradient: 'from-violet-500 to-purple-400',
    },
    {
        icon: ClipboardList,
        title: 'Sistema de Solicitudes',
        subtitle: 'Flujo completo con Webhooks n8n',
        description:
            'Flujo de pedidos de 6 estados (Pendiente → Reservado → Listo → Entregado → Cancelado → Expirado). Cada solicitud genera un token QR de uso único con expiración de 48 horas. Las notificaciones se envían automáticamente vía webhooks n8n.',
        details: [
            'Tokens QR únicos con expiración de 48h',
            'Webhooks n8n: modo producción + modo test',
            'Ítems frecuentes como acceso rápido',
            'Log de auditoría de cambios de estado',
        ],
        gradient: 'from-emerald-500 to-teal-400',
    },
    {
        icon: Camera,
        title: 'Entrega con Escaneo QR',
        subtitle: 'html5-qrcode + Sincronización en Tiempo Real',
        description:
            'Verificación de entregas mediante escaneo de códigos QR con la cámara del dispositivo. Al confirmar, el stock se descuenta automáticamente en Google Sheets y se registra el movimiento completo con timestamp, usuario y orden de trabajo.',
        details: [
            'Escaneo con cámara del dispositivo',
            'Token de uso único — invalida tras entrega',
            'Sync automática: Stock -= cantidad entregada',
            'Registro inmutable en hoja MOVIMIENTOS',
        ],
        gradient: 'from-amber-500 to-orange-400',
    },
    {
        icon: BarChart3,
        title: 'Dashboard Analítico',
        subtitle: 'Recharts + Métricas en Tiempo Real',
        description:
            'Panel de control con gráficos interactivos de distribución de inventario por categoría, tendencias de consumo, alertas de stock bajo (ROP), y métricas de valor total. Notificaciones en tiempo real de solicitudes pendientes.',
        details: [
            'Gráficos de distribución por categoría',
            'Alertas cuando stock ≤ punto de reorden (ROP)',
            'Campana de notificaciones en tiempo real',
            'Sincronización con Supabase Realtime',
        ],
        gradient: 'from-rose-500 to-pink-400',
    },
    {
        icon: Settings,
        title: 'Panel de Administración',
        subtitle: 'Roles, Permisos y Configuración',
        description:
            'Panel completo para administradores con configuración de IA (provider, modelo, API keys, prompt), gestión de webhooks (producción/test), permisos por rol (Administrador/Operador), filtros de inventario configurables, y historial de ediciones.',
        details: [
            'Roles: Administrador (acceso total) y Operador',
            'Config IA: proveedor, modelo, API keys, prompt',
            'Webhook n8n: toggle producción ↔ test',
            'Historial de ediciones con agrupación temporal',
        ],
        gradient: 'from-sky-500 to-indigo-400',
    },
]

const integrations = [
    {
        name: 'Google Sheets + Drive',
        description:
            'Los datos del inventario (ITEMS, MOVIMIENTOS, PEDIDOS, USUARIOS) viven en Google Sheets como fuente de verdad. Las fotos se alojan en Google Drive con enlaces públicos, servidas a través de un Image Proxy server-side con cache de 30 minutos y límite de 200 imágenes en memoria.',
        icon: FileText,
        gradient: 'from-green-500 to-emerald-400',
        details: 'OAuth2 · Sheets API v4 · Drive lh3 proxy · Cache 30min',
    },
    {
        name: 'Supabase',
        description:
            'Autenticación con email/password y Google OAuth. Base de datos PostgreSQL para perfiles, conversaciones IA, mensajes, configuración de la app, permisos por rol, y log de auditoría de estados. Row Level Security (RLS) para aislamiento de datos.',
        icon: Database,
        gradient: 'from-emerald-500 to-teal-400',
        details: 'Auth · PostgreSQL · RLS · Realtime · Server Actions',
    },
    {
        name: 'n8n Automation',
        description:
            'Plataforma de automatización self-hosted en EasyPanel. Recibe webhooks cuando se crea o actualiza una solicitud de materiales. Modo producción y modo test configurables desde el panel de administración sin tocar código.',
        icon: Webhook,
        gradient: 'from-orange-500 to-amber-400',
        details: 'Self-hosted · EasyPanel · Modo prod/test · Webhooks',
    },
]

const architectureFlow = [
    { label: 'Google Sheets', sublabel: 'Pañol_DB', icon: FileText, color: 'bg-green-500/20 border-green-500/30 text-green-400' },
    { label: 'Next.js API', sublabel: 'Server Actions', icon: Globe, color: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
    { label: 'Supabase', sublabel: 'Auth + Data', icon: Database, color: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' },
    { label: 'n8n', sublabel: 'Webhooks', icon: Webhook, color: 'bg-orange-500/20 border-orange-500/30 text-orange-400' },
]

/* ─────────── COMPONENT ─────────── */

export default function FeaturesPage() {
    return (
        <div className="relative min-h-screen bg-black text-white overflow-y-auto overflow-x-hidden">
            {/* ═══ FIXED NAV BAR ═══ */}
            <div className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 py-4 bg-black/60 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link
                        href="/inicio"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/15 hover:text-white transition-all duration-200"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al Inicio
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                            <Package className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-white/50 font-medium hidden sm:block">
                            Pañol · Dole Molina
                        </span>
                    </div>
                </div>
            </div>

            {/* ═══ HERO ═══ */}
            <section
                className="relative pt-32 pb-16 px-6"
                style={{
                    background:
                        'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(13,89,242,0.12), transparent), linear-gradient(180deg, #000 0%, #0a0a0a 100%)',
                }}
            >
                <div className="max-w-6xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 text-xs font-medium mb-6">
                            <Layers className="w-3.5 h-3.5" />
                            Arquitectura del Sistema
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                                Tecnología de
                            </span>
                            <br />
                            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400 bg-clip-text text-transparent">
                                Clase Industrial
                            </span>
                        </h1>
                        <p className="mt-5 text-base sm:text-lg text-white/45 max-w-2xl mx-auto leading-relaxed">
                            Un ecosistema completo de herramientas conectadas para la gestión eficiente del pañol.
                            Desde inteligencia artificial hasta automatización de flujos con webhooks.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ═══ TECH STACK GRID ═══ */}
            <section className="relative py-16 px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.6 }}
                        className="mb-10"
                    >
                        <h2 className="text-2xl sm:text-3xl font-bold text-white/90">
                            Stack Tecnológico
                        </h2>
                        <p className="mt-2 text-sm text-white/40">
                            12 tecnologías integradas en una sola plataforma
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {techStack.map((tech, i) => (
                            <motion.div
                                key={tech.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-30px' }}
                                transition={{ duration: 0.4, delay: i * 0.04 }}
                                className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300"
                            >
                                <tech.icon
                                    className={`w-6 h-6 ${tech.color} mb-3 group-hover:scale-110 transition-transform duration-300`}
                                />
                                <h3 className="text-sm font-semibold text-white/85 mb-1">
                                    {tech.name}
                                </h3>
                                <p className="text-[11px] text-white/35 leading-snug">
                                    {tech.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ ARCHITECTURE FLOW ═══ */}
            <section className="relative py-12 px-6">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.6 }}
                        className="mb-8 text-center"
                    >
                        <h2 className="text-2xl sm:text-3xl font-bold text-white/90">
                            Flujo de Datos
                        </h2>
                        <p className="mt-2 text-sm text-white/40">
                            Cómo se conectan los servicios en tiempo real
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.15 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0"
                    >
                        {architectureFlow.map((node, i) => (
                            <div key={node.label} className="flex items-center">
                                <div
                                    className={`flex flex-col items-center justify-center gap-2 px-6 py-5 rounded-2xl border ${node.color} min-w-[140px]`}
                                >
                                    <node.icon className="w-7 h-7" />
                                    <span className="text-sm font-bold text-white/90">
                                        {node.label}
                                    </span>
                                    <span className="text-[10px] text-white/40 font-medium">
                                        {node.sublabel}
                                    </span>
                                </div>
                                {i < architectureFlow.length - 1 && (
                                    <div className="hidden sm:flex items-center px-2">
                                        <div className="w-8 h-[2px] bg-gradient-to-r from-white/20 to-white/5" />
                                        <ArrowRight className="w-4 h-4 text-white/20 -ml-1" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ═══ MAIN FEATURES ═══ */}
            <section
                className="relative py-20 px-6"
                style={{
                    background:
                        'linear-gradient(180deg, #0a0a0a 0%, #080808 50%, #0a0a0a 100%)',
                }}
            >
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.7 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                            Funcionalidades Principales
                        </h2>
                        <p className="mt-4 text-base text-white/45 max-w-2xl mx-auto">
                            Cada módulo está diseñado para resolver un problema operativo específico del pañol industrial.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {features.map((feature, i) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-50px' }}
                                transition={{
                                    duration: 0.6,
                                    delay: i * 0.08,
                                }}
                                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden hover:border-white/[0.12] transition-all duration-500"
                            >
                                {/* Glow effect */}
                                <div
                                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`}
                                />

                                <div className="relative z-10 p-6">
                                    {/* Header */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div
                                            className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg`}
                                        >
                                            <feature.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white/90">
                                                {feature.title}
                                            </h3>
                                            <p className="text-xs text-white/35 font-medium mt-0.5">
                                                {feature.subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-white/50 leading-relaxed mb-4">
                                        {feature.description}
                                    </p>

                                    {/* Detail pills */}
                                    <div className="flex flex-col gap-1.5">
                                        {feature.details.map((detail) => (
                                            <div
                                                key={detail}
                                                className="flex items-start gap-2"
                                            >
                                                <div className="w-1 h-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
                                                <span className="text-xs text-white/35 leading-snug">
                                                    {detail}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ INTEGRATIONS ═══ */}
            <section className="relative py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.7 }}
                        className="text-center mb-14"
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                            Integraciones Externas
                        </h2>
                        <p className="mt-4 text-base text-white/45 max-w-xl mx-auto">
                            Tres servicios clave que potencian las capacidades del sistema.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {integrations.map((integration, i) => (
                            <motion.div
                                key={integration.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-50px' }}
                                transition={{ duration: 0.6, delay: i * 0.1 }}
                                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-500"
                            >
                                {/* Glow */}
                                <div
                                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${integration.gradient} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500`}
                                />

                                <div className="relative z-10">
                                    <div
                                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.gradient} flex items-center justify-center mb-4 shadow-lg`}
                                    >
                                        <integration.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2 text-white/90">
                                        {integration.name}
                                    </h3>
                                    <p className="text-sm text-white/45 leading-relaxed mb-4">
                                        {integration.description}
                                    </p>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] w-fit">
                                        <Cpu className="w-3 h-3 text-white/30" />
                                        <span className="text-[10px] text-white/30 font-mono">
                                            {integration.details}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ ADDITIONAL CAPABILITIES ═══ */}
            <section className="relative py-16 px-6" style={{ background: 'linear-gradient(180deg, #0a0a0a, #080808)' }}>
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.6 }}
                        className="mb-10"
                    >
                        <h2 className="text-2xl sm:text-3xl font-bold text-white/90">
                            Capacidades Adicionales
                        </h2>
                        <p className="mt-2 text-sm text-white/40">
                            Detalles que hacen la diferencia en la operación diaria
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                icon: ImageIcon,
                                label: 'Image Proxy',
                                desc: 'Proxy server-side para Google Drive con cache de 30 min y prevención de HTTP 429',
                            },
                            {
                                icon: Lock,
                                label: 'Control de Acceso',
                                desc: 'Roles Administrador/Operador con permisos granulares por página vía Supabase RLS',
                            },
                            {
                                icon: Star,
                                label: 'Ítems Frecuentes',
                                desc: 'Los ítems más solicitados por cada usuario aparecen como acceso rápido en solicitudes',
                            },
                            {
                                icon: Bell,
                                label: 'Notificaciones',
                                desc: 'Campana de notificaciones en tiempo real para solicitudes pendientes y actualizaciones',
                            },
                            {
                                icon: Search,
                                label: 'Búsqueda Avanzada',
                                desc: 'Multi-palabra, sin acentos, por nombre/SKU/categoría/marca/descripción simultánea',
                            },
                            {
                                icon: Boxes,
                                label: 'Gestión de Tallas',
                                desc: 'Agrupación de variantes por talla con orden canónico XS→XXXL y stock independiente',
                            },
                            {
                                icon: TrendingUp,
                                label: 'ROP & Safety Stock',
                                desc: 'Alertas automáticas de reorden cuando Stock Disponible ≤ Punto de Reorden calculado',
                            },
                            {
                                icon: Users,
                                label: 'Multi-usuario',
                                desc: 'Perfiles con avatar, roles, áreas y trazabilidad de quién ejecuta cada movimiento',
                            },
                        ].map((cap, i) => (
                            <motion.div
                                key={cap.label}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-30px' }}
                                transition={{ duration: 0.4, delay: i * 0.05 }}
                                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.10] transition-all duration-300"
                            >
                                <cap.icon className="w-5 h-5 text-white/30 mb-3" />
                                <h3 className="text-sm font-semibold text-white/80 mb-1">
                                    {cap.label}
                                </h3>
                                <p className="text-[11px] text-white/35 leading-snug">
                                    {cap.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
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
