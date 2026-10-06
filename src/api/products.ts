import apiClient from './client.ts'
import { fetchAllPages } from './paginate.ts'
import type { Product } from '@/types'

// The API caps product pages at 50
const PRODUCT_PAGE_SIZE = 50

export const productsApi = {
  // GET /products -> { success, data: [...], pagination } — every page
  getAll: (): Promise<Product[]> => fetchAllPages<Product>('/products', PRODUCT_PAGE_SIZE),

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
