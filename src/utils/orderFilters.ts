import type { DeliveryArea, OrderSource, OrderStatus } from '@/types'

export interface OrderFilters {
  search: string
  status: OrderStatus | 'All'
  // Missing means every area
  area?: DeliveryArea | 'All'
  // Days the order was placed, as yyyy-mm-dd (from <input type="date">); '' means no bound
  from: string
  to: string
  // Missing means every source
  source?: OrderSource | 'All'
}

export type OrderQuery = Partial<Record<'search' | 'status' | 'deliveryArea' | 'source' | 'from' | 'to', string>>

// The query string GET /orders understands; filters left on "All" or empty are left out.
// The API does the matching (order number, name or phone; days in Bangladesh time).
export const toOrderQuery = ({ search, status, area = 'All', from, to, source = 'All' }: OrderFilters): OrderQuery => {
  const query: OrderQuery = {}
  const term = search.trim()
  if (term) query.search = term
  if (status !== 'All') query.status = status
  if (area !== 'All') query.deliveryArea = area
  if (source !== 'All') query.source = source
  if (from) query.from = from
  if (to) query.to = to
  return query
}
