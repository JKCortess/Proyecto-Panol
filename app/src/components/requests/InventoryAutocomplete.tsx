'use client'
'use client'

import { useState, useRef, useEffect, useCallback } from 'react';
import { searchInventory, type InventoryItem } from '@/app/requests/search-action';
import { Search, Package, PackagePlus, MapPin, Layers, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (item: InventoryItem) => void;
    onAddUnlisted?: (searchTerm: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function InventoryAutocomplete({
    value,
    onChange,
    onSelect,
    onAddUnlisted,
    placeholder = 'Buscar componente...',
    className,
    disabled = false,
}: InventoryAutocompleteProps) {
    const [results, setResults] = useState<InventoryItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced search
    const doSearch = useCallback(async (query: string) => {
        if (query.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setIsSearching(true);
        try {
            const items = await searchInventory(query);
            setResults(items);
            setIsOpen(true);
            setHighlightedIndex(-1);
        } catch {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 300);
    };

    const handleSelect = (item: InventoryItem) => {
        onSelect(item);
        onChange(item.nombre);
        setIsOpen(false);
        setResults([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        } else if (e.key === 'Enter' && highlightedIndex >= 0) {
            e.preventDefault();
            handleSelect(results[highlightedIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const getStockColor = (stock: number) => {
        if (stock <= 0) return 'text-red-400';
        if (stock <= 5) return 'text-amber-400';
        return 'text-emerald-400';
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <Search className="icon-left icon-left-sm text-slate-500" />
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(
                        "w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 input-with-icon pr-8 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all shadow-sm",
                        disabled && "opacity-50 cursor-not-allowed",
                        className
                    )}
                    autoComplete="off"
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400 animate-spin" />
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-[320px] overflow-y-auto">
                    <div className="px-3 py-2 border-b border-slate-800">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {results.length} resultado(s) del inventario
                        </span>
                    </div>
                    {results.map((item, index) => (
                        <button
                            key={item.sku}
                            type="button"
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={cn(
                                "w-full text-left p-3 flex items-start gap-3 transition-colors border-b border-slate-800/50 last:border-b-0",
                                highlightedIndex === index
                                    ? "bg-blue-600/10"
                                    : "hover:bg-slate-800/50"
                            )}
                        >
                            <div className="p-1.5 bg-slate-800 rounded-md shrink-0 mt-0.5">
                                <Package className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-200 truncate">{item.nombre}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                    <span className="font-mono text-blue-400/80">{item.sku}</span>
                                    <span className="flex items-center gap-1">
                                        <Layers className="w-3 h-3" />
                                        {item.categoria}
                                    </span>
                                    {item.ubicacion && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {item.ubicacion}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className={cn("text-xs font-mono font-bold", getStockColor(item.stock))}>
                                    {item.stock}
                                </span>
                                <p className="text-[10px] text-slate-600">stock</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No results — offer to add unlisted item */}
            {isOpen && results.length === 0 && !isSearching && value.length >= 2 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-4 py-3 text-center border-b border-slate-800">
                        <p className="text-sm text-slate-400">No se encontraron resultados para <span className="font-medium text-slate-300">&quot;{value}&quot;</span></p>
                    </div>
                    {onAddUnlisted && (
                        <button
                            type="button"
                            onClick={() => {
                                onAddUnlisted(value);
                                setIsOpen(false);
                                setResults([]);
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-blue-600/10 transition-colors group/btn"
                        >
                            <div className="p-1.5 bg-amber-500/10 rounded-md shrink-0 group-hover/btn:bg-amber-500/20 transition-colors">
                                <PackagePlus className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium text-amber-400 group-hover/btn:text-amber-300 transition-colors">
                                    Registrar ítem fuera de inventario
                                </p>
                                <p className="text-xs text-slate-600">
                                    Agrega &quot;{value}&quot; como ítem personalizado sin SKU
                                </p>
                            </div>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
