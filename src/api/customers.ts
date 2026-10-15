import apiClient from './client.ts'
import type { CustomerDetail, CustomerPage, CustomerSort, PhoneBlock } from '@/types'

export interface CustomerQuery {
  search?: string
  sort?: CustomerSort
  blocked?: 'true'
}

// A customer is a phone number; the API adds up its orders
export const customersApi = {
  // GET /customers?search=&sort=&blocked=&page=&limit= -> { success, data, pagination }
  getPage: async (query: CustomerQuery, page: number, limit: number): Promise<CustomerPage> => {
    const res = await apiClient.get('/customers', { params: { ...query, page, limit } })
    return { customers: res.data.data, total: res.data.pagination.total }
  },

  // GET /customers/:phone -> { success, data: { customer, orders } }
  get: async (phone: string): Promise<CustomerDetail> => {
    const res = await apiClient.get(`/customers/${phone}`)
    return res.data.data
  },

  // PUT /customers/:phone/block -> { success, data: { phone, blocked } } (needs orders.edit)
  setBlocked: async (phone: string, blocked: boolean, note?: string): Promise<PhoneBlock | null> => {
    const res = await apiClient.put(`/customers/${phone}/block`, { blocked, ...(note && { note }) })
    return res.data.data.blocked
  },
}
