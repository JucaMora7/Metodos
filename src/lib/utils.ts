import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formatea un número con `decimals` decimales; usa notación científica para magnitudes extremas. */
export function fmt(v: number | null | undefined, decimals: number): string {
  if (v === null || v === undefined) return '—'
  if (!Number.isFinite(v)) return v > 0 ? '∞' : v < 0 ? '−∞' : 'NaN'
  if (v !== 0 && (Math.abs(v) < 10 ** -decimals || Math.abs(v) >= 1e9)) return v.toExponential(Math.min(decimals, 6))
  return v.toFixed(decimals)
}
