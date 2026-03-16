'use client'

import { useState } from 'react';
import { Camera, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── SVG Avatar Icon Components ─────────────────────────────────────────

function IconFox({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Ears */}
            <path d="M12 8L18 26H8L12 8Z" fill="#FF8844" stroke="#FF6622" strokeWidth="1"/>
            <path d="M52 8L46 26H56L52 8Z" fill="#FF8844" stroke="#FF6622" strokeWidth="1"/>
            <path d="M14 14L18 26H12L14 14Z" fill="#FFD4B8"/>
            <path d="M50 14L46 26H52L50 14Z" fill="#FFD4B8"/>
            {/* Head */}
            <ellipse cx="32" cy="36" rx="20" ry="18" fill="#FF8844"/>
            <ellipse cx="32" cy="38" rx="14" ry="12" fill="#FFD4B8"/>
            {/* Eyes */}
            <ellipse cx="24" cy="32" rx="3.5" ry="4" fill="white"/>
            <ellipse cx="40" cy="32" rx="3.5" ry="4" fill="white"/>
            <ellipse cx="25" cy="32" rx="2" ry="2.5" fill="#2D1B00"/>
            <ellipse cx="41" cy="32" rx="2" ry="2.5" fill="#2D1B00"/>
            <circle cx="26" cy="31" r="0.8" fill="white"/>
            <circle cx="42" cy="31" r="0.8" fill="white"/>
            {/* Nose */}
            <ellipse cx="32" cy="39" rx="3" ry="2" fill="#2D1B00"/>
            <ellipse cx="32" cy="38.5" rx="1.2" ry="0.6" fill="#5A3A1A" opacity="0.5"/>
            {/* Mouth */}
            <path d="M29 41 Q32 44 35 41" stroke="#2D1B00" strokeWidth="1" fill="none" strokeLinecap="round"/>
            {/* Whiskers */}
            <line x1="8" y1="36" x2="20" y2="38" stroke="#2D1B00" strokeWidth="0.5" opacity="0.3"/>
            <line x1="8" y1="40" x2="20" y2="40" stroke="#2D1B00" strokeWidth="0.5" opacity="0.3"/>
            <line x1="56" y1="36" x2="44" y2="38" stroke="#2D1B00" strokeWidth="0.5" opacity="0.3"/>
            <line x1="56" y1="40" x2="44" y2="40" stroke="#2D1B00" strokeWidth="0.5" opacity="0.3"/>
        </svg>
    );
}

function IconWolf({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Ears */}
            <path d="M14 6L20 24H8L14 6Z" fill="#6B7280"/>
            <path d="M50 6L44 24H56L50 6Z" fill="#6B7280"/>
            <path d="M15 12L19 24H12L15 12Z" fill="#9CA3AF"/>
            <path d="M49 12L45 24H52L49 12Z" fill="#9CA3AF"/>
            {/* Head */}
            <ellipse cx="32" cy="34" rx="20" ry="19" fill="#6B7280"/>
            <ellipse cx="32" cy="32" rx="17" ry="15" fill="#9CA3AF"/>
            {/* Face mask */}
            <ellipse cx="32" cy="40" rx="10" ry="8" fill="#D1D5DB"/>
            {/* Eyes */}
            <path d="M22 29L26 27L30 29L26 31Z" fill="#FCD34D"/>
            <path d="M42 29L38 27L34 29L38 31Z" fill="#FCD34D"/>
            <ellipse cx="26" cy="29" rx="1.5" ry="1.5" fill="#1F2937"/>
            <ellipse cx="38" cy="29" rx="1.5" ry="1.5" fill="#1F2937"/>
            {/* Nose */}
            <ellipse cx="32" cy="38" rx="3.5" ry="2.5" fill="#374151"/>
            <ellipse cx="32" cy="37.5" rx="1.5" ry="0.7" fill="#6B7280" opacity="0.5"/>
            {/* Mouth */}
            <path d="M28 41 Q32 46 36 41" stroke="#374151" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
            {/* Marks */}
            <path d="M20 34L24 32" stroke="#6B7280" strokeWidth="1" opacity="0.5"/>
            <path d="M44 34L40 32" stroke="#6B7280" strokeWidth="1" opacity="0.5"/>
        </svg>
    );
}

function IconLion({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Mane */}
            <circle cx="32" cy="34" r="26" fill="#D97706" opacity="0.3"/>
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                <ellipse
                    key={angle}
                    cx={32 + 22 * Math.cos((angle * Math.PI) / 180)}
                    cy={34 + 22 * Math.sin((angle * Math.PI) / 180)}
                    rx="6"
                    ry="5"
                    fill="#D97706"
                    transform={`rotate(${angle} ${32 + 22 * Math.cos((angle * Math.PI) / 180)} ${34 + 22 * Math.sin((angle * Math.PI) / 180)})`}
                />
            ))}
            {/* Head */}
            <ellipse cx="32" cy="36" rx="16" ry="15" fill="#F59E0B"/>
            {/* Inner face */}
            <ellipse cx="32" cy="40" rx="10" ry="8" fill="#FDE68A"/>
            {/* Eyes */}
            <ellipse cx="25" cy="33" rx="3" ry="3.5" fill="white"/>
            <ellipse cx="39" cy="33" rx="3" ry="3.5" fill="white"/>
            <ellipse cx="26" cy="33" rx="1.8" ry="2" fill="#78350F"/>
            <ellipse cx="40" cy="33" rx="1.8" ry="2" fill="#78350F"/>
            <circle cx="27" cy="32" r="0.7" fill="white"/>
            <circle cx="41" cy="32" r="0.7" fill="white"/>
            {/* Nose */}
            <path d="M29 39L32 41L35 39Z" fill="#92400E"/>
            {/* Mouth */}
            <path d="M30 42 Q32 44 34 42" stroke="#92400E" strokeWidth="1" fill="none" strokeLinecap="round"/>
        </svg>
    );
}

function IconBear({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Ears */}
            <circle cx="16" cy="18" r="8" fill="#92400E"/>
            <circle cx="48" cy="18" r="8" fill="#92400E"/>
            <circle cx="16" cy="18" r="4.5" fill="#D97706"/>
            <circle cx="48" cy="18" r="4.5" fill="#D97706"/>
            {/* Head */}
            <ellipse cx="32" cy="36" rx="20" ry="19" fill="#92400E"/>
            {/* Muzzle */}
            <ellipse cx="32" cy="42" rx="10" ry="8" fill="#D97706"/>
            {/* Eyes */}
            <ellipse cx="24" cy="32" rx="3" ry="3.5" fill="white"/>
            <ellipse cx="40" cy="32" rx="3" ry="3.5" fill="white"/>
            <ellipse cx="25" cy="32.5" rx="2" ry="2.2" fill="#1C1917"/>
            <ellipse cx="41" cy="32.5" rx="2" ry="2.2" fill="#1C1917"/>
            <circle cx="26" cy="31.5" r="0.8" fill="white"/>
            <circle cx="42" cy="31.5" r="0.8" fill="white"/>
            {/* Nose */}
            <ellipse cx="32" cy="40" rx="4" ry="2.5" fill="#1C1917"/>
            <ellipse cx="32" cy="39.5" rx="1.5" ry="0.7" fill="#44403C" opacity="0.5"/>
            {/* Mouth */}
            <path d="M30 43 Q32 46 34 43" stroke="#1C1917" strokeWidth="1" fill="none" strokeLinecap="round"/>
        </svg>
    );
}

function IconEagle({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Head feathers */}
            <ellipse cx="32" cy="28" rx="18" ry="16" fill="#1E3A5F"/>
            <ellipse cx="32" cy="26" rx="14" ry="12" fill="#2563EB"/>
            {/* White head */}
            <ellipse cx="32" cy="34" rx="16" ry="14" fill="white"/>
            {/* Brow ridge */}
            <path d="M18 28 Q25 24 32 28 Q39 24 46 28" fill="#1E3A5F"/>
            {/* Eyes */}
            <ellipse cx="24" cy="32" rx="4" ry="3.5" fill="#FCD34D"/>
            <ellipse cx="40" cy="32" rx="4" ry="3.5" fill="#FCD34D"/>
            <ellipse cx="25" cy="32" rx="2" ry="2.2" fill="#1F2937"/>
            <ellipse cx="41" cy="32" rx="2" ry="2.2" fill="#1F2937"/>
            <circle cx="26" cy="31" r="0.7" fill="#FCD34D"/>
            <circle cx="42" cy="31" r="0.7" fill="#FCD34D"/>
            {/* Beak */}
            <path d="M28 38L32 50L36 38Z" fill="#F59E0B"/>
            <path d="M29 38L32 46L35 38Z" fill="#D97706"/>
            <line x1="28" y1="40" x2="36" y2="40" stroke="#92400E" strokeWidth="0.5"/>
        </svg>
    );
}

function IconPenguin({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Body */}
            <ellipse cx="32" cy="38" rx="18" ry="20" fill="#1F2937"/>
            {/* White belly */}
            <ellipse cx="32" cy="40" rx="12" ry="15" fill="white"/>
            {/* Head */}
            <ellipse cx="32" cy="24" rx="14" ry="12" fill="#1F2937"/>
            {/* Eyes */}
            <ellipse cx="26" cy="24" rx="3.5" ry="4" fill="white"/>
            <ellipse cx="38" cy="24" rx="3.5" ry="4" fill="white"/>
            <ellipse cx="27" cy="24.5" rx="2" ry="2.5" fill="#1F2937"/>
            <ellipse cx="39" cy="24.5" rx="2" ry="2.5" fill="#1F2937"/>
            <circle cx="28" cy="23.5" r="0.8" fill="white"/>
            <circle cx="40" cy="23.5" r="0.8" fill="white"/>
            {/* Beak */}
            <path d="M29 29L32 34L35 29Z" fill="#F59E0B"/>
            {/* Blush */}
            <ellipse cx="22" cy="28" rx="3" ry="1.5" fill="#FCA5A5" opacity="0.4"/>
            <ellipse cx="42" cy="28" rx="3" ry="1.5" fill="#FCA5A5" opacity="0.4"/>
            {/* Bow tie */}
            <path d="M28 35L32 37L36 35L32 39Z" fill="#EF4444"/>
        </svg>
    );
}

function IconOwl({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Ear tufts */}
            <path d="M16 10L22 24L12 20Z" fill="#92400E"/>
            <path d="M48 10L42 24L52 20Z" fill="#92400E"/>
            {/* Body */}
            <ellipse cx="32" cy="38" rx="18" ry="18" fill="#B45309"/>
            {/* Face disc */}
            <ellipse cx="32" cy="32" rx="16" ry="14" fill="#D97706"/>
            {/* Eye rings */}
            <circle cx="24" cy="30" r="7" fill="#FDE68A"/>
            <circle cx="40" cy="30" r="7" fill="#FDE68A"/>
            {/* Eyes */}
            <circle cx="24" cy="30" r="4" fill="#1F2937"/>
            <circle cx="40" cy="30" r="4" fill="#1F2937"/>
            <circle cx="25.5" cy="28.5" r="1.5" fill="white"/>
            <circle cx="41.5" cy="28.5" r="1.5" fill="white"/>
            <circle cx="23" cy="31" r="0.8" fill="white" opacity="0.5"/>
            <circle cx="39" cy="31" r="0.8" fill="white" opacity="0.5"/>
            {/* Beak */}
            <path d="M30 35L32 40L34 35Z" fill="#F59E0B"/>
            {/* Chest pattern */}
            <path d="M24 44 Q32 50 40 44" stroke="#92400E" strokeWidth="1" fill="none"/>
            <path d="M26 48 Q32 52 38 48" stroke="#92400E" strokeWidth="1" fill="none"/>
        </svg>
    );
}

function IconCat({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Ears */}
            <path d="M14 8L22 26H8L14 8Z" fill="#6B7280"/>
            <path d="M50 8L42 26H56L50 8Z" fill="#6B7280"/>
            <path d="M15 14L20 26H11L15 14Z" fill="#F9A8D4"/>
            <path d="M49 14L44 26H54L49 14Z" fill="#F9A8D4"/>
            {/* Head */}
            <ellipse cx="32" cy="36" rx="20" ry="18" fill="#6B7280"/>
            <ellipse cx="32" cy="37" rx="16" ry="14" fill="#9CA3AF"/>
            {/* Eyes */}
            <ellipse cx="24" cy="32" rx="4" ry="5" fill="#86EFAC"/>
            <ellipse cx="40" cy="32" rx="4" ry="5" fill="#86EFAC"/>
            <ellipse cx="24" cy="32" rx="1.5" ry="4.5" fill="#1F2937"/>
            <ellipse cx="40" cy="32" rx="1.5" ry="4.5" fill="#1F2937"/>
            <circle cx="23" cy="30.5" r="0.8" fill="white"/>
            <circle cx="39" cy="30.5" r="0.8" fill="white"/>
            {/* Nose */}
            <path d="M30 38L32 40L34 38Z" fill="#F9A8D4"/>
            {/* Mouth */}
            <path d="M32 40 L30 43" stroke="#4B5563" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
            <path d="M32 40 L34 43" stroke="#4B5563" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
            {/* Whiskers */}
            <line x1="6" y1="34" x2="20" y2="36" stroke="#D1D5DB" strokeWidth="0.7"/>
            <line x1="6" y1="38" x2="20" y2="38" stroke="#D1D5DB" strokeWidth="0.7"/>
            <line x1="6" y1="42" x2="20" y2="40" stroke="#D1D5DB" strokeWidth="0.7"/>
            <line x1="58" y1="34" x2="44" y2="36" stroke="#D1D5DB" strokeWidth="0.7"/>
            <line x1="58" y1="38" x2="44" y2="38" stroke="#D1D5DB" strokeWidth="0.7"/>
            <line x1="58" y1="42" x2="44" y2="40" stroke="#D1D5DB" strokeWidth="0.7"/>
        </svg>
    );
}

function IconDog({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Ears (floppy) */}
            <ellipse cx="14" cy="28" rx="8" ry="14" fill="#92400E" transform="rotate(-10 14 28)"/>
            <ellipse cx="50" cy="28" rx="8" ry="14" fill="#92400E" transform="rotate(10 50 28)"/>
            {/* Head */}
            <ellipse cx="32" cy="34" rx="18" ry="17" fill="#D97706"/>
            {/* Face */}
            <ellipse cx="32" cy="40" rx="12" ry="8" fill="#FDE68A"/>
            {/* Eyes */}
            <ellipse cx="25" cy="31" rx="3.5" ry="4" fill="white"/>
            <ellipse cx="39" cy="31" rx="3.5" ry="4" fill="white"/>
            <ellipse cx="26" cy="31.5" rx="2.2" ry="2.5" fill="#1C1917"/>
            <ellipse cx="40" cy="31.5" rx="2.2" ry="2.5" fill="#1C1917"/>
            <circle cx="27" cy="30.5" r="0.9" fill="white"/>
            <circle cx="41" cy="30.5" r="0.9" fill="white"/>
            {/* Eyebrows */}
            <path d="M21 27 Q25 25 29 27" stroke="#92400E" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            <path d="M35 27 Q39 25 43 27" stroke="#92400E" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            {/* Nose */}
            <ellipse cx="32" cy="38" rx="3.5" ry="2.5" fill="#1C1917"/>
            <ellipse cx="32" cy="37.5" rx="1.3" ry="0.6" fill="#44403C" opacity="0.5"/>
            {/* Mouth */}
            <path d="M29 41 Q32 44 35 41" stroke="#1C1917" strokeWidth="1" fill="none" strokeLinecap="round"/>
            {/* Tongue */}
            <ellipse cx="32" cy="44" rx="2.5" ry="3" fill="#F87171"/>
            <line x1="32" y1="42" x2="32" y2="46" stroke="#EF4444" strokeWidth="0.5"/>
        </svg>
    );
}

function IconShark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Body */}
            <ellipse cx="32" cy="36" rx="24" ry="16" fill="#3B82F6"/>
            <ellipse cx="32" cy="40" rx="20" ry="10" fill="#93C5FD"/>
            {/* Dorsal fin */}
            <path d="M30 20L34 12L38 20Z" fill="#2563EB"/>
            {/* Eyes */}
            <ellipse cx="20" cy="32" rx="3" ry="3.5" fill="white"/>
            <ellipse cx="44" cy="32" rx="3" ry="3.5" fill="white"/>
            <ellipse cx="21" cy="32" rx="1.5" ry="2" fill="#1E3A5F"/>
            <ellipse cx="45" cy="32" rx="1.5" ry="2" fill="#1E3A5F"/>
            <circle cx="21.5" cy="31" r="0.6" fill="white"/>
            <circle cx="45.5" cy="31" r="0.6" fill="white"/>
            {/* Mouth/Grin */}
            <path d="M22 42 Q32 48 42 42" stroke="#1E3A5F" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            {/* Teeth */}
            <path d="M24 42L26 44L28 42L30 44L32 42L34 44L36 42L38 44L40 42" stroke="white" strokeWidth="1" fill="none"/>
            {/* Gills */}
            <line x1="16" y1="36" x2="16" y2="40" stroke="#2563EB" strokeWidth="0.7"/>
            <line x1="14" y1="36" x2="14" y2="39" stroke="#2563EB" strokeWidth="0.7"/>
            <line x1="48" y1="36" x2="48" y2="40" stroke="#2563EB" strokeWidth="0.7"/>
            <line x1="50" y1="36" x2="50" y2="39" stroke="#2563EB" strokeWidth="0.7"/>
        </svg>
    );
}

function IconRocket({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Flames */}
            <ellipse cx="28" cy="56" rx="3" ry="5" fill="#F59E0B" opacity="0.7"/>
            <ellipse cx="32" cy="58" rx="3.5" ry="6" fill="#EF4444" opacity="0.8"/>
            <ellipse cx="36" cy="56" rx="3" ry="5" fill="#F59E0B" opacity="0.7"/>
            <ellipse cx="32" cy="55" rx="2" ry="4" fill="#FDE68A" opacity="0.9"/>
            {/* Fins */}
            <path d="M22 44L16 52L24 48Z" fill="#6366F1"/>
            <path d="M42 44L48 52L40 48Z" fill="#6366F1"/>
            {/* Body */}
            <path d="M26 14 Q32 4 38 14 L40 48 H24 Z" fill="white"/>
            <path d="M27 14 Q32 6 37 14 L39 48 H25 Z" fill="#E0E7FF"/>
            {/* Window */}
            <circle cx="32" cy="26" r="5" fill="#3B82F6"/>
            <circle cx="32" cy="26" r="3.5" fill="#93C5FD"/>
            <circle cx="33.5" cy="24.5" r="1" fill="white" opacity="0.7"/>
            {/* Nose cone */}
            <path d="M28 14 Q32 6 36 14" fill="#EF4444"/>
            {/* Body stripe */}
            <rect x="26" y="36" width="12" height="3" rx="1" fill="#6366F1"/>
            <rect x="26" y="41" width="12" height="2" rx="1" fill="#6366F1"/>
        </svg>
    );
}

function IconBolt({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Outer glow */}
            <path d="M36 4L14 34H28L20 60L50 26H34Z" fill="#FDE68A" opacity="0.3" transform="scale(1.05) translate(-1 -1)"/>
            {/* Main bolt */}
            <path d="M36 4L14 34H28L20 60L50 26H34Z" fill="url(#boltGrad)"/>
            {/* Shine */}
            <path d="M34 10L20 32H28L24 48" stroke="white" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round"/>
            <defs>
                <linearGradient id="boltGrad" x1="20" y1="4" x2="44" y2="60" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FCD34D"/>
                    <stop offset="50%" stopColor="#F59E0B"/>
                    <stop offset="100%" stopColor="#D97706"/>
                </linearGradient>
            </defs>
        </svg>
    );
}

function IconWrench({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Wrench head */}
            <path d="M18 10C12 10 8 16 8 22C8 28 12 32 18 32L26 24Z" fill="#9CA3AF" stroke="#6B7280" strokeWidth="1"/>
            <path d="M14 18C14 16 16 14 18 14C20 14 22 16 22 18C22 20 20 22 18 22C16 22 14 20 14 18Z" fill="#4B5563"/>
            {/* Handle */}
            <rect x="24" y="22" width="26" height="8" rx="2" fill="#D1D5DB" transform="rotate(45 24 22)"/>
            <rect x="24" y="22" width="26" height="8" rx="2" fill="url(#wrenchGrad)" transform="rotate(45 24 22)"/>
            {/* Grip lines */}
            <line x1="38" y1="38" x2="42" y2="42" stroke="#9CA3AF" strokeWidth="1.5" opacity="0.5"/>
            <line x1="40" y1="40" x2="44" y2="44" stroke="#9CA3AF" strokeWidth="1.5" opacity="0.5"/>
            <line x1="42" y1="42" x2="46" y2="46" stroke="#9CA3AF" strokeWidth="1.5" opacity="0.5"/>
            <defs>
                <linearGradient id="wrenchGrad" x1="24" y1="22" x2="50" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#E5E7EB"/>
                    <stop offset="100%" stopColor="#9CA3AF"/>
                </linearGradient>
            </defs>
        </svg>
    );
}

function IconGear({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Gear teeth */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <rect
                    key={angle}
                    x="28"
                    y="6"
                    width="8"
                    height="12"
                    rx="2"
                    fill="#71717A"
                    transform={`rotate(${angle} 32 32)`}
                />
            ))}
            {/* Outer ring */}
            <circle cx="32" cy="32" r="18" fill="#A1A1AA"/>
            <circle cx="32" cy="32" r="15" fill="#71717A"/>
            {/* Inner */}
            <circle cx="32" cy="32" r="8" fill="#A1A1AA"/>
            <circle cx="32" cy="32" r="5" fill="#52525B"/>
            {/* Shine */}
            <path d="M24 24 Q28 20 36 22" stroke="white" strokeWidth="1" fill="none" opacity="0.3"/>
        </svg>
    );
}

function IconMountain({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Sky gradient */}
            <rect width="64" height="64" fill="url(#skyGrad)" rx="0"/>
            {/* Sun */}
            <circle cx="48" cy="14" r="6" fill="#FCD34D"/>
            <circle cx="48" cy="14" r="4" fill="#FDE68A"/>
            {/* Mountain back */}
            <path d="M-4 56L18 18L40 56Z" fill="#065F46"/>
            {/* Snow cap back */}
            <path d="M14 24L18 18L22 24 Q18 28 14 24Z" fill="white"/>
            {/* Mountain front */}
            <path d="M20 56L42 14L64 56Z" fill="#059669"/>
            {/* Snow cap front */}
            <path d="M38 20L42 14L46 20 Q42 26 38 20Z" fill="white" opacity="0.9"/>
            {/* Trees */}
            <path d="M6 56L10 44L14 56Z" fill="#064E3B"/>
            <path d="M52 56L56 46L60 56Z" fill="#064E3B"/>
            {/* Ground */}
            <rect x="0" y="52" width="64" height="12" fill="#065F46" opacity="0.3"/>
            <defs>
                <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#7DD3FC"/>
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0"/>
                </linearGradient>
            </defs>
        </svg>
    );
}

function IconWave({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Water waves */}
            <path d="M0 36 Q8 28 16 36 Q24 44 32 36 Q40 28 48 36 Q56 44 64 36 V64 H0 Z" fill="#2563EB" opacity="0.4"/>
            <path d="M0 40 Q8 32 16 40 Q24 48 32 40 Q40 32 48 40 Q56 48 64 40 V64 H0 Z" fill="#3B82F6" opacity="0.6"/>
            <path d="M0 44 Q8 36 16 44 Q24 52 32 44 Q40 36 48 44 Q56 52 64 44 V64 H0 Z" fill="#60A5FA" opacity="0.8"/>
            {/* Foam */}
            <circle cx="12" cy="38" r="1.5" fill="white" opacity="0.6"/>
            <circle cx="28" cy="42" r="1" fill="white" opacity="0.5"/>
            <circle cx="44" cy="38" r="1.5" fill="white" opacity="0.6"/>
            {/* Sun reflection */}
            <ellipse cx="32" cy="24" rx="3" ry="1" fill="#FDE68A" opacity="0.3"/>
            {/* Bird silhouettes */}
            <path d="M18 16 Q20 14 22 16" stroke="#1E3A5F" strokeWidth="0.8" fill="none"/>
            <path d="M38 12 Q40 10 42 12" stroke="#1E3A5F" strokeWidth="0.8" fill="none"/>
            <path d="M28 10 Q31 7 34 10" stroke="#1E3A5F" strokeWidth="0.8" fill="none"/>
        </svg>
    );
}

function IconFire({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Outer flame */}
            <path d="M32 4 Q44 20 44 32 Q50 24 48 36 Q52 32 50 44 Q48 56 32 58 Q16 56 14 44 Q12 32 16 36 Q14 24 20 32 Q20 20 32 4Z" fill="#EF4444"/>
            {/* Middle flame */}
            <path d="M32 12 Q40 22 40 32 Q44 28 42 40 Q40 50 32 52 Q24 50 22 40 Q20 28 24 32 Q24 22 32 12Z" fill="#F97316"/>
            {/* Inner flame */}
            <path d="M32 22 Q36 28 36 36 Q38 34 37 42 Q36 48 32 50 Q28 48 27 42 Q26 34 28 36 Q28 28 32 22Z" fill="#FCD34D"/>
            {/* Core */}
            <path d="M32 34 Q34 38 34 42 Q33 46 32 47 Q31 46 30 42 Q30 38 32 34Z" fill="#FEF3C7"/>
        </svg>
    );
}

function IconDiamond({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Diamond body */}
            <path d="M32 8L52 24L32 56L12 24Z" fill="url(#diamondGrad)"/>
            {/* Top facet */}
            <path d="M32 8L52 24H12Z" fill="#67E8F9"/>
            {/* Left facet */}
            <path d="M12 24L32 28L32 56Z" fill="#22D3EE"/>
            {/* Right facet */}
            <path d="M52 24L32 28L32 56Z" fill="#06B6D4"/>
            {/* Top left */}
            <path d="M32 8L12 24L32 28Z" fill="#A5F3FC"/>
            {/* Top right */}
            <path d="M32 8L52 24L32 28Z" fill="#67E8F9"/>
            {/* Shine */}
            <path d="M24 18L32 14L28 24Z" fill="white" opacity="0.4"/>
            <line x1="20" y1="24" x2="32" y2="20" stroke="white" strokeWidth="0.5" opacity="0.5"/>
            {/* Sparkles */}
            <circle cx="44" cy="12" r="1" fill="white" opacity="0.8"/>
            <path d="M46 8L47 10L48 8L47 6Z" fill="white" opacity="0.5"/>
            <circle cx="18" cy="16" r="0.7" fill="white" opacity="0.6"/>
            <defs>
                <linearGradient id="diamondGrad" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#A5F3FC"/>
                    <stop offset="50%" stopColor="#22D3EE"/>
                    <stop offset="100%" stopColor="#0891B2"/>
                </linearGradient>
            </defs>
        </svg>
    );
}

function IconTarget({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Rings */}
            <circle cx="32" cy="32" r="26" fill="#FEE2E2"/>
            <circle cx="32" cy="32" r="22" fill="#EF4444"/>
            <circle cx="32" cy="32" r="17" fill="white"/>
            <circle cx="32" cy="32" r="13" fill="#EF4444"/>
            <circle cx="32" cy="32" r="8" fill="white"/>
            <circle cx="32" cy="32" r="4" fill="#DC2626"/>
            {/* Arrow */}
            <line x1="32" y1="32" x2="54" y2="10" stroke="#1F2937" strokeWidth="2"/>
            <path d="M54 10L48 12L52 16Z" fill="#1F2937"/>
            {/* Feathers */}
            <path d="M52 12L56 8L54 14Z" fill="#6B7280"/>
            <path d="M52 12L58 10L54 14Z" fill="#9CA3AF"/>
            {/* Impact marks */}
            <line x1="30" y1="30" x2="28" y2="28" stroke="#1F2937" strokeWidth="0.5" opacity="0.3"/>
            <line x1="34" y1="30" x2="36" y2="28" stroke="#1F2937" strokeWidth="0.5" opacity="0.3"/>
        </svg>
    );
}

function IconShield({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
            {/* Shield body */}
            <path d="M32 4L8 16V36C8 48 18 58 32 62C46 58 56 48 56 36V16L32 4Z" fill="url(#shieldGrad)"/>
            {/* Inner shield */}
            <path d="M32 10L14 20V36C14 46 22 54 32 56C42 54 50 46 50 36V20L32 10Z" fill="#059669"/>
            {/* Star/emblem */}
            <path d="M32 22L34 28H40L35 32L37 38L32 34L27 38L29 32L24 28H30Z" fill="#FCD34D"/>
            {/* Shine */}
            <path d="M18 20L14 22V34" stroke="white" strokeWidth="1" fill="none" opacity="0.2" strokeLinecap="round"/>
            <defs>
                <linearGradient id="shieldGrad" x1="8" y1="4" x2="56" y2="62" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#34D399"/>
                    <stop offset="100%" stopColor="#047857"/>
                </linearGradient>
            </defs>
        </svg>
    );
}

// ─── Avatar Options with SVG Icons ──────────────────────────────────────

interface AvatarOption {
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    label: string;
    emoji: string; // Keep for fallback in text contexts (e.g., assistant chat)
    category: 'animals' | 'objects' | 'nature';
}

const AVATAR_OPTIONS: AvatarOption[] = [
    // 🐾 Animals
    { id: 'avatar-1', icon: IconFox, gradient: 'from-orange-500 via-amber-500 to-red-500', label: 'Zorro', emoji: '🦊', category: 'animals' },
    { id: 'avatar-2', icon: IconWolf, gradient: 'from-slate-500 via-gray-600 to-slate-800', label: 'Lobo', emoji: '🐺', category: 'animals' },
    { id: 'avatar-3', icon: IconLion, gradient: 'from-amber-400 via-yellow-500 to-orange-600', label: 'León', emoji: '🦁', category: 'animals' },
    { id: 'avatar-4', icon: IconBear, gradient: 'from-amber-700 via-yellow-800 to-amber-950', label: 'Oso', emoji: '🐻', category: 'animals' },
    { id: 'avatar-5', icon: IconEagle, gradient: 'from-sky-500 via-blue-600 to-indigo-800', label: 'Águila', emoji: '🦅', category: 'animals' },
    { id: 'avatar-6', icon: IconPenguin, gradient: 'from-cyan-300 via-sky-400 to-blue-600', label: 'Pingüino', emoji: '🐧', category: 'animals' },
    { id: 'avatar-7', icon: IconOwl, gradient: 'from-amber-500 via-orange-600 to-yellow-800', label: 'Búho', emoji: '🦉', category: 'animals' },
    { id: 'avatar-8', icon: IconCat, gradient: 'from-pink-400 via-fuchsia-400 to-rose-500', label: 'Gato', emoji: '🐱', category: 'animals' },
    { id: 'avatar-9', icon: IconDog, gradient: 'from-yellow-300 via-amber-400 to-orange-500', label: 'Perro', emoji: '🐶', category: 'animals' },
    { id: 'avatar-10', icon: IconShark, gradient: 'from-blue-500 via-indigo-600 to-blue-800', label: 'Tiburón', emoji: '🦈', category: 'animals' },
    // ⚡ Objects
    { id: 'avatar-11', icon: IconRocket, gradient: 'from-violet-500 via-purple-600 to-indigo-700', label: 'Cohete', emoji: '🚀', category: 'objects' },
    { id: 'avatar-12', icon: IconBolt, gradient: 'from-yellow-300 via-amber-400 to-orange-500', label: 'Rayo', emoji: '⚡', category: 'objects' },
    { id: 'avatar-13', icon: IconWrench, gradient: 'from-slate-300 via-gray-400 to-slate-600', label: 'Herramienta', emoji: '🔧', category: 'objects' },
    { id: 'avatar-14', icon: IconGear, gradient: 'from-zinc-400 via-gray-500 to-zinc-700', label: 'Engranaje', emoji: '⚙️', category: 'objects' },
    { id: 'avatar-19', icon: IconTarget, gradient: 'from-red-400 via-rose-500 to-red-700', label: 'Diana', emoji: '🎯', category: 'objects' },
    { id: 'avatar-20', icon: IconShield, gradient: 'from-emerald-400 via-green-500 to-emerald-700', label: 'Escudo', emoji: '🛡️', category: 'objects' },
    // 🌊 Nature
    { id: 'avatar-15', icon: IconMountain, gradient: 'from-teal-400 via-emerald-500 to-green-700', label: 'Montaña', emoji: '🏔️', category: 'nature' },
    { id: 'avatar-16', icon: IconWave, gradient: 'from-cyan-400 via-blue-500 to-indigo-600', label: 'Ola', emoji: '🌊', category: 'nature' },
    { id: 'avatar-17', icon: IconFire, gradient: 'from-red-400 via-orange-500 to-amber-500', label: 'Fuego', emoji: '🔥', category: 'nature' },
    { id: 'avatar-18', icon: IconDiamond, gradient: 'from-cyan-300 via-sky-400 to-blue-600', label: 'Diamante', emoji: '💎', category: 'nature' },
];

const CATEGORY_LABELS: Record<string, string> = {
    animals: '🐾 Animales',
    objects: '⚡ Objetos',
    nature: '🌿 Naturaleza',
};

// ─── Exported Functions ─────────────────────────────────────────────────

interface AvatarSelectorProps {
    currentAvatarId: string | null;
    userName: string;
    onSelect: (avatarId: string | null) => void;
}

export function getAvatarById(id: string | null) {
    if (!id) return null;
    return AVATAR_OPTIONS.find(a => a.id === id) || null;
}

export { AVATAR_OPTIONS };

export function AvatarDisplay({
    avatarId,
    userName,
    size = 'md',
    className,
}: {
    avatarId: string | null;
    userName: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}) {
    const avatar = getAvatarById(avatarId);
    const initial = userName ? userName.charAt(0).toUpperCase() : '?';

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24',
    };

    const iconSizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-7 h-7',
        lg: 'w-12 h-12',
        xl: 'w-18 h-18',
    };

    if (avatar) {
        const IconComponent = avatar.icon;
        return (
            <div
                className={cn(
                    'rounded-full flex items-center justify-center bg-gradient-to-br shrink-0 overflow-hidden',
                    avatar.gradient,
                    sizeClasses[size],
                    className
                )}
            >
                <IconComponent className={iconSizeClasses[size]} />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shrink-0 font-bold text-white',
                sizeClasses[size],
                className
            )}
        >
            <span className={cn(
                'font-bold',
                size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-3xl'
            )}>{initial}</span>
        </div>
    );
}

export function AvatarSelector({ currentAvatarId, userName, onSelect }: AvatarSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(currentAvatarId);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const initial = userName ? userName.charAt(0).toUpperCase() : '?';

    const handleSelect = (id: string | null) => {
        setSelectedId(id);
        onSelect(id);
        setIsOpen(false);
    };

    const groupedAvatars = (['animals', 'objects', 'nature'] as const).map(cat => ({
        key: cat,
        label: CATEGORY_LABELS[cat],
        items: AVATAR_OPTIONS.filter(a => a.category === cat),
    }));

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Current Avatar Preview */}
            <div className="relative group">
                <AvatarDisplay avatarId={selectedId} userName={userName} size="xl" />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                    <Camera className="w-6 h-6 text-white drop-shadow-lg" />
                </button>

                {/* Glowing ring animation */}
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300" />
            </div>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
            >
                {isOpen ? 'Cerrar selector' : 'Cambiar avatar'}
            </button>

            {/* Avatar Grid - Expandable */}
            {isOpen && (
                <div className="w-full animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 mt-2 shadow-lg dark:shadow-none">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-300">Elige tu avatar</h4>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* Hovered avatar name tooltip */}
                        <div className="h-5 mb-2 flex items-center justify-center">
                            {hoveredId && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 animate-in fade-in duration-150">
                                    {AVATAR_OPTIONS.find(a => a.id === hoveredId)?.label}
                                </span>
                            )}
                        </div>

                        {/* Default initial avatar option */}
                        <div className="mb-5">
                            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium">Por defecto</p>
                            <button
                                type="button"
                                onClick={() => handleSelect(null)}
                                className={cn(
                                    'relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 transition-all duration-200 transform hover:scale-110',
                                    selectedId === null
                                        ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-lg shadow-blue-500/20'
                                        : 'hover:ring-1 hover:ring-slate-400 dark:hover:ring-slate-500'
                                )}
                            >
                                <span className="font-bold text-xl text-white">{initial}</span>
                                {selectedId === null && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Categorized avatar grid */}
                        {groupedAvatars.map((group) => (
                            <div key={group.key} className="mb-5 last:mb-0">
                                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-medium">{group.label}</p>
                                <div className="grid grid-cols-5 sm:grid-cols-7 gap-3">
                                    {group.items.map((avatar) => {
                                        const IconComponent = avatar.icon;
                                        return (
                                            <button
                                                key={avatar.id}
                                                type="button"
                                                onClick={() => handleSelect(avatar.id)}
                                                onMouseEnter={() => setHoveredId(avatar.id)}
                                                onMouseLeave={() => setHoveredId(null)}
                                                title={avatar.label}
                                                className={cn(
                                                    'relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-gradient-to-br overflow-hidden transition-all duration-200 transform hover:scale-110',
                                                    avatar.gradient,
                                                    selectedId === avatar.id
                                                        ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-lg shadow-blue-500/20 scale-110'
                                                        : 'hover:ring-1 hover:ring-slate-400 dark:hover:ring-slate-500 hover:shadow-md'
                                                )}
                                            >
                                                <IconComponent className="w-9 h-9 sm:w-10 sm:h-10" />
                                                {selectedId === avatar.id && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
