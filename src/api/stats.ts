import apiClient from './client.ts'
import type { DashboardStats } from '@/types'

export const statsApi = {
  // GET /stats?from=&to= -> { success, data } (days are yyyy-mm-dd in Bangladesh time)
  get: async (range: { from: string; to: string }): Promise<DashboardStats> => {
    const res = await apiClient.get('/stats', { params: range })
    return res.data.data
  },
}
