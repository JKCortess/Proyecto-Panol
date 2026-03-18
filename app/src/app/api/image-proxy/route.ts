import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/image-proxy?id={googleDriveFileId}
 * 
 * Server-side proxy for Google Drive images.
 * Prevents HTTP 429 (Too Many Requests) errors that occur when the browser
 * makes many simultaneous direct requests to lh3.googleusercontent.com.
 * 
 * The server fetches the image once and serves it with aggressive cache headers,
 * so subsequent requests are served from the browser cache.
 */

// In-memory cache for images to avoid re-fetching from Google
const imageCache = new Map<string, { data: ArrayBuffer; contentType: string; timestamp: number }>();
const IMAGE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 200; // Max number of images to cache in memory

function cleanupCache() {
    if (imageCache.size <= MAX_CACHE_SIZE) return;

    // Remove oldest entries
    const entries = Array.from(imageCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
        imageCache.delete(key);
    }
}

function getCacheHeaders(fileId: string) {
    return {
        // Use 'private' to prevent Netlify CDN from collapsing all ?id=XXX variants
        // into a single cached response. Browser still caches for 1 day.
        'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800',
        // Explicitly tell Netlify CDN not to cache this route
        'CDN-Cache-Control': 'no-store',
        // Netlify-specific: prevent edge caching
        'Netlify-CDN-Cache-Control': 'no-store',
        // Vary by full URL to differentiate query params
        'Vary': 'Accept',
        // ETag per file ID for proper revalidation
        'ETag': `"img-${fileId}"`,
    };
}

async function fetchImage(url: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return null;

        const data = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return { data, contentType };
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const fileId = request.nextUrl.searchParams.get('id');

    if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
        return NextResponse.json({ error: 'Invalid or missing file ID' }, { status: 400 });
    }

    // Check memory cache first
    const cached = imageCache.get(fileId);
    if (cached && Date.now() - cached.timestamp < IMAGE_CACHE_TTL_MS) {
        return new Response(cached.data, {
            status: 200,
            headers: {
                'Content-Type': cached.contentType,
                ...getCacheHeaders(fileId),
                'X-Image-Cache': 'HIT',
            },
        });
    }

    // Try lh3 URL first (better quality), then fallback to thumbnail
    const urls = [
        `https://lh3.googleusercontent.com/d/${fileId}=w800`,
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
    ];

    for (const url of urls) {
        const result = await fetchImage(url);
        if (result) {
            // Cache it
            imageCache.set(fileId, { ...result, timestamp: Date.now() });
            cleanupCache();

            return new Response(result.data, {
                status: 200,
                headers: {
                    'Content-Type': result.contentType,
                    ...getCacheHeaders(fileId),
                    'X-Image-Cache': 'MISS',
                },
            });
        }
    }

    // Both URLs failed
    console.error(`[ImageProxy] All URLs failed for fileId: ${fileId}`);
    return NextResponse.json(
        { error: `Image not found` },
        { status: 404 }
    );
}
