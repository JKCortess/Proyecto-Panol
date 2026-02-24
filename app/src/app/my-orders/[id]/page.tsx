
import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Calendar,
    MapPin,
    FileText,
    Package,
    User,
    Mail,
    Hash,
    ExternalLink,
    ShieldCheck,
    ChevronDown,
    PackageCheck,
    Edit3
} from "lucide-react";
import Image from "next/image";
import { StatusChip } from "@/components/ui/request-status";
import { CancelRequestButton } from "@/components/requests/CancelRequestButton";
import { QRCodeDisplay } from "@/components/ui/QRCodeDisplay";

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await params;

    // 1. Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // 2. Fetch Request Details
    const { data: req, error } = await supabase
        .from('material_requests')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !req) {
        notFound();
    }

    // 3. Security Check: Ensure user owns this request
    if (req.user_id !== user.id) {
        return notFound();
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCLP = (value: number | undefined) => {
        if (value === undefined || value === null) return "$ -";
        return `$${value.toLocaleString("es-CL")}`;
    };

    type RequestDetailItem = {
        sku?: string;
        detail: string;
        quantity: number;
        notes?: string;
        imagen?: string;
        value?: number;
        brand?: string;
        size?: string;
        talla?: string;
        marca?: string;
    };
    const items: RequestDetailItem[] = Array.isArray(req.items_detail) ? req.items_detail : [];
    const deliveredItems: RequestDetailItem[] | null = Array.isArray(req.items_delivered) ? req.items_delivered : null;
    const isDelivered = req.status === 'Entregada';
    const hasModifications = isDelivered && deliveredItems !== null;

    // Calculate total value
    const displayItems = hasModifications ? deliveredItems : items;
    const totalValue = displayItems.reduce((acc, item) => acc + ((item.value || 0) * item.quantity), 0);
    const hasValue = totalValue > 0;
    const totalItems = displayItems.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <main className="min-h-screen p-4 md:p-8 lg:p-12 text-slate-200" style={{ background: 'transparent' }}>
            <div className="max-w-5xl mx-auto space-y-6">

                {/* ── Back Navigation ───────────────────────────── */}
                <Link
                    href="/my-orders"
                    className="inline-flex items-center gap-2 text-sm font-medium tracking-wide uppercase hover:text-white transition-colors group"
                    style={{ color: 'var(--muted)' }}
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Volver a Mis Solicitudes
                </Link>

                {/* ── Hero Header Card ──────────────────────────── */}
                <div className="ui-card rounded-2xl overflow-hidden">
                    <div className="p-5 md:p-6 lg:p-8">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                            {/* Left: Order Code + Status + Date */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
                                        <span style={{ color: 'var(--brand)' }}>#</span> {req.request_code}
                                    </h1>
                                    <StatusChip status={req.status} size="md" />
                                    {req.status === 'Pendiente' && (
                                        <CancelRequestButton requestId={req.id} requestCode={req.request_code} />
                                    )}
                                </div>
                                <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                                    <Calendar className="w-4 h-4 shrink-0" style={{ color: 'var(--brand)' }} />
                                    Generado el {formatDate(req.created_at)}
                                </p>
                            </div>

                            {/* Right: KPI Summary Strip */}
                            <div className="flex flex-col gap-3 items-start lg:items-end">
                                <div className="flex items-stretch gap-0 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                                    {/* Total Items */}
                                    <div className="px-5 py-3 text-center" style={{ background: 'color-mix(in oklab, var(--surface) 70%, transparent)' }}>
                                        <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Total Ítems</p>
                                        <p className="text-2xl font-mono font-bold" style={{ color: 'var(--foreground)' }}>{totalItems}</p>
                                    </div>
                                    {/* Divider */}
                                    <div style={{ width: '1px', background: 'var(--border)' }} />
                                    {/* Total Value */}
                                    {hasValue && (
                                        <>
                                            <div className="px-5 py-3 text-center" style={{ background: 'color-mix(in oklab, var(--surface) 70%, transparent)' }}>
                                                <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Valor Total</p>
                                                <p className="text-2xl font-mono font-bold text-emerald-400">
                                                    {formatCLP(totalValue)}
                                                </p>
                                            </div>
                                            <div style={{ width: '1px', background: 'var(--border)' }} />
                                        </>
                                    )}
                                    {/* Area */}
                                    <div className="px-5 py-3 text-center" style={{ background: 'color-mix(in oklab, var(--surface) 70%, transparent)' }}>
                                        <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Área</p>
                                        <p className="text-sm font-medium flex items-center gap-1.5 justify-center" style={{ color: 'var(--foreground)' }}>
                                            <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} /> {req.area}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Two-Column: QR + Registration Info ─────────── */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

                    {/* QR Code Card (2/5 width) */}
                    <div className="md:col-span-2 ui-card rounded-2xl p-6 flex flex-col items-center justify-center gap-4">
                        <div className="p-3 rounded-xl" style={{ background: 'color-mix(in oklab, var(--surface) 50%, transparent)', border: '1px solid var(--border)' }}>
                            <QRCodeDisplay
                                value={req.request_code}
                                size={160}
                            />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                                Código QR de Seguimiento
                            </p>
                            <p className="text-xs" style={{ color: 'color-mix(in oklab, var(--muted) 70%, transparent)' }}>
                                Escanee este código al retirar sus materiales
                            </p>
                        </div>
                    </div>

                    {/* Registration Info Card (3/5 width) */}
                    <div className="md:col-span-3 ui-card rounded-2xl overflow-hidden">
                        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in oklab, var(--surface) 40%, transparent)' }}>
                            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                                Información de Registro
                            </h3>
                        </div>
                        <div className="p-6 space-y-0">
                            {/* Solicitante */}
                            <div className="flex items-center justify-between py-3.5" style={{ borderBottom: '1px solid color-mix(in oklab, var(--border) 50%, transparent)' }}>
                                <span className="text-sm flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                                    <User className="w-4 h-4" style={{ color: 'color-mix(in oklab, var(--brand) 60%, white 40%)' }} />
                                    Solicitante
                                </span>
                                <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                                    {req.user_name || req.user_email}
                                </span>
                            </div>
                            {/* Email */}
                            <div className="flex items-center justify-between py-3.5" style={{ borderBottom: '1px solid color-mix(in oklab, var(--border) 50%, transparent)' }}>
                                <span className="text-sm flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                                    <Mail className="w-4 h-4" style={{ color: 'color-mix(in oklab, var(--brand) 60%, white 40%)' }} />
                                    Email de Contacto
                                </span>
                                <span className="text-sm" style={{ color: 'var(--brand)' }}>
                                    {req.user_email}
                                </span>
                            </div>
                            {/* ID Interno */}
                            <div className="flex items-center justify-between py-3.5">
                                <span className="text-sm flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                                    <Hash className="w-4 h-4" style={{ color: 'color-mix(in oklab, var(--brand) 60%, white 40%)' }} />
                                    ID Interno
                                </span>
                                <span className="font-mono text-xs" style={{ color: 'color-mix(in oklab, var(--muted) 60%, transparent)' }}>
                                    {req.id}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Delivered Materials Card (shown when modified delivery exists) ─── */}
                {hasModifications && deliveredItems && (
                    <div className="ui-card rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        {/* Header */}
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(16, 185, 129, 0.04)' }}>
                            <h3 className="font-bold flex items-center gap-2.5" style={{ color: 'var(--foreground)' }}>
                                <PackageCheck className="w-5 h-5 text-emerald-400" />
                                Entrega Real
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <Edit3 className="w-3 h-3" />
                                    Modificada
                                </span>
                                <span className="text-xs font-mono px-2.5 py-1 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'rgb(52, 211, 153)' }}>
                                    {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
                                </span>
                            </div>
                        </div>

                        {/* Delivered Items List */}
                        <div>
                            {deliveredItems.map((item, idx: number) => {
                                // Find matching original item for diff
                                const originalItem = items.find(oi => oi.sku === item.sku && (oi.talla || oi.size || '') === (item.talla || item.size || ''));
                                const isNewInDelivery = !originalItem;
                                const qtyChanged = originalItem && originalItem.quantity !== item.quantity;

                                return (
                                    <div
                                        key={idx}
                                        className="p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 transition-colors order-detail-item-row"
                                        style={{
                                            borderBottom: idx < deliveredItems.length - 1 ? '1px solid color-mix(in oklab, var(--border) 50%, transparent)' : 'none',
                                        }}
                                    >
                                        {/* Thumbnail */}
                                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center" style={{ background: 'color-mix(in oklab, var(--surface) 80%, transparent)', border: '1px solid var(--border)' }}>
                                            {item.imagen ? (
                                                <Image
                                                    src={item.imagen}
                                                    alt={item.detail}
                                                    fill
                                                    className="object-cover"
                                                    sizes="64px"
                                                    unoptimized
                                                />
                                            ) : (
                                                <Package className="w-6 h-6" style={{ color: 'var(--muted)' }} />
                                            )}
                                        </div>

                                        {/* Item Details */}
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            <h4 className="font-semibold text-lg truncate" style={{ color: 'var(--foreground)' }} title={item.detail}>
                                                {item.detail}
                                            </h4>
                                            <div className="flex items-center gap-3 text-sm flex-wrap">
                                                {item.sku && (
                                                    <span className="font-mono text-xs px-2 py-0.5 rounded-md" style={{ color: 'var(--brand)', background: 'color-mix(in oklab, var(--brand) 10%, transparent)' }}>
                                                        {item.sku}
                                                    </span>
                                                )}
                                                {(item.talla || item.size) && (
                                                    <span className="text-xs px-2 py-0.5 rounded-md" style={{ color: '#c084fc', background: 'rgba(192,132,252, 0.08)' }}>
                                                        Talla {item.talla || item.size}
                                                    </span>
                                                )}
                                                {/* Diff badges */}
                                                {isNewInDelivery && (
                                                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                                                        Agregado en entrega
                                                    </span>
                                                )}
                                                {qtyChanged && (
                                                    <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                                                        Solicitado: {originalItem.quantity} → Entregado: {item.quantity}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quantity */}
                                        <div className="shrink-0 flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-2 md:pl-4">
                                            <span className="font-mono font-bold text-sm px-3 py-1.5 rounded-lg" style={{ background: 'color-mix(in oklab, var(--surface) 80%, transparent)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                                                × {item.quantity}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Show items that were NOT delivered from original */}
                            {items.filter(origItem => {
                                return !deliveredItems.some(di => di.sku === origItem.sku && (di.talla || di.size || '') === (origItem.talla || origItem.size || ''));
                            }).map((item, idx) => (
                                <div
                                    key={`not-delivered-${idx}`}
                                    className="p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 opacity-50"
                                    style={{
                                        borderBottom: '1px solid color-mix(in oklab, var(--border) 30%, transparent)',
                                    }}
                                >
                                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center" style={{ background: 'color-mix(in oklab, var(--surface) 80%, transparent)', border: '1px solid var(--border)' }}>
                                        <Package className="w-6 h-6" style={{ color: 'var(--muted)' }} />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <h4 className="font-semibold text-lg truncate line-through" style={{ color: 'var(--muted)' }} title={item.detail}>
                                            {item.detail}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm flex-wrap">
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 font-medium">
                                                No entregado
                                            </span>
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        <span className="font-mono text-sm text-red-400/60 line-through">× {item.quantity}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Materials Detail Card (Original Request) ──────────────────────── */}
                <details className="ui-card rounded-2xl overflow-hidden" {...(!hasModifications ? { open: true } : {})}>
                    {/* Header */}
                    <summary className="px-6 py-4 flex items-center justify-between cursor-pointer list-none" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in oklab, var(--surface) 40%, transparent)' }}>
                        <h3 className="font-bold flex items-center gap-2.5" style={{ color: 'var(--foreground)' }}>
                            <Package className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                            {hasModifications ? 'Solicitud Original' : 'Detalle de Materiales'}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in oklab, var(--brand) 12%, transparent)', color: 'var(--brand)' }}>
                                {items.reduce((acc, item) => acc + item.quantity, 0)} {items.reduce((acc, item) => acc + item.quantity, 0) === 1 ? 'ítem' : 'ítems'}
                            </span>
                            {hasModifications && (
                                <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                            )}
                        </div>
                    </summary>

                    {/* Items List */}
                    <div>
                        {items.length === 0 ? (
                            <div className="p-10 text-center italic" style={{ color: 'var(--muted)' }}>
                                No hay ítems registrados en este detalle.
                            </div>
                        ) : (
                            items.map((item, idx: number) => (
                                <div
                                    key={idx}
                                    className="p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 transition-colors order-detail-item-row"
                                    style={{
                                        borderBottom: idx < items.length - 1 ? '1px solid color-mix(in oklab, var(--border) 50%, transparent)' : 'none',
                                    }}
                                >
                                    {/* Thumbnail */}
                                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center" style={{ background: 'color-mix(in oklab, var(--surface) 80%, transparent)', border: '1px solid var(--border)' }}>
                                        {item.imagen ? (
                                            <Image
                                                src={item.imagen}
                                                alt={item.detail}
                                                fill
                                                className="object-cover"
                                                sizes="64px"
                                                unoptimized
                                            />
                                        ) : (
                                            <Package className="w-6 h-6" style={{ color: 'var(--muted)' }} />
                                        )}
                                    </div>

                                    {/* Item Details */}
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <h4 className="font-semibold text-lg truncate" style={{ color: 'var(--foreground)' }} title={item.detail}>
                                            {item.detail}
                                        </h4>
                                        <div className="flex items-center gap-3 text-sm flex-wrap">
                                            {item.sku && (
                                                <span className="font-mono text-xs px-2 py-0.5 rounded-md" style={{ color: 'var(--brand)', background: 'color-mix(in oklab, var(--brand) 10%, transparent)' }}>
                                                    {item.sku}
                                                </span>
                                            )}
                                            {item.brand && (
                                                <span className="text-xs px-2 py-0.5 rounded-md" style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.08)' }}>
                                                    {item.brand}
                                                </span>
                                            )}
                                            {item.size && (
                                                <span className="text-xs px-2 py-0.5 rounded-md" style={{ color: '#c084fc', background: 'rgba(192,132,252, 0.08)' }}>
                                                    Talla {item.size}
                                                </span>
                                            )}
                                            {item.value && item.value > 0 && (
                                                <span className="font-mono text-xs text-emerald-400">
                                                    {formatCLP(item.value)} c/u
                                                </span>
                                            )}
                                        </div>
                                        {item.notes && (
                                            <p className="text-sm italic flex items-start gap-2 mt-1 p-2 rounded-lg" style={{ color: '#fbbf24', background: 'rgba(251,191,36, 0.04)', border: '1px solid rgba(251,191,36,0.1)' }}>
                                                <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'rgba(251,191,36,0.5)' }} />
                                                {item.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* Quantity + Price + Action */}
                                    <div className="shrink-0 flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-2 md:pl-4" style={{ borderLeft: 'none' }}>
                                        {/* Quantity Badge */}
                                        <span className="font-mono font-bold text-sm px-3 py-1.5 rounded-lg" style={{ background: 'color-mix(in oklab, var(--surface) 80%, transparent)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                                            × {item.quantity}
                                        </span>

                                        {/* Total Price */}
                                        {item.value && item.value > 0 && (
                                            <div className="text-right">
                                                <span className="text-[10px] uppercase font-bold block" style={{ color: 'var(--muted)' }}>Total</span>
                                                <span className="font-mono text-emerald-400 font-bold text-base">
                                                    {formatCLP(item.value * item.quantity)}
                                                </span>
                                            </div>
                                        )}

                                        {/* View Link */}
                                        {item.sku ? (
                                            <Link
                                                href={`/inventory?q=${encodeURIComponent(item.sku)}`}
                                                className="inline-flex items-center gap-1.5 text-xs font-medium transition-all group/link"
                                                style={{ color: 'var(--brand)' }}
                                                title="Ver en inventario"
                                            >
                                                Ver Item <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                                            </Link>
                                        ) : (
                                            <Link
                                                href={`/inventory?q=${encodeURIComponent(item.detail)}`}
                                                className="inline-flex items-center gap-1.5 text-xs font-medium transition-all group/link"
                                                style={{ color: 'var(--brand)' }}
                                                title="Buscar en inventario"
                                            >
                                                Buscar <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Total Footer (only if has value) */}
                    {hasValue && !hasModifications && (
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)', background: 'color-mix(in oklab, var(--surface) 40%, transparent)' }}>
                            <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                                Total Solicitud
                            </span>
                            <span className="text-xl font-mono font-bold text-emerald-400">
                                {formatCLP(totalValue)}
                            </span>
                        </div>
                    )}
                </details>

                {/* ── General Notes (if any) ──────────────────────── */}
                {req.notes && (
                    <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.12)', borderLeft: '3px solid rgba(251,191,36,0.4)' }}>
                        <h4 className="font-bold text-sm uppercase flex items-center gap-2" style={{ color: '#fbbf24' }}>
                            <FileText className="w-4 h-4" /> Notas Generales
                        </h4>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(251,191,36,0.7)' }}>
                            {req.notes}
                        </p>
                    </div>
                )}

            </div>
        </main>
    );
}
