import type { Order } from '@/types'

// Steadfast's public tracking page; opens without logging in
export const steadfastTrackingUrl = (trackingCode: string): string =>
  `https://steadfast.com.bd/t/${encodeURIComponent(trackingCode)}`

// Only a confirmed order that hasn't been booked yet can go to the courier
// (the API checks the same rule)
export const canBookCourier = (order: Order): boolean =>
  order.status === 'Processing' && !order.courier?.trackingCode

const STATUS_LABELS: Record<string, string> = {
  in_review: 'Waiting for Steadfast to review',
  pending: 'With Steadfast, on the way',
  hold: 'On hold at Steadfast',
  delivered_approval_pending: 'Delivered, waiting for Steadfast approval',
  partial_delivered_approval_pending: 'Partly delivered, waiting for Steadfast approval',
  cancelled_approval_pending: 'Cancelled, waiting for Steadfast approval',
  unknown_approval_pending: 'Unknown, waiting for Steadfast approval',
  delivered: 'Delivered',
  partial_delivered: 'Partly delivered',
  cancelled: 'Cancelled by Steadfast (returning)',
  unknown: 'Unknown',
}

// Steadfast sends snake_case codes; unknown codes are shown as plain words
export const courierStatusLabel = (status?: string): string => {
  if (!status) return 'Not checked yet'
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
}
