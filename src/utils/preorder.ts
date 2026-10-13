import type { Order, OrderItem } from '@/types'

// A pre-order line is a saree sourced for this customer: it took no stock and ships later
export const hasPreorder = (order: Pick<Order, 'items'>): boolean => order.items.some((item) => item.preorder)

// "Red Katan" or "Red Katan (pre-order, about 15 days)" for tables, CSV and the print slip
export const itemLabel = (item: Pick<OrderItem, 'name' | 'preorder' | 'preorderDays'>): string =>
  item.preorder
    ? `${item.name} (pre-order${item.preorderDays ? `, about ${item.preorderDays} days` : ''})`
    : item.name
