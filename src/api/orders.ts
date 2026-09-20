import apiClient from './client.ts'
import type { Order, OrderStatus } from '@/types'

export const ordersApi = {
  // GET /orders -> { success, data: [...], pagination } (admin JWT required)
  getAll: async (limit = 100): Promise<Order[]> => {
    const res = await apiClient.get('/orders', { params: { limit } })
    return res.data.data
  },

  // PATCH /orders/:id/status -> { success, data: order }
  updateStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    const res = await apiClient.patch(`/orders/${id}/status`, { status })
    return res.data.data
  },
}
