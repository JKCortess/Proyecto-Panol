import { describe, it, expect } from 'vitest';

// ─── Pure functions extracted from data.ts for unit testing ───
// These are copied here since the module has side-effects (Google Auth) that can't
// run in test environment. We test the pure logic independently.

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

function normalizeForSearch(str: string): string {
    return str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function getSizeOrder(talla: string): number {
    const normalized = talla.trim().toUpperCase();
    const idx = SIZE_ORDER.indexOf(normalized);
    return idx !== -1 ? idx : Infinity;
}

interface SizeVariant {
    talla: string;
    stock: number;
    reservado: number;
    rop: number;
}

function sortVariants(variants: SizeVariant[]): SizeVariant[] {
    return [...variants].sort((a, b) => {
        const orderA = getSizeOrder(a.talla);
        const orderB = getSizeOrder(b.talla);
        if (orderA !== orderB) return orderA - orderB;
        return a.talla.localeCompare(b.talla);
    });
}

function convertToProxyUrl(url: string): string {
    if (!url) return url;
    const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match) return `/api/image-proxy?id=${lh3Match[1]}`;
    const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileMatch) return `/api/image-proxy?id=${driveFileMatch[1]}`;
    const driveUcMatch = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
    if (driveUcMatch) return `/api/image-proxy?id=${driveUcMatch[1]}`;
    return url;
}

function parseNumericValue(val: string | number | null | undefined): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
}

function matchesSearchQuery(item: { nombre: string; sku: string; categoria: string; marca: string; descripcion_general: string; tipo_componente: string; proveedor: string }, queryWords: string[]): boolean {
    const searchableText = normalizeForSearch(
        [item.nombre, item.sku, item.categoria, item.marca, item.descripcion_general, item.tipo_componente, item.proveedor].join(' ')
    );
    return queryWords.every(word => searchableText.includes(word));
}

// ─── Tests ───

describe('normalizeForSearch', () => {
    it('lowercases text', () => {
        expect(normalizeForSearch('GUANTES')).toBe('guantes');
    });

    it('removes Spanish accents', () => {
        expect(normalizeForSearch('Gestión')).toBe('gestion');
        expect(normalizeForSearch('Pañol')).toBe('panol');
    });

    it('handles empty string', () => {
        expect(normalizeForSearch('')).toBe('');
    });

    it('preserves numbers and special characters', () => {
        expect(normalizeForSearch('SKU-123')).toBe('sku-123');
    });
});

describe('getSizeOrder', () => {
    it('returns correct index for known sizes', () => {
        expect(getSizeOrder('S')).toBe(1);
        expect(getSizeOrder('M')).toBe(2);
        expect(getSizeOrder('XL')).toBe(4);
    });

    it('handles case insensitive and trimming', () => {
        expect(getSizeOrder('  xl  ')).toBe(4);
        expect(getSizeOrder('xs')).toBe(0);
    });

    it('returns Infinity for unknown sizes', () => {
        expect(getSizeOrder('42')).toBe(Infinity);
        expect(getSizeOrder('Grande')).toBe(Infinity);
    });
});

describe('sortVariants', () => {
    it('sorts sizes in canonical order', () => {
        const variants: SizeVariant[] = [
            { talla: 'XL', stock: 5, reservado: 0, rop: 1 },
            { talla: 'S', stock: 10, reservado: 0, rop: 2 },
            { talla: 'M', stock: 8, reservado: 0, rop: 1 },
        ];
        const sorted = sortVariants(variants);
        expect(sorted.map(v => v.talla)).toEqual(['S', 'M', 'XL']);
    });

    it('places unknown sizes at the end alphabetically', () => {
        const variants: SizeVariant[] = [
            { talla: 'M', stock: 5, reservado: 0, rop: 1 },
            { talla: '44', stock: 3, reservado: 0, rop: 1 },
            { talla: '38', stock: 7, reservado: 0, rop: 1 },
        ];
        const sorted = sortVariants(variants);
        expect(sorted.map(v => v.talla)).toEqual(['M', '38', '44']);
    });

    it('does not mutate the original array', () => {
        const variants: SizeVariant[] = [
            { talla: 'L', stock: 5, reservado: 0, rop: 1 },
            { talla: 'S', stock: 10, reservado: 0, rop: 2 },
        ];
        const original = [...variants];
        sortVariants(variants);
        expect(variants).toEqual(original);
    });
});

describe('convertToProxyUrl', () => {
    it('converts lh3.googleusercontent.com URLs', () => {
        const url = 'https://lh3.googleusercontent.com/d/1AbC_dEf=w1000';
        expect(convertToProxyUrl(url)).toBe('/api/image-proxy?id=1AbC_dEf');
    });

    it('converts drive.google.com/file/d/ URLs', () => {
        const url = 'https://drive.google.com/file/d/1XyZ-abc/view';
        expect(convertToProxyUrl(url)).toBe('/api/image-proxy?id=1XyZ-abc');
    });

    it('converts drive.google.com/uc?id= URLs', () => {
        const url = 'https://drive.google.com/uc?id=1TestId123';
        expect(convertToProxyUrl(url)).toBe('/api/image-proxy?id=1TestId123');
    });

    it('returns non-Google URLs as-is', () => {
        const url = 'https://example.com/image.png';
        expect(convertToProxyUrl(url)).toBe(url);
    });

    it('returns empty string for empty input', () => {
        expect(convertToProxyUrl('')).toBe('');
    });
});

describe('parseNumericValue', () => {
    it('parses numbers directly', () => {
        expect(parseNumericValue(42)).toBe(42);
    });

    it('parses strings with currency symbols', () => {
        expect(parseNumericValue('$1,500')).toBe(1500);
    });

    it('returns 0 for null/undefined/empty', () => {
        expect(parseNumericValue(null)).toBe(0);
        expect(parseNumericValue(undefined)).toBe(0);
        expect(parseNumericValue('')).toBe(0);
    });

    it('handles negative numbers', () => {
        expect(parseNumericValue('-100')).toBe(-100);
    });
});

describe('matchesSearchQuery', () => {
    const testItem = {
        nombre: 'Guantes de PU Negro',
        sku: 'GP-001',
        categoria: 'EPP',
        marca: 'Tresor',
        descripcion_general: 'Guantes anticorte',
        tipo_componente: 'Guante',
        proveedor: 'SPEX',
    };

    it('matches single word', () => {
        expect(matchesSearchQuery(testItem, ['guante'])).toBe(true);
    });

    it('matches multi-word query', () => {
        expect(matchesSearchQuery(testItem, ['guante', 'pu'])).toBe(true);
    });

    it('returns false when not all words match', () => {
        expect(matchesSearchQuery(testItem, ['guante', 'azul'])).toBe(false);
    });

    it('matches SKU', () => {
        expect(matchesSearchQuery(testItem, ['gp-001'])).toBe(true);
    });

    it('matches provider', () => {
        expect(matchesSearchQuery(testItem, ['spex'])).toBe(true);
    });
});
