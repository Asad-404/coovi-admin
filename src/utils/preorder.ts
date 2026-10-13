import type { Order, OrderItem, Product } from '@/types'

// A pre-order line is a saree sourced for this customer: it took no stock and ships later
export const hasPreorder = (order: Pick<Order, 'items'>): boolean => order.items.some((item) => item.preorder)

// "Red Katan" or "Red Katan (pre-order, about 15 days)" for tables, CSV and the print slip
export const itemLabel = (item: Pick<OrderItem, 'name' | 'preorder' | 'preorderDays'>): string =>
  item.preorder
    ? `${item.name} (pre-order${item.preorderDays ? `, about ${item.preorderDays} days` : ''})`
    : item.name

export type LineAvailability = 'in-stock' | 'preorder' | 'short'

// What the API will do with this many of a product, the same rule as checkout:
// enough stock sells from stock, otherwise a pre-order product takes the whole
// line as a pre-order, and anything else is refused.
export const lineAvailability = (
  product: Pick<Product, 'stock' | 'allowPreorder'>,
  quantity: number,
): LineAvailability => {
  if (product.stock >= quantity) return 'in-stock'
  return product.allowPreorder ? 'preorder' : 'short'
}
