import apiClient from './client.ts'
import type { Admin, AdminRole } from '@/types'

export interface NewTeamMember {
  email: string
  name: string
  role: AdminRole
  password: string
}

export type TeamMemberUpdate = Partial<{ name: string; role: AdminRole; active: boolean }>

// Team logins; every route is owner only on the API
export const adminsApi = {
  // GET /admins -> { success, data: admins }
  list: async (): Promise<Admin[]> => {
    const res = await apiClient.get('/admins')
    return res.data.data
  },

  // POST /admins -> { success, data: admin }; the password is a temporary one to pass on
  create: async (member: NewTeamMember): Promise<Admin> => {
    const res = await apiClient.post('/admins', member)
    return res.data.data
  },

  // PATCH /admins/:id -> { success, data: admin }; a role change or switch-off signs them out
  update: async (id: string, changes: TeamMemberUpdate): Promise<Admin> => {
    const res = await apiClient.patch(`/admins/${id}`, changes)
    return res.data.data
  },

  // POST /admins/:id/reset-password -> { success, message }; signs them out everywhere
  resetPassword: async (id: string, password: string): Promise<void> => {
    await apiClient.post(`/admins/${id}/reset-password`, { password })
  },
}
