"use client";

import { useState, useEffect, useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem("ui-theme");
    if (stored === "light" || stored === "dark") return stored;

    const root = document.documentElement;
    if (root.classList.contains("theme-light")) return "light";
    if (root.classList.contains("theme-dark")) return "dark";

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark", "dark");
    root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
    if (theme === "dark") root.classList.add("dark");
}

export function ThemeToggle({ className, variant = "default" }: { className?: string, variant?: "default" | "icon" }) {
    const [theme, setTheme] = useState<ThemeMode>("dark");
    const [mounted, setMounted] = useState(false);

    // Initialize theme from DOM/localStorage after mount
    useEffect(() => {
        setTheme(getInitialTheme());
        setMounted(true);
    }, []);

    const toggleTheme = useCallback(() => {
        const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
        localStorage.setItem("ui-theme", nextTheme);
        applyTheme(nextTheme);
        setTheme(nextTheme);
    }, [theme]);

    // Listen for external changes (other tabs, system preference)
    useEffect(() => {
        const onStorage = () => {
            setTheme(getInitialTheme());
        };
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onMediaChange = () => {
            if (!localStorage.getItem("ui-theme")) {
                const next = media.matches ? "dark" : "light";
                applyTheme(next);
                setTheme(next);
            }
        };

        window.addEventListener("storage", onStorage);
        media.addEventListener("change", onMediaChange);
        return () => {
            window.removeEventListener("storage", onStorage);
            media.removeEventListener("change", onMediaChange);
        };
    }, []);

    // Prevent hydration mismatch - show dark icon until mounted
    const displayTheme = mounted ? theme : "dark";

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={cn(
                "inline-flex items-center transition-all",
                variant === "default" && "gap-2 rounded-full border border-slate-300 dark:border-slate-700/60 px-3 py-2 text-xs font-semibold backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80",
                className
            )}
            title={displayTheme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            aria-label={displayTheme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        >
            {displayTheme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-slate-500" />}
            {variant === "default" && <span>{displayTheme === "dark" ? "Claro" : "Oscuro"}</span>}
        </button>
    );
}
