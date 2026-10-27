import apiClient from './client.ts'
import { fetchAllPages } from './paginate.ts'
import type { DeliveryOptions, ManualOrderInput, Order, OrderDetailsUpdate, OrderPage, StatusUpdate } from '@/types'
import type { OrderQuery } from '@/utils/orderFilters'

// The API's largest page, used when every matching order is needed (CSV export)
const EXPORT_PAGE_SIZE = 100

export const ordersApi = {
  // GET /orders?page=&limit=&search=&status=... -> { success, data: [...], pagination }
  // One page of the orders matching the filters, newest first, plus how many match in all
  getPage: async (query: OrderQuery, page: number, limit: number): Promise<OrderPage> => {
    const res = await apiClient.get('/orders', { params: { ...query, page, limit } })
    return { orders: res.data.data, total: res.data.pagination.total }
  },

  // Every order matching the filters, page by page (for the CSV file)
  getAllMatching: (query: OrderQuery): Promise<Order[]> => fetchAllPages<Order>('/orders', EXPORT_PAGE_SIZE, query),

  // GET /orders?status=Pending&limit=1 -> only the count is read
  countPending: async (): Promise<number> => {
    const res = await apiClient.get('/orders', { params: { status: 'Pending', limit: 1 } })
    return res.data.pagination.total
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
