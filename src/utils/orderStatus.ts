import type { ChipProps } from '@mui/material'
import type { OrderStatus } from '@/types'

export const STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

export const statusColor: Record<OrderStatus, ChipProps['color']> = {
  Pending: 'warning',
  Processing: 'info',
  Shipped: 'primary',
  Delivered: 'success',
  Cancelled: 'error',
}

// Forward-only order flow. The API adjusts stock only on Pending → Processing
// (takes it) and Processing → Cancelled (returns it), so any other jump —
// e.g. back to Pending, or cancelling after shipping — would leave stock wrong.
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
}

export const canMoveTo = (from: OrderStatus, to: OrderStatus): boolean =>
  NEXT_STATUSES[from].includes(to)
