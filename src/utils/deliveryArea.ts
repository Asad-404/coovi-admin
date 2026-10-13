import type { DeliveryArea, Order } from '@/types'

// Orders from before delivery areas have no area; they were charged the inside-Dhaka fee
export const orderArea = (order: Order): DeliveryArea => order.deliveryArea ?? 'inside_dhaka'

export const DELIVERY_AREA_LABELS: Record<DeliveryArea, string> = {
  inside_dhaka: 'Inside Dhaka',
  outside_dhaka: 'Outside Dhaka',
}

// "Dhaka city", "Dhaka suburbs", "Rajshahi (outside Dhaka)" or, for old orders, the area alone
export const describeDelivery = (order: Order): string => {
  const area = orderArea(order)
  if (order.district === 'Dhaka') return area === 'inside_dhaka' ? 'Dhaka city' : 'Dhaka suburbs'
  if (order.district) return `${order.district} (outside Dhaka)`
  return `${DELIVERY_AREA_LABELS[area]} (no district)`
}
