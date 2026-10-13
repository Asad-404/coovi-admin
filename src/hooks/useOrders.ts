import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '@/api/orders'
import type { OrderList } from '@/types'
import { ORDER_SYNC_MS, mergeOrders, syncSince } from '@/utils/orderSync'

export const ORDERS_KEY = ['orders'] as const

// Every order, from one shared cache that useOrderSync keeps fresh
export const useOrders = () =>
  useQuery({ queryKey: ORDERS_KEY, queryFn: ordersApi.getAll, select: (list: OrderList) => list.orders })

// While the admin is open, asks the API every minute (and on returning to the tab) for
// orders created or changed since the last check, and merges them into the cached list.
// New orders, cancels, status changes and edits made on another device show up without a reload.
export function useOrderSync(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    let running = false

    const sync = async () => {
      const cached = queryClient.getQueryData<OrderList>(ORDERS_KEY)
      // No list yet, or an API without serverTime: nothing to sync against
      if (running || !cached?.serverTime) return
      running = true
      try {
        const changes = await ordersApi.getChangedSince(syncSince(cached.serverTime))
        queryClient.setQueryData<OrderList>(ORDERS_KEY, (latest) =>
          latest && {
            orders: mergeOrders(latest.orders, changes.orders),
            serverTime: changes.serverTime ?? latest.serverTime,
          },
        )
      } catch {
        // Network blip: the next check asks again from the same time. Expired login is
        // handled by the API client, which returns to the login page.
      } finally {
        running = false
      }
    }

    const timer = setInterval(sync, ORDER_SYNC_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [queryClient])
}
