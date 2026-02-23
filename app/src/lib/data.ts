
import { getSheets } from "./google";

// ─── In-memory cache for Google Sheets data ─────────────────────────────
// Prevents redundant API calls within the same minute. TTL: 60 seconds.
// Can be manually invalidated via invalidateInventoryCache() or the "Actualizar Datos" button.
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

let inventoryCache: CacheEntry<InventoryItem[]> | null = null;
let imageLinksCache: CacheEntry<Map<string, string[]>> | null = null;

function isCacheValid<T>(cache: CacheEntry<T> | null): cache is CacheEntry<T> {
    if (!cache) return false;
    return Date.now() - cache.timestamp < CACHE_TTL_MS;
}

/**
 * Invalidates both inventory and image links caches.
 * Called from the admin revalidation API route.
 */
export function invalidateInventoryCache() {
    inventoryCache = null;
    imageLinksCache = null;
    console.log('[Cache] Inventory and image caches invalidated manually.');
}

/** Returns how many seconds until the cache expires, or null if no cache. */
export function getCacheStatus(): { hasCachedInventory: boolean; hasCachedImages: boolean; expiresInSeconds: number | null } {
    const now = Date.now();
    const invValid = isCacheValid(inventoryCache);
    const imgValid = isCacheValid(imageLinksCache);
    const oldestTimestamp = invValid && inventoryCache ? inventoryCache.timestamp : null;
    return {
        hasCachedInventory: invValid,
        hasCachedImages: imgValid,
        expiresInSeconds: oldestTimestamp ? Math.round((CACHE_TTL_MS - (now - oldestTimestamp)) / 1000) : null,
    };
}

export interface InventoryItem {
    sku: string;
    nombre: string;
    tipo_componente: string;
    categoria: string;
    marca: string;
    modelo: string;
    potencia: string;
    talla: string;
    foto: string;
    fotos: string[];
    stock: number;
    reservado: number;
    estante_nro: string;
    estante_nivel: string;
    observacion: string;
    descripcion_general: string;
    uso_aplicacion: string;
    valor_aprox_clp: number;
    valor_confirmado_spex: number;
    valor: number;
    clasificacion: string;
    rop: number;
    safety_stock: number;
    proveedor: string;
}

export interface SizeVariant {
    talla: string;
    stock: number;
    reservado: number;
    rop: number;
}

export interface GroupedInventoryItem extends Omit<InventoryItem, 'stock' | 'reservado' | 'rop'> {
    /** Total stock across all size variants */
    totalStock: number;
    /** Total reserved across all size variants */
    totalReservado: number;
    /** Max ROP across variants (to determine critical status) */
    maxRop: number;
    /** Individual size variants — empty if item has no talla */
    variants: SizeVariant[];
    /** Whether this item has size variants */
    hasSizes: boolean;
}

/**
 * Canonical size order for sorting talla variants.
 * Sizes not in this list are placed at the end (as "Otro" / unknown).
 */
const SIZE_ORDER: string[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

/**
 * Returns a sort index for a talla string.
 * Known sizes get their canonical position (0-6).
 * Unknown sizes get Infinity so they sort to the end.
 */
function getSizeOrder(talla: string): number {
    const normalized = talla.trim().toUpperCase();
    const idx = SIZE_ORDER.indexOf(normalized);
    return idx !== -1 ? idx : Infinity;
}

/**
 * Sorts an array of SizeVariant in canonical size order:
 * XS → S → M → L → XL → XXL → XXXL → (everything else alphabetically)
 */
function sortVariants(variants: SizeVariant[]): SizeVariant[] {
    return [...variants].sort((a, b) => {
        const orderA = getSizeOrder(a.talla);
        const orderB = getSizeOrder(b.talla);
        if (orderA !== orderB) return orderA - orderB;
        // Both are unknown — sort alphabetically as fallback
        return a.talla.localeCompare(b.talla);
    });
}

/**
 * Groups inventory items by Nombre + Marca + Categoría, merging size variants.
 * Items with the same identity (name, brand, category) but different tallas
 * become one GroupedInventoryItem with multiple SizeVariants.
 * Photos from all items in the group are merged (deduplicated).
 * Variants are sorted in canonical size order: XS → S → M → L → XL → XXL → XXXL → Otro.
 */
export function groupItemsByIdentity(items: InventoryItem[]): GroupedInventoryItem[] {
    const groupMap = new Map<string, {
        base: InventoryItem;
        variants: SizeVariant[];
        totalStock: number;
        totalReservado: number;
        maxRop: number;
        allFotos: Set<string>;
    }>();

    for (const item of items) {
        // Group by Nombre + Marca + Categoría (case-sensitive, trimmed)
        const key = `${item.nombre.trim()}|${(item.marca || '').trim()}|${item.categoria.trim()}`;

        if (groupMap.has(key)) {
            const group = groupMap.get(key)!;
            group.totalStock += item.stock;
            group.totalReservado += item.reservado;
            group.maxRop = Math.max(group.maxRop, item.rop);

            // Merge photos from this item into the group
            for (const foto of item.fotos) {
                group.allFotos.add(foto);
            }

            if (item.talla) {
                // Check if this talla already exists in variants — merge if so
                const existingVariant = group.variants.find(v => v.talla === item.talla);
                if (existingVariant) {
                    existingVariant.stock += item.stock;
                    existingVariant.reservado += item.reservado;
                    existingVariant.rop = Math.max(existingVariant.rop, item.rop);
                } else {
                    group.variants.push({
                        talla: item.talla,
                        stock: item.stock,
                        reservado: item.reservado,
                        rop: item.rop,
                    });
                }
            }
        } else {
            const variants: SizeVariant[] = [];
            if (item.talla) {
                variants.push({
                    talla: item.talla,
                    stock: item.stock,
                    reservado: item.reservado,
                    rop: item.rop,
                });
            }

            groupMap.set(key, {
                base: item,
                variants,
                totalStock: item.stock,
                totalReservado: item.reservado,
                maxRop: item.rop,
                allFotos: new Set(item.fotos),
            });
        }
    }

    return Array.from(groupMap.values()).map(({ base, variants, totalStock, totalReservado, maxRop, allFotos }) => {
        // Sort variants in canonical size order before returning
        const sortedVariants = sortVariants(variants);
        return {
            ...base,
            fotos: Array.from(allFotos), // Merged & deduplicated photos from all items in group
            totalStock,
            totalReservado,
            maxRop,
            variants: sortedVariants.length > 1 ? sortedVariants : (sortedVariants.length === 1 && sortedVariants[0].talla ? sortedVariants : []),
            hasSizes: sortedVariants.length > 1 || (sortedVariants.length === 1 && !!sortedVariants[0].talla),
        };
    });
}

function parseNumericValue(val: string | number | null | undefined): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const vStr = val.toString().trim();
    // Remove currency symbols, dots (thousands separator), and spaces
    const clean = vStr.replace(/[$\s.]/g, '').replace(/,/g, '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : Math.round(parsed);
}

/**
 * Fetches image links from the "Link imágenes" Google Sheet.
 * Returns a Map<string, string[]> mapping SKU → array of image URLs.
 * 
 * Filename pattern: {SKU}-{PhotoNumber}.{ext}
 * Example: "401-GPAZ-01-01.png" → SKU: "401-GPAZ-01", Photo #01
 * 
 * Image URL format: https://lh3.googleusercontent.com/d/{FILE_ID}=w1000
 */
async function getImageLinksMap(): Promise<Map<string, string[]>> {
    // Return cached image links if valid
    if (isCacheValid(imageLinksCache)) {
        console.log('[Cache] Using cached image links map.');
        return imageLinksCache!.data;
    }

    console.log('[Cache] Fetching fresh image links from Google Sheets...');
    const imageMap = new Map<string, string[]>();

    try {
        const sheets = await getSheets();
        const spreadsheetId = process.env.LINK_IMAGENES_SPREADSHEET_ID;

        if (!spreadsheetId) {
            console.warn("LINK_IMAGENES_SPREADSHEET_ID not set, skipping image links");
            return imageMap;
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "'Hoja 1'!A:F",
        });

        const rows = response.data.values || [];

        // Temporary map to store images with their photo number for sorting
        const tempMap = new Map<string, { photoNum: string; url: string }[]>();

        // Skip header row (index 0)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 2) continue;

            const filename = (row[0] || "").trim(); // e.g. "401-GPAZ-01-01.png"
            const fileId = (row[1] || "").trim();   // Google Drive file ID

            if (!filename || !fileId) continue;

            // Remove extension (.png, .jpg, etc.)
            const nameWithoutExt = filename.replace(/\.[^.]+$/, "");

            // Extract SKU: everything except the last "-XX" segment (photo number)
            // "401-GPAZ-01-01" → SKU: "401-GPAZ-01", Photo: "01"
            const lastDashIndex = nameWithoutExt.lastIndexOf("-");
            if (lastDashIndex === -1) continue;

            const sku = nameWithoutExt.substring(0, lastDashIndex);
            const photoNum = nameWithoutExt.substring(lastDashIndex + 1); // e.g. "01", "02"
            const imageUrl = `/api/image-proxy?id=${fileId}`;

            if (!tempMap.has(sku)) {
                tempMap.set(sku, []);
            }
            tempMap.get(sku)!.push({ photoNum, url: imageUrl });
        }

        // Sort images by photo number and build final imageMap
        for (const [sku, images] of tempMap) {
            images.sort((a, b) => a.photoNum.localeCompare(b.photoNum, undefined, { numeric: true }));
            imageMap.set(sku, images.map(img => img.url));
        }

        // Store in cache
        imageLinksCache = { data: imageMap, timestamp: Date.now() };
    } catch (error) {
        console.error("Error fetching image links:", error);
    }

    return imageMap;
}

/**
 * Converts a Google Drive URL to our image proxy URL.
 * Supports formats:
 * - https://lh3.googleusercontent.com/d/{ID}=w1000
 * - https://drive.google.com/file/d/{ID}/view
 * - https://drive.google.com/uc?id={ID}
 * Non-Google URLs are returned as-is.
 */
function convertToProxyUrl(url: string): string {
    if (!url) return url;

    // Match lh3 URL: https://lh3.googleusercontent.com/d/{ID}
    const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match) return `/api/image-proxy?id=${lh3Match[1]}`;

    // Match drive.google.com/file/d/{ID}/
    const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileMatch) return `/api/image-proxy?id=${driveFileMatch[1]}`;

    // Match drive.google.com/uc?id={ID}
    const driveUcMatch = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
    if (driveUcMatch) return `/api/image-proxy?id=${driveUcMatch[1]}`;

    // Not a Google Drive URL — return as-is
    return url;
}

export async function getInventory(query?: string): Promise<InventoryItem[]> {
    // Return cached inventory if valid (for the full, unfiltered list)
    // Query filtering is applied after cache retrieval
    if (!query && isCacheValid(inventoryCache)) {
        console.log('[Cache] Using cached inventory data.');
        return inventoryCache!.data;
    }

    // If we have a query but cache is valid, filter from cache
    if (query && isCacheValid(inventoryCache)) {
        console.log('[Cache] Using cached inventory data with query filter.');
        const lowerQuery = query.toLowerCase();
        return inventoryCache!.data.filter((item) =>
            item.nombre.toLowerCase().includes(lowerQuery) ||
            item.sku.toLowerCase().includes(lowerQuery) ||
            item.categoria.toLowerCase().includes(lowerQuery) ||
            item.marca.toLowerCase().includes(lowerQuery) ||
            item.descripcion_general.toLowerCase().includes(lowerQuery)
        );
    }

    console.log('[Cache] Fetching fresh inventory from Google Sheets...');
    const sheets = await getSheets();
    const spreadsheetId = process.env.PANOL_DB_SPREADSHEET_ID;

    if (!spreadsheetId) throw new Error("PANOL_DB_SPREADSHEET_ID not set");

    // Fetch inventory data and image links in parallel
    const [inventoryResponse, imageMap] = await Promise.all([
        sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "ITEMS!A2:Y", // Columns A-Y (25 cols): SKU, Nombre, Tipo componente, Categoría, Marca, Modelo, Potencia, Talla, Link_Foto, Stock_Actual, Stock_Reservado, #, Estante Nro, Estante Nivel, Observación, Desc. general, Uso/Aplicación, Valor SPEX, Clasificación, ROP, Safety_Stock, #, #, #, Proveedor
        }),
        getImageLinksMap(),
    ]);

    const rows = inventoryResponse.data.values || [];

    const items: InventoryItem[] = rows.map((row) => {
        // Fallback for missing SKU: Hash of name or "NO-SKU-" + index
        const name = row[1] || "";
        let sku = row[0] || "";

        if (!sku && name) {
            // Simple deterministic hash from string
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                const char = name.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            sku = `GEN-${Math.abs(hash).toString(16).toUpperCase()}`;
        } else if (!sku) {
            sku = `UNKNOWN-${Math.random().toString(36).substr(2, 5)}`;
        }

        const linkFoto = row[8] || ""; // Column I = Link_Foto (index 8)

        // Determine fotos array:
        // 1. If SKU exists in imageMap → use those URLs (already proxied)
        // 2. Else if Link_Foto is set → convert to proxy URL if it's a Google Drive link
        // 3. Else → empty array
        let fotos: string[] = [];
        if (imageMap.has(sku)) {
            fotos = imageMap.get(sku)!;
        } else if (linkFoto) {
            fotos = [convertToProxyUrl(linkFoto)];
        }

        // New column mapping after adding Tipo componente (C), Modelo (F), Potencia (G):
        // A=SKU(0), B=Nombre(1), C=Tipo_componente(2), D=Categoría(3), E=Marca(4),
        // F=Modelo(5), G=Potencia(6), H=Talla(7), I=Link_Foto(8),
        // J=Stock_Actual(9), K=Stock_Reservado(10), L=#(11),
        // M=Estante_Nro(12), N=Estante_Nivel(13), O=Observación(14),
        // P=Desc_general(15), Q=Uso/Aplicación(16), R=Valor_SPEX(17),
        // S=Clasificación(18), T=ROP(19), U=Safety_Stock(20)
        return {
            sku: sku,
            nombre: name,
            tipo_componente: row[2] || "",
            categoria: row[3] || "",
            marca: row[4] || "",
            modelo: row[5] || "",
            potencia: row[6] || "",
            talla: row[7] || "",
            foto: fotos.length > 0 ? fotos[0] : linkFoto,
            fotos: fotos,
            stock: parseInt(row[9] || "0") || 0,
            reservado: parseInt(row[10] || "0") || 0,
            estante_nro: row[12] || "",
            estante_nivel: row[13] || "",
            observacion: row[14] || "",
            descripcion_general: row[15] || "",
            uso_aplicacion: row[16] || "",
            valor_confirmado_spex: parseNumericValue(row[17]),
            valor_aprox_clp: parseNumericValue(row[17]),  // Use SPEX value as fallback (old Valor aprox column no longer exists)
            valor: parseNumericValue(row[17]),             // Use SPEX value as fallback (old Valor column no longer exists)
            clasificacion: row[18] || "",
            rop: parseInt(row[19] || "0") || 0,
            safety_stock: parseInt(row[20] || "0") || 0,
            proveedor: row[24] || "",
        };
    });

    // Store in cache (always cache the full, unfiltered list)
    inventoryCache = { data: items, timestamp: Date.now() };
    console.log(`[Cache] Inventory cached: ${items.length} items. Expires in ${CACHE_TTL_MS / 1000}s.`);

    if (query) {
        const lowerQuery = query.toLowerCase();
        return items.filter((item) =>
            item.nombre.toLowerCase().includes(lowerQuery) ||
            item.sku.toLowerCase().includes(lowerQuery) ||
            item.categoria.toLowerCase().includes(lowerQuery) ||
            item.marca.toLowerCase().includes(lowerQuery) ||
            item.descripcion_general.toLowerCase().includes(lowerQuery)
        );
    }

    return items;
}



export async function getUsers() {
    const sheets = await getSheets();
    const spreadsheetId = process.env.PANOL_DB_SPREADSHEET_ID;
    if (!spreadsheetId) throw new Error("PANOL_DB_SPREADSHEET_ID not set");

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "USUARIOS!A2:D",
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
        id: row[0],
        nombre: row[1],
        rol: row[2],
        email: row[3],
    }));
}
