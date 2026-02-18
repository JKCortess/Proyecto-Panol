
import {
    LayoutDashboard,
    Package,
    ArrowLeftRight,
    Users,
    ClipboardList,
    FileText,
    ListTodo,
    ShoppingCart,
    Settings,
    ScanLine,
} from "lucide-react";

export type MenuGroup = "navigation" | "admin";

export interface MenuItem {
    key: string;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    group: MenuGroup;
}

export const ALL_MENU_ITEMS: MenuItem[] = [
    // --- Navegación (visible para todos según permisos) ---
    { key: "dashboard", label: "Inicio", href: "/", icon: LayoutDashboard, group: "navigation" },
    { key: "inventory", label: "Inventario", href: "/inventory", icon: Package, group: "navigation" },
    { key: "requests_new", label: "Carrito", href: "/requests/new", icon: ShoppingCart, group: "navigation" },
    { key: "my_orders", label: "Mis Solicitudes", href: "/my-orders", icon: FileText, group: "navigation" },

    // --- Administración (solo admins) ---
    { key: "scan_qr", label: "Escanear QR", href: "/scan", icon: ScanLine, group: "admin" },
    { key: "requests_pending", label: "Administrar Solicitudes", href: "/requests/pending", icon: ListTodo, group: "admin" },
    { key: "stock", label: "Gestión de Stock", href: "/stock", icon: ArrowLeftRight, group: "admin" },
    { key: "admin", label: "Configuración avanzada", href: "/admin", icon: Settings, group: "admin" },
];
