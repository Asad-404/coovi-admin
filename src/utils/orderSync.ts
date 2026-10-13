import type { Order } from '@/types'

// How often the open admin asks the API for orders changed since its last check
export const ORDER_SYNC_MS = 60_000

// Each check reaches a few seconds back past the last server time, so an order saved at
// that exact moment is never skipped; seeing an unchanged order twice is harmless
export const SYNC_OVERLAP_MS = 5_000

export const syncSince = (serverTime: string): string =>
  new Date(new Date(serverTime).getTime() - SYNC_OVERLAP_MS).toISOString()

// Puts changed orders into the list: each replaces its old copy by _id and brand-new ones
// are added, keeping the list newest first like the API returns it
export function mergeOrders(current: Order[], changed: Order[]): Order[] {
  if (changed.length === 0) return current
  const byId = new Map(current.map((order) => [order._id, order]))
  for (const order of changed) byId.set(order._id, order)
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const countPending = (orders: Order[]): number =>
  orders.filter((order) => order.status === 'Pending').length
