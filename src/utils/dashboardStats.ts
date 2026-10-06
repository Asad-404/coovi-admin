import { LOW_STOCK_THRESHOLD } from '@/constants'
import type { Order, OrderStatus, Product } from '@/types'
import { STATUSES } from '@/utils/orderStatus'

// Cancelled orders never bring in money, so they don't count as revenue
export const revenueOf = (orders: Order[]): number =>
  orders.filter((o) => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0)

export const countByStatus = (orders: Order[]): Record<OrderStatus, number> => {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>
  for (const order of orders) counts[order.status] += 1
  return counts
}

export const lowStockProducts = (products: Product[]): Product[] =>
  products.filter((p) => p.stock < LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock)

export interface DailyRevenue {
  date: string // yyyy-mm-dd, local time
  revenue: number
  orders: number
}

const localDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Revenue per day for the last `days` days (oldest first), cancelled excluded
export const dailyRevenue = (orders: Order[], days: number, now = new Date()): DailyRevenue[] => {
  const buckets = new Map<string, DailyRevenue>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = localDateKey(d)
    buckets.set(key, { date: key, revenue: 0, orders: 0 })
  }
  for (const order of orders) {
    if (order.status === 'Cancelled') continue
    const bucket = buckets.get(localDateKey(new Date(order.createdAt)))
    if (bucket) {
      bucket.revenue += order.total
      bucket.orders += 1
    }
  }
  return [...buckets.values()]
}
