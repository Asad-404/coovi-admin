import apiClient from './client.ts'
import { fetchAllPagesWithTime } from './paginate.ts'
import type { DeliveryOptions, ManualOrderInput, Order, OrderDetailsUpdate, OrderList, StatusUpdate } from '@/types'

const ORDER_PAGE_SIZE = 100

export const ordersApi = {
  // GET /orders -> { success, data: [...], serverTime, pagination } (admin JWT required) — every page
  getAll: async (): Promise<OrderList> => {
    const { items, serverTime } = await fetchAllPagesWithTime<Order>('/orders', ORDER_PAGE_SIZE)
    return { orders: items, serverTime }
  },

  // GET /orders?updatedSince=<time> -> only orders created or changed since then (usually none)
  getChangedSince: async (since: string): Promise<OrderList> => {
    const { items, serverTime } = await fetchAllPagesWithTime<Order>('/orders', ORDER_PAGE_SIZE, {
      updatedSince: since,
    })
    return { orders: items, serverTime }
  },

  // POST /orders/manual -> { success, data: order } — an order taken by Facebook, WhatsApp
  // or phone. The API prices the items from the database and returns the real totals.
  createManual: async (input: ManualOrderInput): Promise<Order> => {
    const res = await apiClient.post('/orders/manual', input)
    return res.data.data
  },

  // GET /orders/delivery-fee -> { success, data: { deliveryFee } } — the fee checkout charges
  getDeliveryFee: async (): Promise<number> => {
    const res = await apiClient.get('/orders/delivery-fee')
    return res.data.data.deliveryFee
  },

  // GET /orders/delivery-fee -> { success, data: { deliveryFee, zones, districts } } (public)
  getDeliveryOptions: async (): Promise<DeliveryOptions> => {
    const res = await apiClient.get('/orders/delivery-fee')
    return res.data.data
  },

  // PATCH /orders/:id -> { success, data: order } — contact and delivery details only;
  // the API refuses items/totals, freezes Delivered/Cancelled/Returned orders, allows district
  // and area only while Pending, and recomputes the fee and total itself
  updateDetails: async (id: string, details: OrderDetailsUpdate): Promise<Order> => {
    const res = await apiClient.patch(`/orders/${id}`, details)
    return res.data.data
  },

  // POST /orders/:id/notes -> { success, data: order } — private note, append-only
  addNote: async (id: string, text: string): Promise<Order> => {
    const res = await apiClient.post(`/orders/${id}/notes`, { text })
    return res.data.data
  },

  // PATCH /orders/:id/status -> { success, data: order }
  updateStatus: async (id: string, change: StatusUpdate): Promise<Order> => {
    const res = await apiClient.patch(`/orders/${id}/status`, change)
    return res.data.data
  },

  // POST /orders/:id/courier/steadfast -> { success, data: order } — books the
  // parcel with Steadfast; the API decides the cash to collect
  bookSteadfast: async (id: string): Promise<Order> => {
    const res = await apiClient.post(`/orders/${id}/courier/steadfast`)
    return res.data.data
  },

  // POST /orders/:id/courier/steadfast/refresh -> { success, data: order }
  refreshSteadfast: async (id: string): Promise<Order> => {
    const res = await apiClient.post(`/orders/${id}/courier/steadfast/refresh`)
    return res.data.data
  },
}
