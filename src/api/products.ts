import apiClient from './client.ts'
import type { Product } from '@/types'

export const productsApi = {
  // GET /products -> { success, data: [...], pagination }
  getAll: async (limit = 100): Promise<Product[]> => {
    const res = await apiClient.get('/products', { params: { limit } })
    return res.data.data
  },

  getBySlug: async (slug: string): Promise<Product> => {
    const res = await apiClient.get(`/products/${slug}`)
    return res.data.data
  },

  create: async (data: Partial<Product>): Promise<Product> => {
    const res = await apiClient.post('/products', data)
    return res.data.data
  },

  update: async (id: string, data: Partial<Product>): Promise<Product> => {
    const res = await apiClient.put(`/products/${id}`, data)
    return res.data.data
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`)
  },
}
