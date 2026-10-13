import apiClient from './client.ts'
import { fetchAllPagesWithTime } from './paginate.ts'
import type { Order, OrderDetailsUpdate, OrderList, StatusChange } from '@/types'

const ORDER_PAGE_SIZE = 100

export const ordersApi = {
  // GET /orders -> { success, data: [...], serverTime, pagination } (admin JWT required) — every page
  getAll: async (): Promise<OrderList> => {
    const { items, serverTime } = await fetchAllPagesWithTime<Order>('/orders', ORDER_PAGE_SIZE)
    return { orders: items, serverTime }
  },

  // GET /orders?updatedSince=<time> -> only orders created or changed since then (usually none)
  getChangedSince: async (since: string): Promise<OrderList> => {
    const { items, serverTime } = await fetchAllPagesWithTime<Order>('/orders', ORDER_PAGE_SIZE, {
      updatedSince: since,
    })
    return { orders: items, serverTime }
  },

  // PATCH /orders/:id -> { success, data: order } — contact details only; the API
  // refuses items/totals and freezes Delivered/Cancelled/Returned orders
  updateDetails: async (id: string, details: OrderDetailsUpdate): Promise<Order> => {
    const res = await apiClient.patch(`/orders/${id}`, details)
    return res.data.data
  },

  // PATCH /orders/:id/status -> { success, data: order }
  updateStatus: async (id: string, change: StatusChange): Promise<Order> => {
    const res = await apiClient.patch(`/orders/${id}/status`, change)
    return res.data.data
  },
}
