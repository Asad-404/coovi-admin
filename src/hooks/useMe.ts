import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { isOwnerRole } from '@/utils/permissions'
import type { Permission } from '@/utils/permissions'

export const ME_KEY = ['me'] as const

// The signed-in team member, with what they can do. Refetched on every page change
// (DashboardLayout), so access the owner changes shows up on the next click. The API
// checks every request anyway; this only decides which pages and buttons to show.
export const useMe = () => useQuery({ queryKey: ME_KEY, queryFn: authApi.me })

export function useAccess() {
  const { data: me, isLoading } = useMe()
  const permissions = me?.permissions ?? []
  return {
    me,
    loading: isLoading,
    isOwner: isOwnerRole(me?.role),
    can: (permission: Permission): boolean => permissions.includes(permission),
  }
}
