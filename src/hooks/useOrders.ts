import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ordersApi } from '@/api/orders'
import type { OrderQuery } from '@/utils/orderFilters'

// Every order query starts with this key, so invalidating it refreshes them all
export const ORDERS_KEY = ['orders'] as const

// How often an open admin checks for new and changed orders
export const ORDER_REFRESH_MS = 60_000

// One page of orders matching the filters, searched by the API. The page on screen stays
// while the next one loads, and it refreshes every minute so new orders show up.
export const useOrderPage = (query: OrderQuery, page: number, pageSize: number) =>
  useQuery({
    queryKey: [...ORDERS_KEY, 'page', query, page, pageSize],
    queryFn: () => ordersApi.getPage(query, page, pageSize),
    placeholderData: keepPreviousData,
    refetchInterval: ORDER_REFRESH_MS,
    staleTime: 0,
  })

// Orders waiting for confirmation, for the menu badge and the tab title.
// enabled: false for someone without orders.view (the API would refuse it).
export const usePendingCount = (enabled = true) =>
  useQuery({
    queryKey: [...ORDERS_KEY, 'pending-count'],
    queryFn: ordersApi.countPending,
    enabled,
    refetchInterval: ORDER_REFRESH_MS,
    staleTime: 0,
  })
