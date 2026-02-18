"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    FileText,
    Menu,
    X,
    Shield,
    LogOut,
    ListTodo,
    ArrowLeftRight,
    Settings,
    ChevronRight,
} from "lucide-react";
import { type User } from "@supabase/supabase-js";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";
import { type UserProfile, type RolePermission } from "@/app/profile/actions";
import { AvatarDisplay } from "@/components/profile/AvatarSelector";
import { ThemeToggle } from "./ThemeToggle";
import { ALL_MENU_ITEMS } from "@/constants/navigation";

interface MobileNavProps {
    user: User | null;
    profile: UserProfile | null;
    permissions: RolePermission[];
}

// Bottom tab items (max 5 for thumb reach)
const BOTTOM_TABS = [
    { key: "dashboard", label: "Inicio", href: "/", icon: LayoutDashboard },
    { key: "inventory", label: "Inventario", href: "/inventory", icon: Package },
    { key: "requests_new", label: "Carrito", href: "/requests/new", icon: ShoppingCart },
    { key: "my_orders", label: "Solicitudes", href: "/my-orders", icon: FileText },
];

export function MobileNav({ user, profile, permissions }: MobileNavProps) {
    const pathname = usePathname();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);

    const isAdmin = profile?.role === "Administrador";
    const displayName =
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "User";

    // Close drawer when path changes
    useEffect(() => {
        setDrawerOpen(false);
    }, [pathname]);

    // Lock body scroll when drawer open
    useEffect(() => {
        if (drawerOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [drawerOpen]);

    const handleSignOut = async () => {
        await signOut();
    };

    // Admin items filtered by permissions
    const visibleAdminItems = ALL_MENU_ITEMS
        .filter((item) => item.group === "admin")
        .filter((item) => {
            if (isAdmin) return true;
            const perm = permissions.find((p) => p.page_key === item.key);
            if (!perm) return false;
            return perm.allowed;
        });

    const hasAdminItems = visibleAdminItems.length > 0;

    // Check if current path matches any bottom tab
    const isTabActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    // Don't render on login page
    if (pathname === "/login" || pathname === "/register") return null;

    return (
        <>
            {/* ─── Bottom Navigation Bar ─── */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 safe-area-bottom">
                <div className="flex items-center h-16">
                    {BOTTOM_TABS.map((tab) => {
                        const active = isTabActive(tab.href);
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.key}
                                href={tab.href}
                                className={cn(
                                    "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors relative",
                                    active
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-slate-400 dark:text-slate-500 active:text-slate-600 dark:active:text-slate-300"
                                )}
                            >
                                {active && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                                )}
                                <Icon className={cn("w-5 h-5", active && "scale-110")} />
                                <span className="text-[10px] font-semibold leading-none">
                                    {tab.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* More / Menu button */}
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                            drawerOpen
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-slate-400 dark:text-slate-500 active:text-slate-600 dark:active:text-slate-300"
                        )}
                    >
                        <Menu className="w-5 h-5" />
                        <span className="text-[10px] font-semibold leading-none">Más</span>
                    </button>
                </div>
            </nav>

            {/* ─── Drawer Overlay ─── */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setDrawerOpen(false)}
                    />

                    {/* Drawer Panel */}
                    <div
                        ref={drawerRef}
                        className="absolute right-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col"
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                                    <Package className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                    Gestión de Pañol
                                </span>
                            </div>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="p-2 -mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Drawer Nav */}
                        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                            {/* Profile Link */}
                            <Link
                                href="/profile"
                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-4"
                            >
                                <AvatarDisplay
                                    avatarId={profile?.avatar_id || null}
                                    userName={displayName}
                                    size="md"
                                    className="shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                        {displayName}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {isAdmin ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/20 px-2 py-0.5 rounded-full">
                                                <Shield className="w-2.5 h-2.5" />
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-medium text-slate-500">
                                                Operador
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </Link>

                            {/* Admin Section */}
                            {hasAdminItems && (
                                <div className="pt-2">
                                    <p className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2 flex items-center gap-1.5">
                                        <Shield className="w-3 h-3" />
                                        Administración
                                    </p>
                                    {visibleAdminItems.map((item) => {
                                        const Icon = item.icon;
                                        const active = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                                                    active
                                                        ? "bg-blue-600 text-white shadow-lg"
                                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700"
                                                )}
                                            >
                                                <Icon
                                                    className={cn(
                                                        "w-5 h-5",
                                                        active ? "text-white" : "text-slate-400 dark:text-slate-500"
                                                    )}
                                                />
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Theme Toggle */}
                            <div className="pt-4 px-3">
                                <ThemeToggle />
                            </div>
                        </div>

                        {/* Sign Out */}
                        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm font-medium border border-slate-200 dark:border-slate-800"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
