import apiClient from './client.ts'
import { fetchAllPages } from './paginate.ts'
import type { Product } from '@/types'

// The API caps product pages at 50
const PRODUCT_PAGE_SIZE = 50

export const productsApi = {
  // GET /products -> { success, data: [...], pagination } — every page, published products only
  getAll: (): Promise<Product[]> => fetchAllPages<Product>('/products', PRODUCT_PAGE_SIZE),

  // GET /products/manage -> the same list with drafts included (needs products.view)
  getAllWithDrafts: (): Promise<Product[]> => fetchAllPages<Product>('/products/manage', PRODUCT_PAGE_SIZE),

  // GET /products/manage/:slug -> finds a draft too (needs products.view)
  getBySlug: async (slug: string): Promise<Product> => {
    const res = await apiClient.get(`/products/manage/${slug}`)
    return res.data.data
  },

  // GET /products/:id/cost -> { success, data: { costPrice } } (needs money access)
  getCost: async (id: string): Promise<number | null> => {
    const res = await apiClient.get(`/products/${id}/cost`)
    return res.data.data.costPrice
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
