import apiClient from './client.ts'
import { fetchAllPages } from './paginate.ts'
import type { Order, OrderDetailsUpdate, OrderStatus } from '@/types'

const ORDER_PAGE_SIZE = 100

export const ordersApi = {
  // GET /orders -> { success, data: [...], pagination } (admin JWT required) — every page
  getAll: (): Promise<Order[]> => fetchAllPages<Order>('/orders', ORDER_PAGE_SIZE),

  // GET /orders?status=Pending&limit=1 -> pagination.total: how many orders wait for confirmation
  pendingCount: async (): Promise<number> => {
    const res = await apiClient.get('/orders', { params: { status: 'Pending', limit: 1 } })
    return res.data.pagination?.total ?? 0
  },

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
}
