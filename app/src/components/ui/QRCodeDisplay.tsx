'use client'

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
    value: string;
    size?: number;
    label?: string;
    className?: string;
}

export function QRCodeDisplay({ value, size = 160, label, className = '' }: QRCodeDisplayProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!value) return;
        QRCode.toDataURL(value, {
            width: size,
            margin: 2,
            color: {
                dark: '#e2e8f0',   // slate-200 for the QR modules
                light: '#0f172a',  // slate-950 for the background
            },
            errorCorrectionLevel: 'M',
        })
            .then(setQrDataUrl)
            .catch(console.error);
    }, [value, size]);

    if (!qrDataUrl) {
        return (
            <div
                className={`animate-pulse bg-slate-800 rounded-xl ${className}`}
                style={{ width: size, height: size }}
            />
        );
    }

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl shadow-lg shadow-blue-900/10">
                <img
                    src={qrDataUrl}
                    alt={`Código QR: ${value}`}
                    width={size}
                    height={size}
                    className="rounded-md"
                />
            </div>
            {label && (
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    {label}
                </p>
            )}
        </div>
    );
}
