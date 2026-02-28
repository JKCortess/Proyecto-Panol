'use server'

import { createClient } from '@/utils/supabase/server';
import { requestSchema, RequestFormValues } from './schema';
import { syncStockToSheets, restoreStockInSheets } from '@/lib/sheets-mutations';
import { invalidateInventoryCache } from '@/lib/data';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { getActiveWebhookUrl } from '@/app/(app)/admin/webhook-actions';
import { generateQRCodeDataUrl, uploadQRToStorage, deleteQRFromStorage } from '@/lib/qr-utils';

// Generate a random 6-digit numeric code
const generateRequestCode = () => {
    // Generate a random number between 100000 and 999999
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
};

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const toHtmlEntities = (value: string) =>
    escapeHtml(value).replace(/[^\x00-\x7F]/g, (char) => `&#${char.charCodeAt(0)};`);

async function sendPurchaseWebhook(payload: unknown, webhookUrl: string) {
    const webhookUrls = [webhookUrl];
    if (webhookUrl.includes('/webhook-test/')) {
        webhookUrls.push(webhookUrl.replace('/webhook-test/', '/webhook/'));
    }

    let lastError = 'Unknown webhook error';
    const payloadJson = JSON.stringify(payload);

    for (const webhookUrl of webhookUrls) {
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: payloadJson,
                cache: 'no-store',
                signal: AbortSignal.timeout(15000),
            });

            if (response.ok) {
                return response;
            }

            const errorBody = await response.text().catch(() => '');
            lastError = `${response.status} ${response.statusText}${errorBody ? ` | ${errorBody.slice(0, 300)}` : ''}`;
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
        }
    }

    throw new Error(lastError);
}

export async function createRequest(
    data: RequestFormValues,
    userEmail: string,
    userId: string,
    userName?: string
) {
    // 1. Validate input
    const validatedFields = requestSchema.safeParse(data);

    if (!validatedFields.success) {
        return { error: 'Campos inválidos', details: validatedFields.error.flatten() };
    }

    const supabase = await createClient();
    const requestCode = generateRequestCode();
    // Generate QR code data URL for embedding in email and returning to client
    const qrDataUrl = await generateQRCodeDataUrl(requestCode, 180);
    const finalUserName = data.requester_name || userName || null;

    // Upload QR code to Supabase Storage (public bucket)
    let qrImageUrl = '';
    try {
        qrImageUrl = await uploadQRToStorage(requestCode);
    } catch (qrUploadError) {
        console.error('QR upload to storage failed (non-blocking):', qrUploadError);
    }

    // Fetch user phone from profile
    let userPhone: string | null = null;
    try {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('telefono')
            .eq('id', userId)
            .single();
        userPhone = profile?.telefono || null;
    } catch (phoneError) {
        console.error('Could not fetch user phone:', phoneError);
    }

    try {
        // 2. Insert into database
        const { error: dbError } = await supabase
            .from('material_requests')
            .insert({
                request_code: requestCode,
                user_id: userId,
                user_email: userEmail,
                user_name: finalUserName,
                area: data.area,
                items_detail: data.items,
                notes: data.general_notes || null,
                status: 'Pendiente',
            });

        if (dbError) {
            console.error('Database Error:', dbError);
            return { error: 'Error de base de datos: No se pudo crear la solicitud.' };
        }

        // 3. Build Email HTML
        const totalItems = data.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalValue = data.items.reduce((sum, item) => sum + (item.quantity * (item.value || 0)), 0);
        const formatCLP = (v: number) => v > 0 ? `$${v.toLocaleString('es-CL')}` : '-';

        const now = new Date();
        const fecha = now.toLocaleDateString('es-CL', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        }) + ', ' + now.toLocaleTimeString('es-CL', {
            hour: '2-digit', minute: '2-digit', hour12: false,
        }) + ' hrs';
        const safeUserName = toHtmlEntities(finalUserName || 'No especificado');
        const safeUserEmail = toHtmlEntities(userEmail);
        const safeArea = toHtmlEntities(data.area);
        const safeFecha = toHtmlEntities(fecha);

        // Build item cards (each item as a clean card without images)
        const itemCardsHtml = data.items.map((item, i) => {
            const subtotal = item.quantity * (item.value || 0);
            const hasTalla = item.talla && item.talla.trim();
            const hasMarca = item.marca && item.marca.trim();
            const hasNotes = item.notes && item.notes.trim();
            const badgesHtml = [
                hasMarca ? `<span style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-right: 4px;">&#128196; ${toHtmlEntities(item.marca!)}</span>` : '',
                hasTalla ? `<span style="display: inline-block; background: #f3e8ff; color: #7c3aed; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; font-family: 'Courier New', monospace;">&#128207; Talla: ${toHtmlEntities(item.talla!)}</span>` : '',
            ].filter(Boolean).join(' ');

            return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 0;" width="100%">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                        <tr>
                            <td class="item-cell" style="padding: 14px 18px; vertical-align: top;">
                                <table class="item-inner" width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <p style="margin: 0 0 2px 0; font-family: 'Courier New', monospace; color: #3b82f6; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">${toHtmlEntities(item.sku || '---')}</p>
                                            <p style="margin: 0 0 6px 0; color: #0f172a; font-size: 14px; font-weight: 700; line-height: 1.3; word-break: break-word;">${toHtmlEntities(item.detail)}</p>
                                            ${badgesHtml ? `<div style="margin-bottom: 6px;">${badgesHtml}</div>` : ''}
                                            ${hasNotes ? `<p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.4; font-style: italic;">&#128221; ${toHtmlEntities(item.notes!)}</p>` : ''}
                                        </td>
                                        <td class="item-qty-col" width="110" style="vertical-align: top; text-align: right;">
                                            <div class="item-qty-box" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 6px 10px; text-align: center; display: inline-block;">
                                                <p style="margin: 0; color: #0c4a6e; font-size: 20px; font-weight: 800; line-height: 1;">${item.quantity}</p>
                                                <p style="margin: 2px 0 0 0; color: #0369a1; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">unidad${item.quantity > 1 ? 'es' : ''}</p>
                                            </div>
                                            ${item.value && item.value > 0 ? `
                                            <p style="margin: 6px 0 0 0; color: #64748b; font-size: 11px; text-align: center;">${formatCLP(item.value || 0)} c/u</p>
                                            <p style="margin: 2px 0 0 0; color: #059669; font-size: 13px; font-weight: 700; text-align: center;">${formatCLP(subtotal)}</p>
                                            ` : ''}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>`;
        }).join('');

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    @media only screen and (max-width: 480px) {
        .email-wrapper { padding: 12px 6px !important; }
        .email-header { padding: 28px 20px 24px !important; }
        .email-header h1 { font-size: 20px !important; }
        .code-banner { padding: 16px 16px !important; }
        .code-banner-table td { display: block !important; width: 100% !important; text-align: center !important; }
        .code-banner-code { margin-top: 10px !important; }
        .info-section { padding: 20px 16px !important; }
        .info-table td { display: block !important; width: 100% !important; padding: 0 0 14px 0 !important; }
        .info-table td:last-child { padding-bottom: 0 !important; }
        .items-header { padding: 20px 16px 8px !important; }
        .items-body { padding: 8px 16px 16px !important; }
        .item-cell { padding: 12px 14px !important; }
        .item-inner td { display: block !important; width: 100% !important; text-align: left !important; }
        .item-qty-col { margin-top: 10px !important; display: inline-flex !important; gap: 8px; align-items: center; }
        .item-qty-box { display: inline-block !important; }
        .total-section { padding: 0 16px 16px 16px !important; }
        .total-inner td { display: block !important; width: 100% !important; text-align: left !important; }
        .total-amount { text-align: left !important; margin-top: 4px; }
        .notes-section { padding: 0 16px 16px 16px !important; }
        .status-section { padding: 16px !important; }
        .status-table td { display: block !important; width: 100% !important; text-align: center !important; }
        .status-date { margin-top: 8px !important; text-align: center !important; }
        .qr-section { padding: 20px 16px !important; }
    }
</style>
</head>
<body style="margin: 0; padding: 0; background: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
    <div class="email-wrapper" style="max-width: 680px; margin: 0 auto; padding: 32px 16px;">
        
        <!-- Header -->
        <div class="email-header" style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e293b 100%); padding: 40px 32px 36px; border-radius: 20px 20px 0 0; text-align: center; position: relative;">
            <div style="margin-bottom: 12px;">
                <span style="display: inline-block; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">Gesti&oacute;n de Pa&ntilde;ol</span>
            </div>
            <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Solicitud de Materiales</h1>
            <p style="color: #64748b; margin: 0; font-size: 13px;">Confirmaci&oacute;n de recepci&oacute;n de tu solicitud</p>
            <div style="width: 48px; height: 3px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); margin: 16px auto 0; border-radius: 2px;"></div>
        </div>

        <!-- Code Banner -->
        <div class="code-banner" style="background: linear-gradient(90deg, #1e293b 0%, #0f1d32 100%); padding: 22px 32px; border-bottom: 3px solid #3b82f6;">
            <table class="code-banner-table" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align: middle;">
                    <p style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 2px 0; font-weight: 600;">C&oacute;digo de Seguimiento</p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">Conserva este c&oacute;digo para consultas</p>
                </td>
                <td class="code-banner-code" style="text-align: right; vertical-align: middle;">
                    <span style="display: inline-block; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.25); color: #60a5fa; font-family: 'Courier New', monospace; font-size: 22px; font-weight: 800; letter-spacing: 3px; padding: 10px 20px; border-radius: 10px;">${requestCode}</span>
                </td>
            </tr></table>
        </div>

        <!-- Body -->
        <div style="background: #ffffff; padding: 0; border-radius: 0 0 20px 20px; overflow: hidden;">
            
            <!-- Solicitante Info -->
            <div class="info-section" style="padding: 24px 32px; border-bottom: 1px solid #e2e8f0; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);">
                <table class="info-table" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="vertical-align: top; padding: 0 12px 0 0;">
                            <p style="margin: 0 0 4px 0; color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">&#128100; Solicitante</p>
                            <p style="margin: 0; color: #0f172a; font-size: 15px; font-weight: 700; word-break: break-word;">${safeUserName}</p>
                            <p style="margin: 4px 0 0 0; color: #3b82f6; font-size: 12px; font-weight: 500; word-break: break-all;">${safeUserEmail}</p>
                        </td>
                        <td style="vertical-align: top; padding: 0 12px 0 0;">
                            <p style="margin: 0 0 4px 0; color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">&#127970; &Aacute;rea</p>
                            <div style="display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 700;">${safeArea}</div>
                        </td>
                        <td style="vertical-align: top; text-align: center; white-space: nowrap;">
                            <p style="margin: 0 0 4px 0; color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">&#128230; Items</p>
                            <p style="margin: 0; color: #3b82f6; font-size: 28px; font-weight: 800; line-height: 1;">${totalItems}</p>
                            <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 10px; font-weight: 500;">${data.items.length} l&iacute;nea${data.items.length > 1 ? 's' : ''}</p>
                        </td>
                        ${totalValue > 0 ? `
                        <td style="vertical-align: top; text-align: center; white-space: nowrap;">
                            <p style="margin: 0 0 4px 0; color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">&#128176; Valor</p>
                            <p style="margin: 0; color: #059669; font-size: 15px; font-weight: 800; line-height: 1;">${formatCLP(totalValue)}</p>
                        </td>` : ''}
                    </tr>
                </table>
            </div>

            <!-- Items Section -->
            <div class="items-header" style="padding: 24px 32px 8px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td>
                            <h2 style="color: #0f172a; font-size: 15px; margin: 0; font-weight: 800; letter-spacing: -0.3px;">
                                Detalle de &Iacute;tems Solicitados
                            </h2>
                        </td>
                        <td style="text-align: right;">
                            <span style="display: inline-block; background: #eff6ff; color: #2563eb; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">${data.items.length} producto${data.items.length > 1 ? 's' : ''}</span>
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Item Cards -->
            <div class="items-body" style="padding: 8px 32px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <tbody>
                        ${itemCardsHtml}
                    </tbody>
                </table>
            </div>

            ${totalValue > 0 ? `
            <!-- Total Summary -->
            <div class="total-section" style="padding: 0 32px 24px 32px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px;">
                            <table class="total-inner" width="100%"><tr>
                                <td style="color: #166534; font-size: 13px; font-weight: 600;">&#128178; Total Estimado</td>
                                <td class="total-amount" style="text-align: right; color: #059669; font-size: 18px; font-weight: 800; font-family: 'Courier New', monospace;">${formatCLP(totalValue)}</td>
                            </tr></table>
                        </td>
                    </tr>
                </table>
            </div>` : ''}

            ${data.general_notes ? `
            <!-- General Notes -->
            <div class="notes-section" style="padding: 0 32px 24px 32px;">
                <div style="background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); border: 1px solid #fde68a; border-radius: 10px; padding: 14px 18px; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0 0 6px 0; color: #92400e; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">&#128221; Notas Generales</p>
                    <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">${toHtmlEntities(data.general_notes)}</p>
                </div>
            </div>` : ''}

            <!-- Status & Date -->
            <div class="status-section" style="padding: 16px 32px; background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border-top: 1px solid #e2e8f0;">
                <table class="status-table" width="100%"><tr>
                    <td style="vertical-align: middle;">
                        <span style="display: inline-block; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; border: 1px solid #fbbf24;">&#9203; Pendiente de revisi&oacute;n</span>
                    </td>
                    <td class="status-date" style="text-align: right; vertical-align: middle;">
                        <p style="margin: 0; color: #64748b; font-size: 11px; font-weight: 500;">&#128197; ${safeFecha}</p>
                    </td>
                </tr></table>
            </div>

            <!-- QR Code -->
            <div class="qr-section" style="padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 6px 0; color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">C&oacute;digo QR de Seguimiento</p>
                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 11px;">Presenta este QR al momento de retirar</p>
                <div style="display: inline-block; background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 10px;">
                    <img src="${qrDataUrl}" alt="QR ${requestCode}" width="140" height="140" style="display: block; border-radius: 6px;" />
                </div>
                <p style="margin: 8px 0 0 0; color: #3b82f6; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 800; letter-spacing: 3px;">${requestCode}</p>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 24px 0 8px;">
            <div style="width: 40px; height: 2px; background: linear-gradient(90deg, transparent, #475569, transparent); margin: 0 auto 12px;"></div>
            <p style="color: #64748b; font-size: 12px; margin: 0 0 4px 0; font-weight: 700; letter-spacing: 0.3px;">Gesti&oacute;n de Pa&ntilde;ol &mdash; Dole Molina</p>
            <p style="color: #475569; font-size: 11px; margin: 0;">Este es un correo autom&aacute;tico. No responder a este mensaje.</p>
        </div>
    </div>
</body>
</html>
        `;

        // 4. Send Webhook to n8n (Email Automation)
        // We prefer n8n to handle email dispatching (User confirmation + Admin alert)
        let emailSent = false;
        let webhookSent = false;

        try {
            const payload = {
                type: 'new_request',
                request_code: requestCode,
                recipient_email: userEmail,
                recipient_name: finalUserName,
                recipient_phone: userPhone,
                qr_image_url: qrImageUrl,
                area: data.area,
                email_html: emailHtml,
                raw_data: {
                    items: data.items,
                    notes: data.general_notes,
                    total_items: totalItems,
                    date: fecha
                },
                meta: {
                    source: 'Gestión de Pañol App',
                    env: process.env.NODE_ENV
                }
            };

            const activeWebhookUrl = await getActiveWebhookUrl();
            const response = await sendPurchaseWebhook(payload, activeWebhookUrl);
            webhookSent = response.ok;
            emailSent = response.ok;
            console.log(`Webhook n8n enviado para ${requestCode} (${response.url})`);
        } catch (webhookError) {
            console.error('Webhook n8n falló:', webhookError);
        }

        if (!webhookSent && process.env.RESEND_API_KEY) {
            try {
                const resend = new Resend(process.env.RESEND_API_KEY);
                const recipient = process.env.RESEND_TO_OVERRIDE || userEmail;
                await resend.emails.send({
                    from: 'onboarding@resend.dev',
                    to: [recipient],
                    subject: `Confirmación de Solicitud #${requestCode}`,
                    html: emailHtml,
                });
                emailSent = true;
            } catch (e) {
                console.error('Resend fallback also failed:', e);
            }
        }

        revalidatePath('/requests');
        return { success: true, code: requestCode, emailSent, webhookSent, qrDataUrl, qrImageUrl };

    } catch (error) {
        console.error('Server Action Error:', error);
        return { error: 'Error interno del servidor' };
    }
}

export async function getPendingRequests() {
    const supabase = await createClient();

    // Fetch only actionable requests for pending management.
    const { data, error } = await supabase
        .from('material_requests')
        .select('*')
        .in('status', ['Pendiente', 'Aceptada', 'Alerta', 'Cancelada'])
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching requests:', error);
        return [];
    }

    return data;
}



async function getAdminContext() {
    const supabase = await createClient();
    const userResult = await supabase.auth.getUser();
    const adminId = userResult.data.user?.id;

    if (!adminId) {
        return { supabase, error: 'No autenticado' as const };
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', adminId)
        .single();

    return {
        supabase,
        adminId,
        adminName: profile?.full_name || 'Administrador',
    };
}

// Valid status transitions (all reversible)
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
    'Pendiente': ['Aceptada', 'Cancelada', 'Alerta'],
    'Aceptada': ['Pendiente', 'Cancelada', 'Alerta'],
    'Cancelada': ['Pendiente'],
    'Alerta': ['Pendiente', 'Aceptada', 'Cancelada'],
    'Entregada': ['Cancelada'],
};

export async function updateRequestStatus(
    requestId: string,
    newStatus: string,
    reason?: string
) {
    const adminContext = await getAdminContext();
    if ('error' in adminContext) return { error: adminContext.error };
    const { supabase, adminId, adminName } = adminContext;

    // Get current request
    const { data: request, error: fetchError } = await supabase
        .from('material_requests')
        .select('id, status, request_code')
        .eq('id', requestId)
        .single();

    if (fetchError || !request) {
        return { error: 'Solicitud no encontrada' };
    }

    // Validate transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[request.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
        return { error: `No se puede cambiar de "${request.status}" a "${newStatus}"` };
    }

    // Update the request status
    const { data: updatedRows, error: updateError } = await supabase
        .from('material_requests')
        .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select('id, status');

    if (updateError) {
        console.error('Update Error:', updateError);
        return { error: 'Error al actualizar el estado' };
    }

    if (!updatedRows || updatedRows.length === 0) {
        return { error: 'No se pudo actualizar la solicitud. Verifica permisos de administrador en Supabase.' };
    }

    // Log the status change
    const { error: logError } = await supabase
        .from('request_status_log')
        .insert({
            request_id: requestId,
            request_code: request.request_code,
            previous_status: request.status,
            new_status: newStatus,
            changed_by: adminId,
            changed_by_name: adminName,
            reason: reason || null,
        });

    if (logError) {
        console.error('Log Error:', logError);
        // Don't fail the whole operation if logging fails
    }

    if (request.status === 'Entregada' && newStatus === 'Cancelada') {
        try {
            // We need to fetch items to restore stock
            const { data: fullRequest } = await supabase
                .from('material_requests')
                .select('items_detail')
                .eq('id', requestId)
                .single();

            if (fullRequest?.items_detail) {
                const items = fullRequest.items_detail as { sku: string; quantity: number; talla?: string }[];

                // 1. Restore in Sheets (Source of Truth 1)
                const restoreResult = await restoreStockInSheets(
                    items.map(i => ({ sku: i.sku, quantity: i.quantity, talla: i.talla })),
                    adminId,
                    requestId,
                    new Date().toISOString()
                );

                if (restoreResult?.error) {
                    console.error("Stock Restoration Error (Sheets):", restoreResult.error);
                } else {
                    console.log(`Stock restored in Sheets for Request ${request.request_code}`);
                    invalidateInventoryCache();
                }

                // 2. Log restoration movements in Supabase (audit trail only — Sheets is source of truth)
                for (const item of items) {
                    if (!item.sku) continue;

                    // Ensure SKU exists for FK constraint
                    await supabase
                        .from('inventory')
                        .upsert(
                            { sku: item.sku, name: item.sku, stock_current: 0, stock_reserved: 0 },
                            { onConflict: 'sku', ignoreDuplicates: true }
                        );

                    await supabase
                        .from('stock_movements')
                        .insert({
                            sku: item.sku,
                            quantity_change: item.quantity,
                            movement_type: 'Entrada',
                            reference_id: requestId,
                            notes: `Anulación solicitud ${request.request_code}`,
                            admin_id: adminId,
                        });
                }
            }
        } catch (e) {
            console.error("Stock Restoration Exception:", e);
        }
    }

    revalidatePath('/requests/pending');
    revalidatePath('/my-orders');
    return { success: true, code: request.request_code };
}

export async function getRequestStatusLog(requestId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('request_status_log')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching status log:', error);
        return [];
    }

    return data;
}

export async function getRecentAdminMovements(
    limit = 50,
    filters?: {
        fromDate?: string;
        toDate?: string;
        adminQuery?: string;
        requestCode?: string;
    }
) {
    const supabase = await createClient();

    let query = supabase
        .from('request_status_log')
        .select('id, request_id, request_code, previous_status, new_status, changed_by_name, reason, created_at')
        .in('new_status', ['Aceptada', 'Entregada', 'Eliminada', 'Pendiente', 'Cancelada'])
        .order('created_at', { ascending: false })
        .limit(limit);

    if (filters?.fromDate) {
        const fromIso = new Date(`${filters.fromDate}T00:00:00.000`).toISOString();
        query = query.gte('created_at', fromIso);
    }

    if (filters?.toDate) {
        const toIso = new Date(`${filters.toDate}T23:59:59.999`).toISOString();
        query = query.lte('created_at', toIso);
    }

    if (filters?.adminQuery?.trim()) {
        query = query.ilike('changed_by_name', `%${filters.adminQuery.trim()}%`);
    }

    if (filters?.requestCode?.trim()) {
        query = query.ilike('request_code', `%${filters.requestCode.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching recent admin movements:', error);
        return [];
    }

    // Enrich movements with current request status to avoid stale UI buttons
    const requestIds = [...new Set(data.map((m) => m.request_id).filter(Boolean))] as string[];
    const statusMap: Record<string, string> = {};

    if (requestIds.length > 0) {
        const { data: requests } = await supabase
            .from('material_requests')
            .select('id, status')
            .in('id', requestIds);

        if (requests) {
            for (const r of requests) {
                statusMap[r.id] = r.status;
            }
        }
    }

    return data.map((m) => ({
        ...m,
        current_request_status: m.request_id ? (statusMap[m.request_id] ?? null) : null,
    }));
}

export async function getRequestDetailForAdmin(requestId: string) {
    const adminContext = await getAdminContext();
    if ('error' in adminContext) return { error: adminContext.error };
    const { supabase } = adminContext;

    const { data, error } = await supabase
        .from('material_requests')
        .select('id, request_code, user_name, user_email, area, items_detail, notes, status, created_at, updated_at')
        .eq('id', requestId)
        .single();

    if (error || !data) {
        return { error: 'No se encontró el detalle de la solicitud' };
    }

    return { success: true, request: data };
}

export async function deliverRequest(
    requestId: string,
    deliveryDate: string,
    deliveredItems?: { sku: string; quantity: number; detail: string; talla?: string; marca?: string; notes?: string; value?: number }[]
) {
    const supabase = await createClient();

    // 1. Get the request details
    const { data: request, error: fetchError } = await supabase
        .from('material_requests')
        .select('*')
        .eq('id', requestId)
        .single();

    if (fetchError || !request) {
        return { error: 'Solicitud no encontrada' };
    }

    if (request.status === 'Entregada') {
        return { error: 'La solicitud ya fue entregada' };
    }

    const originalItems = request.items_detail as { sku: string; quantity: number; detail: string; talla?: string }[];
    // Use delivered items if provided (admin modified), otherwise use original request
    const itemsToDeliver = deliveredItems && deliveredItems.length > 0 ? deliveredItems : originalItems;
    const wasModified = !!deliveredItems && deliveredItems.length > 0;

    const adminContext = await getAdminContext();
    if ('error' in adminContext) return { error: adminContext.error };
    const { adminId, adminName } = adminContext;

    // Execute delivery transaction with the items to actually deliver
    const result = await deliverRequestRPC(requestId, deliveryDate, adminId, itemsToDeliver, wasModified ? deliveredItems : undefined);

    // Log the status change to Entregada ONLY if transaction succeeded
    if (result && 'success' in result && result.success && adminId) {
        // Build delivery reason with modification details
        let deliveryReason = `Entregada el ${new Date(deliveryDate).toLocaleDateString('es-CL')}`;
        if (wasModified) {
            const origCount = originalItems.reduce((s, i) => s + i.quantity, 0);
            const delivCount = itemsToDeliver.reduce((s, i) => s + i.quantity, 0);
            deliveryReason += ` (Modificada: ${origCount} solicitado(s) → ${delivCount} entregado(s))`;
        }

        await supabase.from('request_status_log').insert({
            request_id: requestId,
            request_code: request.request_code,
            previous_status: request.status,
            new_status: 'Entregada',
            changed_by: adminId,
            changed_by_name: adminName,
            reason: deliveryReason,
        });

        // Sync with Google Sheets
        // We do this after the DB transaction to ensure Supabase is the source of truth for the status.
        // If this fails, we log it, but the request remains in "Entregada" state in Supabase.
        try {
            const syncResult = await syncStockToSheets(
                itemsToDeliver.map(i => ({ sku: i.sku, quantity: i.quantity, talla: i.talla })),
                adminId,
                requestId,
                deliveryDate
            );

            if (syncResult?.error) {
                console.error("Sheets Sync Warning:", syncResult.error);
                // We could return a warning here, but for now we just log it.
            } else {
                console.log(`Stock synced to Sheets for Request ${request.request_code}`);
            }
        } catch (e) {
            console.error("Sheets Sync Exception:", e);
        }

        // Delete QR image from Supabase Storage (no longer needed after delivery)
        try {
            await deleteQRFromStorage(request.request_code);
        } catch (qrDeleteError) {
            console.error('QR cleanup failed (non-blocking):', qrDeleteError);
        }

        // Invalidate cache so next page load shows fresh stock
        invalidateInventoryCache();
    }

    return result;
}

// Helper: deliver request via direct queries (no RPC needed)
// Google Sheets is the source of truth for stock — Supabase only tracks status + audit log.
async function deliverRequestRPC(
    requestId: string,
    deliveryDate: string,
    adminId: string | undefined,
    items: { sku: string; quantity: number; detail: string }[],
    deliveredItems?: { sku: string; quantity: number; detail: string; talla?: string; marca?: string; notes?: string; value?: number }[]
) {
    const supabase = await createClient();

    // 1. Update request status to 'Entregada' and save delivered items if modified
    const updatePayload: Record<string, unknown> = {
        status: 'Entregada',
        delivered_at: deliveryDate,
        updated_at: new Date().toISOString(),
    };
    if (deliveredItems) {
        updatePayload.items_delivered = deliveredItems;
    }

    const { error: statusError } = await supabase
        .from('material_requests')
        .update(updatePayload)
        .eq('id', requestId);

    if (statusError) {
        console.error('Delivery status update error:', statusError);
        return { error: statusError.message };
    }

    // 2. Get request code for notes
    const { data: reqData } = await supabase
        .from('material_requests')
        .select('request_code')
        .eq('id', requestId)
        .single();

    const requestCode = reqData?.request_code || requestId;

    // 3. Log each item as a stock movement (audit trail)
    for (const item of items) {
        if (!item.sku || item.quantity <= 0) continue;

        // Ensure SKU exists in inventory table (skeleton entry for FK constraint)
        await supabase
            .from('inventory')
            .upsert(
                { sku: item.sku, name: item.detail || item.sku, stock_current: 0, stock_reserved: 0 },
                { onConflict: 'sku', ignoreDuplicates: true }
            );

        // Log movement
        await supabase
            .from('stock_movements')
            .insert({
                sku: item.sku,
                quantity_change: -item.quantity,
                movement_type: 'Salida',
                reference_id: requestId,
                notes: `Entrega de solicitud ${requestCode}`,
                admin_id: adminId,
            });
    }

    revalidatePath('/requests/pending');
    revalidatePath('/inventory');
    return { success: true };
}

export async function deleteRequest(requestId: string, reason?: string) {
    const adminContext = await getAdminContext();
    if ('error' in adminContext) return { error: adminContext.error };
    const { supabase, adminId, adminName } = adminContext;

    const { data: request, error: fetchError } = await supabase
        .from('material_requests')
        .select('id, status, request_code')
        .eq('id', requestId)
        .single();

    if (fetchError || !request) {
        return { error: 'Solicitud no encontrada' };
    }

    if (request.status === 'Entregada') {
        return { error: 'No se puede eliminar una solicitud ya entregada' };
    }

    if (request.status === 'Eliminada') {
        return { error: 'La solicitud ya está eliminada' };
    }

    const { data: updatedRows, error: updateError } = await supabase
        .from('material_requests')
        .update({
            status: 'Eliminada',
            updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select('id, status');

    if (updateError) {
        console.error('Delete request update error:', updateError);
        return { error: 'Error al eliminar la solicitud' };
    }

    if (!updatedRows || updatedRows.length === 0) {
        return { error: 'No se pudo eliminar la solicitud. Verifica permisos de administrador en Supabase.' };
    }

    const { error: logError } = await supabase
        .from('request_status_log')
        .insert({
            request_id: requestId,
            request_code: request.request_code,
            previous_status: request.status,
            new_status: 'Eliminada',
            changed_by: adminId,
            changed_by_name: adminName,
            reason: reason || 'Eliminación administrativa',
        });

    if (logError) {
        console.error('Delete request log error:', logError);
    }

    revalidatePath('/requests/pending');
    revalidatePath('/my-orders');
    return { success: true, code: request.request_code };
}

export async function restoreRequest(requestId: string, reason?: string) {
    const adminContext = await getAdminContext();
    if ('error' in adminContext) return { error: adminContext.error };
    const { supabase, adminId, adminName } = adminContext;

    const { data: request, error: fetchError } = await supabase
        .from('material_requests')
        .select('id, status, request_code')
        .eq('id', requestId)
        .single();

    if (fetchError || !request) {
        return { error: 'Solicitud no encontrada' };
    }

    if (request.status !== 'Eliminada') {
        return { error: `Solo se pueden restaurar solicitudes eliminadas. Estado actual: ${request.status}` };
    }

    const { data: updatedRows, error: updateError } = await supabase
        .from('material_requests')
        .update({
            status: 'Pendiente',
            updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'Eliminada')
        .select('id, status');

    if (updateError) {
        console.error('Restore request update error:', updateError);
        return { error: 'Error al restaurar la solicitud' };
    }

    if (!updatedRows || updatedRows.length === 0) {
        return { error: 'No se pudo restaurar la solicitud. Verifica permisos de administrador en Supabase.' };
    }

    const { error: logError } = await supabase
        .from('request_status_log')
        .insert({
            request_id: requestId,
            request_code: request.request_code,
            previous_status: 'Eliminada',
            new_status: 'Pendiente',
            changed_by: adminId,
            changed_by_name: adminName,
            reason: reason || 'Restauración administrativa',
        });

    if (logError) {
        console.error('Restore request log error:', logError);
    }

    revalidatePath('/requests/pending');
    revalidatePath('/my-orders');
    return { success: true, code: request.request_code };
}

export async function bulkDeleteRequests(requestIds: string[], reason?: string) {
    const uniqueIds = [...new Set(requestIds.filter((id): id is string => Boolean(id)))];
    if (uniqueIds.length === 0) return { error: 'No hay solicitudes seleccionadas' };

    let successCount = 0;
    const failed: string[] = [];

    for (const requestId of uniqueIds) {
        const result = await deleteRequest(requestId, reason);
        if ('success' in result && result.success) {
            successCount += 1;
        } else {
            failed.push('error' in result ? (result.error ?? 'Error desconocido') : 'Error desconocido');
        }
    }

    return {
        success: true,
        successCount,
        failedCount: failed.length,
        errors: failed,
    };
}

export async function bulkDeliverRequests(requestIds: string[], deliveryDate: string) {
    const uniqueIds = [...new Set(requestIds.filter((id): id is string => Boolean(id)))];
    if (uniqueIds.length === 0) return { error: 'No hay solicitudes seleccionadas' };

    let successCount = 0;
    const failed: string[] = [];

    for (const requestId of uniqueIds) {
        const result = await deliverRequest(requestId, deliveryDate);
        if ('success' in result && result.success) {
            successCount += 1;
        } else {
            failed.push('error' in result ? (result.error ?? 'Error desconocido') : 'Error desconocido');
        }
    }


    return {
        success: true,
        successCount,
        failedCount: failed.length,
        errors: failed,
    };
}

export async function cancelOwnRequest(requestId: string, reason: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'No autenticado' };

    // 1. Fetch request and verify ownership
    const { data: request, error: fetchError } = await supabase
        .from('material_requests')
        .select('id, status, request_code, user_id, user_name')
        .eq('id', requestId)
        .single();

    if (fetchError || !request) {
        return { error: 'Solicitud no encontrada' };
    }

    if (request.user_id !== user.id) {
        return { error: 'No tienes permiso para cancelar esta solicitud' };
    }

    if (request.status !== 'Pendiente') {
        return { error: 'Solo se pueden cancelar solicitudes en estado Pendiente' };
    }

    // 2. Update status
    const { error: updateError } = await supabase
        .from('material_requests')
        .update({
            status: 'Cancelada',
            updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

    if (updateError) {
        console.error('Cancel own request error:', updateError);
        return { error: 'Error al cancelar la solicitud' };
    }

    // 3. Log the change
    // 3. Log the change
    const { error: logError } = await supabase.from('request_status_log').insert({
        request_id: requestId,
        request_code: request.request_code,
        previous_status: 'Pendiente',
        new_status: 'Cancelada',
        changed_by: user.id,
        changed_by_name: request.user_name || user.email || 'Usuario',
        reason: reason,
    });

    if (logError) {
        console.error('CancelOwnRequest log error:', logError);
    }

    try {
        revalidatePath('/requests/pending');
        revalidatePath('/my-orders');
        revalidatePath(`/my-orders/${requestId}`);
    } catch (e) {
        console.error('Revalidation error:', e);
    }

    return { success: true, code: request.request_code };
}

/**
 * Lookup a request by its 6-digit request_code (used by QR scanner).
 * Returns request details enriched with inventory info (stock, location).
 * Admin-only.
 */
export async function lookupRequestByCode(code: string) {
    if (!code || code.trim().length < 3) {
        return { error: 'Código inválido' };
    }

    const adminContext = await getAdminContext();
    if ('error' in adminContext) return { error: adminContext.error };
    const { supabase } = adminContext;

    const trimmedCode = code.trim();

    const { data, error } = await supabase
        .from('material_requests')
        .select('id, request_code, user_name, user_email, area, items_detail, notes, status, created_at, updated_at')
        .eq('request_code', trimmedCode)
        .single();

    if (error || !data) {
        return { error: `No se encontró solicitud con código "${trimmedCode}"` };
    }

    // Enrich items with inventory data (stock + location)
    const items = (data.items_detail || []) as {
        sku: string; detail: string; quantity: number;
        talla?: string; marca?: string; notes?: string; value?: number;
    }[];

    const { getInventoryBySKUs } = await import('@/app/(app)/requests/search-action');
    const skuRequests = items.map(i => ({ sku: i.sku || '', talla: i.talla }));
    const inventoryMap = await getInventoryBySKUs(skuRequests);

    const enrichedItems = items.map(item => {
        const compositeKey = item.talla
            ? `${item.sku}::${item.talla}`
            : item.sku || '';
        const inv = inventoryMap[compositeKey] || inventoryMap[item.sku || ''];

        return {
            ...item,
            stock_actual: inv?.stock ?? null,
            estante_nro: inv?.estante_nro ?? null,
            estante_nivel: inv?.estante_nivel ?? null,
            nombre_inventario: inv?.nombre ?? null,
            categoria: inv?.categoria ?? null,
            foto: inv?.foto ?? null,
        };
    });

    return {
        success: true,
        request: {
            ...data,
            enriched_items: enrichedItems,
        },
    };
}
