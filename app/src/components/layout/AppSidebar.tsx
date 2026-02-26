"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    Users,
    LogOut,
    ClipboardList,
    Shield,
    FileText,
    ListTodo,
    ArrowLeftRight,
    ShoppingCart,
    ChevronDown,
    Settings,
    Compass,
    PanelLeftClose,
    PanelLeft,
} from "lucide-react";
import { type User } from "@supabase/supabase-js";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";
import { type UserProfile, type RolePermission } from "@/app/profile/actions";
import { AvatarDisplay } from "@/components/profile/AvatarSelector";
import { ThemeToggle } from "./ThemeToggle";

// Map page_key to route and menu info
import { ALL_MENU_ITEMS } from "@/constants/navigation";

const allMenuItems = ALL_MENU_ITEMS;

interface AppSidebarProps {
    user: User | null;
    profile: UserProfile | null;
    permissions: RolePermission[];
}

export function AppSidebar({ user, profile, permissions }: AppSidebarProps) {
    const pathname = usePathname();
    const [navMenuOpen, setNavMenuOpen] = useState(true);
    const [adminMenuOpen, setAdminMenuOpen] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Persist collapsed state
    useEffect(() => {
        const stored = localStorage.getItem("sidebar-collapsed");
        if (stored === "true") setCollapsed(true);
    }, []);

    useEffect(() => {
        localStorage.setItem("sidebar-collapsed", String(collapsed));
    }, [collapsed]);

    const handleSignOut = async () => {
        await signOut();
    };

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const handleLogoutCancel = () => {
        setShowLogoutConfirm(false);
    };

    const handleLogoutConfirm = async () => {
        setShowLogoutConfirm(false);
        await handleSignOut();
    };

    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const isAdmin = profile?.role === 'Administrador';

    // Build the visible menu items separated by group
    const visibleNavItems = allMenuItems
        .filter((item) => item.group === "navigation")
        .filter((item) => {
            if (isAdmin) return true;
            const perm = permissions.find(p => p.page_key === item.key);
            if (!perm) return true;
            return perm.allowed;
        });

    const visibleAdminItems = allMenuItems
        .filter((item) => item.group === "admin")
        .filter((item) => {
            if (isAdmin) return true;
            const perm = permissions.find(p => p.page_key === item.key);
            if (!perm) return false; // admin items hidden by default for non-admins
            return perm.allowed;
        });

    const hasAdminItems = visibleAdminItems.length > 0;
    // Check if any admin route is active (to auto-expand)
    const isAdminRouteActive = visibleAdminItems.some(item => item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
    const isNavRouteActive = visibleNavItems.some(item => item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));

    const renderMenuLink = (item: typeof allMenuItems[0]) => {
        // For short routes like /admin, require exact match to avoid
        // highlighting multiple items (e.g. /admin AND /admin/edit-history)
        const isActive = item.href === '/'
            ? pathname === '/'
            : item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
            <li key={item.href}>
                <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                        "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
                        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                        isActive
                            ? "bg-[var(--brand)] text-white shadow-lg"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    )}
                >
                    <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                    {!collapsed && item.label}
                </Link>
            </li>
        );
    };

    const SectionHeader = ({
        icon: Icon,
        label,
        isOpen,
        onToggle,
        colorClass,
    }: {
        icon: React.ComponentType<{ className?: string }>;
        label: string;
        isOpen: boolean;
        onToggle: () => void;
        colorClass: string;
    }) => {
        if (collapsed) {
            return (
                <div className="flex justify-center py-2 mb-2">
                    <div className={cn("w-8 h-[2px] rounded-full", colorClass === "blue" ? "bg-slate-500/40 dark:bg-slate-500/30" : "bg-amber-500/40")} />
                </div>
            );
        }

        return (
            <button
                onClick={onToggle}
                className={cn(
                    "flex items-center justify-between w-full mb-3 px-2 py-2 rounded-lg transition-all duration-200 group/section",
                    "hover:bg-slate-100/50 dark:hover:bg-slate-800/50",
                    colorClass === "blue"
                        ? "border-l-2 border-slate-400 dark:border-slate-500"
                        : "border-l-2 border-amber-500 dark:border-amber-400"
                )}
            >
                <span className="flex items-center gap-2.5">
                    <span className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-md",
                        colorClass === "blue"
                            ? "bg-slate-200/80 dark:bg-slate-600/30"
                            : "bg-amber-500/15 dark:bg-amber-500/20"
                    )}>
                        <Icon className={cn(
                            "w-3.5 h-3.5",
                            colorClass === "blue"
                                ? "text-slate-600 dark:text-slate-400"
                                : "text-amber-600 dark:text-amber-400"
                        )} />
                    </span>
                    <span className={cn(
                        "text-xs font-bold uppercase tracking-widest",
                        colorClass === "blue"
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-amber-700 dark:text-amber-300"
                    )}>
                        {label}
                    </span>
                </span>
                <ChevronDown
                    className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200",
                        colorClass === "blue"
                            ? "text-slate-500/50 dark:text-slate-400/50"
                            : "text-amber-500/50 dark:text-amber-400/50",
                        isOpen ? "rotate-0" : "-rotate-90"
                    )}
                />
            </button>
        );
    };

    return (
        <>
            <aside
                className={cn(
                    "border-r border-slate-200 dark:border-slate-800 flex-col hidden md:flex h-full backdrop-blur-2xl transition-all duration-300 relative",
                    collapsed ? "w-[72px]" : "w-64"
                )}
            >
                {/* Collapse Toggle Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        "absolute -right-3 top-7 z-50 w-6 h-6 rounded-full",
                        "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
                        "flex items-center justify-center shadow-md",
                        "hover:bg-slate-100 dark:hover:bg-slate-700/40 hover:border-slate-300 dark:hover:border-slate-600",
                        "transition-all duration-200 group/toggle"
                    )}
                    title={collapsed ? "Expandir menú" : "Colapsar menú"}
                >
                    {collapsed ? (
                        <PanelLeft className="w-3.5 h-3.5 text-slate-400 group-hover/toggle:text-slate-200 transition-colors" />
                    ) : (
                        <PanelLeftClose className="w-3.5 h-3.5 text-slate-400 group-hover/toggle:text-slate-200 transition-colors" />
                    )}
                </button>

                {/* Logo Area */}
                <div className={cn("flex items-center gap-3 transition-all duration-300", collapsed ? "p-4 justify-center" : "p-6")}>
                    <div className="w-[54px] h-[54px] rounded-xl bg-white dark:bg-white flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
                        <Image src="/logo-dole.png" alt="Dole" width={48} height={48} className="object-contain" />
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">Gestión de Pañol</span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase">Dole Molina</span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className={cn("flex-1 space-y-5 py-4 overflow-y-auto", collapsed ? "px-2" : "px-4")}>
                    {/* General Navigation */}
                    <div>
                        <SectionHeader
                            icon={Compass}
                            label="Navegación"
                            isOpen={navMenuOpen || isNavRouteActive}
                            onToggle={() => setNavMenuOpen(!navMenuOpen)}
                            colorClass="blue"
                        />
                        <div
                            className={cn(
                                "overflow-hidden transition-all duration-200",
                                (navMenuOpen || isNavRouteActive || collapsed) ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                            )}
                        >
                            <ul className="space-y-1">
                                {visibleNavItems.map(renderMenuLink)}
                            </ul>
                        </div>
                    </div>

                    {/* Admin Section */}
                    {hasAdminItems && (
                        <div>
                            <SectionHeader
                                icon={Shield}
                                label="Administración"
                                isOpen={adminMenuOpen || isAdminRouteActive}
                                onToggle={() => setAdminMenuOpen(!adminMenuOpen)}
                                colorClass="amber"
                            />
                            <div
                                className={cn(
                                    "overflow-hidden transition-all duration-200",
                                    (adminMenuOpen || isAdminRouteActive || collapsed) ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                                )}
                            >
                                <ul className="space-y-1">
                                    {visibleAdminItems.map(renderMenuLink)}
                                </ul>
                            </div>
                        </div>
                    )}
                </nav>

                {/* Theme Toggle */}
                <div className={cn("px-4 pb-2", collapsed && "px-2")}>
                    <ThemeToggle
                        variant={collapsed ? "icon" : "default"}
                        className={cn(
                            "w-full justify-center",
                            collapsed && "p-2 rounded-xl"
                        )}
                    />
                </div>

                {/* User Profile - Clickable to go to Mi Perfil */}
                <div className={cn("p-4 border-t border-slate-200 dark:border-slate-800", collapsed && "p-2")}>
                    {collapsed ? (
                        <div className="flex flex-col items-center gap-2">
                            <Link href="/profile" title={displayName}>
                                <AvatarDisplay
                                    avatarId={profile?.avatar_id || null}
                                    userName={displayName}
                                    size="md"
                                    className="shadow-sm ring-1 ring-slate-100 dark:ring-slate-600"
                                />
                            </Link>
                            <button
                                onClick={handleLogoutClick}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors group/logout"
                                title="Cerrar Sesión"
                            >
                                <LogOut className="w-4 h-4 text-slate-400 group-hover/logout:text-red-500 dark:text-slate-500 dark:group-hover/logout:text-red-400 transition-colors" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                            <Link
                                href="/profile"
                                className="flex items-center gap-3 flex-1 min-w-0 group"
                            >
                                <AvatarDisplay
                                    avatarId={profile?.avatar_id || null}
                                    userName={displayName}
                                    size="md"
                                    className="shadow-sm ring-1 ring-slate-100 dark:ring-slate-600"
                                />
                                <div className="flex-1 overflow-hidden min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate tracking-tight transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-300">
                                        {displayName}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {isAdmin ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600/30 px-2 py-0.5 rounded-full">
                                                <Shield className="w-2.5 h-2.5" />
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
                                                Operador
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
                            <button
                                onClick={handleLogoutClick}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors shrink-0 group/logout"
                                title="Cerrar Sesión"
                            >
                                <LogOut className="w-4 h-4 text-slate-400 group-hover/logout:text-red-500 dark:text-slate-500 dark:group-hover/logout:text-red-400 transition-colors" />
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={handleLogoutCancel}
                    />
                    {/* Modal */}
                    <div className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-[340px] max-w-[90vw] animate-in zoom-in-95 fade-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
                                <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">¿Cerrar sesión?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                Estás a punto de salir de tu cuenta. ¿Deseas continuar?
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={handleLogoutCancel}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleLogoutConfirm}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 shadow-lg shadow-red-500/25 transition-colors"
                                >
                                    Sí, cerrar sesión
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
