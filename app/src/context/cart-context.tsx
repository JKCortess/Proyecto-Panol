"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";

export type CartItem = {
    sku: string;
    nombre: string;
    talla?: string;
    marca?: string;
    cantidad: number;
    valor: number; // Unit price from Google Sheets "Valor" column
    imagen?: string;
};

/** Composite key for cart: items with same SKU but different talla are separate entries */
const cartKey = (sku: string, talla?: string) => talla ? `${sku}::${talla}` : sku;

interface CartContextType {
    items: CartItem[];
    cart: CartItem[]; // Alias for items
    addToCart: (item: Omit<CartItem, "cantidad">, quantity?: number) => void;
    removeFromCart: (sku: string, talla?: string) => void;
    updateQuantity: (sku: string, talla?: string, cantidad?: number) => void;
    clearCart: () => void;
    totalItems: number;
    totalValue: number; // Total $ value of the cart
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    hasMounted: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    // ALWAYS start with empty array to match server-side render (prevents hydration mismatch)
    const [items, setItems] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const isInitialLoad = useRef(true);

    // Load cart from localStorage ONLY after mount (client-side)
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem("panol_cart");
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setItems(parsed);
                }
            }
        } catch (e) {
            console.error("Failed to parse cart from local storage", e);
        }
        // Mark as mounted so consumers can safely render client-only content
        setHasMounted(true);
        isInitialLoad.current = false;
    }, []);

    // Save cart to local storage whenever it changes (but skip the initial load)
    useEffect(() => {
        if (isInitialLoad.current) return;
        localStorage.setItem("panol_cart", JSON.stringify(items));
    }, [items]);

    const addToCart = (newItem: Omit<CartItem, "cantidad">, quantity: number = 1) => {
        const key = cartKey(newItem.sku, newItem.talla);
        setItems((prev) => {
            const existing = prev.find((i) => cartKey(i.sku, i.talla) === key);
            if (existing) {
                return prev.map((i) =>
                    cartKey(i.sku, i.talla) === key
                        ? { ...i, cantidad: i.cantidad + quantity, valor: newItem.valor || i.valor, imagen: newItem.imagen || i.imagen }
                        : i
                );
            }
            return [...prev, { ...newItem, cantidad: quantity }];
        });
        setIsOpen(true); // Open cart when adding item
    };

    const removeFromCart = (sku: string, talla?: string) => {
        const key = cartKey(sku, talla);
        setItems((prev) => prev.filter((i) => cartKey(i.sku, i.talla) !== key));
    };

    const updateQuantity = (sku: string, talla?: string, cantidad?: number) => {
        const key = cartKey(sku, talla);
        setItems((prev) => {
            if ((cantidad ?? 0) <= 0) {
                return prev.filter((i) => cartKey(i.sku, i.talla) !== key);
            }
            return prev.map((i) => (cartKey(i.sku, i.talla) === key ? { ...i, cantidad: cantidad! } : i));
        });
    };

    const clearCart = () => {
        setItems([]);
    };

    const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);
    const totalValue = items.reduce((acc, item) => acc + (item.valor || 0) * item.cantidad, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                cart: items, // Alias for compatibility
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                totalItems,
                totalValue,
                isOpen,
                setIsOpen,
                hasMounted,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};
