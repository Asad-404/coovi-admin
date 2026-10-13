import type { ManualOrderSource, Order, OrderSource } from '@/types'

export const ORDER_SOURCES: OrderSource[] = ['website', 'facebook', 'whatsapp', 'phone', 'other']

// The sources an admin can pick when entering an order by hand
export const MANUAL_SOURCES: ManualOrderSource[] = ['facebook', 'whatsapp', 'phone', 'other']

export const SOURCE_LABELS: Record<OrderSource, string> = {
  website: 'Website',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  phone: 'Phone',
  other: 'Other',
}

// Orders saved before manual order entry have no source: they all came from the website
export const orderSource = (order: Pick<Order, 'source'>): OrderSource => order.source ?? 'website'

export interface PreviewLine {
  price: number
  quantity: number
}

export interface TotalsPreview {
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
}

// The total the admin sees while typing in an order. Only a preview: the API
// prices the order again from the database and its answer is what gets saved.
export const previewTotals = (lines: PreviewLine[], deliveryFee: number, discount: number): TotalsPreview => {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
  return { subtotal, discount, deliveryFee, total: subtotal - discount + deliveryFee }
}
