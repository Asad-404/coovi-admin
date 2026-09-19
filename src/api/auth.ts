import apiClient from './client.ts'
import type { Admin, AuthResponse } from '@/types'

export const authApi = {
  // POST /auth/login -> { success, data: { token, admin } }
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/login', { email, password })
    return res.data.data
  },

  // GET /auth/me -> { success, data: admin }
  me: async (): Promise<Admin> => {
    const res = await apiClient.get('/auth/me')
    return res.data.data
  },
}
