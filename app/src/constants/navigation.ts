
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
    Bot,
    History,
    Home,
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
    { key: "inicio", label: "Inicio", href: "/inicio", icon: Home, group: "navigation" },
    { key: "inventory", label: "Inventario", href: "/inventory", icon: Package, group: "navigation" },
    { key: "requests_new", label: "Carrito", href: "/requests/new", icon: ShoppingCart, group: "navigation" },
    { key: "my_orders", label: "Mis Solicitudes", href: "/my-orders", icon: FileText, group: "navigation" },
    { key: "ai_assistant", label: "Asistente IA", href: "/assistant", icon: Bot, group: "navigation" },

    // --- Administración (solo admins) ---
    { key: "dashboard", label: "Panel de Control", href: "/dashboard", icon: LayoutDashboard, group: "admin" },
    { key: "scan_qr", label: "Escanear QR", href: "/scan", icon: ScanLine, group: "admin" },
    { key: "requests_pending", label: "Administrar Solicitudes", href: "/requests/pending", icon: ListTodo, group: "admin" },
    { key: "stock", label: "Gestión de Stock", href: "/stock", icon: ArrowLeftRight, group: "admin" },
    { key: "edit_history", label: "Historial Ediciones", href: "/admin/edit-history", icon: History, group: "admin" },
    { key: "admin", label: "Configuración avanzada", href: "/admin", icon: Settings, group: "admin" },
];
