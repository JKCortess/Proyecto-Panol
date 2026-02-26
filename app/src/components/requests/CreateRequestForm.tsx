'use client'

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { requestSchema, RequestFormValues } from '@/app/requests/schema';
import { createRequest } from '@/app/requests/actions';
import { useCart, type CartItem } from '@/context/cart-context';
import { InventoryAutocomplete } from './InventoryAutocomplete';
import { type InventoryItem } from '@/app/requests/search-action';
import Image from 'next/image';
import {
    Plus,
    Trash2,
    Send,
    Loader2,
    ClipboardList,
    Building2,
    Briefcase,
    Package,
    ShoppingBasket,
    User,
    AlertTriangle,
    StickyNote,
    Link2,
    Ruler,
    Tag,
    X,
    CheckCircle2,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay';

const formatCLP = (value: number | undefined) => {
    if (!value) return "$0";
    return `$${value.toLocaleString("es-CL")}`;
};

interface CreateRequestFormProps {
    userEmail: string;
    userId: string;
    userName?: string | null;
    userArea?: string | null;
    userRole?: string;
}

// Sub-component to handle controlled autocomplete per item row
function ItemDetailField({ control, index, setValue }: {
    control: Control<RequestFormValues>;
    index: number;
    setValue: UseFormSetValue<RequestFormValues>;
}) {
    const detailValue = useWatch({ control, name: `items.${index}.detail` }) || '';

    const handleSelect = (item: InventoryItem) => {
        setValue(`items.${index}.detail`, item.nombre, { shouldValidate: true });
        setValue(`items.${index}.sku`, item.sku, { shouldValidate: true });
        setValue(`items.${index}.value`, item.valor || 0);
        setValue(`items.${index}.imagen`, item.imagen || '');
    };

    const handleAddUnlisted = (searchTerm: string) => {
        setValue(`items.${index}.detail`, searchTerm, { shouldValidate: true });
        setValue(`items.${index}.sku`, 'SIN-SKU', { shouldValidate: true });
        setValue(`items.${index}.value`, 0);
        setValue(`items.${index}.imagen`, '');
    };

    return (
        <InventoryAutocomplete
            value={detailValue}
            onChange={(val) => setValue(`items.${index}.detail`, val, { shouldValidate: true })}
            onSelect={handleSelect}
            onAddUnlisted={handleAddUnlisted}
            placeholder="Buscar componente..."
        />
    );
}

export function CreateRequestForm({ userEmail, userId, userName, userArea, userRole }: CreateRequestFormProps) {
    const router = useRouter();
    const { items: cartItems, clearCart } = useCart();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<{ success?: boolean; code?: string; error?: string; emailSent?: boolean; qrDataUrl?: string } | null>(null);
    const [cartLoaded, setCartLoaded] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<RequestFormValues | null>(null);

    const defaultArea = userArea || 'Mantención';

    const { register, control, handleSubmit, formState: { errors }, reset, setValue } = useForm<RequestFormValues>({
        resolver: zodResolver(requestSchema),
        defaultValues: {
            requester_name: userName || undefined,
            area: defaultArea as RequestFormValues['area'],
            items: [{ sku: '', detail: '', quantity: 1, notes: '', value: 0, imagen: '' }],
            general_notes: '',
        }
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "items"
    });

    const watchedItems = useWatch({ control, name: "items" });

    // Load cart items into the form on mount
    useEffect(() => {
        if (cartItems.length > 0 && !cartLoaded) {
            const cartFormItems = cartItems.map((item: CartItem) => ({
                sku: item.sku,
                detail: item.nombre,
                quantity: item.cantidad,
                notes: '',
                value: item.valor,
                imagen: item.imagen || '',
                talla: item.talla || '',
                marca: item.marca || '',
            }));
            replace(cartFormItems);
            setCartLoaded(true);
        }
    }, [cartItems, cartLoaded, replace]);
    // Step 1: Form validation passes -> show confirmation modal
    const onSubmit = async (data: RequestFormValues) => {
        setPendingFormData(data);
        setShowConfirmModal(true);
    };

    // Step 2: User confirms in modal -> actually send the request
    const handleConfirmedSubmit = async () => {
        if (!pendingFormData) return;
        setShowConfirmModal(false);
        setIsSubmitting(true);
        setSubmitResult(null);
        try {
            const result = await createRequest(pendingFormData, userEmail, userId, userName || undefined);
            if (result.success) {
                setSubmitResult({ success: true, code: result.code, emailSent: result.emailSent, qrDataUrl: result.qrDataUrl });
                clearCart();
            } else {
                setSubmitResult({ error: result.error });
            }
        } catch {
            setSubmitResult({ error: 'Ocurrió un error inesperado.' });
        } finally {
            setIsSubmitting(false);
            setPendingFormData(null);
        }
    };

    const handleCancelConfirm = () => {
        setShowConfirmModal(false);
        setPendingFormData(null);
    };



    // Success Screen
    if (submitResult?.success) {
        return (
            <div className="max-w-2xl mx-auto p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ClipboardList className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Solicitud enviada con éxito</h2>
                <p className="text-slate-400">
                    Tu código de seguimiento es: <strong className="text-blue-400 font-mono text-lg">{submitResult.code}</strong>
                </p>
                {/* QR Code */}
                {submitResult.code && (
                    <div className="py-4">
                        <QRCodeDisplay
                            value={submitResult.code}
                            size={160}
                            label="Presenta este QR al retirar"
                        />
                    </div>
                )}

                {submitResult.emailSent ? (
                    <p className="text-sm text-green-500/70">
                        Se ha enviado un correo de confirmación a {userEmail}
                    </p>
                ) : (
                    <p className="text-sm text-amber-500/70">
                        Las notificaciones por correo no están configuradas. Guarda tu código de seguimiento.
                    </p>
                )}
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={() => {
                            setSubmitResult(null);
                            setCartLoaded(true); // Prevent cart from re-loading
                            reset({
                                area: defaultArea as RequestFormValues['area'],
                                items: [{ sku: '', detail: '', quantity: 1, notes: '', value: 0, imagen: '' }],
                                general_notes: '',
                            });
                        }}
                        className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
                    >
                        Nueva Solicitud
                    </button>
                    <button
                        onClick={() => router.push('/my-orders')}
                        className="px-6 py-2.5 bg-slate-800 hover:bg-blue-600/20 border border-slate-700 hover:border-blue-500/50 text-slate-200 hover:text-blue-300 rounded-lg font-medium transition-all flex items-center gap-2"
                    >
                        <ClipboardList className="w-4 h-4" />
                        Ir a Mis Pedidos
                    </button>
                </div>
            </div>
        );
    }

    const hasCartItems = cartItems.length > 0 && cartLoaded;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Cart Integration Banner */}
            {hasCartItems && (
                <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-start gap-3 animate-in fade-in duration-300">
                    <ShoppingBasket className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-blue-300 font-medium text-sm">
                            Se cargaron <strong>{cartItems.length}</strong> item(s) desde tu carrito.
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                            Puedes modificar cantidades, agregar notas o añadir más items antes de enviar.
                        </p>
                    </div>
                </div>
            )}

            {/* No Profile Warning */}
            {!userName && (
                <div className="p-4 bg-amber-600/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-amber-300 font-medium text-sm">
                            No has completado tu perfil.
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                            Completa tu perfil para que tu nombre y área aparezcan automáticamente.
                        </p>
                    </div>
                    <Link
                        href="/profile"
                        className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
                    >
                        <Link2 className="w-3 h-3" />
                        Completar Perfil
                    </Link>
                </div>
            )}

            {/* Requestor Info */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Building2 className="w-5 h-5 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Información del Solicitante</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nombre</label>
                        <div className="relative">
                            <User className="icon-left icon-left-sm text-slate-500" />
                            <input
                                {...register('requester_name')}
                                disabled={userRole !== 'Administrador'}
                                placeholder={userName || 'Sin nombre (completa tu perfil)'}
                                className={cn(
                                    "w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2.5 input-with-icon pr-3 text-sm",
                                    userRole === 'Administrador' ? "cursor-text text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50" : "cursor-not-allowed text-slate-400"
                                )}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Correo</label>
                        <input
                            disabled
                            value={userEmail}
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-400 cursor-not-allowed text-sm font-mono"
                        />
                    </div>

                    {/* Area */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Área <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Briefcase className="icon-left icon-left-sm text-slate-500" />
                            <select
                                {...register('area')}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 input-with-icon pr-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none text-sm"
                            >
                                <option value="Mantención">Mantención</option>
                                <option value="SADEMA">SADEMA</option>
                                <option value="Packing">Packing</option>
                                <option value="Frío">Frío</option>
                                <option value="Administración">Administración</option>
                                <option value="Otro">Otro</option>
                            </select>
                            {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area.message}</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Items List - Shopping Cart Style */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <ShoppingBasket className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Detalle de Solicitud</h3>
                            <p className="text-xs text-slate-500">Revisa los ítems antes de confirmar</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => append({ sku: '', detail: '', quantity: 1, notes: '', value: 0, imagen: '' })}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar Item
                    </button>
                </div>

                <div className="overflow-x-auto -mx-2 px-2 rounded-lg border border-slate-800">
                    <table className="w-full text-sm text-left mobile-card-table">
                        <thead className="bg-slate-950 text-slate-400 font-medium uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 w-32">SKU</th>
                                <th className="px-4 py-3">Descripción</th>
                                <th className="px-4 py-3 w-24 text-center">Cant.</th>
                                <th className="px-4 py-3 w-32 text-right">Precio Unit.</th>
                                <th className="px-4 py-3 w-32 text-right">Total</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                            {fields.map((field, index) => {
                                const currentQty = watchedItems?.[index]?.quantity || 0;
                                const currentValue = watchedItems?.[index]?.value || 0;
                                const subtotal = currentQty * currentValue;

                                const currentImagen = watchedItems?.[index]?.imagen;

                                return (
                                    <tr key={field.id} className="group hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex items-center gap-2">
                                                {currentImagen ? (
                                                    <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-700 shrink-0 bg-slate-800">
                                                        <Image
                                                            src={currentImagen}
                                                            alt=""
                                                            width={40}
                                                            height={40}
                                                            className="w-full h-full object-cover"
                                                            unoptimized
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-md border border-slate-800 shrink-0 bg-slate-900 flex items-center justify-center">
                                                        <Package className="w-4 h-4 text-slate-700" />
                                                    </div>
                                                )}
                                                <input
                                                    {...register(`items.${index}.sku` as const)}
                                                    placeholder="SKU"
                                                    className="w-full bg-transparent border-none text-slate-300 placeholder:text-slate-600 focus:ring-0 p-0 font-mono text-xs"
                                                    readOnly={!!field.sku}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top space-y-2">
                                            <ItemDetailField
                                                control={control}
                                                index={index}
                                                setValue={setValue}
                                            />
                                            {errors.items?.[index]?.detail && (
                                                <p className="text-xs text-red-500">{errors.items[index]?.detail?.message}</p>
                                            )}
                                            {/* Marca & Talla badges */}
                                            {(watchedItems?.[index]?.marca || watchedItems?.[index]?.talla) && (
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {watchedItems?.[index]?.marca && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                                            <Tag className="w-2.5 h-2.5" />
                                                            {watchedItems[index].marca}
                                                        </span>
                                                    )}
                                                    {watchedItems?.[index]?.talla && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                            <Ruler className="w-2.5 h-2.5" />
                                                            {watchedItems[index].talla}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <input
                                                {...register(`items.${index}.notes` as const)}
                                                placeholder="Agregar nota (opcional)..."
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-xs text-slate-400 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-700"
                                            />
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <input
                                                type="number"
                                                min={1}
                                                {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                                                className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-2 text-center text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                                            />
                                            {errors.items?.[index]?.quantity && (
                                                <p className="text-xs text-red-500 text-center mt-1">{errors.items[index]?.quantity?.message}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top text-right text-slate-400 font-mono">
                                            {formatCLP(currentValue)}
                                        </td>
                                        <td className="px-4 py-3 align-top text-right font-medium text-emerald-400 font-mono">
                                            {formatCLP(subtotal)}
                                        </td>
                                        <td className="px-4 py-3 align-top text-right">
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                disabled={fields.length === 1}
                                                className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-30 p-1"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-950/50">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right text-slate-400 text-xs font-medium uppercase tracking-wider">
                                    Total Estimado
                                </td>
                                <td className="px-4 py-3 text-right text-lg font-bold text-emerald-400 font-mono">
                                    {formatCLP(
                                        (watchedItems || []).reduce((acc, item) => {
                                            const qty = item?.quantity || 0;
                                            const val = item?.value || 0;
                                            return acc + (qty * val);
                                        }, 0)
                                    )}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* General Notes */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                        <StickyNote className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Notas Generales</h3>
                    <span className="text-xs text-slate-600">(opcional)</span>
                </div>
                <textarea
                    {...register('general_notes')}
                    rows={3}
                    placeholder="Agrega instrucciones especiales, contexto de la orden de trabajo, urgencia, etc."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-slate-600 resize-none"
                />
            </div>

            {/* Global Error */}
            {submitResult?.error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                    {submitResult.error}
                </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-600">
                    {fields.length} ítem(s) · Área: {defaultArea}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Enviar Solicitud
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && pendingFormData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleCancelConfirm}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

                    {/* Modal */}
                    <div
                        className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/40 w-full max-w-lg max-h-[85vh] overflow-hidden animate-in zoom-in-95 fade-in duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Confirmar Solicitud</h3>
                                    <p className="text-xs text-slate-500">Revisa el resumen antes de enviar</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelConfirm}
                                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[55vh]">
                            {/* Requester Info */}
                            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                                <User className="w-4 h-4 text-slate-400" />
                                <div className="text-sm">
                                    <span className="text-slate-300 font-medium">{pendingFormData.requester_name || userName || 'Sin nombre'}</span>
                                    <span className="text-slate-600 mx-2">·</span>
                                    <span className="text-slate-500">{pendingFormData.area}</span>
                                </div>
                            </div>

                            {/* Items Summary */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ítems ({pendingFormData.items.length})</p>
                                <div className="space-y-1.5">
                                    {pendingFormData.items.map((item, i) => {
                                        const subtotal = (item.quantity || 0) * (item.value || 0);
                                        return (
                                            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-800/30 rounded-lg border border-slate-800">
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                                                        {item.imagen ? (
                                                            <Image src={item.imagen} alt="" width={32} height={32} className="w-full h-full object-cover rounded-md" unoptimized />
                                                        ) : (
                                                            <Package className="w-3.5 h-3.5 text-slate-600" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-slate-200 truncate">{item.detail || 'Sin descripción'}</p>
                                                        <p className="text-xs text-slate-500 font-mono">{item.sku || 'Sin SKU'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0 ml-3">
                                                    <p className="text-sm font-medium text-slate-300">x{item.quantity}</p>
                                                    <p className="text-xs text-emerald-400 font-mono">{formatCLP(subtotal)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                                <span className="text-sm font-medium text-slate-400">Total Estimado</span>
                                <span className="text-lg font-bold text-emerald-400 font-mono">
                                    {formatCLP(
                                        pendingFormData.items.reduce((acc, item) => {
                                            return acc + ((item.quantity || 0) * (item.value || 0));
                                        }, 0)
                                    )}
                                </span>
                            </div>

                            {/* Notes */}
                            {pendingFormData.general_notes && (
                                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                                    <p className="text-xs font-semibold text-amber-400/80 mb-1">Notas generales</p>
                                    <p className="text-sm text-slate-400">{pendingFormData.general_notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelConfirm}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmedSubmit}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/30 transition-all transform active:scale-95"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Confirmar y Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}

