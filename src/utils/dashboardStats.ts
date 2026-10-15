import { LOW_STOCK_THRESHOLD } from '@/constants'
import type { Product } from '@/types'

export const lowStockProducts = (products: Product[], threshold = LOW_STOCK_THRESHOLD): Product[] =>
  products.filter((p) => p.stock < threshold).sort((a, b) => a.stock - b.stock)

export const RANGE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'month', label: 'This month' },
  { key: 'custom', label: 'Custom' },
] as const
export type RangePreset = (typeof RANGE_PRESETS)[number]['key']

export interface DateRange {
  from: string // yyyy-mm-dd, a Bangladesh day
  to: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000

// The shop's day in Bangladesh (UTC+6), whatever time zone this computer is in
export const dhakaToday = (now = new Date()): string => new Date(now.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10)

const addDays = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

// The from/to days for a preset; custom keeps whatever was picked
export const rangeFor = (preset: Exclude<RangePreset, 'custom'>, now = new Date()): DateRange => {
  const today = dhakaToday(now)
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case '7d':
      return { from: addDays(today, -6), to: today }
    case '30d':
      return { from: addDays(today, -29), to: today }
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today }
  }
}

// The API accepts at most 366 days, from on or before to
export const MAX_RANGE_DAYS = 366
export const rangeProblem = ({ from, to }: DateRange): string | null => {
  if (!from || !to) return 'Pick both dates'
  if (from > to) return 'The start date must be on or before the end date'
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS + 1
  if (days > MAX_RANGE_DAYS) return `Pick at most ${MAX_RANGE_DAYS} days`
  return null
}

export const percent = (part: number, whole: number): string =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–'
