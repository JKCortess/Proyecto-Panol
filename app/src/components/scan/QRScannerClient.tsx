'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    ScanLine, Search, Package, MapPin, Layers, CheckCircle2,
    XCircle, Clock, AlertTriangle, ArrowLeft, Loader2, Keyboard,
    Camera, Truck, Hash, CameraOff, ExternalLink, ChevronDown, RefreshCw
} from 'lucide-react';
import Image from 'next/image';
import { lookupRequestByCode, deliverRequest } from '@/app/(app)/requests/actions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type EnrichedItem = {
    sku: string;
    detail: string;
    quantity: number;
    talla?: string;
    marca?: string;
    notes?: string;
    value?: number;
    stock_actual: number | null;
    estante_nro: string | null;
    estante_nivel: string | null;
    nombre_inventario: string | null;
    categoria: string | null;
    foto: string | null;
};

type RequestResult = {
    id: string;
    request_code: string;
    user_name: string | null;
    user_email: string | null;
    area: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    enriched_items: EnrichedItem[];
};

type ViewState = 'scanner' | 'result' | 'delivered';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'Pendiente': { label: 'Pendiente', color: 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/10 border-yellow-300 dark:border-yellow-500/30', icon: <Clock className="w-3.5 h-3.5" /> },
    'Aceptada': { label: 'Aceptada', color: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    'Alerta': { label: 'Contactar', color: 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/30', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    'Entregada': { label: 'Entregada', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    'Cancelada': { label: 'Cancelada', color: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/10 border-red-300 dark:border-red-500/30', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const CAMERA_PREF_KEY = 'preferred-camera-id';

export function QRScannerClient() {
    const [viewState, setViewState] = useState<ViewState>('scanner');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [delivering, setDelivering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<RequestResult | null>(null);
    const [scannerActive, setScannerActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(CAMERA_PREF_KEY);
        }
        return null;
    });
    const html5QrcodeRef = useRef<any>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isMountedRef = useRef(true);

    // Track mount state
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopScanner();
        };
    }, []);

    // Enumerate available cameras on mount
    const loadCameras = useCallback(async () => {
        try {
            // Need a brief getUserMedia call first so labels become available
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
            tempStream.getTracks().forEach(t => t.stop());

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            if (isMountedRef.current) {
                setCameras(videoDevices);
                // If stored preference is no longer valid, clear it
                const storedId = localStorage.getItem(CAMERA_PREF_KEY);
                if (storedId && !videoDevices.some(d => d.deviceId === storedId)) {
                    localStorage.removeItem(CAMERA_PREF_KEY);
                    setSelectedCameraId(null);
                }
            }
        } catch (e) {
            console.warn('Could not enumerate cameras:', e);
        }
    }, []);

    const stopScanner = useCallback(async () => {
        if (html5QrcodeRef.current) {
            try {
                const state = html5QrcodeRef.current.getState();
                // State 2 = SCANNING, State 3 = PAUSED
                if (state === 2 || state === 3) {
                    await html5QrcodeRef.current.stop();
                }
            } catch (e) {
                // Ignore stop errors
            }
            html5QrcodeRef.current = null;
        }
        if (isMountedRef.current) {
            setScannerActive(false);
        }
    }, []);

    const isSecureContext = typeof window !== 'undefined' && (
        window.isSecureContext ||
        window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    );

    const startScanner = useCallback(async () => {
        // Check for secure context FIRST — camera requires HTTPS on mobile
        if (!isSecureContext) {
            setCameraError(
                `La cámara requiere conexión HTTPS. Estás accediendo por HTTP (${window.location.origin}). ` +
                `Usa el ingreso manual del código o accede desde https://... para usar la cámara.`
            );
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError('Tu navegador no soporta acceso a la cámara. Usa el ingreso manual del código.');
            return;
        }

        if (html5QrcodeRef.current) {
            await stopScanner();
        }

        setCameraError(null);

        // Show the container first so html5-qrcode can find it
        setScannerActive(true);

        // Wait for React to flush the render (container becomes display:block)
        await new Promise(r => setTimeout(r, 200));

        if (!videoContainerRef.current) {
            setScannerActive(false);
            return;
        }

        try {
            const { Html5Qrcode } = await import('html5-qrcode');

            // Create instance using the container ID
            const qrScanner = new Html5Qrcode('qr-video-container');
            html5QrcodeRef.current = qrScanner;

            // If we haven't enumerated cameras yet, do it now
            if (cameras.length === 0) {
                await loadCameras();
            }

            const cameraConfig = selectedCameraId
                ? { deviceId: { exact: selectedCameraId } }
                : { facingMode: 'environment' };

            await qrScanner.start(
                cameraConfig,
                {
                    fps: 10,
                    qrbox: { width: 220, height: 220 },
                    aspectRatio: 1,
                },
                (decodedText: string) => {
                    // On successful scan
                    const cleaned = decodedText.trim();
                    if (cleaned) {
                        stopScanner();
                        handleLookup(cleaned);
                    }
                },
                () => {
                    // QR code not found in frame — ignore, keep scanning
                }
            );
        } catch (err: any) {
            console.error('Camera error:', err);
            const msg = typeof err === 'string' ? err : err?.message || 'Error desconocido';

            if (msg.includes('not supported') || msg.includes('Camera streaming not supported')) {
                setCameraError(
                    `La cámara no es compatible con este navegador en HTTP. ` +
                    `Accede vía HTTPS o usa el ingreso manual del código.`
                );
            } else if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
                setCameraError('Permiso de cámara denegado. Habilita el acceso en la configuración del navegador.');
            } else if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
                setCameraError('No se encontró cámara disponible en este dispositivo.');
            } else if (msg.includes('NotReadableError') || msg.includes('Could not start')) {
                setCameraError('La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.');
            } else {
                setCameraError(`No se pudo iniciar la cámara: ${msg}`);
            }

            if (isMountedRef.current) {
                setScannerActive(false);
            }
            html5QrcodeRef.current = null;
        }
    }, [stopScanner, isSecureContext, selectedCameraId, cameras.length, loadCameras]);

    const handleLookup = async (lookupCode?: string) => {
        const searchCode = lookupCode || code;
        if (!searchCode.trim()) return;

        setLoading(true);
        setError(null);
        await stopScanner();

        try {
            const res = await lookupRequestByCode(searchCode);
            if ('error' in res && res.error) {
                setError(res.error);
            } else if (res.success && res.request) {
                setResult(res.request as RequestResult);
                setViewState('result');
            }
        } catch {
            setError('Error al buscar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    const handleDeliver = async () => {
        if (!result) return;

        setDelivering(true);
        try {
            const deliveryDate = new Date().toISOString();
            const res = await deliverRequest(result.id, deliveryDate);

            if (res && 'error' in res && res.error) {
                toast.error(res.error);
            } else {
                setViewState('delivered');
                toast.success(`Solicitud ${result.request_code} entregada exitosamente`);
            }
        } catch {
            toast.error('Error al entregar la solicitud');
        } finally {
            setDelivering(false);
        }
    };

    const handleReset = () => {
        setViewState('scanner');
        setCode('');
        setResult(null);
        setError(null);
        setCameraError(null);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const canDeliver = result && !['Entregada', 'Cancelada', 'Eliminada'].includes(result.status);

    // ══════════ SCANNER VIEW ══════════
    if (viewState === 'scanner') {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
                        <ScanLine className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Escáner QR</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Escanear Código QR</h1>
                    <p className="text-slate-400 text-sm max-w-md mx-auto">
                        Escanea el código QR de la solicitud o ingresa el código manualmente para ver los detalles y entregar.
                    </p>
                </div>

                {/* Camera Scanner */}
                <div className="ui-card rounded-2xl overflow-hidden border-l-4 border-l-blue-500">
                    <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/70 flex items-center gap-3 flex-wrap">
                        <Camera className="w-5 h-5 text-blue-400" />
                        <h2 className="font-semibold text-white text-sm">Cámara</h2>

                        {/* Camera selector dropdown — only shown when >1 camera */}
                        {cameras.length > 1 && (
                            <div className="relative">
                                <select
                                    value={selectedCameraId || ''}
                                    onChange={async (e) => {
                                        const newId = e.target.value || null;
                                        setSelectedCameraId(newId);
                                        if (newId) {
                                            localStorage.setItem(CAMERA_PREF_KEY, newId);
                                        } else {
                                            localStorage.removeItem(CAMERA_PREF_KEY);
                                        }
                                        // Restart scanner with new camera if active
                                        if (scannerActive) {
                                            await stopScanner();
                                            // Small delay to let cleanup finish
                                            setTimeout(() => startScanner(), 300);
                                        }
                                    }}
                                    className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs font-medium cursor-pointer hover:border-blue-500/50 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                                >
                                    <option value="">Auto (trasera)</option>
                                    {cameras.map((cam, i) => (
                                        <option key={cam.deviceId} value={cam.deviceId}>
                                            {cam.label || `Cámara ${i + 1}`}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            </div>
                        )}

                        {isSecureContext && !scannerActive ? (
                            <button
                                onClick={startScanner}
                                className="ml-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                            >
                                Activar cámara
                            </button>
                        ) : isSecureContext && scannerActive ? (
                            <button
                                onClick={stopScanner}
                                className="ml-auto px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <CameraOff className="w-4 h-4" />
                                Detener
                            </button>
                        ) : null}
                    </div>
                    <div className="p-4">
                        {/* Placeholder shown when scanner is NOT active — rendered OUTSIDE the scanner container */}
                        {!scannerActive && !cameraError && (
                            <div
                                onClick={isSecureContext ? startScanner : undefined}
                                className={cn(
                                    "rounded-xl overflow-hidden mx-auto max-w-sm min-h-[200px] flex items-center justify-center bg-slate-900/50 border-2 border-dashed border-slate-700",
                                    isSecureContext && "cursor-pointer hover:bg-slate-800/50 hover:border-blue-500/40 transition-all"
                                )}
                            >
                                <div className="text-center p-6">
                                    {!isSecureContext ? (
                                        <>
                                            <CameraOff className="w-12 h-12 text-amber-500/60 mx-auto mb-3" />
                                            <p className="text-amber-400 text-sm font-semibold mb-1">Cámara no disponible (HTTP)</p>
                                            <p className="text-slate-500 text-xs">La cámara requiere HTTPS. Usa el ingreso manual abajo.</p>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-12 h-12 text-blue-500/40 mx-auto mb-3" />
                                            <p className="text-slate-400 text-sm">Presiona aquí o &quot;Activar cámara&quot; para escanear</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* This div is exclusively for html5-qrcode — React must NOT render children here */}
                        <div
                            ref={videoContainerRef}
                            id="qr-video-container"
                            className="rounded-xl overflow-hidden mx-auto max-w-sm"
                            style={{ minHeight: scannerActive ? '280px' : '0px', display: scannerActive ? 'block' : 'none' }}
                        />

                        {cameraError && (
                            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-400 text-sm font-semibold mb-1">Error de cámara</p>
                                    <p className="text-red-400/80 text-xs">{cameraError}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Manual Input */}
                <div className="ui-card rounded-2xl overflow-hidden border-l-4 border-l-purple-500">
                    <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/70 flex items-center gap-3">
                        <Keyboard className="w-5 h-5 text-purple-400" />
                        <h2 className="font-semibold text-white text-sm">Ingreso manual</h2>
                    </div>
                    <div className="p-5">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleLookup();
                            }}
                            className="flex gap-3"
                        >
                            <div className="relative flex-1">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Ej: 482917"
                                    className="w-full h-12 input-with-icon pr-4 rounded-xl border border-slate-700 bg-slate-900 text-white text-lg font-mono placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                    autoComplete="off"
                                    inputMode="numeric"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!code.trim() || loading}
                                className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-semibold text-sm transition-colors flex items-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                                Buscar
                            </button>
                        </form>

                        {error && (
                            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ══════════ RESULT VIEW ══════════
    if (viewState === 'result' && result) {
        const statusConfig = STATUS_CONFIG[result.status] || STATUS_CONFIG['Pendiente'];
        const totalItems = result.enriched_items.reduce((s, i) => s + i.quantity, 0);

        return (
            <div className="space-y-5">
                {/* Back Button */}
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Escanear otro código
                </button>

                {/* Request Header */}
                <div className="ui-card rounded-2xl overflow-hidden border-l-4 border-l-blue-500">
                    <div className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-3xl font-bold text-white font-mono">
                                        {result.request_code}
                                    </span>
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                                        statusConfig.color
                                    )}>
                                        {statusConfig.icon}
                                        {statusConfig.label}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                                    <span>👤 {result.user_name || 'Sin nombre'}</span>
                                    <span>🏭 {result.area || 'Sin área'}</span>
                                    <span>📦 {totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                                    <span>📅 {new Date(result.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            {canDeliver && (
                                <button
                                    onClick={handleDeliver}
                                    disabled={delivering}
                                    className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30 shrink-0"
                                >
                                    {delivering ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Truck className="w-5 h-5" />
                                    )}
                                    Entregar
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Items Detail */}
                <div className="ui-card rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/70">
                        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-400" />
                            Detalle de ítems ({result.enriched_items.length})
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-800">
                        {result.enriched_items.map((item, i) => (
                            <div key={i} className="p-4 hover:bg-slate-900/40 transition-colors">
                                <div className="flex flex-col md:flex-row md:items-start gap-3">
                                    {/* Product image */}
                                    <div className="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                        {item.foto ? (
                                            <Image src={item.foto} alt={item.nombre_inventario || item.detail} width={56} height={56} className="object-cover w-full h-full" unoptimized />
                                        ) : (
                                            <Package className="w-6 h-6 text-slate-600" />
                                        )}
                                    </div>
                                    {/* Item info */}
                                    <div className="flex-1 min-w-0">
                                        {item.sku && (
                                            <p className="text-xs font-mono text-blue-400 font-bold tracking-wide mb-0.5">
                                                {item.sku}
                                            </p>
                                        )}
                                        <p className="text-white font-semibold text-sm leading-snug mb-1.5">
                                            {item.nombre_inventario || item.detail}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {item.marca && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold">
                                                    {item.marca}
                                                </span>
                                            )}
                                            {item.talla && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold font-mono">
                                                    Talla: {item.talla}
                                                </span>
                                            )}
                                            {item.categoria && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[10px] font-bold">
                                                    {item.categoria}
                                                </span>
                                            )}
                                        </div>
                                        {/* View in inventory link */}
                                        {item.sku && (
                                            <a
                                                href={`/inventory?q=${encodeURIComponent(item.sku)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold hover:bg-blue-500/20 hover:border-blue-400/30 transition-colors w-fit"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Ver en inventario
                                            </a>
                                        )}
                                    </div>

                                    {/* Qty + Location + Stock */}
                                    <div className="flex items-start gap-3 shrink-0">
                                        {/* Quantity */}
                                        <div className="text-center px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 min-w-[60px]">
                                            <p className="text-xl font-extrabold text-blue-400 leading-none">{item.quantity}</p>
                                            <p className="text-[9px] uppercase tracking-wider text-blue-400/70 font-bold mt-0.5">
                                                {item.quantity > 1 ? 'uds' : 'ud'}
                                            </p>
                                        </div>

                                        {/* Location */}
                                        <div className="text-center px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 min-w-[80px]">
                                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                                <MapPin className="w-3 h-3 text-amber-400" />
                                                <span className="text-[9px] uppercase tracking-wider text-amber-400/70 font-bold">Ubic.</span>
                                            </div>
                                            {item.estante_nro ? (
                                                <p className="text-sm font-bold text-amber-300 font-mono leading-none">
                                                    E{item.estante_nro} / N{item.estante_nivel || '?'}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-500 italic">Sin ubic.</p>
                                            )}
                                        </div>

                                        {/* Stock */}
                                        <div className={cn(
                                            "text-center px-3 py-2 rounded-xl border min-w-[60px]",
                                            item.stock_actual !== null && item.stock_actual > 0
                                                ? item.stock_actual >= item.quantity
                                                    ? "bg-emerald-500/10 border-emerald-500/20"
                                                    : "bg-orange-500/10 border-orange-500/20"
                                                : "bg-red-500/10 border-red-500/20"
                                        )}>
                                            <div className="flex items-center justify-center gap-1 mb-0.5">
                                                <Layers className="w-3 h-3 text-slate-400" />
                                                <span className="text-[9px] uppercase tracking-wider text-slate-400/70 font-bold">Stock</span>
                                            </div>
                                            <p className={cn(
                                                "text-lg font-extrabold leading-none font-mono",
                                                item.stock_actual !== null && item.stock_actual > 0
                                                    ? item.stock_actual >= item.quantity
                                                        ? "text-emerald-400"
                                                        : "text-orange-400"
                                                    : "text-red-400"
                                            )}>
                                                {item.stock_actual ?? '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                {result.notes && (
                    <div className="ui-card rounded-2xl overflow-hidden p-4">
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">📝 Notas</p>
                        <p className="text-sm text-slate-300">{result.notes}</p>
                    </div>
                )}

                {/* Bottom Deliver CTA (mobile) */}
                {canDeliver && (
                    <div className="md:hidden pb-4">
                        <button
                            onClick={handleDeliver}
                            disabled={delivering}
                            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                        >
                            {delivering ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Truck className="w-5 h-5" />
                            )}
                            Entregar solicitud {result.request_code}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ══════════ DELIVERED VIEW ══════════
    if (viewState === 'delivered' && result) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                        <CheckCircle2 className="w-14 h-14 text-emerald-400" />
                    </div>
                    <div className="absolute -inset-3 rounded-full border-2 border-emerald-500/20 animate-ping" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">¡Entrega exitosa!</h2>
                    <p className="text-slate-400 text-sm">
                        La solicitud <span className="font-mono text-blue-400 font-bold">{result.request_code}</span> ha sido marcada como entregada.
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                        Solicitante: {result.user_name || 'Sin nombre'} • {result.area || 'Sin área'}
                    </p>
                </div>
                <button
                    onClick={handleReset}
                    className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-colors flex items-center gap-2"
                >
                    <ScanLine className="w-5 h-5" />
                    Escanear otro código
                </button>
            </div>
        );
    }

    return null;
}
