"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Package,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    User,
    Calendar,
    Pencil,
} from "lucide-react";

interface EditChange {
    id: string;
    field_label: string;
    old_value: string;
    new_value: string;
}

interface EditGroup {
    key: string;
    sku: string;
    itemName: string;
    talla: string | null;
    editedBy: string;
    createdAt: string;
    changes: EditChange[];
}

interface EditHistoryCardProps {
    group: EditGroup;
    imageUrl: string | null;
}

export function EditHistoryCard({ group, imageUrl }: EditHistoryCardProps) {
    const [expanded, setExpanded] = useState(false);

    const date = new Date(group.createdAt);
    const formattedDate = date.toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
        >
            {/* Clickable Header */}
            <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="w-full text-left flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100/60 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
            >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={group.itemName}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            unoptimized
                        />
                    ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {group.itemName}
                        {group.talla && (
                            <span className="ml-1 text-purple-500 dark:text-purple-400 font-mono text-xs">
                                ({group.talla})
                            </span>
                        )}
                    </p>
                    <p className="text-xs font-mono text-slate-400">
                        SKU: {group.sku}
                    </p>
                </div>

                {/* Meta */}
                <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500 shrink-0">
                    <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {group.editedBy}
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate} {formattedTime}
                    </span>
                </div>

                {/* Expand icon */}
                <div className="shrink-0 text-slate-400">
                    {expanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </div>
            </button>

            {/* Mobile meta (always visible) */}
            <div className="sm:hidden flex items-center gap-4 px-5 py-2 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {group.editedBy}
                </span>
                <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formattedDate} {formattedTime}
                </span>
            </div>

            {/* Expandable Content */}
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    }`}
            >
                {/* Changes Table */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.changes.map((change) => (
                        <div
                            key={change.id}
                            className="flex items-center gap-3 px-5 py-2.5"
                        >
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 min-w-[100px] shrink-0">
                                {change.field_label}
                            </span>
                            <span
                                className="text-xs font-mono text-red-400/80 line-through truncate max-w-[200px]"
                                title={change.old_value}
                            >
                                {change.old_value || "(vacío)"}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span
                                className="text-xs font-mono text-emerald-400 font-semibold truncate max-w-[200px]"
                                title={change.new_value}
                            >
                                {change.new_value || "(vacío)"}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Action: Go to inventory */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30 flex justify-end">
                    <Link
                        href={`/inventory?q=${encodeURIComponent(group.sku)}`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/40 transition-all duration-200"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar en Inventario
                    </Link>
                </div>
            </div>
        </div>
    );
}
