import { useQuery } from '@tanstack/react-query'
import apiClient from './client.ts'
import { LOW_STOCK_THRESHOLD } from '@/constants'
import type { ShopSettings } from '@/types'

export type SettingsUpdate = Partial<Omit<ShopSettings, 'updatedAt'>>

export const settingsApi = {
  // GET /settings/admin -> { success, data: settings } — every field, admin only
  get: async (): Promise<ShopSettings> => {
    const res = await apiClient.get('/settings/admin')
    return res.data.data
  },

  // PATCH /settings -> { success, data: settings } — only the fields sent change
  update: async (changes: SettingsUpdate): Promise<ShopSettings> => {
    const res = await apiClient.patch('/settings', changes)
    return res.data.data
  },
}

// The saved low-stock limit; the built-in default until settings have loaded (or if they fail)
export const useLowStockThreshold = (): number => {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  return data?.lowStockThreshold ?? LOW_STOCK_THRESHOLD
}
