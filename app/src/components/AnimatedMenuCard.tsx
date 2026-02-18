
"use client";

import { motion } from "framer-motion";
import { IndustrialCard } from "@/components/ui/IndustrialCard";
import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
    title: string;
    desc: string;
    icon: ReactNode;
    href: string;
    variant?: "default" | "neon";
    index: number;
}

export function AnimatedMenuCard({ title, desc, icon, href, variant = "default", index }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: index * 0.1 + 0.3,
                duration: 0.5,
                type: "spring",
                stiffness: 100
            }}
            className="h-full"
        >
            <Link href={href} className="group block h-full outline-none">
                <IndustrialCard
                    variant={variant}
                    className={cn(
                        "h-full flex flex-col justify-between transition-all duration-300",
                        "group-hover:border-slate-500/50 group-hover:shadow-xl group-hover:shadow-blue-500/5",
                        "group-focus:ring-2 group-focus:ring-blue-500 group-focus:ring-offset-2 group-focus:ring-offset-slate-950"
                    )}
                >
                    <div className="flex flex-col gap-4">
                        <div className={cn(
                            "p-4 rounded-lg w-fit transition-all duration-300",
                            "bg-slate-900/80 border border-slate-800",
                            "group-hover:border-blue-500/30 group-hover:bg-blue-500/10",
                            "group-hover:scale-110 group-hover:rotate-3"
                        )}>
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-100 group-hover:text-blue-400 transition-colors tracking-tight">
                                {title}
                            </h3>
                            <p className="text-slate-400 text-sm mt-2 leading-relaxed font-light">
                                {desc}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                        <span className="text-xs font-mono text-blue-400 uppercase tracking-widest">Acceder &rarr;</span>
                    </div>
                </IndustrialCard>
            </Link>
        </motion.div>
    );
}
