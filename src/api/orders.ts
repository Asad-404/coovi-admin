import apiClient from './client.ts'
import { fetchAllPages } from './paginate.ts'
import type { Order, OrderDetailsUpdate, OrderStatus } from '@/types'

const ORDER_PAGE_SIZE = 100

export const ordersApi = {
  // GET /orders -> { success, data: [...], pagination } (admin JWT required) — every page
  getAll: (): Promise<Order[]> => fetchAllPages<Order>('/orders', ORDER_PAGE_SIZE),

  // PATCH /orders/:id -> { success, data: order } — contact details only; the API
  // refuses items/totals and freezes Delivered/Cancelled orders
  updateDetails: async (id: string, details: OrderDetailsUpdate): Promise<Order> => {
    const res = await apiClient.patch(`/orders/${id}`, details)
    return res.data.data
  },

  // PATCH /orders/:id/status -> { success, data: order }
  updateStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    const res = await apiClient.patch(`/orders/${id}/status`, { status })
    return res.data.data
  },

  // POST /orders/:id/courier/steadfast -> { success, data: order } — books the
  // parcel with Steadfast; the API decides the cash to collect
  bookSteadfast: async (id: string): Promise<Order> => {
    const res = await apiClient.post(`/orders/${id}/courier/steadfast`)
    return res.data.data
  },

  // POST /orders/:id/courier/steadfast/refresh -> { success, data: order }
  refreshSteadfast: async (id: string): Promise<Order> => {
    const res = await apiClient.post(`/orders/${id}/courier/steadfast/refresh`)
    return res.data.data
  },
}
