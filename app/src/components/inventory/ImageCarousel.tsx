"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Package, X, ZoomIn } from "lucide-react";
import { createPortal } from "react-dom";

interface ImageCarouselProps {
    fotos: string[];
    alt: string;
    marca?: string;
}

/* ========================================================================
 *  LIGHTBOX MODAL — Full-screen image viewer with zoom + navigation
 * ====================================================================== */
function ImageLightbox({
    fotos,
    alt,
    initialIndex,
    onClose,
}: {
    fotos: string[];
    alt: string;
    initialIndex: number;
    onClose: () => void;
}) {
    const [current, setCurrent] = useState(initialIndex);
    const [isLoading, setIsLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const panStart = useRef({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const wasDragged = useRef(false);
    const total = fotos.length;

    const MIN_ZOOM = 1;
    const MAX_ZOOM = 5;
    const ZOOM_STEP = 0.3;

    // Reset zoom when switching images
    useEffect(() => {
        setIsLoading(true);
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [current]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Escape":
                    handleClose();
                    break;
                case "ArrowRight":
                    setCurrent((prev) => (prev + 1) % total);
                    break;
                case "ArrowLeft":
                    setCurrent((prev) => (prev - 1 + total) % total);
                    break;
                case "+":
                case "=":
                    setZoom((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
                    break;
                case "-":
                    setZoom((prev) => {
                        const newZoom = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
                        if (newZoom === 1) setPan({ x: 0, y: 0 });
                        return newZoom;
                    });
                    break;
                case "0":
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total]);

    // Mouse wheel zoom on image container
    useEffect(() => {
        const container = imageContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
            setZoom((prev) => {
                const newZoom = Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM);
                if (newZoom === 1) setPan({ x: 0, y: 0 });
                return newZoom;
            });
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => container.removeEventListener("wheel", handleWheel);
    }, []);

    // ─── Touch support for mobile ───
    const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
    const pinchStartDist = useRef<number | null>(null);
    const pinchStartZoom = useRef<number>(1);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Pinch start
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDist.current = Math.hypot(dx, dy);
            pinchStartZoom.current = zoom;
            return;
        }
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
            if (zoom > 1) {
                setIsDragging(true);
                wasDragged.current = false;
                dragStart.current = { x: touch.clientX, y: touch.clientY };
                panStart.current = { ...pan };
            }
        }
    }, [zoom, pan]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDist.current !== null) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const scale = dist / pinchStartDist.current;
            const newZoom = Math.min(Math.max(pinchStartZoom.current * scale, MIN_ZOOM), MAX_ZOOM);
            setZoom(newZoom);
            if (newZoom === 1) setPan({ x: 0, y: 0 });
            return;
        }
        if (e.touches.length === 1 && zoom > 1 && isDragging) {
            const touch = e.touches[0];
            const dx = touch.clientX - dragStart.current.x;
            const dy = touch.clientY - dragStart.current.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                wasDragged.current = true;
            }
            setPan({
                x: panStart.current.x + dx,
                y: panStart.current.y + dy,
            });
        }
    }, [zoom, isDragging]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        pinchStartDist.current = null;
        setIsDragging(false);

        if (!touchStart.current || wasDragged.current) {
            wasDragged.current = false;
            return;
        }

        // Swipe detection (only when not zoomed)
        if (zoom <= 1 && e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const dx = touch.clientX - touchStart.current.x;
            const dy = touch.clientY - touchStart.current.y;
            const elapsed = Date.now() - touchStart.current.time;

            if (Math.abs(dx) > 50 && Math.abs(dy) < 100 && elapsed < 400) {
                if (dx < 0) {
                    // Swipe left → next
                    setCurrent((prev) => (prev + 1) % total);
                } else {
                    // Swipe right → prev
                    setCurrent((prev) => (prev - 1 + total) % total);
                }
            }
        }
        touchStart.current = null;
    }, [zoom, total]);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => onClose(), 200);
    }, [onClose]);

    const goNext = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrent((prev) => (prev + 1) % total);
    }, [total]);

    const goPrev = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrent((prev) => (prev - 1 + total) % total);
    }, [total]);

    // Click on image: toggle zoom between 1x and 2x
    const handleImageClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (wasDragged.current) {
            wasDragged.current = false;
            return;
        }
        setZoom((prev) => {
            if (prev > 1) {
                setPan({ x: 0, y: 0 });
                return 1;
            }
            return 2;
        });
    }, []);

    // Pan (drag) when zoomed in
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        wasDragged.current = false;
        dragStart.current = { x: e.clientX, y: e.clientY };
        panStart.current = { ...pan };
    }, [zoom, pan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || zoom <= 1) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            wasDragged.current = true;
        }
        setPan({
            x: panStart.current.x + dx,
            y: panStart.current.y + dy,
        });
    }, [isDragging, zoom]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const lightboxContent = (
        <div
            className={`fixed inset-0 z-[9999] transition-all duration-200 ${isClosing ? "opacity-0" : "opacity-100"
                }`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            role="dialog"
            aria-modal="true"
            aria-label={`Visor de imagen: ${alt}`}
        >
            {/* Backdrop — clickable to close */}
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-md z-[1] cursor-pointer"
                onClick={handleClose}
            />

            {/* Top bar: title + close — stops propagation */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-8 py-4 z-30"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-mono px-3 py-1.5 rounded-lg bg-white/10 text-white/80 backdrop-blur-sm border border-white/10">
                        {current + 1} / {total}
                    </span>
                    <span className="text-sm font-medium text-white/70 hidden sm:block max-w-md truncate">
                        {alt}
                    </span>
                    {/* Zoom level badge */}
                    {zoom > 1 && (
                        <span className="text-xs font-bold font-mono px-2 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {Math.round(zoom * 100)}%
                        </span>
                    )}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all active:scale-90"
                    aria-label="Cerrar visor"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Main image area — pointer-events-none lets clicks pass through to backdrop */}
            <div
                ref={imageContainerRef}
                className={`absolute inset-0 flex items-center justify-center z-10 pointer-events-none ${isClosing ? "scale-95" : "scale-100"
                    } transition-transform duration-200`}
                style={{ top: 60, bottom: 80 }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Loading spinner */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    key={current}
                    src={fotos[current]}
                    alt={`${alt} - Foto ${current + 1}`}
                    className={`max-w-[90vw] max-h-[80vh] object-contain rounded-xl shadow-2xl select-none pointer-events-auto transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"
                        }`}
                    style={{
                        transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.3s',
                        cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                    }}
                    draggable={false}
                    onClick={handleImageClick}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(e);
                    }}
                    onLoad={() => setIsLoading(false)}
                    onError={() => setIsLoading(false)}
                />
            </div>

            {/* Navigation arrows — stop propagation individually */}
            {total > 1 && (
                <>
                    <button
                        onClick={goPrev}
                        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all active:scale-90"
                        aria-label="Foto anterior"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={goNext}
                        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all active:scale-90"
                        aria-label="Foto siguiente"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* Bottom: thumbnail strip — stops propagation */}
            {total > 1 && (
                <div
                    className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                >
                    {fotos.map((foto, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrent(index)}
                            className={`rounded-lg overflow-hidden transition-all duration-200 border-2 ${index === current
                                ? "border-blue-500 ring-2 ring-blue-500/30 scale-110"
                                : "border-transparent opacity-50 hover:opacity-80"
                                }`}
                            aria-label={`Ir a foto ${index + 1}`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={foto}
                                alt={`Miniatura ${index + 1}`}
                                className="w-12 h-12 sm:w-14 sm:h-14 object-cover"
                                loading="lazy"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Keyboard hint */}
            <div
                className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 z-30 hidden sm:flex items-center gap-2 text-[10px] text-white/30"
                onClick={(e) => e.stopPropagation()}
            >
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono">←</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono">→</span>
                <span>navegar</span>
                <span className="ml-2 px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono">scroll</span>
                <span>zoom</span>
                <span className="ml-2 px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-mono">ESC</span>
                <span>cerrar</span>
            </div>
        </div>
    );

    // Use portal to render at document root (avoids z-index issues)
    if (typeof document !== "undefined") {
        return createPortal(lightboxContent, document.body);
    }
    return null;
}

/* ========================================================================
 *  IMAGE CAROUSEL — Card-level image display with lightbox trigger
 * ====================================================================== */
export function ImageCarousel({ fotos, alt, marca }: ImageCarouselProps) {
    const [current, setCurrent] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fallback: if onLoad never fires (e.g. cached image), force isLoading to false
    useEffect(() => {
        setIsLoading(true);
        setHasError(false);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [current]);

    const total = fotos.length;

    const goNext = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrent((prev) => (prev + 1) % total);
    }, [total]);

    const goPrev = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrent((prev) => (prev - 1 + total) % total);
    }, [total]);

    const goTo = useCallback((index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrent(index);
    }, []);

    const openLightbox = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (total > 0 && !hasError) {
            setLightboxOpen(true);
        }
    }, [total, hasError]);

    // No photos: show placeholder icon
    if (total === 0) {
        return (
            <div className="aspect-square w-full bg-slate-950 relative p-6 flex items-center justify-center group-hover:bg-slate-950/80 transition-colors">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]"></div>
                <Package className="w-16 h-16 text-slate-800 relative z-10" />
                {marca && (
                    <div className="absolute bottom-2 left-2 z-10">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700/50 backdrop-blur-sm">
                            {marca}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // Single photo: static image with lightbox
    if (total === 1) {
        return (
            <>
                <div
                    className="aspect-square w-full bg-slate-950 relative flex items-center justify-center group-hover:bg-slate-950/80 transition-colors overflow-hidden cursor-zoom-in"
                    onClick={openLightbox}
                >
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]"></div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={fotos[0]}
                        alt={alt}
                        className="object-contain w-full h-full p-4 relative z-10 transform transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onLoad={() => setIsLoading(false)}
                        onError={() => { setIsLoading(false); setHasError(true); }}
                    />
                    {isLoading && !hasError && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    )}
                    {hasError && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <Package className="w-16 h-16 text-slate-700" />
                        </div>
                    )}
                    {/* Zoom hint */}
                    {!hasError && !isLoading && (
                        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-7 h-7 rounded-md bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                                <ZoomIn className="w-3.5 h-3.5 text-white/70" />
                            </div>
                        </div>
                    )}
                    {marca && (
                        <div className="absolute bottom-2 left-2 z-10">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700/50 backdrop-blur-sm">
                                {marca}
                            </span>
                        </div>
                    )}
                </div>

                {/* Lightbox */}
                {lightboxOpen && (
                    <ImageLightbox
                        fotos={fotos}
                        alt={alt}
                        initialIndex={0}
                        onClose={() => setLightboxOpen(false)}
                    />
                )}
            </>
        );
    }

    // Multiple photos: carousel with lightbox
    return (
        <>
            <div className="aspect-square w-full bg-slate-950 relative flex items-center justify-center group-hover:bg-slate-950/80 transition-colors overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]"></div>

                {/* Current Image — clickable to open lightbox */}
                <div
                    className="relative w-full h-full p-4 flex items-center justify-center cursor-zoom-in"
                    onClick={openLightbox}
                >
                    {isLoading && !hasError && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    )}
                    {hasError ? (
                        <Package className="w-16 h-16 text-slate-700 relative z-10" />
                    ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            key={current}
                            src={fotos[current]}
                            alt={`${alt} - Foto ${current + 1}`}
                            className={`object-contain w-full h-full rounded-lg shadow-lg relative z-10 transition-all duration-300 ${isLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
                                }`}
                            onLoad={() => {
                                setIsLoading(false);
                                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                            }}
                            onError={() => {
                                setIsLoading(false);
                                setHasError(true);
                                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                            }}
                        />
                    )}

                    {/* Zoom hint on hover */}
                    {!hasError && !isLoading && (
                        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="w-7 h-7 rounded-md bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                                <ZoomIn className="w-3.5 h-3.5 text-white/70" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Counter Badge */}
                <div className="absolute top-2 left-2 z-20">
                    <span className="text-[10px] font-bold font-mono px-2 py-1 rounded-md bg-black/60 text-white/80 backdrop-blur-sm border border-white/10">
                        {current + 1}/{total}
                    </span>
                </div>

                {/* Prev Button */}
                <button
                    onClick={goPrev}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90"
                    aria-label="Foto anterior"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Next Button */}
                <button
                    onClick={goNext}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90"
                    aria-label="Foto siguiente"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>

                {/* Dots Indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
                    {fotos.map((_, index) => (
                        <button
                            key={index}
                            onClick={(e) => goTo(index, e)}
                            className={`rounded-full transition-all duration-200 ${index === current
                                ? "w-5 h-2 bg-blue-500"
                                : "w-2 h-2 bg-white/30 hover:bg-white/50"
                                }`}
                            aria-label={`Ir a foto ${index + 1}`}
                        />
                    ))}
                </div>

                {/* Brand Badge */}
                {marca && (
                    <div className="absolute bottom-10 left-2 z-20">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700/50 backdrop-blur-sm">
                            {marca}
                        </span>
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <ImageLightbox
                    fotos={fotos}
                    alt={alt}
                    initialIndex={current}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </>
    );
}
