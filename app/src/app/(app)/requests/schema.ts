import { z } from 'zod';

export const requestItemSchema = z.object({
    sku: z.string().optional(),
    detail: z.string().min(1, 'Debes indicar el detalle del item'),
    quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
    notes: z.string().optional(),
    value: z.number().optional(),
    imagen: z.string().optional(),
    talla: z.string().optional(),
    marca: z.string().optional(),
});

export const requestSchema = z.object({
    area: z.enum(['Mantención', 'SADEMA', 'Packing', 'Frío', 'Administración', 'Otro'] as const),
    items: z.array(requestItemSchema).min(1, 'Agrega al menos un item.'),
    general_notes: z.string().optional(),
    requester_name: z.string().optional(),
});

export type RequestFormValues = z.infer<typeof requestSchema>;
