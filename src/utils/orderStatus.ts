import type { ChipProps } from '@mui/material'
import type { Order, OrderStatus, RefundMethod } from '@/types'

export const STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned']

export const statusColor: Record<OrderStatus, ChipProps['color']> = {
  Pending: 'warning',
  Processing: 'info',
  Shipped: 'primary',
  Delivered: 'success',
  Cancelled: 'error',
  Returned: 'secondary',
}

// Forward-only order flow. The API takes stock on Pending → Processing and
// gives it back on Processing → Cancelled or on Returned (a parcel refused at
// the door is Shipped → Returned, a return after delivery is Delivered →
// Returned), so any other jump would leave stock wrong.
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Returned'],
  Delivered: ['Returned'],
  Cancelled: [],
  Returned: [],
}

export const canMoveTo = (from: OrderStatus, to: OrderStatus): boolean =>
  NEXT_STATUSES[from].includes(to)

// Offered when cancelling or returning; stored as plain text on the order
export const CANCEL_REASONS = [
  'Customer refused the parcel',
  'Customer unreachable',
  'Wrong address',
  'Changed mind',
  'Damaged',
  'Out of stock',
  'Duplicate order',
] as const

export const REFUND_METHODS: RefundMethod[] = ['bKash', 'Nagad', 'Cash', 'Bank transfer', 'Store credit']

// Days after delivery the shop accepts a return (shown on the storefront
// return policy). The admin only warns past it; the owner can still accept.
export const RETURN_WINDOW_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

// Whole days since the order was delivered, or null when the date is unknown
// (orders delivered before deliveredAt was recorded)
export const daysSinceDelivery = (order: Order, now = new Date()): number | null =>
  order.deliveredAt ? Math.floor((now.getTime() - new Date(order.deliveredAt).getTime()) / DAY_MS) : null

export const isPastReturnWindow = (order: Order, now = new Date()): boolean => {
  const days = daysSinceDelivery(order, now)
  return days !== null && days > RETURN_WINDOW_DAYS
}
