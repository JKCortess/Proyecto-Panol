import QRCode from 'qrcode';
import { createClient } from '@/utils/supabase/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const QR_BUCKET = 'qr-codes';

/**
 * Generate a QR code as a base64 data URL (for embedding in emails).
 * Uses white modules on transparent bg for email compatibility.
 */
export async function generateQRCodeDataUrl(
    value: string,
    size: number = 180
): Promise<string> {
    return QRCode.toDataURL(value, {
        width: size,
        margin: 2,
        color: {
            dark: '#1e293b',   // dark blue-gray for QR modules
            light: '#ffffff',  // white background (email safe)
        },
        errorCorrectionLevel: 'M',
    });
}

/**
 * Generate a QR code as a PNG buffer (for uploading to storage).
 */
async function generateQRCodeBuffer(
    value: string,
    size: number = 300
): Promise<Buffer> {
    return QRCode.toBuffer(value, {
        type: 'png',
        width: size,
        margin: 2,
        color: {
            dark: '#1e293b',
            light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
    });
}

/**
 * Upload a QR code image to Supabase Storage (public bucket).
 * Returns the public URL of the uploaded image.
 */
export async function uploadQRToStorage(requestCode: string): Promise<string> {
    const supabase = await createClient();
    const fileName = `${requestCode}.png`;
    const buffer = await generateQRCodeBuffer(requestCode, 300);

    const { error } = await supabase.storage
        .from(QR_BUCKET)
        .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: true,
        });

    if (error) {
        console.error('Error uploading QR to storage:', error);
        throw new Error(`Failed to upload QR image: ${error.message}`);
    }

    // Return the public URL
    return `${SUPABASE_URL}/storage/v1/object/public/${QR_BUCKET}/${fileName}`;
}

/**
 * Delete a QR code image from Supabase Storage.
 * Called when a request is delivered (status → Entregada).
 */
export async function deleteQRFromStorage(requestCode: string): Promise<void> {
    const supabase = await createClient();
    const fileName = `${requestCode}.png`;

    const { error } = await supabase.storage
        .from(QR_BUCKET)
        .remove([fileName]);

    if (error) {
        console.error(`Error deleting QR ${fileName} from storage:`, error);
        // Non-blocking: don't throw, just log
    } else {
        console.log(`QR image ${fileName} deleted from storage.`);
    }
}
