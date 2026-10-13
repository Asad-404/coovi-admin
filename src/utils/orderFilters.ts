import type { Order, OrderSource, OrderStatus } from '@/types'
import { orderSource } from '@/utils/orderSource'

export interface OrderFilters {
  search: string
  status: OrderStatus | 'All'
  // Inclusive local dates as yyyy-mm-dd (from <input type="date">); '' means no bound
  from: string
  to: string
  // Missing means every source
  source?: OrderSource | 'All'
}

const startOfDay = (date: string): number => new Date(`${date}T00:00:00`).getTime()
const endOfDay = (date: string): number => new Date(`${date}T23:59:59.999`).getTime()

export const filterOrders = (orders: Order[], { search, status, from, to, source = 'All' }: OrderFilters): Order[] => {
  const term = search.trim().toLowerCase()
  const fromTime = from ? startOfDay(from) : -Infinity
  const toTime = to ? endOfDay(to) : Infinity

  return orders.filter((order) => {
    const matchesSearch =
      !term ||
      order.orderNumber.toLowerCase().includes(term) ||
      order.customerName.toLowerCase().includes(term) ||
      order.phone.includes(term)
    const matchesStatus = status === 'All' || order.status === status
    const matchesSource = source === 'All' || orderSource(order) === source
    const created = new Date(order.createdAt).getTime()
    return matchesSearch && matchesStatus && matchesSource && created >= fromTime && created <= toTime
  })
}
