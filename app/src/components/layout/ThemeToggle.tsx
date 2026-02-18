"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark";

function applyTheme(theme: ThemeMode) {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark", "dark");
    root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
    if (theme === "dark") root.classList.add("dark");
}

function getThemeSnapshot(): ThemeMode {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem("ui-theme");
    if (stored === "light" || stored === "dark") return stored;

    const root = document.documentElement;
    if (root.classList.contains("theme-light")) return "light";
    if (root.classList.contains("theme-dark")) return "dark";

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeTheme(callback: () => void) {
    if (typeof window === "undefined") return () => undefined;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onStorage = () => callback();
    const onMediaChange = () => callback();

    window.addEventListener("storage", onStorage);
    media.addEventListener("change", onMediaChange);

    // Trigger one client recalculation after hydration.
    queueMicrotask(callback);

    return () => {
        window.removeEventListener("storage", onStorage);
        media.removeEventListener("change", onMediaChange);
    };
}

export function ThemeToggle({ className, variant = "default" }: { className?: string, variant?: "default" | "icon" }) {
    const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "dark");

    const toggleTheme = () => {
        const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
        localStorage.setItem("ui-theme", nextTheme);
        applyTheme(nextTheme);
    };

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={cn(
                "inline-flex items-center transition-all",
                variant === "default" && "gap-2 rounded-full border border-slate-700/60 px-3 py-2 text-xs font-semibold backdrop-blur-xl bg-slate-900/70 text-slate-200 hover:bg-slate-800/80",
                className
            )}
            title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-300" /> : <Moon className="h-3.5 w-3.5 text-slate-300" />}
            {variant === "default" && <span>{theme === "dark" ? "Claro" : "Oscuro"}</span>}
        </button>
    );
}
