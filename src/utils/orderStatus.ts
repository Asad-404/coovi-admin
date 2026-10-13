import type { ChipProps } from '@mui/material'
import type { OrderStatus } from '@/types'

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
// gives it back on Processing → Cancelled or Shipped → Returned (parcel refused
// at the door), so any other jump would leave stock wrong. The shop takes no
// returns after delivery, so Delivered is final.
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Returned'],
  Delivered: [],
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
