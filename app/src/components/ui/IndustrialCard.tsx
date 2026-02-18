"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "neon" | "alert" | "success"
}

const IndustrialCard = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = "default", children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative overflow-hidden rounded-lg border p-6 transition-all duration-300 transform group", // Using 'rounded-lg' (8px)
                    "bg-white dark:bg-slate-900 shadow-xl", // Changed from slate-950/80 to slate-900 for 'surface' look
                    {
                        "border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-blue-500/10 hover:-translate-y-1": variant === "default", // More predictable hover
                        "border-blue-500/30 bg-blue-950/10 hover:border-blue-400/50 hover:shadow-blue-500/10": variant === "neon",
                        "border-red-500/30 bg-red-950/10 hover:border-red-400/50": variant === "alert",
                        "border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-400/50": variant === "success",
                    },
                    className
                )}
                {...props}
            >
                <div className="relative z-10">{children}</div>

                {/* Decorative Grid Background - Subtle, engineering paper style */}
                <div className="absolute inset-0 z-0 opacity-5 pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>
            </div>
        )
    }
)
IndustrialCard.displayName = "IndustrialCard"

export { IndustrialCard }
