"use client";

import * as React from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ModernDatePickerProps {
    name?: string;
    label?: string;
    value?: string; // YYYY-MM-DD
    defaultValue?: string; // YYYY-MM-DD
    onChange?: (date: string) => void;
    className?: string;
    placeholder?: string;
    dark?: boolean;
}

export function ModernDatePicker({
    name,
    label,
    value: controlledValue,
    defaultValue,
    onChange,
    className,
    placeholder = "Seleccionar fecha",
    dark = true,
}: ModernDatePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Internal state for uncontrolled usage or local tracking
    const [internalValue, setInternalValue] = React.useState<string>(
        controlledValue || defaultValue || ""
    );

    const value = controlledValue !== undefined ? controlledValue : internalValue;

    const [viewDate, setViewDate] = React.useState<Date>(() => {
        return value ? new Date(value + "T00:00:00") : new Date();
    });

    const calendarRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (controlledValue) {
            setInternalValue(controlledValue);
            setViewDate(new Date(controlledValue + "T00:00:00"));
        }
    }, [controlledValue]);

    // Click outside to close
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
    const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

    const handleSelectDate = (date: Date) => {
        const formatted = format(date, "yyyy-MM-dd");
        setInternalValue(formatted);
        if (onChange) onChange(formatted);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setInternalValue("");
        if (onChange) onChange("");
    };

    const days = React.useMemo(() => {
        const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 }); // Monday start
        const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [viewDate]);

    const displayDate = value ? format(new Date(value + "T00:00:00"), "dd/MM/yyyy") : "";
    const monthName = format(viewDate, "MMMM yyyy", { locale: es });

    return (
        <div className={cn("relative", className)} ref={calendarRef}>
            {label && (
                <label className="text-[11px] uppercase text-slate-500 font-semibold block mb-1">
                    {label}
                </label>
            )}

            {/* Hidden input for forms */}
            {name && <input type="hidden" name={name} value={value} />}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg border cursor-pointer transition-all duration-200",
                    isOpen ? "ring-2 ring-blue-500/50 border-blue-500/50" : "",
                    dark
                        ? "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600"
                        : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                )}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className={cn("truncate", !displayDate && "text-slate-500")}>
                        {displayDate || placeholder}
                    </span>
                </div>
                {value && (
                    <div
                        role="button"
                        onClick={handleClear}
                        className="p-0.5 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                    >
                        <X className="w-3.5 h-3.5" />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={cn(
                            "absolute z-50 mt-2 p-4 rounded-2xl shadow-2xl border w-[300px]",
                            dark
                                ? "bg-slate-900/95 border-slate-800 backdrop-blur-xl"
                                : "bg-white/95 border-slate-200 backdrop-blur-xl"
                        )}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                aria-label="Previous month"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h4 className="font-semibold text-sm capitalize text-slate-100">
                                {monthName}
                            </h4>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                aria-label="Next month"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 mb-2">
                            {["lu", "ma", "mi", "ju", "vi", "sá", "do"].map((day) => (
                                <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-slate-500 uppercase">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day) => {
                                const isSelected = value ? isSameDay(day, new Date(value + "T00:00:00")) : false;
                                const isCurrentMonth = isSameMonth(day, viewDate);
                                const isTodayDate = isToday(day);

                                return (
                                    <button
                                        type="button"
                                        key={day.toISOString()}
                                        onClick={() => handleSelectDate(day)}
                                        className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all relative",
                                            !isCurrentMonth && "text-slate-600 opacity-50",
                                            isSelected
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 font-bold"
                                                : isCurrentMonth ? "text-slate-200 hover:bg-slate-800" : "",
                                            !isSelected && isTodayDate && "text-blue-400 font-bold after:content-[''] after:absolute after:bottom-1 after:w-1 after:h-1 after:bg-blue-400 after:rounded-full"
                                        )}
                                    >
                                        {format(day, "d")}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center px-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setInternalValue("");
                                    if (onChange) onChange("");
                                    setIsOpen(false);
                                }}
                                className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                Borrar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSelectDate(new Date())}
                                className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors"
                            >
                                Hoy
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
