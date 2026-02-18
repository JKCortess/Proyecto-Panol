import QRCode from 'qrcode';

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
