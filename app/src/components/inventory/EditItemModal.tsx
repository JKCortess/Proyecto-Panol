"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    X,
    Save,
    Loader2,
    Package,
    MapPin,
    DollarSign,
    FileText,
    Layers,
    Tag,
    Truck,
    CheckCircle2,
    Pencil,
    AlertTriangle,
    ShieldCheck,
    ArrowRight,
    Type,
} from "lucide-react";
import Image from "next/image";
import { updateInventoryItem, type InventoryItemUpdate } from "@/app/inventory/actions";

// Human-readable labels for change summary
const FIELD_LABELS: Record<string, string> = {
    nombre: "Nombre",
    stock: "Stock",
    rop: "Mín. (ROP)",
    valor_aprox_clp: "Valor aprox (CLP)",
    valor_spex: "Valor SPEX",
    estante_nro: "Estante Nro",
    estante_nivel: "Nivel Estante",
    descripcion_general: "Descripción",
    observacion: "Observación",
    categoria: "Categoría",
    marca: "Marca",
    proveedor: "Proveedor",
};

interface EditItemModalProps {
    open: boolean;
    onClose: () => void;
    item: {
        sku: string;
        nombre: string;
        talla?: string;
        foto?: string;
        marca?: string;
        categoria?: string;
        stock: number;
        rop: number;
        valor_aprox_clp: number;
        valor_spex: number;
        estante_nro: string;
        estante_nivel: string;
        descripcion_general: string;
        observacion: string;
        proveedor: string;
    };
    onSaved?: () => void;
}

export function EditItemModal({ open, onClose, item, onSaved }: EditItemModalProps) {
    const [saving, setSaving] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Form state
    const [nombre, setNombre] = useState(item.nombre);
    const [stock, setStock] = useState(item.stock);
    const [rop, setRop] = useState(item.rop);
    const [valorAprox, setValorAprox] = useState(item.valor_aprox_clp);
    const [valorSpex, setValorSpex] = useState(item.valor_spex);
    const [estanteNro, setEstanteNro] = useState(item.estante_nro);
    const [estanteNivel, setEstanteNivel] = useState(item.estante_nivel);
    const [descripcion, setDescripcion] = useState(item.descripcion_general);
    const [observacion, setObservacion] = useState(item.observacion);
    const [categoria, setCategoria] = useState(item.categoria || "");
    const [marca, setMarca] = useState(item.marca || "");
    const [proveedor, setProveedor] = useState(item.proveedor || "");

    // Reset form when item changes
    useEffect(() => {
        setNombre(item.nombre);
        setStock(item.stock);
        setRop(item.rop);
        setValorAprox(item.valor_aprox_clp);
        setValorSpex(item.valor_spex);
        setEstanteNro(item.estante_nro);
        setEstanteNivel(item.estante_nivel);
        setDescripcion(item.descripcion_general);
        setObservacion(item.observacion);
        setCategoria(item.categoria || "");
        setMarca(item.marca || "");
        setProveedor(item.proveedor || "");
        setShowConfirm(false);
    }, [item]);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !saving) {
                if (showConfirm) {
                    setShowConfirm(false);
                } else {
                    onClose();
                }
            }
        };
        if (open) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [open, saving, showConfirm, onClose]);

    // Compute changed fields for confirmation summary
    const changedFields = useMemo(() => {
        const changes: { field: string; label: string; oldValue: string | number; newValue: string | number }[] = [];
        if (nombre !== item.nombre) changes.push({ field: "nombre", label: FIELD_LABELS.nombre, oldValue: item.nombre, newValue: nombre });
        if (stock !== item.stock) changes.push({ field: "stock", label: FIELD_LABELS.stock, oldValue: item.stock, newValue: stock });
        if (rop !== item.rop) changes.push({ field: "rop", label: FIELD_LABELS.rop, oldValue: item.rop, newValue: rop });
        if (valorAprox !== item.valor_aprox_clp) changes.push({ field: "valor_aprox_clp", label: FIELD_LABELS.valor_aprox_clp, oldValue: item.valor_aprox_clp, newValue: valorAprox });
        if (valorSpex !== item.valor_spex) changes.push({ field: "valor_spex", label: FIELD_LABELS.valor_spex, oldValue: item.valor_spex, newValue: valorSpex });
        if (estanteNro !== item.estante_nro) changes.push({ field: "estante_nro", label: FIELD_LABELS.estante_nro, oldValue: item.estante_nro || "-", newValue: estanteNro || "-" });
        if (estanteNivel !== item.estante_nivel) changes.push({ field: "estante_nivel", label: FIELD_LABELS.estante_nivel, oldValue: item.estante_nivel || "-", newValue: estanteNivel || "-" });
        if (descripcion !== item.descripcion_general) changes.push({ field: "descripcion_general", label: FIELD_LABELS.descripcion_general, oldValue: item.descripcion_general || "-", newValue: descripcion || "-" });
        if (observacion !== item.observacion) changes.push({ field: "observacion", label: FIELD_LABELS.observacion, oldValue: item.observacion || "-", newValue: observacion || "-" });
        if (categoria !== (item.categoria || "")) changes.push({ field: "categoria", label: FIELD_LABELS.categoria, oldValue: item.categoria || "-", newValue: categoria || "-" });
        if (marca !== (item.marca || "")) changes.push({ field: "marca", label: FIELD_LABELS.marca, oldValue: item.marca || "-", newValue: marca || "-" });
        if (proveedor !== (item.proveedor || "")) changes.push({ field: "proveedor", label: FIELD_LABELS.proveedor, oldValue: item.proveedor || "-", newValue: proveedor || "-" });
        return changes;
    }, [nombre, stock, rop, valorAprox, valorSpex, estanteNro, estanteNivel, descripcion, observacion, categoria, marca, proveedor, item]);

    const handleRequestSave = useCallback(() => {
        if (changedFields.length === 0) {
            toast.info("No hay cambios para guardar.");
            return;
        }
        setShowConfirm(true);
    }, [changedFields]);

    const handleConfirmSave = useCallback(async () => {
        setSaving(true);

        const updates: InventoryItemUpdate = {};
        if (nombre !== item.nombre) updates.nombre = nombre;
        if (stock !== item.stock) updates.stock = stock;
        if (rop !== item.rop) updates.rop = rop;
        if (valorAprox !== item.valor_aprox_clp) updates.valor_aprox_clp = valorAprox;
        if (valorSpex !== item.valor_spex) updates.valor_spex = valorSpex;
        if (estanteNro !== item.estante_nro) updates.estante_nro = estanteNro;
        if (estanteNivel !== item.estante_nivel) updates.estante_nivel = estanteNivel;
        if (descripcion !== item.descripcion_general) updates.descripcion_general = descripcion;
        if (observacion !== item.observacion) updates.observacion = observacion;
        if (categoria !== (item.categoria || "")) updates.categoria = categoria;
        if (marca !== (item.marca || "")) updates.marca = marca;
        if (proveedor !== (item.proveedor || "")) updates.proveedor = proveedor;

        try {
            const result = await updateInventoryItem(item.sku, updates, item.talla);
            if (result.error) {
                toast.error(result.error);
                setShowConfirm(false);
            } else {
                toast.success(`"${nombre}" actualizado exitosamente.`, {
                    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
                });
                onSaved?.();
                onClose();
            }
        } catch {
            toast.error("Error inesperado al guardar.");
            setShowConfirm(false);
        } finally {
            setSaving(false);
        }
    }, [nombre, stock, rop, valorAprox, valorSpex, estanteNro, estanteNivel, descripcion, observacion, categoria, marca, proveedor, item, onSaved, onClose]);

    // Standard input class (no icon)
    const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all";

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !saving && !showConfirm && onClose()}
                    />

                    {/* Modal */}
                    <motion.div
                        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl shadow-black/30"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 rounded-t-2xl">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                {item.foto ? (
                                    <Image src={item.foto} alt={item.nombre} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                                ) : (
                                    <Package className="w-6 h-6 text-slate-400" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Pencil className="w-4 h-4 text-amber-500 shrink-0" />
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">Editar Ítem</h2>
                                </div>
                                <p className="text-sm text-slate-500 truncate" title={item.nombre}>
                                    {item.nombre} {item.talla && <span className="text-purple-400 font-mono">({item.talla})</span>}
                                </p>
                                <p className="text-xs font-mono text-slate-400">SKU: {item.sku}</p>
                            </div>
                            <button
                                onClick={() => !saving && onClose()}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                disabled={saving}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Confirmation Overlay */}
                        <AnimatePresence>
                            {showConfirm && (
                                <motion.div
                                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-2xl"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <motion.div
                                        className="mx-4 w-full max-w-md bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                                <ShieldCheck className="w-5 h-5 text-amber-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirmar Cambios</h3>
                                                <p className="text-xs text-slate-500">Revisa los cambios antes de guardar</p>
                                            </div>
                                        </div>

                                        {/* Changes Summary */}
                                        <div className="space-y-2 max-h-60 overflow-y-auto mb-5 pr-1">
                                            {changedFields.map((change) => (
                                                <div key={change.field} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 min-w-[80px] shrink-0">{change.label}</span>
                                                    <span className="text-xs font-mono text-red-400 line-through truncate max-w-[120px]" title={String(change.oldValue)}>{String(change.oldValue)}</span>
                                                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                                    <span className="text-xs font-mono text-emerald-400 font-bold truncate max-w-[120px]" title={String(change.newValue)}>{String(change.newValue)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => setShowConfirm(false)}
                                                disabled={saving}
                                                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-all disabled:opacity-50"
                                            >
                                                Volver
                                            </button>
                                            <button
                                                onClick={handleConfirmSave}
                                                disabled={saving}
                                                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
                                            >
                                                {saving ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Guardando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShieldCheck className="w-4 h-4" />
                                                        Confirmar y Guardar
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-6">

                            {/* Section: Nombre */}
                            <div>
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-3 tracking-wider">
                                    <Type className="w-3.5 h-3.5" />
                                    Identificación
                                </h3>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Nombre del Ítem</label>
                                    <input
                                        type="text"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            {/* Section: Stock & Precio */}
                            <div>
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-3 tracking-wider">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    Stock y Precio
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Stock Actual</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={stock}
                                            onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                                            className={`${inputCls} font-mono`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Mín. (ROP)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={rop}
                                            onChange={(e) => setRop(Math.max(0, parseInt(e.target.value) || 0))}
                                            className={`${inputCls} font-mono`}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Valor aprox (CLP)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={valorAprox}
                                            onChange={(e) => setValorAprox(Math.max(0, parseInt(e.target.value) || 0))}
                                            className={`${inputCls} font-mono`}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Valor confirmado SPEX</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={valorSpex}
                                            onChange={(e) => setValorSpex(Math.max(0, parseInt(e.target.value) || 0))}
                                            className={`${inputCls} font-mono`}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 italic">La columna “Valor” del Google Sheet se calcula automáticamente.</p>
                            </div>

                            {/* Section: Ubicación */}
                            <div>
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-3 tracking-wider">
                                    <MapPin className="w-3.5 h-3.5" />
                                    Ubicación
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Estante Nro</label>
                                        <input
                                            type="text"
                                            value={estanteNro}
                                            onChange={(e) => setEstanteNro(e.target.value)}
                                            placeholder="Ej: 28"
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Nivel de Estante</label>
                                        <input
                                            type="text"
                                            value={estanteNivel}
                                            onChange={(e) => setEstanteNivel(e.target.value)}
                                            placeholder="Ej: 2"
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Clasificación */}
                            <div>
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-3 tracking-wider">
                                    <Tag className="w-3.5 h-3.5" />
                                    Clasificación
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Categoría</label>
                                        <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Marca</label>
                                        <input type="text" value={marca} onChange={(e) => setMarca(e.target.value)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Proveedor</label>
                                        <input type="text" value={proveedor} onChange={(e) => setProveedor(e.target.value)} className={inputCls} />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Información */}
                            <div>
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-3 tracking-wider">
                                    <FileText className="w-3.5 h-3.5" />
                                    Información
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Descripción General</label>
                                        <textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${inputCls} resize-none`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Observación</label>
                                        <textarea rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} className={`${inputCls} resize-none`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
                            <button
                                onClick={() => !saving && onClose()}
                                disabled={saving}
                                className="px-4 py-2.5 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRequestSave}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="w-4 h-4" />
                                Guardar Cambios
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
