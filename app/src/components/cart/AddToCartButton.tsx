"use client";

import { useCart } from "@/context/cart-context";
import { FolderPlus } from "lucide-react";

export function AddToCartButton({ sku, nombre, valor = 0, imagen }: { sku: string; nombre: string; valor?: number; imagen?: string }) {
    const { addToCart } = useCart();

    return (
        <button
            onClick={() => addToCart({ sku, nombre, valor, imagen })}
            className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center shadow-lg shadow-blue-500/20"
            title="Agregar al Pedido"
        >
            <FolderPlus className="w-5 h-5" />
        </button>
    );
}
