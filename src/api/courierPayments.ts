import apiClient from './client.ts'
import type { CourierPayment, CourierPaymentList, NewCourierPayment, UnpaidOrders } from '@/types'

// The admin shows the latest payments; older ones stay in the database
const PAYMENT_PAGE_SIZE = 100

export const courierPaymentsApi = {
  // GET /courier-payments -> { success, data: [...], summary, pagination }
  list: async (): Promise<CourierPaymentList> => {
    const res = await apiClient.get('/courier-payments', { params: { page: 1, limit: PAYMENT_PAGE_SIZE } })
    return { payments: res.data.data, summary: res.data.summary, total: res.data.pagination.total }
  },

  // GET /courier-payments/unpaid -> { success, data: { orders, count, expectedTotal } }
  unpaid: async (): Promise<UnpaidOrders> => {
    const res = await apiClient.get('/courier-payments/unpaid')
    return res.data.data
  },

  // POST /courier-payments -> { success, data: payment }; the API computes every total
  create: async (payment: NewCourierPayment): Promise<CourierPayment> => {
    const res = await apiClient.post('/courier-payments', payment)
    return res.data.data
  },

  // DELETE /courier-payments/:id -> its orders show as unpaid again
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/courier-payments/${id}`)
  },
}
